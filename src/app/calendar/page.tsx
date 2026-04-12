import { EconomicCalendar } from "@/components/calendar/economic-calendar";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Lịch kinh tế",
  description:
    "Sự kiện kinh tế quan trọng (CPI, NFP, lãi suất) — hỗ trợ toggle múi giờ VN/UTC.",
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const cal = await resolveCalendarEvents();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Lịch kinh tế
        </h1>
        <p className="mt-2 text-muted-foreground">
          Đồng bộ từ Financial Modeling Prep khi có{" "}
          <code className="rounded bg-muted px-1 font-mono text-sm">
            FMP_API_KEY
          </code>
          . Cache DB (TTL mặc định 45 phút) để giảm gọi API. Toggle VN/UTC; cột
          trạng thái cập nhật theo giờ hiện tại (cửa sổ “live” ~90 phút sau giờ
          sự kiện).
        </p>
      </div>
      <EconomicCalendar
        events={cal.events}
        source={cal.source}
        warning={cal.warning}
        syncedAt={cal.syncedAt}
      />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.explore]} />
    </div>
  );
}
