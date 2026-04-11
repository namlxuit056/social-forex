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
    if (v === null) return "bg-zinc-800";
    if (v > 0.55) return "bg-emerald-900/70";
    if (v < 0.45) return "bg-rose-900/60";
    return "bg-zinc-800/80";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Heatmap (demo)</h1>
        <p className="mt-2 text-zinc-400">
          Ma trận ngẫu nhiên để demo UI. Thực tế: tính % thay đổi theo phiên từ
          dữ liệu giá.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-1" />
              {currencies.map((c) => (
                <th key={c} className="p-1 font-mono text-zinc-500">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.base}>
                <td className="p-1 font-mono text-zinc-500">{row.base}</td>
                {row.values.map((v, i) => (
                  <td
                    key={currencies[i]}
                    className={`h-10 w-10 border border-zinc-900 p-0 text-center font-mono ${cellColor(v)}`}
                  >
                    {v === null ? null : v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
