import { LiveQuotesTable } from "@/components/quotes/live-quotes-table";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Tỷ giá live",
  description:
    "Bảng tỷ giá forex, vàng, chỉ số cập nhật liên tục từ Yahoo Finance với fallback tự động.",
};

export default async function QuotesPage() {
  const initial = await resolveQuotes();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Bảng tỷ giá
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Tỷ giá forex, vàng, chỉ số và crypto cập nhật liên tục.
          Dữ liệu được tự động làm mới mỗi 15 giây.
        </p>
      </div>
      <LiveQuotesTable
        initial={initial.quotes}
        initialSource={initial.source}
        initialWarning={initial.warning}
        initialUpdatedAt={initial.updatedAt}
      />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
