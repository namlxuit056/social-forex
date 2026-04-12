import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  MessageSquare,
  Radio,
  Trophy,
  Wrench,
} from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DashboardTradingViewWidget } from "@/components/dashboard/tradingview-widget";
import { Disclaimer } from "@/components/layout/disclaimer";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Dashboard",
  description: "Bảng điều khiển cá nhân — tổng quan tín hiệu, leaderboard và công cụ.",
};

const quickLinks = [
  { href: "/quotes", title: "Tỷ giá live", desc: "Forex, vàng, chỉ số cập nhật liên tục.", icon: BarChart3 },
  { href: "/signals", title: "Phòng tín hiệu", desc: "Tín hiệu free & VIP từ cộng đồng.", icon: Radio },
  { href: "/forum", title: "Diễn đàn", desc: "Thảo luận chiến lược & tin tức.", icon: MessageSquare },
  { href: "/leaderboard", title: "Bảng xếp hạng", desc: "So sánh hiệu suất cộng đồng.", icon: Trophy },
  { href: "/academy", title: "Academy", desc: "Bài học và tài liệu giao dịch.", icon: BookOpen },
  { href: "/tools", title: "Công cụ", desc: "Position size, margin, pivot…", icon: Wrench },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const userId = session.user.id;

  const [user, activeSignals, closedSignals, unreadDm] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, vipUntil: true },
    }),
    prisma.signal.count({
      where: { authorId: userId, status: "ACTIVE" },
    }),
    prisma.signal.findMany({
      where: { authorId: userId, status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] } },
      select: { status: true },
    }),
    prisma.directMessage.count({
      where: { recipientId: userId, readAt: null },
    }),
  ]);

  const displayName = user?.name ?? user?.email ?? "Trader";
  const now = new Date();
  const vipActive = user?.vipUntil != null && user.vipUntil > now;

  const wins = closedSignals.filter((s) => s.status === "CLOSED_WIN").length;
  const losses = closedSignals.filter((s) => s.status === "CLOSED_LOSS").length;
  const totalClosed = wins + losses;
  const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 1000) / 10 : null;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Bảng điều khiển
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Xin chào, {displayName}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Tổng quan cá nhân: tín hiệu đang mở, tỷ lệ thắng, biểu đồ và lối tắt nhanh.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {vipActive ? (
            <Badge className="bg-primary/20 text-primary hover:bg-primary/25">
              VIP đang hoạt động
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border text-muted-foreground">
              Tài khoản Free
            </Badge>
          )}
          <Link
            href="/profile"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Hồ sơ
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tín hiệu đang mở</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              {activeSignals}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <Link href="/signals" className="text-primary hover:underline">
              Xem phòng tín hiệu
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lệnh đã đóng</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {totalClosed}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {wins} thắng · {losses} thua
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tỷ lệ thắng</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              {winRate !== null ? `${winRate}%` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Dựa trên tín hiệu đã đóng.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tin nhắn chưa đọc</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {unreadDm}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <Link href="/messages" className="text-primary hover:underline">
              Mở hộp thư
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">
          Biểu đồ (TradingView)
        </h2>
        <DashboardTradingViewWidget />
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-medium text-foreground">
          Lối tắt
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:ring-1 hover:ring-primary/30">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <div className="rounded-lg bg-muted p-2 ring-1 ring-border">
                    <item.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1">{item.desc}</CardDescription>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Separator />
      <Disclaimer variant="compact" />
    </div>
  );
}
