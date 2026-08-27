import { prisma } from "@/lib/prisma";
import {
  DEFAULT_THRESHOLD_CANDIDATES,
  plannedRFor,
  summarizeCalibration,
  type AutoScalpCalibration,
  type CalibrationRow,
  type ThresholdCandidate,
} from "./ai-calibration";

/** Merge the thresholds real users have configured into the replay grid so the sim always
 * shows the gates actually in force, plus the stepped-up defaults. Deduped, sorted. */
async function resolveThresholdCandidates(): Promise<{
  candidates: ThresholdCandidate[];
  configured: ThresholdCandidate[];
}> {
  const configs = await prisma.autoScalpConfig.findMany({
    where: { enabled: true },
    select: { minScore: true, minConfidence: true },
  });
  const configured = [
    ...new Map(
      configs.map((c) => [`${c.minScore}/${c.minConfidence}`, { minScore: c.minScore, minConfidence: c.minConfidence }]),
    ).values(),
  ];
  const merged = new Map<string, ThresholdCandidate>();
  for (const c of [...configured, ...DEFAULT_THRESHOLD_CANDIDATES]) {
    merged.set(`${c.minScore}/${c.minConfidence}`, c);
  }
  const candidates = [...merged.values()].sort(
    (a, b) => a.minScore - b.minScore || a.minConfidence - b.minConfidence,
  );
  return { candidates, configured };
}

export type AutoScalpCalibrationResult = AutoScalpCalibration & {
  /** (minScore, minConfidence) pairs currently in force on an enabled AutoScalpConfig. */
  configuredThresholds: ThresholdCandidate[];
};

/** Correlates the AI's own qualityScore/confidence at entry time against the real
 * Signal outcome, for auto-fired scalping trades — lets an admin see whether the
 * minScore/minConfidence thresholds actually track real win rate. */
export async function getAutoScalpCalibration(): Promise<AutoScalpCalibrationResult> {
  const [proposals, { candidates, configured }] = await Promise.all([
    prisma.aiTradeProposal.findMany({
      where: {
        timeframe: "M5_AUTO",
        signalId: { not: null },
        qualityScore: { not: null },
        confidence: { not: null },
      },
      select: {
        signalId: true,
        qualityScore: true,
        confidence: true,
        symbol: true,
        direction: true,
        entry: true,
        stopLoss: true,
        takeProfit: true,
      },
    }),
    resolveThresholdCandidates(),
  ]);

  if (proposals.length === 0) {
    return { ...summarizeCalibration([], 0, candidates), configuredThresholds: configured };
  }

  const signalIds = proposals.map((p) => p.signalId!).filter(Boolean);
  const signals = await prisma.signal.findMany({
    where: { id: { in: signalIds } },
    select: { id: true, status: true, mt5Link: { select: { journal: { select: { pnl: true } } } } },
  });
  const signalById = new Map(signals.map((s) => [s.id, s]));

  const rows: CalibrationRow[] = [];
  let totalOpen = 0;
  for (const p of proposals) {
    const signal = signalById.get(p.signalId!);
    const pnl = signal?.mt5Link?.journal?.pnl ?? null;
    const outcome =
      signal?.status === "CLOSED_WIN" ? "WIN" : signal?.status === "CLOSED_LOSS" ? "LOSS" : null;
    if (!outcome) {
      totalOpen += 1; // ACTIVE, PENDING, CANCELLED, or missing — not resolved yet
      continue;
    }
    rows.push({
      qualityScore: p.qualityScore!,
      confidence: p.confidence!,
      outcome,
      symbol: p.symbol,
      direction: p.direction,
      plannedR: plannedRFor(outcome, p.direction, p.entry, p.stopLoss, p.takeProfit),
      pnl,
    });
  }

  return { ...summarizeCalibration(rows, totalOpen, candidates), configuredThresholds: configured };
}
