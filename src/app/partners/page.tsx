import Link from "next/link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = { title: "Đối tác & Affiliate" };

export default function PartnersPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Đối tác & thu nhập
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mô hình doanh thu dự kiến và lưu ý pháp lý — không phải đề nghị hợp tác
          cụ thể.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kênh monetization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            Website có thể chứa link giới thiệu sàn (IB/affiliate). Khi triển
            khai, cần công khai mối quan hệ và tuân thủ quy định quảng cáo tài
            chính tại quốc gia bạn nhắm tới.
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>IB: hoa hồng theo lot — gắn tracking UTM trên link.</li>
            <li>
              VIP signals: Stripe → cập nhật{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground/90">
                vipUntil
              </code>
              .
            </li>
            <li>Listing phí sàn: bảng so sánh có tiêu chí cố định.</li>
          </ul>
          <p className="text-sm">
            Xem thêm:{" "}
            <Link href="/brokers" className="font-medium text-primary hover:underline">
              So sánh sàn
            </Link>
            ,{" "}
            <Link href="/resources" className="font-medium text-primary hover:underline">
              tài liệu
            </Link>
            .
          </p>
        </CardContent>
      </Card>
      <PageCtaRow heading="Điều hướng nhanh" items={[...pageCtas.risk, ...pageCtas.learn]} />
    </div>
  );
}
