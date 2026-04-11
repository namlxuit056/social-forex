export const metadata = { title: "Đối tác & Affiliate" };

export default function PartnersPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Đối tác & thu nhập</h1>
      <div className="space-y-4 text-zinc-400">
        <p>
          Website có thể chứa link giới thiệu sàn (IB/affiliate). Khi triển khai, cần
          công khai mối quan hệ và tuân thủ quy định quảng cáo tài chính tại quốc gia bạn
          nhắm tới.
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm">
          <li>IB: hoa hồng theo lot — gắn tracking UTM trên link.</li>
          <li>VIP signals: Stripe → cập nhật <code className="font-mono">vipUntil</code>.</li>
          <li>Listing phí sàn: bảng so sánh có tiêu chí cố định.</li>
        </ul>
      </div>
    </div>
  );
}
