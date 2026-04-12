import { DemoBacktest } from "@/components/backtest/demo-backtest";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Backtest",
  description: "Mô phỏng Monte Carlo cho equity curve — công cụ học tập về quản lý vốn.",
};

export default function BacktestPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Backtest — mô phỏng equity
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mô phỏng Monte Carlo giúp bạn hiểu tác động của win rate và risk/reward
          lên đường equity. Nhập thông số và quan sát kết quả qua nhiều kịch bản.
        </p>
      </div>
      <DemoBacktest />
      <Disclaimer variant="compact" />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
