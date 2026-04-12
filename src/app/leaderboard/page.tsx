import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { prisma } from "@/lib/prisma";
import { pageCtas } from "@/lib/page-cta-presets";
import { Trophy } from "lucide-react";

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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Leaderboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tính từ tín hiệu đã đóng (thắng/thua). Chỉ hiển thị trader có ít nhất một
          lệnh đóng.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Trophy}
            title="Chưa có dữ liệu xếp hạng"
            description="Đóng vài tín hiệu (thắng hoặc thua) trong phòng tín hiệu để xuất hiện trên bảng."
            primary={{ href: "/signals", label: "Đến phòng tín hiệu" }}
            secondary={[
              { href: "/quotes", label: "Tỷ giá" },
              { href: "/academy", label: "Academy" },
            ]}
          />
          <PageCtaRow heading="Khám phá" items={[...pageCtas.community, ...pageCtas.explore]} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Trader</th>
                  <th className="px-4 py-3">Thắng</th>
                  <th className="px-4 py-3">Thua</th>
                  <th className="px-4 py-3">Tỷ lệ thắng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={r.userId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <Link
                        href={`/u/${r.userId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-primary">{r.wins}</td>
                    <td className="px-4 py-3 text-destructive">{r.losses}</td>
                    <td className="px-4 py-3 font-mono">
                      {r.winRate !== null ? `${r.winRate}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PageCtaRow heading="Tiếp theo" items={[...pageCtas.community, ...pageCtas.trading]} />
        </>
      )}
    </div>
  );
}
