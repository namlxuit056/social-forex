import { LiveQuotesTable } from "@/components/quotes/live-quotes-table";
import { buildQuotes } from "@/lib/quotes/mock";

export const metadata = { title: "Tỷ giá live" };

export default function QuotesPage() {
  const initial = buildQuotes(0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Bảng tỷ giá (demo)</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          Dữ liệu giả lập để demo UI và polling. Thay endpoint bằng WebSocket hoặc
          REST từ nhà cung cấp dữ liệu đã ký hợp đồng.
        </p>
      </div>
      <LiveQuotesTable initial={initial} />
    </div>
  );
}
