import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { pageCtas } from "@/lib/page-cta-presets";

const brokers = [
  {
    name: "IC Markets",
    spread: "0.0–0.6",
    regulation: "ASIC, CySEC, SCB",
    minDeposit: "$200",
    note: "Raw spread, phổ biến cho scalping/EA.",
  },
  {
    name: "Exness",
    spread: "0.0–1.0",
    regulation: "FCA, CySEC, FSA",
    minDeposit: "$1",
    note: "Nạp/rút nhanh, phổ biến tại Việt Nam.",
  },
  {
    name: "XM",
    spread: "0.6–1.6",
    regulation: "CySEC, ASIC, IFSC",
    minDeposit: "$5",
    note: "Bonus đa dạng, hỗ trợ tiếng Việt.",
  },
  {
    name: "Pepperstone",
    spread: "0.0–0.7",
    regulation: "FCA, ASIC, CySEC, DFSA",
    minDeposit: "$200",
    note: "Tốc độ khớp lệnh nhanh, TradingView tích hợp.",
  },
  {
    name: "FXTM (ForexTime)",
    spread: "0.5–1.5",
    regulation: "FCA, CySEC, FSCA",
    minDeposit: "$10",
    note: "Copy trading, đa dạng tài khoản.",
  },
];

export const metadata = {
  title: "So sánh sàn",
  description: "So sánh sàn forex uy tín: spread, quy định, nạp tối thiểu và ghi chú cho trader Việt.",
};

export default function BrokersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          So sánh sàn Forex
        </h1>
        <p className="mt-2 text-muted-foreground">
          Thông tin tham khảo dựa trên dữ liệu công khai từ website các sàn.
          Spread là giá trị trung bình, có thể thay đổi theo thị trường và loại tài khoản.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Sàn</th>
              <th className="px-4 py-3">Spread (pip)</th>
              <th className="px-4 py-3">Quy định</th>
              <th className="px-4 py-3">Nạp tối thiểu</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {brokers.map((b) => (
              <tr key={b.name} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{b.name}</td>
                <td className="px-4 py-3 font-mono">{b.spread}</td>
                <td className="px-4 py-3">{b.regulation}</td>
                <td className="px-4 py-3 font-mono">{b.minDeposit}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Disclaimer variant="compact" />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.risk, ...pageCtas.explore]} />
    </div>
  );
}
