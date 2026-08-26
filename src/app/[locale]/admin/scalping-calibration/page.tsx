import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Gauge } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAutoScalpCalibration } from "@/lib/scalping/ai-calibration-query";
import type { CalibrationBucket } from "@/lib/scalping/ai-calibration";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "AI Scalp Calibration" };
}

const MIN_SAMPLE_FOR_TRUST = 20;

function winRateColor(pct: number) {
  if (pct >= 55) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 45) return "text-amber-600 dark:text-amber-500";
  return "text-destructive";
}

function BucketTable({ title, rows, keyLabel }: { title: string; rows: CalibrationBucket[]; keyLabel: string }) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có lệnh đã đóng để thống kê.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">{keyLabel}</th>
                  <th className="py-2 pr-4">Số lệnh</th>
                  <th className="py-2 pr-4">Thắng</th>
                  <th className="py-2">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4 font-mono">{row.key}</td>
                    <td className="py-2 pr-4">{row.count}</td>
                    <td className="py-2 pr-4">{row.wins}</td>
                    <td className={cn("py-2 font-semibold", winRateColor(row.winRatePct))}>
                      {row.winRatePct}%
                      {row.count < MIN_SAMPLE_FOR_TRUST && (
                        <span className="ml-1.5 font-normal text-muted-foreground">(mẫu nhỏ)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ScalpingCalibrationPage({
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
        <h1 className="font-heading text-2xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const calibration = await getAutoScalpCalibration();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/crons" className="text-xs text-muted-foreground hover:underline">
          ← Cron Jobs
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-semibold text-foreground">
          <Gauge className="mr-2 inline-block size-5" aria-hidden />
          {t("scalpingCalibration")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("scalpingCalibrationDesc")}</p>
      </div>

      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{calibration.totalClosed}</p>
            <p className="text-xs text-muted-foreground">Lệnh đã đóng (có kết quả)</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{calibration.totalOpen}</p>
            <p className="text-xs text-muted-foreground">Đang mở / chưa có kết quả</p>
          </div>
          <div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                calibration.overallWinRatePct === null
                  ? "text-foreground"
                  : winRateColor(calibration.overallWinRatePct),
              )}
            >
              {calibration.overallWinRatePct === null ? "—" : `${calibration.overallWinRatePct}%`}
            </p>
            <p className="text-xs text-muted-foreground">Win rate tổng</p>
          </div>
        </CardContent>
      </Card>

      {calibration.totalClosed > 0 && calibration.totalClosed < MIN_SAMPLE_FOR_TRUST && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Mẫu còn nhỏ ({calibration.totalClosed} lệnh) — chưa đủ để kết luận ngưỡng minScore/minConfidence
          hiện tại có đáng tin không. Cần tích luỹ thêm dữ liệu.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <BucketTable title="Win rate theo qualityScore" rows={calibration.byScoreBucket} keyLabel="Score" />
        <BucketTable title="Win rate theo confidence" rows={calibration.byConfidence} keyLabel="Confidence" />
      </div>
    </div>
  );
}
