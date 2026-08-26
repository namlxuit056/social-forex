import { prisma } from "@/lib/prisma";
import { summarizeCalibration, type AutoScalpCalibration, type CalibrationRow } from "./ai-calibration";

/** Correlates the AI's own qualityScore/confidence at entry time against the real
 * Signal outcome, for auto-fired scalping trades — lets an admin see whether the
 * minScore/minConfidence thresholds actually track real win rate. */
export async function getAutoScalpCalibration(): Promise<AutoScalpCalibration> {
  const proposals = await prisma.aiTradeProposal.findMany({
    where: {
      timeframe: "M5_AUTO",
      signalId: { not: null },
      qualityScore: { not: null },
      confidence: { not: null },
    },
    select: { signalId: true, qualityScore: true, confidence: true },
  });

  if (proposals.length === 0) {
    return summarizeCalibration([], 0);
  }

  const signalIds = proposals.map((p) => p.signalId!).filter(Boolean);
  const signals = await prisma.signal.findMany({
    where: { id: { in: signalIds } },
    select: { id: true, status: true },
  });
  const statusById = new Map(signals.map((s) => [s.id, s.status]));

  const rows: CalibrationRow[] = [];
  let totalOpen = 0;
  for (const p of proposals) {
    const status = statusById.get(p.signalId!);
    if (status === "CLOSED_WIN") rows.push({ qualityScore: p.qualityScore!, confidence: p.confidence!, outcome: "WIN" });
    else if (status === "CLOSED_LOSS") rows.push({ qualityScore: p.qualityScore!, confidence: p.confidence!, outcome: "LOSS" });
    else totalOpen += 1; // ACTIVE, PENDING, CANCELLED, or missing — not resolved yet
  }

  return summarizeCalibration(rows, totalOpen);
}
