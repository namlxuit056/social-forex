import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

const pairs = [
  { symbol: "EURUSD", long: 58, short: 42 },
  { symbol: "GBPUSD", long: 45, short: 55 },
  { symbol: "USDJPY", long: 62, short: 38 },
  { symbol: "XAUUSD", long: 71, short: 29 },
];

export const metadata = { title: "Sentiment" };

export default function SentimentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Tâm lý thị trường
        </h1>
        <p className="mt-2 text-muted-foreground">
          Số liệu minh họa — nguồn thật thường từ broker aggregate hoặc API
          chuyên dụng.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {pairs.map((p) => (
          <div
            key={p.symbol}
            className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
          >
            <div className="flex justify-between font-mono text-sm">
              <span className="text-foreground">{p.symbol}</span>
              <span className="text-muted-foreground">Long / Short %</span>
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-primary"
                style={{ width: `${p.long}%` }}
                title={`Long ${p.long}%`}
              />
              <div
                className="bg-destructive/80"
                style={{ width: `${p.short}%` }}
                title={`Short ${p.short}%`}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span className="text-primary">Long {p.long}%</span>
              <span className="text-destructive">Short {p.short}%</span>
            </div>
          </div>
        ))}
      </div>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.community]} />
    </div>
  );
}
