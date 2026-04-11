import { DemoBacktest } from "@/components/backtest/demo-backtest";

export const metadata = { title: "Backtest" };

export default function BacktestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Backtest (mô phỏng)</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Demo Monte Carlo đơn giản — không dùng OHLC thật. Backtest chuyên nghiệm cần
          dữ liệu lịch sử + engine riêng.
        </p>
      </div>
      <DemoBacktest />
    </div>
  );
}
