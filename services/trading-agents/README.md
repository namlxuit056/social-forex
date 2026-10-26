# TradingAgents sidecar

Runs [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)
(Apache-2.0) as a local HTTP service for the `/trading-agents` page.

- toolforex stores runs in Postgres (`TradingAgentsRun`); this process only executes
  the agent graph and keeps job status in memory (a restart forgets in-flight jobs,
  which the web app then marks `sidecar_lost`).
- Expects the TradingAgents clone at `../TradingAgents` next to this repo
  (see `pyproject.toml`).
- Reads keys from the repo's `.env`. Without `TRADINGAGENTS_LLM_PROVIDER` it uses
  DeepSeek (`deepseek-v4-pro` deep / `deepseek-flash` quick) when `DEEPSEEK_API_KEY`
  is set. Any `TRADINGAGENTS_*` variable from the upstream README overrides it.
- Auth: `Authorization: Bearer $TRADING_AGENTS_SECRET` (falls back to `CRON_SECRET`).

```bash
git clone https://github.com/TauricResearch/TradingAgents.git ../../../TradingAgents
uv sync
uv run uvicorn server:app --host 127.0.0.1 --port 8765   # or: pm2 start ecosystem.config.cjs --only sf-agents
```

Endpoints: `GET /health`, `POST /runs`, `GET /runs/{id}`.
