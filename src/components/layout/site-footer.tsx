import Link from "next/link";

const footerLinks = [
  { href: "/quotes", label: "Tỷ giá" },
  { href: "/calendar", label: "Lịch kinh tế" },
  { href: "/forum", label: "Diễn đàn" },
  { href: "/signals", label: "Tín hiệu" },
  { href: "/academy", label: "Academy" },
  { href: "/tools", label: "Công cụ" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-10 text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-medium text-foreground/90">Social Forex</p>
            <p className="mt-2 max-w-md leading-relaxed">
              Nền tảng cộng đồng và công cụ giao dịch forex.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {footerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground/80">
          <p className="font-medium text-muted-foreground">
            Tuyên bố miễn trừ trách nhiệm
          </p>
          <p className="mt-1">
            Tất cả nội dung trên Social Forex (bao gồm tín hiệu, bài viết,
            phân tích kỹ thuật và tài liệu academy) chỉ mang tính chất tham
            khảo và giáo dục, <strong>không phải tư vấn đầu tư</strong>. Giao
            dịch forex và các sản phẩm tài chính phái sinh có rủi ro cao, bạn
            có thể mất toàn bộ vốn. Hãy cân nhắc kỹ trước khi giao dịch và
            tham khảo ý kiến chuyên gia tài chính có giấy phép khi cần.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Social Forex. Mọi quyền được bảo lưu.
        </p>
      </div>
    </footer>
  );
}
