"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runScreenerAutoFire } from "@/lib/signals/screener-auto-fire";
import { runScreenerAutoReview } from "@/lib/signals/screener-auto-review";
import { runScalpingAutoRunAll } from "@/lib/scalping/auto-run";
import { reconcileStaleMt5Signals } from "@/lib/mt5/reconcile-signals";
import { runTrailingStopUpdate } from "@/lib/mt5/trailing-stop-run";
import { checkPriceAlerts } from "@/lib/price-alerts/check";
import { runJournalWeeklyReview } from "@/lib/journal/weekly-review-run";
import { runJournalDailyReview } from "@/lib/journal/daily-review-run";
import { runAcademyAutoGenerate } from "@/lib/ai/academy-auto-generate";
import type { CronJobKey } from "./job-registry";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

export type RunCronJobResult =
  | { ok: true; jobKey: CronJobKey; at: string; summary: string }
  | { ok: false; jobKey: CronJobKey; at: string; error: string };

export async function runCronJob(jobKey: CronJobKey): Promise<RunCronJobResult> {
  await requireAdmin();
  const at = new Date().toISOString();

  try {
    let summary: unknown;
    switch (jobKey) {
      case "screener-auto-run":
        summary = await runScreenerAutoFire();
        break;
      case "screener-auto-review":
        summary = await runScreenerAutoReview();
        break;
      case "scalping-auto-run":
        summary = await runScalpingAutoRunAll();
        break;
      case "mt5-reconcile-signals":
        summary = await reconcileStaleMt5Signals();
        break;
      case "mt5-trailing-stop":
        summary = await runTrailingStopUpdate();
        break;
      case "price-alerts-check":
        summary = await checkPriceAlerts();
        break;
      case "journal-weekly-review":
        summary = await runJournalWeeklyReview();
        break;
      case "journal-daily-review":
        summary = await runJournalDailyReview();
        break;
      case "academy-auto-generate":
        summary = await runAcademyAutoGenerate(3);
        break;
      default:
        return { ok: false, jobKey, at, error: "unknown_job" };
    }
    return { ok: true, jobKey, at, summary: JSON.stringify(summary, null, 2) };
  } catch (err) {
    return { ok: false, jobKey, at, error: err instanceof Error ? err.message : "unknown_error" };
  }
}
