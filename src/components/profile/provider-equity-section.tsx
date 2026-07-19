import { prisma } from "@/lib/prisma";
import { TRADER_STATS_MIN_SAMPLE } from "@/lib/signals/public-performance-stats";
import {
  buildEquityCurve,
  buildMonthlyR,
  type ClosedSignalForEquity,
} from "@/lib/signals/provider-equity";
import { ProviderEquityChart } from "./provider-equity-chart";

export async function ProviderEquitySection({
  profileUserId,
  locale,
}: {
  profileUserId: string;
  locale: string;
}) {
  const signals = await prisma.signal.findMany({
    where: {
      authorId: profileUserId,
      status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] },
      closedAt: { not: null },
    },
    select: {
      status: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      closedAt: true,
    },
    orderBy: { closedAt: "asc" },
  });

  if (signals.length < TRADER_STATS_MIN_SAMPLE) return null;

  const closed = signals.map((s) => ({
    ...s,
    status: s.status as ClosedSignalForEquity["status"],
    closedAt: s.closedAt!,
  }));

  const points = buildEquityCurve(closed).map((p) => ({
    date: p.date.toISOString(),
    r: p.r,
    cumR: Math.round(p.cumR * 100) / 100,
  }));
  const monthly = buildMonthlyR(closed).map((m) => ({
    key: m.key,
    r: Math.round(m.r * 100) / 100,
    wins: m.wins,
    losses: m.losses,
  }));

  return <ProviderEquityChart points={points} monthly={monthly} locale={locale} />;
}
