import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Timer } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCronJobEnabledMap } from "@/lib/cron/job-enabled";
import { CRON_JOBS } from "./job-registry";
import { CronJobsPanel } from "./cron-jobs-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("manageCrons") };
}

export default async function AdminCronsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const enabledMap = await getCronJobEnabledMap();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <Timer className="mr-2 inline-block size-5" aria-hidden />
          {t("manageCrons")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("manageCronsDesc")}</p>
      </div>

      <CronJobsPanel jobs={CRON_JOBS} initialEnabledMap={enabledMap} />
    </div>
  );
}
