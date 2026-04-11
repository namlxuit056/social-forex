import Link from "next/link";
import { auth } from "@/auth";
import { SignalRoom } from "@/components/signals/signal-room";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

export const metadata = { title: "Phòng tín hiệu" };

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { vipUntil: true },
      })
    : null;

  const canViewVip = isVipActive(dbUser?.vipUntil);

  const rows = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  const signals = rows.map((s) => {
    const masked = s.tier === "VIP" && !canViewVip;
    return {
      id: s.id,
      symbol: s.symbol,
      direction: s.direction,
      entry: masked ? null : s.entry,
      stopLoss: masked ? null : s.stopLoss,
      takeProfit: masked ? null : s.takeProfit,
      tier: s.tier,
      status: s.status,
      notes: masked ? null : s.notes,
      masked,
      authorLabel: s.author?.name ?? s.author?.email ?? "—",
      isAuthor: userId === s.authorId,
      createdAt: s.createdAt.toISOString(),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Signal room</h1>
        <p className="mt-2 text-zinc-400">
          Đăng tín hiệu, đóng lệnh để cập nhật leaderboard. Tín hiệu VIP chỉ hiện
          đầy đủ khi tài khoản có VIP còn hạn.
        </p>
      </div>

      {!session?.user && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400">
          <Link href="/auth/signin" className="text-emerald-500 hover:underline">
            Đăng nhập
          </Link>{" "}
          để đăng tín hiệu và quản lý lệnh của bạn.
        </p>
      )}

      <SignalRoom signals={signals} showCreate={!!session?.user} />
    </div>
  );
}
