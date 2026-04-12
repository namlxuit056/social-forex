import { Video } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Webinar & Livestream",
  description: "Webinar giao dịch forex trực tiếp — lịch phát sóng và replay.",
};

export default function WebinarPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Webinar & Livestream
        </h1>
        <p className="mt-2 text-muted-foreground">
          Phiên giao dịch trực tiếp, phân tích kỹ thuật và Q&A cộng đồng.
        </p>
      </div>

      <EmptyState
        icon={Video}
        title="Chưa có webinar nào được lên lịch"
        description="Chúng tôi đang chuẩn bị nội dung webinar đầu tiên. Theo dõi trang này để cập nhật lịch phát sóng."
        primary={{ href: "/academy", label: "Xem Academy" }}
        secondary={[
          { href: "/signals", label: "Phòng tín hiệu" },
          { href: "/calendar", label: "Lịch kinh tế" },
        ]}
      />

      <PageCtaRow heading="Trong lúc chờ đợi" items={[...pageCtas.learn, ...pageCtas.community]} />
    </div>
  );
}
