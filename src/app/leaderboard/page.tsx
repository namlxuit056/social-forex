import { prisma } from "@/lib/prisma";

export const metadata = { title: "Bảng xếp hạng" };

export const dynamic = "force-dynamic";

type Row = {
  userId: string;
  name: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number | null;
};

export default async function LeaderboardPage() {
  const closed = await prisma.signal.findMany({
    where: {
      status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] },
    },
    select: {
      authorId: true,
      status: true,
      author: { select: { name: true, email: true } },
    },
  });

  const map = new Map<
    string,
    { wins: number; losses: number; label: string }
  >();

  for (const s of closed) {
    const label = s.author?.name ?? s.author?.email ?? s.authorId;
    const cur = map.get(s.authorId) ?? { wins: 0, losses: 0, label };
    if (s.status === "CLOSED_WIN") cur.wins += 1;
    if (s.status === "CLOSED_LOSS") cur.losses += 1;
    cur.label = label;
    map.set(s.authorId, cur);
  }

  const rows: Row[] = [...map.entries()].map(([userId, v]) => {
    const total = v.wins + v.losses;
    const winRate = total > 0 ? Math.round((v.wins / total) * 1000) / 10 : null;
    return {
      userId,
      name: v.label,
      wins: v.wins,
      losses: v.losses,
      total,
      winRate,
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return (b.winRate ?? 0) - (a.winRate ?? 0);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Leaderboard</h1>
        <p className="mt-2 text-zinc-400">
          Tính từ tín hiệu đã đóng (thắng/thua). Chỉ hiển thị trader có ít nhất một
          lệnh đóng.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-zinc-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Trader</th>
              <th className="px-4 py-3">Thắng</th>
              <th className="px-4 py-3">Thua</th>
              <th className="px-4 py-3">Tỷ lệ thắng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Chưa có dữ liệu — hãy đóng vài tín hiệu ở Signal room.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.userId} className="hover:bg-zinc-900/40">
                <td className="px-4 py-3 font-mono text-zinc-500">{i + 1}</td>
                <td className="px-4 py-3 text-zinc-200">{r.name}</td>
                <td className="px-4 py-3 text-emerald-400">{r.wins}</td>
                <td className="px-4 py-3 text-rose-400">{r.losses}</td>
                <td className="px-4 py-3 font-mono">
                  {r.winRate !== null ? `${r.winRate}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
