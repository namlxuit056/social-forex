"use client";

import { useEffect, useState } from "react";
import type { QuoteRow } from "@/lib/quotes/mock";

type Props = { initial: QuoteRow[] };

export function LiveQuotesTable({ initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/quotes");
      if (!res.ok) return;
      const data = (await res.json()) as {
        updatedAt: string;
        quotes: QuoteRow[];
      };
      setRows(data.quotes);
      setUpdatedAt(data.updatedAt);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const groups = ["major", "minor", "metal", "energy", "crypto"] as const;
  const labels: Record<(typeof groups)[number], string> = {
    major: "Major",
    minor: "Minor / Cross",
    metal: "Kim loại",
    energy: "Năng lượng",
    crypto: "Crypto",
  };

  return (
    <div className="space-y-6">
      {updatedAt && (
        <p className="text-xs text-zinc-500">
          Cập nhật client: {new Date(updatedAt).toLocaleString("vi-VN")}
        </p>
      )}
      {groups.map((g) => {
        const subset = rows.filter((r) => r.group === g);
        if (!subset.length) return null;
        return (
          <section key={g}>
            <h3 className="mb-2 text-sm font-medium text-emerald-500/90">
              {labels[g]}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-zinc-900/80 text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Cặp</th>
                    <th className="px-3 py-2 font-medium">Bid</th>
                    <th className="px-3 py-2 font-medium">Ask</th>
                    <th className="px-3 py-2 font-medium">Δ%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {subset.map((r) => (
                    <tr key={r.symbol} className="hover:bg-zinc-900/50">
                      <td className="px-3 py-2">
                        <span className="font-mono font-medium text-zinc-100">
                          {r.symbol}
                        </span>
                        <span className="ml-2 text-zinc-500">{r.name}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-emerald-400/90">
                        {r.bid}
                      </td>
                      <td className="px-3 py-2 font-mono text-sky-400/90">
                        {r.ask}
                      </td>
                      <td
                        className={`px-3 py-2 font-mono ${
                          r.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {r.changePct >= 0 ? "+" : ""}
                        {r.changePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
