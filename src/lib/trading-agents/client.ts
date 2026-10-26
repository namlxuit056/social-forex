import type { Prisma, TradingAgentsRun } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendLocalizedPushToUser } from "@/lib/push-i18n";
import { revalidateNotificationSurfaces } from "@/lib/revalidate-notification-surfaces";

/**
 * Client for the TradingAgents sidecar (services/trading-agents, pm2 `sf-agents`).
 * Postgres holds the run records; the sidecar only executes the agent graph and
 * keeps job status in memory, so every read of an unfinished run syncs it here.
 */

export const TRADING_AGENTS_ANALYSTS = ["market", "news", "social"] as const;
export type TradingAgentsAnalyst = (typeof TRADING_AGENTS_ANALYSTS)[number];

/** Report stages copied from the agent state, in reading order. */
export const TRADING_AGENTS_REPORT_KEYS = [
  "market_report",
  "sentiment_report",
  "news_report",
  "fundamentals_report",
  "investment_plan",
  "trader_investment_plan",
] as const;

const RATINGS = ["Buy", "Overweight", "Hold", "Underweight", "Sell", "REVIEW"] as const;
type Rating = (typeof RATINGS)[number];

function asRating(value: string | null): Rating {
  return RATINGS.includes(value as Rating) ? (value as Rating) : "REVIEW";
}

// A run takes 3–10 minutes; past this it is treated as lost.
const RUN_TIMEOUT_MS = 30 * 60 * 1000;

type SidecarJob = {
  id: string;
  status: "queued" | "running" | "done" | "error";
  error: string | null;
  rating: string | null;
  final_decision: string | null;
  reports: Record<string, string>;
};

function baseUrl() {
  return process.env.TRADING_AGENTS_URL || "http://127.0.0.1:8765";
}

function headers() {
  const secret = process.env.TRADING_AGENTS_SECRET || process.env.CRON_SECRET || "";
  return { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
}

export function isRunFinished(status: string) {
  return status === "DONE" || status === "ERROR";
}

export async function submitTradingAgentsRun(run: TradingAgentsRun): Promise<void> {
  const res = await fetch(`${baseUrl()}/runs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      id: run.id,
      symbol: run.symbol,
      trade_date: run.tradeDate,
      language: run.language,
      analysts: run.analysts,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`sidecar ${res.status}`);
}

/** Pull the sidecar's status for an unfinished run and persist any change. */
export async function syncTradingAgentsRun(run: TradingAgentsRun): Promise<TradingAgentsRun> {
  if (isRunFinished(run.status)) return run;

  const timedOut = Date.now() - run.createdAt.getTime() > RUN_TIMEOUT_MS;
  let job: SidecarJob | null = null;
  try {
    const res = await fetch(`${baseUrl()}/runs/${encodeURIComponent(run.id)}`, {
      headers: headers(),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (res.status === 404) {
      // Sidecar restarted and forgot the job.
      return markError(run, "sidecar_lost");
    }
    if (res.ok) job = (await res.json()) as SidecarJob;
  } catch {
    // Sidecar unreachable — keep the run as is until it times out.
  }

  if (!job) return timedOut ? markError(run, "timeout") : run;

  if (job.status === "done") {
    return finish(run, {
      status: "DONE",
      rating: job.rating,
      decision: job.final_decision,
      reports: job.reports,
    });
  }
  if (job.status === "error") return markError(run, job.error ?? "unknown");
  if (timedOut) return markError(run, "timeout");
  if (job.status === "running" && run.status === "QUEUED") {
    return prisma.tradingAgentsRun.update({ where: { id: run.id }, data: { status: "RUNNING" } });
  }
  return run;
}

/** Sync every unfinished run — called by the sidecar when a job ends, and by cron as a backstop. */
export async function syncUnfinishedTradingAgentsRuns(): Promise<number> {
  const runs = await prisma.tradingAgentsRun.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] } },
  });
  let finished = 0;
  for (const run of runs) {
    if (isRunFinished((await syncTradingAgentsRun(run)).status)) finished += 1;
  }
  return finished;
}

function markError(run: TradingAgentsRun, error: string) {
  return finish(run, { status: "ERROR", error });
}

/**
 * Move an unfinished run to DONE/ERROR. The conditional update makes the
 * transition happen once even when the callback, cron and a page poll race,
 * and only the winner notifies.
 */
async function finish(
  run: TradingAgentsRun,
  data: {
    status: "DONE" | "ERROR";
    rating?: string | null;
    decision?: string | null;
    reports?: Prisma.InputJsonValue;
    error?: string;
  },
): Promise<TradingAgentsRun> {
  const { count } = await prisma.tradingAgentsRun.updateMany({
    where: { id: run.id, status: { in: ["QUEUED", "RUNNING"] } },
    data: { ...data, finishedAt: new Date() },
  });
  const updated = await prisma.tradingAgentsRun.findUniqueOrThrow({ where: { id: run.id } });
  if (count === 1) await notifyRunFinished(updated);
  return updated;
}

async function notifyRunFinished(run: TradingAgentsRun) {
  const userIds = [...new Set([run.userId, ...run.watcherIds])];
  const meta = { runId: run.id, symbol: run.symbol, status: run.status, rating: run.rating };
  const url = `/trading-agents?run=${run.id}`;

  for (const userId of userIds) {
    await prisma.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: `ta:${run.id}` } },
      create: { userId, kind: "TRADING_AGENTS_DONE", dedupeKey: `ta:${run.id}`, meta },
      update: {},
    });
    try {
      await sendLocalizedPushToUser(userId, (t) =>
        run.status === "DONE"
          ? {
              title: t("tradingAgentsDoneTitle", { symbol: run.symbol }),
              body: t("tradingAgentsDoneBody", {
                rating: t(`tradingAgentsRating.${asRating(run.rating)}`),
              }),
              url,
            }
          : {
              title: t("tradingAgentsFailedTitle", { symbol: run.symbol }),
              body: t("tradingAgentsFailedBody"),
              url,
            },
      );
    } catch {
      // Non-blocking
    }
  }
  try {
    revalidateNotificationSurfaces();
  } catch {
    // Throws when reached from a page render (the /trading-agents poll path); the bell refreshes on next navigation.
  }
}
