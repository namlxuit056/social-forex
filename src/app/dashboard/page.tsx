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
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dashboard" };

const quickLinks = [
  {
    href: "/quotes",
    title: "Tỷ giá live",
    desc: "Yahoo Finance + fallback mock.",
    icon: BarChart3,
  },
  {
    href: "/signals",
    title: "Phòng tín hiệu",
    desc: "Tín hiệu free & VIP theo tier.",
    icon: Radio,
  },
  {
    href: "/forum",
    title: "Diễn đàn",
    desc: "Thảo luận chiến lược & tin tức.",
    icon: MessageSquare,
  },
  {
    href: "/leaderboard",
    title: "Bảng xếp hạng",
    desc: "So sánh hiệu suất cộng đồng.",
    icon: Trophy,
  },
  {
    href: "/academy",
    title: "Academy",
    desc: "Bài học và tài liệu nền tảng.",
    icon: BookOpen,
  },
  {
    href: "/tools",
    title: "Công cụ",
    desc: "Position size, margin, pivot…",
    icon: Wrench,
  },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, vipUntil: true },
  });

  const displayName = user?.name ?? user?.email ?? "Trader";
  const now = new Date();
  const vipActive = user?.vipUntil != null && user.vipUntil > now;

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
            Tổng quan nhanh: biểu đồ TradingView embed, thẻ thống kê minh họa và
            lối tắt tới công cụ. Tỷ giá live: Yahoo Finance (xem trang Tỷ giá).
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
            <CardDescription>Watchlist (demo)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              12 cặp
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            EUR/USD, GBP/USD, XAU/USD…
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tín hiệu đang mở</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              —
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Xem phòng tín hiệu để cập nhật.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>P/L tuần (demo)</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-chart-1">
              +0.0%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Không phải tư vấn đầu tư.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cảnh báo rủi ro</CardDescription>
            <CardTitle className="text-base text-chart-2">Cao</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Giao dịch margin có thể mất vốn.
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">
          Biểu đồ nhanh (TradingView)
        </h2>
        <p className="text-sm text-muted-foreground">
          Widget nhúng — đổi mã qua biến môi trường{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NEXT_PUBLIC_TRADINGVIEW_SYMBOL
          </code>
          .
        </p>
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
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Separator />

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Social Forex cung cấp công cụ và nội dung mang tính giáo dục. Không phải
        dịch vụ tư vấn đầu tư hay lời khuyên tài chính cá nhân. Bạn chịu trách
        nhiệm với mọi quyết định giao dịch.
      </p>
    </div>
  );
}
