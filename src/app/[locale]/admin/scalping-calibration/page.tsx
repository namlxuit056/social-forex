import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Gauge } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAutoScalpCalibration } from "@/lib/scalping/ai-calibration-query";
import type { CalibrationBucket } from "@/lib/scalping/ai-calibration";
import { getAutoScalpHistory, type AutoScalpHistoryFilter, type AutoScalpHistoryRow } from "@/lib/scalping/auto-scalp-history";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { ScalpingPromptInspector } from "@/components/admin/scalping-prompt-inspector";
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

const STATUS_OPTIONS: Array<{ value: AutoScalpHistoryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang mở" },
  { value: "PENDING", label: "Chờ khớp" },
  { value: "CLOSED_WIN", label: "Thắng" },
  { value: "CLOSED_LOSS", label: "Thua" },
  { value: "CANCELLED", label: "Đã huỷ" },
];

function statusBadge(status: AutoScalpHistoryRow["signalStatus"]) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400">Đang mở</Badge>;
    case "PENDING":
      return <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">Chờ khớp</Badge>;
    case "CLOSED_WIN":
      return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">Thắng</Badge>;
    case "CLOSED_LOSS":
      return <Badge variant="destructive">Thua</Badge>;
    case "CANCELLED":
      return <Badge variant="outline" className="text-muted-foreground">Đã huỷ</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">Không rõ</Badge>;
  }
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(value);
}

function pnlColor(pnl: number) {
  if (pnl > 0) return "text-emerald-600 dark:text-emerald-400";
  if (pnl < 0) return "text-destructive";
  return "text-muted-foreground";
}

function formatPnl(pnl: number) {
  const sign = pnl > 0 ? "+" : "";
  return `${sign}${pnl.toFixed(2)}`;
}

function HistoryTable({ rows }: { rows: AutoScalpHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có lệnh nào khớp bộ lọc.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4">Thời gian</th>
            <th className="py-2 pr-4">User</th>
            <th className="py-2 pr-4">Symbol</th>
            <th className="py-2 pr-4">Hướng</th>
            <th className="py-2 pr-4">Entry/SL/TP</th>
            <th className="py-2 pr-4">Lot</th>
            <th className="py-2 pr-4">Score/Conf</th>
            <th className="py-2 pr-4">Trạng thái</th>
            <th className="py-2 pr-4">P/L</th>
            <th className="py-2">AI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/30 align-top last:border-0">
              <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </td>
              <td className="py-2 pr-4 max-w-[160px] truncate text-xs" title={row.userEmail}>
                {row.userEmail}
              </td>
              <td className="py-2 pr-4 font-mono font-semibold">{row.symbol}</td>
              <td className="py-2 pr-4">
                <span className={row.direction === "LONG" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                  {row.direction}
                </span>
              </td>
              <td className="py-2 pr-4 whitespace-nowrap font-mono text-xs">
                {row.entry} / {row.stopLoss ?? "—"} / {row.takeProfit ?? "—"}
              </td>
              <td className="py-2 pr-4">{row.lotSize ?? "—"}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {row.qualityScore ?? "—"} / {row.confidence ?? "—"}
              </td>
              <td className="py-2 pr-4">{statusBadge(row.signalStatus)}</td>
              <td className={cn("py-2 pr-4 whitespace-nowrap font-mono font-semibold", row.pnl === null ? "text-muted-foreground" : pnlColor(row.pnl))}>
                {row.pnl === null ? "—" : formatPnl(row.pnl)}
              </td>
              <td className="py-2">
                <details>
                  <summary className="cursor-pointer text-xs text-primary hover:underline">Xem</summary>
                  <div className="mt-2 max-w-md space-y-2">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{row.reasoning}</p>
                    {row.checklist.length > 0 && (
                      <ul className="space-y-1">
                        {row.checklist.map((item, i) => (
                          <li key={i} className="text-xs">
                            <span
                              className={cn(
                                "mr-1 font-semibold",
                                item.status === "pass" && "text-emerald-600 dark:text-emerald-400",
                                item.status === "warn" && "text-amber-600 dark:text-amber-500",
                                item.status === "fail" && "text-destructive",
                              )}
                            >
                              [{item.status}]
                            </span>
                            <span className="font-medium">{item.label}:</span> {item.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: rawStatus } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const statusFilter: AutoScalpHistoryFilter =
    STATUS_OPTIONS.some((o) => o.value === rawStatus) ? (rawStatus as AutoScalpHistoryFilter) : "all";

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

  const [calibration, history] = await Promise.all([
    getAutoScalpCalibration(),
    getAutoScalpHistory(statusFilter, 50),
  ]);

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
          <div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                calibration.totalPnl === null ? "text-foreground" : pnlColor(calibration.totalPnl),
              )}
            >
              {calibration.totalPnl === null ? "—" : formatPnl(calibration.totalPnl)}
            </p>
            <p className="text-xs text-muted-foreground">
              Tổng lợi nhuận{calibration.pnlKnownCount > 0 ? ` (${calibration.pnlKnownCount} lệnh có dữ liệu)` : ""}
            </p>
          </div>
          <div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                calibration.avgPnlPerTrade === null ? "text-foreground" : pnlColor(calibration.avgPnlPerTrade),
              )}
            >
              {calibration.avgPnlPerTrade === null ? "—" : formatPnl(calibration.avgPnlPerTrade)}
            </p>
            <p className="text-xs text-muted-foreground">Lợi nhuận trung bình / lệnh</p>
          </div>
        </CardContent>
      </Card>

      {calibration.totalClosed > calibration.pnlKnownCount && (
        <p className="text-xs text-muted-foreground">
          P/L chỉ tính được cho {calibration.pnlKnownCount}/{calibration.totalClosed} lệnh đã đóng — số còn lại
          chưa có TradeJournal gắn kèm (bridge MT5 chưa từng gửi heartbeat nào cho lệnh đó trước khi đóng).
        </p>
      )}

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

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Prompt gửi lên AI (Auto-Scalp)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScalpingPromptInspector symbols={QUOTE_DEFINITIONS.map((d) => d.symbol)} />
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Lịch sử lệnh Auto-Scalp (gần nhất 50)</CardTitle>
            <form method="get" className="flex items-center gap-2">
              <select
                name="status"
                defaultValue={statusFilter}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-8 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
              >
                Lọc
              </button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <HistoryTable rows={history} />
        </CardContent>
      </Card>
    </div>
  );
}
