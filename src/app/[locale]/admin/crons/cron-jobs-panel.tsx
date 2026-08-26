"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Play, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { runCronJob, toggleCronJob, type RunCronJobResult } from "./actions";
import type { CronJobKey, CronJobMeta } from "./job-registry";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN");
}

function JobResult({ result }: { result: RunCronJobResult }) {
  return (
    <div
      className={
        result.ok
          ? "mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3"
          : "mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
      }
    >
      <p className="text-xs font-medium text-muted-foreground">
        {result.ok ? "Kết quả" : "Lỗi"} · {formatTime(result.at)}
      </p>
      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-foreground">
        {result.ok ? result.summary : result.error}
      </pre>
    </div>
  );
}

function JobCard({
  job,
  enabled,
  onToggle,
}: {
  job: CronJobMeta;
  enabled: boolean;
  onToggle: (jobKey: CronJobKey, next: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [result, setResult] = useState<RunCronJobResult | null>(null);

  function run() {
    startTransition(async () => {
      const res = await runCronJob(job.key satisfies CronJobKey);
      setResult(res);
    });
  }

  function toggle() {
    const next = !enabled;
    onToggle(job.key, next);
    startToggleTransition(async () => {
      await toggleCronJob(job.key, next);
    });
  }

  return (
    <Card className={cn("border-border/70", !enabled && "opacity-70")}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{job.label}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{job.schedule}</p>
          </div>
          <div className="flex items-center gap-2">
            {job.risk === "trade" && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" aria-hidden />
                Có thể bắn lệnh thật
              </Badge>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={enabled ? "Tắt job này" : "Bật job này"}
              disabled={isTogglePending}
              onClick={toggle}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
                enabled ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{job.description}</p>
        {!enabled && (
          <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-500">
            Đã tắt — lịch tự động (Vercel Cron) và trigger bên ngoài sẽ bị bỏ qua. Nút &quot;Chạy ngay&quot; bên dưới vẫn hoạt động để test thủ công.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {job.settingsHref && (
            <Link
              href={job.settingsHref}
              className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "gap-1.5")}
            >
              <Settings2 className="size-3.5" aria-hidden />
              {job.settingsLabel ?? "Cấu hình"}
            </Link>
          )}
          {job.risk === "trade" ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button size="sm" variant="outline" disabled={isPending} className="gap-1.5" />
                }
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Play className="size-3.5" aria-hidden />
                )}
                Chạy ngay
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive" aria-hidden />
                    Chạy &quot;{job.label}&quot; ngay bây giờ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Job này có thể tạo Signal / AiTradeProposal thật và khiến MT5 EA khớp
                    lệnh trên tài khoản liên kết. Không thể hoàn tác sau khi lệnh đã khớp.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={run}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Đồng ý, chạy ngay
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button size="sm" variant="outline" onClick={run} disabled={isPending} className="gap-1.5">
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="size-3.5" aria-hidden />
              )}
              Chạy ngay
            </Button>
          )}
        </div>

        {result && <JobResult result={result} />}
      </CardContent>
    </Card>
  );
}

export function CronJobsPanel({
  jobs,
  initialEnabledMap,
}: {
  jobs: CronJobMeta[];
  initialEnabledMap: Record<CronJobKey, boolean>;
}) {
  const [enabledMap, setEnabledMap] = useState(initialEnabledMap);

  function handleToggle(jobKey: CronJobKey, next: boolean) {
    setEnabledMap((prev) => ({ ...prev, [jobKey]: next }));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((job) => (
        <JobCard
          key={job.key}
          job={job}
          enabled={enabledMap[job.key] ?? true}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
