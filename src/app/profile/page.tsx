import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

export const metadata = { title: "Hồ sơ" };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p className="text-zinc-400">Đăng nhập để xem hồ sơ và follow.</p>
        <Link
          href="/auth/signin"
          className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-500"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vipUntil: true },
  });
  const vip = isVipActive(dbUser?.vipUntil);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Hồ sơ</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-medium text-zinc-200">Tài khoản</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="text-zinc-500">Tên</dt>
            <dd>{session.user.name ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-zinc-500">Email</dt>
            <dd>{session.user.email ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-zinc-500">ID</dt>
            <dd className="font-mono text-xs text-zinc-400">{session.user.id}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-zinc-500">VIP</dt>
            <dd className={vip ? "text-emerald-400" : "text-zinc-400"}>
              {vip
                ? `Đang hoạt động đến ${dbUser?.vipUntil?.toLocaleString("vi-VN")}`
                : "Chưa kích hoạt"}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-zinc-500">
          Follow và tin nhắn — sẽ bổ sung. Thanh toán VIP (Stripe) gắn vào{" "}
          <code className="font-mono">vipUntil</code>.
        </p>
      </div>
    </div>
  );
}
