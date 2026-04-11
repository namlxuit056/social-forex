"use client";

import { useFormState } from "react-dom";
import { closeSignal, createSignal } from "@/actions/signals";

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
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-medium text-white">Đăng tín hiệu</h2>
        <p className="mt-1 text-sm text-zinc-500">
          VIP: chỉ tài khoản có <code className="font-mono">vipUntil</code> còn hạn.
        </p>
        <form action={createAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="text-zinc-400">Symbol</span>
            <input
              name="symbol"
              required
              placeholder="XAUUSD"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono uppercase"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Hướng</span>
            <select
              name="direction"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Tier</span>
            <select
              name="tier"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            >
              <option value="FREE">FREE</option>
              <option value="VIP">VIP</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Entry</span>
            <input
              name="entry"
              type="number"
              step="any"
              required
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Stop loss</span>
            <input
              name="stopLoss"
              type="number"
              step="any"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            />
          </label>
          <label className="text-sm">
            <span className="text-zinc-400">Take profit</span>
            <input
              name="takeProfit"
              type="number"
              step="any"
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-zinc-400">Ghi chú</span>
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            />
          </label>
          {createState?.error && (
            <p className="text-sm text-rose-400 sm:col-span-2">{createState.error}</p>
          )}
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 sm:col-span-2"
          >
            Đăng tín hiệu
          </button>
        </form>
      </section>
      )}

      <section>
        <h2 className="text-lg font-medium text-white">Danh sách</h2>
        <ul className="mt-4 space-y-4">
          {signals.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-lg text-white">{s.symbol}</span>
                  <span
                    className={`ml-2 rounded px-2 py-0.5 text-xs ${
                      s.direction === "LONG"
                        ? "bg-emerald-900/60 text-emerald-300"
                        : "bg-rose-900/60 text-rose-300"
                    }`}
                  >
                    {s.direction}
                  </span>
                  <span
                    className={`ml-2 rounded px-2 py-0.5 text-xs ${
                      s.tier === "VIP"
                        ? "bg-amber-900/50 text-amber-200"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {s.tier}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {s.authorLabel}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {new Date(s.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>
              {s.masked ? (
                <p className="mt-3 text-sm text-amber-200/90">
                  Tín hiệu VIP — nâng cấp tài khoản để xem entry / SL / TP.
                </p>
              ) : (
                <dl className="mt-3 grid gap-1 font-mono text-sm text-zinc-300 sm:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Entry</dt>
                    <dd>{s.entry}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">SL</dt>
                    <dd>{s.stopLoss ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">TP</dt>
                    <dd>{s.takeProfit ?? "—"}</dd>
                  </div>
                </dl>
              )}
              {s.notes && !s.masked && (
                <p className="mt-2 text-sm text-zinc-500">{s.notes}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-500">Trạng thái:</span>
                <span className="text-zinc-300">{s.status}</span>
                {s.isAuthor && s.status === "ACTIVE" && (
                  <CloseSignalForm signalId={s.id} />
                )}
              </div>
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
    <form action={formAction} className="inline-flex flex-wrap gap-2">
      <input type="hidden" name="signalId" value={signalId} />
      {state?.error && (
        <span className="text-rose-400">{state.error}</span>
      )}
      <button
        type="submit"
        name="status"
        value="CLOSED_WIN"
        className="rounded border border-emerald-800 px-2 py-1 text-emerald-400 hover:bg-emerald-950"
      >
        TP hit
      </button>
      <button
        type="submit"
        name="status"
        value="CLOSED_LOSS"
        className="rounded border border-rose-800 px-2 py-1 text-rose-400 hover:bg-rose-950"
      >
        SL hit
      </button>
      <button
        type="submit"
        name="status"
        value="CANCELLED"
        className="rounded border border-zinc-600 px-2 py-1 text-zinc-400 hover:bg-zinc-900"
      >
        Huỷ
      </button>
    </form>
  );
}
