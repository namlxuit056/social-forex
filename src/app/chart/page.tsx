import { TradingViewEmbed } from "@/components/charts/tradingview-embed";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Biểu đồ",
  description: "Biểu đồ TradingView trực tiếp — phân tích kỹ thuật forex, vàng, chỉ số.",
};

export default function ChartPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Biểu đồ TradingView
        </h1>
        <p className="mt-2 text-muted-foreground">
          Phân tích kỹ thuật trực tiếp — chọn symbol, khung thời gian và indicator qua giao diện TradingView.
        </p>
      </div>
      <TradingViewEmbed />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
