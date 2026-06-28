"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2, CheckCircle2, XCircle, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getTopicIdeasForBulkAction, generateAcademyLessonAction } from "./actions";

type RowStatus =
  | { state: "waiting" }
  | { state: "generating" }
  | { state: "done" }
  | { state: "failed"; error: string };

type Row = { topic: string; level: string; status: RowStatus };

type Phase = "idle" | "getting-topics" | "generating" | "done";

export function BulkGenerateForm() {
  const router = useRouter();
  const [count, setCount] = useState(3);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<Row[]>([]);

  async function handleGenerate() {
    setPhase("getting-topics");
    setRows([]);

    let topics: Array<{ topic: string; level: string }>;
    try {
      topics = await getTopicIdeasForBulkAction(count);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setRows([{ topic: "Lấy ý tưởng thất bại", level: "", status: { state: "failed", error: msg } }]);
      setPhase("done");
      return;
    }

    setRows(topics.map((t) => ({ ...t, status: { state: "waiting" } })));
    setPhase("generating");

    for (let i = 0; i < topics.length; i++) {
      setRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: { state: "generating" } } : r)),
      );

      const fd = new FormData();
      fd.set("topic", topics[i].topic);
      fd.set("level", topics[i].level);

      const result = await generateAcademyLessonAction(fd);
      if (result?.error) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: { state: "failed", error: result.error!.slice(0, 200) } }
              : r,
          ),
        );
      } else {
        setRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: { state: "done" } } : r)),
        );
      }

      if (i < topics.length - 1) {
        // 10s gap between lessons — gives Groq free-tier time to recover rate-limit
        await new Promise((r) => setTimeout(r, 10000));
      }
    }

    setPhase("done");
    router.refresh();
  }

  const isRunning = phase === "getting-topics" || phase === "generating";
  const doneCount = rows.filter((r) => r.status.state === "done").length;
  const failedCount = rows.filter((r) => r.status.state === "failed").length;
  const currentIdx = rows.findIndex((r) => r.status.state === "generating");

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="size-4 text-primary" aria-hidden />
          AI tự lên ý tưởng &amp; tạo hàng loạt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="bulk-count">Số bài cần tạo</Label>
          <Input
            id="bulk-count"
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            className="mt-1.5"
            disabled={isRunning}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            AI tự chọn chủ đề, tạo tuần tự từng bài — bài trước xong mới bắt đầu bài sau (1–10).
          </p>
        </div>

        <Button onClick={handleGenerate} disabled={isRunning} className="w-full">
          {phase === "getting-topics" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang lên ý tưởng...
            </>
          ) : phase === "generating" ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Đang tạo bài {currentIdx + 1}/{rows.length}...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 size-4" />
              Tạo hàng loạt
            </>
          )}
        </Button>

        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-md border border-border/50 bg-muted/20 px-3 py-2.5"
              >
                <span className="mt-0.5 shrink-0">
                  {row.status.state === "waiting" && (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  {row.status.state === "generating" && (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  )}
                  {row.status.state === "done" && (
                    <CheckCircle2 className="size-4 text-green-500" />
                  )}
                  {row.status.state === "failed" && (
                    <XCircle className="size-4 text-destructive" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-foreground">{row.topic}</p>
                  {row.level && (
                    <span className="text-xs text-muted-foreground">{row.level}</span>
                  )}
                  {row.status.state === "generating" && (
                    <p className="mt-0.5 text-xs text-muted-foreground">Đang viết bài...</p>
                  )}
                  {row.status.state === "failed" && (
                    <p className="mt-0.5 font-mono text-xs leading-relaxed text-destructive/80">
                      {row.status.error}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {phase === "done" && (
              <p
                className={`text-sm font-medium ${failedCount > 0 ? "text-amber-500" : "text-green-500"}`}
              >
                Hoàn thành: {doneCount} thành công
                {failedCount > 0 ? `, ${failedCount} thất bại` : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
