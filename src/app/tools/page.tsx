import { TradingCalculators } from "@/components/tools/trading-calculators";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Công cụ tính toán",
  description:
    "Máy tính position size, margin, pivot point và pip value cho trader forex.",
};

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Máy tính giao dịch
        </h1>
        <p className="mt-2 text-muted-foreground">
          Position size, pivot classic, ước lượng margin. Điều chỉnh theo quy
          ước từng sàn khi go-live.
        </p>
      </div>
      <TradingCalculators />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.explore, ...pageCtas.trading]} />
    </div>
  );
}
