"use client";

import { useActionState } from "react";
import { Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkGenerateAcademyLessonsAction, type BulkGenerateState } from "./actions";
import { SubmitButton } from "./submit-button";

export function BulkGenerateForm() {
  const [state, formAction] = useActionState<BulkGenerateState, FormData>(
    bulkGenerateAcademyLessonsAction,
    null,
  );

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="size-4 text-primary" aria-hidden />
          AI tự lên ý tưởng &amp; tạo hàng loạt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="count">Số bài cần tạo</Label>
            <Input
              id="count"
              name="count"
              type="number"
              min={1}
              max={10}
              defaultValue={3}
              className="mt-1.5"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              AI tự chọn chủ đề đa dạng (1–10 bài), tránh trùng bài đã có. Mỗi bài cách nhau ~2 giây.
            </p>
          </div>
          <SubmitButton
            className="w-full"
            pendingLabel="AI đang tạo hàng loạt (vui lòng đợi)..."
          >
            <Wand2 className="mr-2 size-4" aria-hidden />
            Tạo hàng loạt
          </SubmitButton>
        </form>

        {state && (
          <div className="mt-4 space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
            <p className={state.created > 0 ? "text-green-500" : "text-muted-foreground"}>
              ✓ Đã tạo thành công: <strong>{state.created}</strong> bài
            </p>
            {state.failed > 0 && (
              <p className="text-amber-500">
                ✗ Thất bại: <strong>{state.failed}</strong> bài
              </p>
            )}
            {state.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {state.errors.map((err, i) => (
                  <li key={i} className="font-mono text-xs text-destructive/80 leading-relaxed">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
