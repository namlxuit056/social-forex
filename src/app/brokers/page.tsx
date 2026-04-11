const brokers = [
  { name: "Broker A (mẫu)", spread: "0.8–1.2", regulation: "FCA (ví dụ)", note: "Ý kiến cá nhân, không quảng cáo." },
  { name: "Broker B (mẫu)", spread: "0.5–1.0", regulation: "ASIC (ví dụ)", note: "Cập nhật spread theo tài khoản." },
];

export const metadata = { title: "So sánh sàn" };

export default function BrokersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Review & so sánh sàn</h1>
        <p className="mt-2 text-zinc-400">
          Bảng minh họa — thay dữ liệu thật và ghi rõ quan hệ affiliate nếu có link IB.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-zinc-500">
            <tr>
              <th className="px-4 py-3">Sàn</th>
              <th className="px-4 py-3">Spread (ví dụ)</th>
              <th className="px-4 py-3">Quy định</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {brokers.map((b) => (
              <tr key={b.name} className="hover:bg-zinc-900/40">
                <td className="px-4 py-3 font-medium text-zinc-100">{b.name}</td>
                <td className="px-4 py-3">{b.spread}</td>
                <td className="px-4 py-3">{b.regulation}</td>
                <td className="px-4 py-3 text-zinc-500">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
