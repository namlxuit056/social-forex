"use client";

import { useFormState } from "react-dom";
import { closeSignal, createSignal } from "@/actions/signals";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type SignalRow = {
  id: string;
  symbol: string;
  direction: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  tier: "FREE" | "VIP";
  status: "ACTIVE" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";
  notes: string | null;
  masked: boolean;
  authorLabel: string;
  isAuthor: boolean;
  createdAt: string;
};

const createInitial: { error?: string } | null = null;
const closeInitial: { error?: string; ok?: boolean } | null = null;

export function SignalRoom({
  signals,
  showCreate,
}: {
  signals: SignalRow[];
  showCreate: boolean;
}) {
  const [createState, createAction] = useFormState(createSignal, createInitial);

  return (
    <div className="space-y-10">
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Đăng tín hiệu</CardTitle>
            <CardDescription>
              VIP: chỉ tài khoản có <code className="font-mono text-xs">vipUntil</code> còn hạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="signal-symbol">Symbol</Label>
                <Input
                  id="signal-symbol"
                  name="symbol"
                  required
                  placeholder="XAUUSD"
                  className="mt-1.5 font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="signal-direction">Hướng</Label>
                <select
                  id="signal-direction"
                  name="direction"
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="LONG">LONG</option>
                  <option value="SHORT">SHORT</option>
                </select>
              </div>
              <div>
                <Label htmlFor="signal-tier">Tier</Label>
                <select
                  id="signal-tier"
                  name="tier"
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="FREE">FREE</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <Label htmlFor="signal-entry">Entry</Label>
                <Input
                  id="signal-entry"
                  name="entry"
                  type="number"
                  step="any"
                  required
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="signal-sl">Stop loss</Label>
                <Input
                  id="signal-sl"
                  name="stopLoss"
                  type="number"
                  step="any"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="signal-tp">Take profit</Label>
                <Input
                  id="signal-tp"
                  name="takeProfit"
                  type="number"
                  step="any"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="signal-notes">Ghi chú</Label>
                <Textarea
                  id="signal-notes"
                  name="notes"
                  rows={2}
                  className="mt-1.5"
                />
              </div>
              {createState?.error && (
                <p className="text-sm text-destructive sm:col-span-2">{createState.error}</p>
              )}
              <Button type="submit" className="sm:col-span-2">
                Đăng tín hiệu
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-lg font-medium text-foreground">Danh sách</h2>
        {signals.length === 0 && (
          <div className="mt-4">
            <EmptyState
              title="Chưa có tín hiệu nào"
              description={
                showCreate
                  ? "Dùng form phía trên để đăng tín hiệu đầu tiên, hoặc chờ thành viên khác."
                  : "Đăng nhập để đăng tín hiệu và xem đầy đủ theo quyền VIP."
              }
              primary={
                !showCreate
                  ? { href: "/auth/signin?callbackUrl=/signals", label: "Đăng nhập" }
                  : undefined
              }
              secondary={[
                { href: "/quotes", label: "Tỷ giá" },
                { href: "/calendar", label: "Lịch kinh tế" },
                { href: "/leaderboard", label: "BXH" },
              ]}
            />
          </div>
        )}
        <ul className="mt-4 space-y-4">
          {signals.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="pt-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-semibold text-foreground">{s.symbol}</span>
                      <Badge variant={s.direction === "LONG" ? "default" : "destructive"} className="text-xs">
                        {s.direction}
                      </Badge>
                      <Badge variant={s.tier === "VIP" ? "secondary" : "outline"} className="text-xs">
                        {s.tier}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.authorLabel}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  {s.masked ? (
                    <p className="mt-3 text-sm text-amber-400/90">
                      Tín hiệu VIP — nâng cấp tài khoản để xem entry / SL / TP.
                    </p>
                  ) : (
                    <dl className="mt-3 grid gap-1 font-mono text-sm text-foreground/80 sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Entry</dt>
                        <dd>{s.entry}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SL</dt>
                        <dd>{s.stopLoss ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">TP</dt>
                        <dd>{s.takeProfit ?? "—"}</dd>
                      </div>
                    </dl>
                  )}

                  {s.notes && !s.masked && (
                    <p className="mt-2 text-sm text-muted-foreground">{s.notes}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <Badge variant="outline" className="text-xs">{s.status}</Badge>
                    {s.isAuthor && s.status === "ACTIVE" && (
                      <CloseSignalForm signalId={s.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CloseSignalForm({ signalId }: { signalId: string }) {
  const [state, formAction] = useFormState(closeSignal, closeInitial);
  return (
    <form action={formAction} className="inline-flex flex-wrap gap-1.5">
      <input type="hidden" name="signalId" value={signalId} />
      {state?.error && (
        <span className="text-destructive">{state.error}</span>
      )}
      <Button type="submit" name="status" value="CLOSED_WIN" size="sm" variant="outline" className="h-6 gap-1 px-2 text-xs text-emerald-400 hover:text-emerald-300">
        TP hit
      </Button>
      <Button type="submit" name="status" value="CLOSED_LOSS" size="sm" variant="outline" className="h-6 gap-1 px-2 text-xs text-destructive hover:text-red-400">
        SL hit
      </Button>
      <Button type="submit" name="status" value="CANCELLED" size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs">
        Huỷ
      </Button>
    </form>
  );
}
