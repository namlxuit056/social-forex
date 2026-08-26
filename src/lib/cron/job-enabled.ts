import { prisma } from "@/lib/prisma";
import { CRON_JOBS, type CronJobKey } from "@/app/[locale]/admin/crons/job-registry";

/** Missing row = enabled (default). */
export async function isCronJobEnabled(key: CronJobKey): Promise<boolean> {
  const row = await prisma.cronJobSetting.findUnique({ where: { key } });
  return row?.enabled ?? true;
}

export async function getCronJobEnabledMap(): Promise<Record<CronJobKey, boolean>> {
  const rows = await prisma.cronJobSetting.findMany();
  const disabled = new Set(rows.filter((r) => !r.enabled).map((r) => r.key));
  return Object.fromEntries(
    CRON_JOBS.map((job) => [job.key, !disabled.has(job.key)]),
  ) as Record<CronJobKey, boolean>;
}

export async function setCronJobEnabled(key: CronJobKey, enabled: boolean): Promise<void> {
  await prisma.cronJobSetting.upsert({
    where: { key },
    create: { key, enabled },
    update: { enabled },
  });
}
