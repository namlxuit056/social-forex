"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import {
  TRADING_AGENTS_ANALYSTS,
  submitTradingAgentsRun,
} from "@/lib/trading-agents/client";

const VALID_SYMBOLS = QUOTE_DEFINITIONS.map((d) => d.symbol);

// Each run is ~20–40 LLM calls, so VIPs get a daily budget; admins are uncapped.
const VIP_RUNS_PER_DAY = 5;
// A finished analysis of the same pair/date/language is shared instead of re-run.
const REUSE_WINDOW_MS = 6 * 60 * 60 * 1000;

const schema = z.object({
  symbol: z.string().refine((s) => VALID_SYMBOLS.includes(s), "invalid_symbol"),
  language: z.enum(["vi", "en"]),
  analysts: z.array(z.enum(TRADING_AGENTS_ANALYSTS)).min(1),
});

export type StartTradingAgentsResult = { runId?: string; error?: string };

export async function startTradingAgentsRun(input: {
  symbol: string;
  language: string;
  analysts: string[];
}): Promise<StartTradingAgentsResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  if (!rateLimit(`trading-agents:${userId}`, 3, 60_000).ok) return { error: "rate_limited" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "invalid_data" };
  const { symbol, language, analysts } = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true, role: true },
  });
  const isAdmin = dbUser?.role === "ADMIN";
  if (!isAdmin && !isVipActive(dbUser?.vipUntil)) return { error: "vip_required" };

  const tradeDate = new Date().toISOString().slice(0, 10);
  const sortedAnalysts = [...analysts].sort();

  const reusable = await prisma.tradingAgentsRun.findFirst({
    where: {
      symbol,
      tradeDate,
      language,
      analysts: { equals: sortedAnalysts },
      OR: [
        { status: { in: ["QUEUED", "RUNNING"] } },
        { status: "DONE", finishedAt: { gte: new Date(Date.now() - REUSE_WINDOW_MS) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (reusable) return { runId: reusable.id };

  if (!isAdmin) {
    const usedToday = await prisma.tradingAgentsRun.count({
      where: {
        userId,
        status: { not: "ERROR" },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (usedToday >= VIP_RUNS_PER_DAY) return { error: "quota_reached" };
  }

  const run = await prisma.tradingAgentsRun.create({
    data: { userId, symbol, tradeDate, language, analysts: sortedAnalysts },
  });

  try {
    await submitTradingAgentsRun(run);
  } catch {
    await prisma.tradingAgentsRun.update({
      where: { id: run.id },
      data: { status: "ERROR", error: "sidecar_unavailable", finishedAt: new Date() },
    });
    return { error: "sidecar_unavailable" };
  }

  revalidateLocalizedPath("/trading-agents");
  return { runId: run.id };
}
