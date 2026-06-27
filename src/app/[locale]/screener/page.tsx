import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { MarketScreener } from "@/components/screener/market-screener";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("screener");
  return { title: t("title"), description: t("description") };
}

async function fetchScreenerData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/screener`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json();
    return raw.map((p) => ({
      ...p,
      price: p.price ?? 0,
      changePercent: p.changePercent ?? p.changePercent24h ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function ScreenerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("screener");

  const [pairs, session] = await Promise.all([
    fetchScreenerData(),
    auth(),
  ]);

  const isLoggedIn = !!session?.user?.id;
  let isVip = false;
  let initialFavorites: string[] = [];

  if (isLoggedIn) {
    const [dbUser, favs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session!.user!.id },
        select: { vipUntil: true },
      }),
      prisma.userFavoriteSymbol.findMany({
        where: { userId: session!.user!.id },
        select: { symbol: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    isVip = isVipActive(dbUser?.vipUntil);
    initialFavorites = favs.map((f) => f.symbol);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <MarketScreener
        pairs={pairs}
        isLoggedIn={isLoggedIn}
        isVip={isVip}
        initialFavorites={initialFavorites}
      />
    </div>
  );
}
