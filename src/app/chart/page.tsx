import { TradingViewEmbed } from "@/components/charts/tradingview-embed";

export const metadata = { title: "Biểu đồ" };

export default function ChartPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Biểu đồ TradingView</h1>
        <p className="mt-2 text-zinc-400">
          Widget nhúng — đổi symbol qua UI TradingView. Có thể chuyển sang
          Charting Library khi có license.
        </p>
      </div>
      <TradingViewEmbed />
    </div>
  );
}
