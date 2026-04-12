import Link from "next/link";
import { Lock } from "lucide-react";
import { auth } from "@/auth";
import { SignalRoom } from "@/components/signals/signal-room";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Phòng tín hiệu",
  description:
    "Tín hiệu giao dịch forex từ cộng đồng — Free và VIP, entry/SL/TP và leaderboard.",
};

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

  const hasVipSignals = rows.some((s) => s.tier === "VIP");

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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Signal room
        </h1>
        <p className="mt-2 text-muted-foreground">
          Đăng tín hiệu, đóng lệnh để cập nhật leaderboard. Tín hiệu VIP chỉ hiện
          đầy đủ khi tài khoản có VIP còn hạn.
        </p>
      </div>

      {!session?.user && (
        <Card className="border-primary/20 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Đăng nhập để đăng tín hiệu</CardTitle>
            <CardDescription>
              Bạn vẫn xem được tín hiệu free; cần tài khoản để tạo và quản lý lệnh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/auth/signin?callbackUrl=/signals"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Đăng nhập
            </Link>
          </CardContent>
        </Card>
      )}

      {session?.user && !canViewVip && hasVipSignals && (
        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-amber-400" />
              <CardTitle className="text-base text-amber-200">
                Tín hiệu VIP bị khóa
              </CardTitle>
            </div>
            <CardDescription className="text-amber-200/70">
              Có {rows.filter((s) => s.tier === "VIP").length} tín hiệu VIP trên trang này.
              Nâng cấp tài khoản để xem đầy đủ entry, SL và TP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/profile"
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "border-amber-500/50 text-amber-200 hover:bg-amber-950/40",
              )}
            >
              Xem hồ sơ & nâng cấp VIP
            </Link>
          </CardContent>
        </Card>
      )}

      <SignalRoom signals={signals} showCreate={!!session?.user} />
      <Disclaimer />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.trading, ...pageCtas.community]} />
    </div>
  );
}
