"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScreenerLotRow } from "@/lib/signals/screener-lot-config";
import { deleteScreenerLot, upsertScreenerLot } from "./actions";

type Feedback = { ok: boolean; text: string } | null;

function FeedbackBadge({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <span
      className={
        feedback.ok
          ? "flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
          : "flex items-center gap-1 text-xs text-destructive"
      }
    >
      {feedback.ok ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
      {feedback.text}
    </span>
  );
}

function LotRow({
  row,
  locked,
  onSaved,
  onDeleted,
}: {
  row: ScreenerLotRow;
  locked?: boolean;
  onSaved: (row: ScreenerLotRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [value, setValue] = useState(String(row.lotSize));
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await upsertScreenerLot(row.symbol, Number(value));
      if (res.ok) {
        setValue(String(res.row.lotSize));
        onSaved(res.row);
        setFeedback({ ok: true, text: "Đã lưu" });
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  }

  function remove() {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteScreenerLot(row.id, row.symbol);
      if (res.ok) {
        onDeleted(row.id);
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-28 shrink-0">
        <Label className="text-xs text-muted-foreground">Symbol</Label>
        <p className="font-mono text-sm font-medium text-foreground">{row.symbol}</p>
      </div>
      <div className="max-w-40 flex-1">
        <Label htmlFor={`lot-${row.id}`} className="text-xs text-muted-foreground">
          Lot
        </Label>
        <Input
          id={`lot-${row.id}`}
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
        />
      </div>
      <Button type="button" size="sm" variant="outline" onClick={save} disabled={isPending}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Lưu"}
      </Button>
      {!locked && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={remove}
          disabled={isPending}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      )}
      <FeedbackBadge feedback={feedback} />
    </div>
  );
}

function AddSymbolForm({ onAdded }: { onAdded: (row: ScreenerLotRow) => void }) {
  const [symbol, setSymbol] = useState("");
  const [lot, setLot] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  function add() {
    if (!symbol.trim() || !lot.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await upsertScreenerLot(symbol, Number(lot));
      if (res.ok) {
        onAdded(res.row);
        setSymbol("");
        setLot("");
        setFeedback({ ok: true, text: "Đã thêm" });
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="border-border mt-4 border-t pt-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Thêm symbol mới</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28 shrink-0">
          <Label htmlFor="new-symbol" className="text-xs text-muted-foreground">
            Symbol
          </Label>
          <Input
            id="new-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="EURUSD"
            disabled={isPending}
          />
        </div>
        <div className="max-w-40 flex-1">
          <Label htmlFor="new-lot" className="text-xs text-muted-foreground">
            Lot
          </Label>
          <Input
            id="new-lot"
            type="number"
            inputMode="decimal"
            min="0"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="0.05"
            disabled={isPending}
          />
        </div>
        <Button type="button" size="sm" onClick={add} disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
          Thêm
        </Button>
        <FeedbackBadge feedback={feedback} />
      </div>
    </div>
  );
}

export function LotConfigPanel({
  defaultRow,
  symbolRows,
}: {
  defaultRow: ScreenerLotRow;
  symbolRows: ScreenerLotRow[];
}) {
  const [defaultLot, setDefaultLot] = useState(defaultRow);
  const [rows, setRows] = useState(symbolRows);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          Lot mặc định (áp dụng cho symbol chưa cấu hình riêng)
        </p>
        <LotRow
          row={defaultLot}
          locked
          onSaved={setDefaultLot}
          onDeleted={() => {}}
        />
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Lot riêng theo symbol</p>
        <div className="space-y-4">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có symbol nào được cấu hình riêng.</p>
          )}
          {rows.map((row) => (
            <LotRow
              key={row.id}
              row={row}
              onSaved={(updated) => setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
              onDeleted={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
            />
          ))}
        </div>

        <AddSymbolForm onAdded={(row) => setRows((prev) => [...prev, row])} />
      </div>
    </div>
  );
}
