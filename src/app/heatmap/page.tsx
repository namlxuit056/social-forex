import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

const currencies = ["USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "NZD"];

/** Giá trị cố định (demo) — không dùng Math.random để tránh lệch SSR. */
function demoStrength(i: number, j: number) {
  if (i === j) return null;
  const n = ((i * 7 + j * 11) % 37) / 37;
  return Math.round(n * 100) / 100;
}

export const metadata = { title: "Heatmap" };

export default function HeatmapPage() {
  const grid = currencies.map((base, i) => ({
    base,
    values: currencies.map((_, j) => demoStrength(i, j)),
  }));

  function cellColor(v: number | null) {
    if (v === null) return "bg-muted";
    if (v > 0.55) return "bg-primary/35";
    if (v < 0.45) return "bg-destructive/35";
    return "bg-muted/80";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Heatmap (demo)
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ma trận cố định để demo UI. Thực tế: tính % thay đổi theo phiên từ
          dữ liệu giá.
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
                <td className="p-1 font-mono text-muted-foreground">{row.base}</td>
                {row.values.map((v, i) => (
                  <td
                    key={currencies[i]}
                    className={`h-10 w-10 border border-border p-0 text-center font-mono ${cellColor(v)}`}
                  >
                    {v === null ? null : v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
