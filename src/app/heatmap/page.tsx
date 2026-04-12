import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";

export const metadata = {
  title: "Heatmap",
  description: "Ma trận sức mạnh tiền tệ tính từ tỷ giá live.",
};

export const dynamic = "force-dynamic";

const currencies = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD"];

function buildStrengthMatrix(
  quotes: { symbol: string; bid: number; ask: number; changePct: number }[],
) {
  const changeMap = new Map<string, number>();
  for (const q of quotes) {
    changeMap.set(q.symbol.replace("/", ""), q.changePct);
  }

  const strength = new Map<string, number>();
  for (const c of currencies) {
    let total = 0;
    let count = 0;
    for (const other of currencies) {
      if (c === other) continue;
      const pair = `${c}${other}`;
      const inv = `${other}${c}`;
      if (changeMap.has(pair)) {
        total += changeMap.get(pair)!;
        count++;
      } else if (changeMap.has(inv)) {
        total -= changeMap.get(inv)!;
        count++;
      }
    }
    strength.set(c, count > 0 ? total / count : 0);
  }

  return currencies.map((base) => ({
    base,
    values: currencies.map((quote) => {
      if (base === quote) return null;
      const bStr = strength.get(base) ?? 0;
      const qStr = strength.get(quote) ?? 0;
      const diff = bStr - qStr;
      return Math.round(Math.max(0, Math.min(1, 0.5 + diff * 5)) * 100) / 100;
    }),
  }));
}

function cellColor(v: number | null) {
  if (v === null) return "bg-muted";
  if (v > 0.6) return "bg-primary/40";
  if (v > 0.55) return "bg-primary/25";
  if (v < 0.4) return "bg-destructive/40";
  if (v < 0.45) return "bg-destructive/25";
  return "bg-muted/80";
}

export default async function HeatmapPage() {
  const { quotes: allQuotes, source } = await resolveQuotes();
  const grid = buildStrengthMatrix(allQuotes);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Heatmap — sức mạnh tiền tệ
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sức mạnh tương đối giữa 8 đồng tiền chính, tính từ dữ liệu tỷ giá{" "}
          {source === "yahoo" ? "Yahoo Finance" : source === "mock" ? "mô phỏng" : source}.
          Giá trị gần 1 = base mạnh, gần 0 = base yếu.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border p-4">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {currencies.map((c) => (
                <th key={c} className="p-1 font-mono text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.base}>
                <td className="p-1 font-mono font-medium text-muted-foreground">{row.base}</td>
                {row.values.map((v, i) => (
                  <td
                    key={currencies[i]}
                    className={`h-10 w-10 border border-border p-0 text-center font-mono ${cellColor(v)}`}
                  >
                    {v === null ? "" : v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Nguồn: {source === "yahoo" ? "Yahoo Finance (live)" : source === "mock" ? "Dữ liệu mô phỏng" : source}
      </p>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
