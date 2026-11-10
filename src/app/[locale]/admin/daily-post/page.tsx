import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { vnDay } from "@/lib/marketing/daily-post-format";
import { prisma } from "@/lib/prisma";
import { DailyPostPanel } from "./daily-post-panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bài đăng mỗi ngày" };

export default async function AdminDailyPostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") redirect("/");

  const posts = await prisma.dailyMarketPost.findMany({
    orderBy: { day: "desc" },
    take: 14,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bài đăng mỗi ngày"
        description="Nhận định vàng do AI viết mỗi sáng: tự đăng kênh Telegram, bản Facebook và kịch bản video để copy đăng tay. Link trong bài có UTM để đo lượt về theo kênh."
      />
      <DailyPostPanel
        today={vnDay(new Date())}
        posts={posts.map((p) => ({
          id: p.id,
          day: p.day,
          bias: p.bias,
          headline: p.headline,
          telegramText: p.telegramText,
          facebookText: p.facebookText,
          videoScript: p.videoScript,
          chartImageUrl: p.chartImageUrl,
          telegramSentAt: p.telegramSentAt?.toISOString() ?? null,
          telegramError: p.telegramError,
        }))}
      />
    </div>
  );
}
