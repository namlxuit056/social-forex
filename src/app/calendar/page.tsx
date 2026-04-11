import { sampleCalendar, type Impact } from "@/lib/data/calendar-sample";

export const metadata = { title: "Lịch kinh tế" };

function badge(impact: Impact) {
  const map = {
    low: "bg-zinc-700 text-zinc-200",
    medium: "bg-amber-900/50 text-amber-200",
    high: "bg-rose-900/50 text-rose-200",
  };
  const label = { low: "Thấp", medium: "Trung bình", high: "Cao" };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${map[impact]}`}
    >
      {label[impact]}
    </span>
  );
}

export default function CalendarPage() {
  const sorted = [...sampleCalendar].sort(
    (a, b) =>
      new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Lịch kinh tế</h1>
        <p className="mt-2 text-zinc-400">
          Mẫu tĩnh — đồng bộ từ API (TradingEconomics, v.v.) trong sprint tới.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-zinc-500">
            <tr>
              <th className="px-4 py-3">Thời gian (UTC)</th>
              <th className="px-4 py-3">Tiền tệ</th>
              <th className="px-4 py-3">Sự kiện</th>
              <th className="px-4 py-3">Tác động</th>
              <th className="px-4 py-3">Dự báo / Trước đó</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sorted.map((ev) => (
              <tr key={ev.id} className="hover:bg-zinc-900/40">
                <td className="px-4 py-3 font-mono text-zinc-300">
                  {new Date(ev.timeUtc).toISOString().replace("T", " ").slice(0, 16)}
                </td>
                <td className="px-4 py-3 font-medium">{ev.currency}</td>
                <td className="px-4 py-3">{ev.title}</td>
                <td className="px-4 py-3">{badge(ev.impact)}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {[ev.forecast, ev.previous].filter(Boolean).join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
