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
          Nguồn mặc định: Yahoo Finance qua{" "}
          <code className="rounded bg-muted px-1 font-mono text-sm">yahoo-finance2</code>
          . Có thể đặt{" "}
          <code className="rounded bg-muted px-1 font-mono text-sm">QUOTES_PROVIDER=mock</code>{" "}
          để chỉ dùng dữ liệu mô phỏng. Khi API lỗi hoặc rate limit, hệ thống tự
          fallback sang mock và hiển thị cảnh báo.
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
