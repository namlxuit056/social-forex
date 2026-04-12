import { TradingViewEmbed } from "@/components/charts/tradingview-embed";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = { title: "Biểu đồ" };

export default function ChartPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Biểu đồ TradingView
        </h1>
        <p className="mt-2 text-muted-foreground">
          Widget nhúng — đổi symbol qua UI TradingView. Có thể chuyển sang
          Charting Library khi có license.
        </p>
      </div>
      <TradingViewEmbed />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
