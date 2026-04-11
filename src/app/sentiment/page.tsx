const pairs = [
  { symbol: "EURUSD", long: 58, short: 42 },
  { symbol: "GBPUSD", long: 45, short: 55 },
  { symbol: "USDJPY", long: 62, short: 38 },
  { symbol: "XAUUSD", long: 71, short: 29 },
];

export const metadata = { title: "Sentiment" };

export default function SentimentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Tâm lý thị trường</h1>
        <p className="mt-2 text-zinc-400">
          Số liệu minh họa — nguồn thật thường từ broker aggregate hoặc API
          chuyên dụng.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pairs.map((p) => (
          <div
            key={p.symbol}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <div className="flex justify-between font-mono text-sm">
              <span className="text-white">{p.symbol}</span>
              <span className="text-zinc-500">Long / Short %</span>
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="bg-emerald-500"
                style={{ width: `${p.long}%` }}
                title={`Long ${p.long}%`}
              />
              <div
                className="bg-rose-500"
                style={{ width: `${p.short}%` }}
                title={`Short ${p.short}%`}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span className="text-emerald-400">Long {p.long}%</span>
              <span className="text-rose-400">Short {p.short}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
