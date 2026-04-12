import { DemoBacktest } from "@/components/backtest/demo-backtest";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = { title: "Backtest" };

export default function BacktestPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Backtest (mô phỏng)
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Demo Monte Carlo đơn giản — không dùng OHLC thật. Backtest chuyên
          nghiệp cần dữ liệu lịch sử + engine riêng.
        </p>
      </div>
      <DemoBacktest />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
