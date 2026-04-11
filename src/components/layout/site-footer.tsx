export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 px-4 py-10 text-sm text-zinc-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-medium text-zinc-400">Social Forex</p>
          <p className="mt-2 max-w-md leading-relaxed">
            Nền tảng cộng đồng và công cụ giao dịch. Thông tin chỉ mang tính học
            tập; không phải tư vấn đầu tư. Giao dịch có rủi ro.
          </p>
        </div>
        <div className="text-right md:text-left">
          <p>Monetization dự kiến: IB/affiliate, VIP signals, quảng cáo có chọn lọc.</p>
        </div>
      </div>
    </footer>
  );
}
