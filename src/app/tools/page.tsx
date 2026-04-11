import { TradingCalculators } from "@/components/tools/trading-calculators";

export const metadata = { title: "Công cụ tính toán" };

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Máy tính giao dịch
        </h1>
        <p className="mt-2 text-zinc-400">
          Position size, pivot classic, ước lượng margin. Điều chỉnh theo quy ước
          từng sàn khi go-live.
        </p>
      </div>
      <TradingCalculators />
    </div>
  );
}
