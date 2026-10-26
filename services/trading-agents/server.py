"""HTTP sidecar that runs TauricResearch/TradingAgents for toolforex.

toolforex (Next.js) owns the run records in Postgres; this process only
executes the multi-agent graph and keeps each job's status in memory. A
restart forgets in-flight jobs and the Next side marks them failed when
GET /runs/{id} answers 404.

Run:  uv run uvicorn server:app --host 127.0.0.1 --port 8765
"""

from __future__ import annotations

import logging
import os
import threading
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

# toolforex's .env (two levels up) holds the provider keys; load it before the
# tradingagents import, whose DEFAULT_CONFIG reads TRADINGAGENTS_* at import.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Without an explicit TRADINGAGENTS_LLM_PROVIDER, use DeepSeek when its key is
# present — the same default provider the rest of toolforex uses.
if not os.getenv("TRADINGAGENTS_LLM_PROVIDER") and os.getenv("DEEPSEEK_API_KEY"):
    os.environ["TRADINGAGENTS_LLM_PROVIDER"] = "deepseek"
    os.environ.setdefault("TRADINGAGENTS_DEEP_THINK_LLM", "deepseek-v4-pro")
    os.environ.setdefault("TRADINGAGENTS_QUICK_THINK_LLM", "deepseek-flash")

from tradingagents.dataflows.symbols import crypto_base  # noqa: E402
from tradingagents.default_config import build_default_config  # noqa: E402
from tradingagents.graph.trading_graph import TradingAgentsGraph  # noqa: E402

logger = logging.getLogger("trading-agents-sidecar")
logging.basicConfig(level=logging.INFO)

SECRET = os.getenv("TRADING_AGENTS_SECRET") or os.getenv("CRON_SECRET") or ""
CONCURRENCY = int(os.getenv("TRADING_AGENTS_CONCURRENCY", "1"))
MAX_JOBS_KEPT = 200

LANGUAGES = {"vi": "Vietnamese", "en": "English"}
Analyst = Literal["market", "social", "news", "fundamentals"]

# State keys copied into the result, in reading order.
REPORT_KEYS = (
    "market_report",
    "sentiment_report",
    "news_report",
    "fundamentals_report",
    "investment_plan",
    "trader_investment_plan",
)


class RunRequest(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    symbol: str = Field(pattern=r"^[A-Z0-9]{3,12}$")
    trade_date: date
    language: Literal["vi", "en"] = "vi"
    analysts: list[Analyst] = Field(default_factory=lambda: ["market", "news"], min_length=1)


class Job(BaseModel):
    id: str
    status: Literal["queued", "running", "done", "error"] = "queued"
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    rating: str | None = None
    final_decision: str | None = None
    reports: dict[str, str] = Field(default_factory=dict)


jobs: dict[str, Job] = {}
jobs_lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=CONCURRENCY)

app = FastAPI(title="toolforex TradingAgents sidecar")


def require_secret(authorization: str | None = Header(default=None)) -> None:
    if not SECRET or authorization != f"Bearer {SECRET}":
        raise HTTPException(status_code=401, detail="unauthorized")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _prune() -> None:
    finished = sorted(
        (j for j in jobs.values() if j.status in ("done", "error")),
        key=lambda j: j.created_at,
    )
    for job in finished[: max(0, len(jobs) - MAX_JOBS_KEPT)]:
        jobs.pop(job.id, None)


def _execute(req: RunRequest) -> None:
    job = jobs[req.id]
    job.status = "running"
    job.started_at = _now()
    try:
        config = build_default_config()
        config["output_language"] = LANGUAGES[req.language]
        asset_type = "crypto" if crypto_base(req.symbol) else "stock"
        graph = TradingAgentsGraph(selected_analysts=req.analysts, config=config)
        state, rating = graph.propagate(req.symbol, req.trade_date.isoformat(), asset_type=asset_type)
        job.rating = rating
        job.final_decision = state.get("final_trade_decision") or ""
        job.reports = {k: state[k] for k in REPORT_KEYS if state.get(k)}
        job.status = "done"
    except Exception as exc:  # surfaced to the caller, never raised
        logger.error("run %s failed: %s", req.id, traceback.format_exc())
        job.error = f"{type(exc).__name__}: {exc}"[:2000]
        job.status = "error"
    finally:
        job.finished_at = _now()


@app.get("/health")
def health() -> dict:
    config = build_default_config()
    return {
        "ok": True,
        "provider": config["llm_provider"],
        "deep_model": config["deep_think_llm"],
        "quick_model": config["quick_think_llm"],
        "active": sum(1 for j in jobs.values() if j.status in ("queued", "running")),
    }


@app.post("/runs", dependencies=[Depends(require_secret)])
def create_run(req: RunRequest) -> Job:
    with jobs_lock:
        existing = jobs.get(req.id)
        if existing:
            return existing
        _prune()
        job = Job(id=req.id, created_at=_now())
        jobs[req.id] = job
    executor.submit(_execute, req)
    return job


@app.get("/runs/{run_id}", dependencies=[Depends(require_secret)])
def get_run(run_id: str) -> Job:
    job = jobs.get(run_id)
    if not job:
        raise HTTPException(status_code=404, detail="unknown run")
    return job
