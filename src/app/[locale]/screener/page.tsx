import { Filter } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketScreener } from "@/components/screener/market-screener";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";

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

function generateMockData() {
  return QUOTE_DEFINITIONS.map((q) => {
    const rsi = 30 + Math.random() * 40;
    const macd = (Math.random() - 0.5) * 0.002;
    const ema20 = q.mockMid * (1 + (Math.random() - 0.5) * 0.02);
    const ema50 = q.mockMid * (1 + (Math.random() - 0.5) * 0.03);
    const atr = q.mockMid * (0.005 + Math.random() * 0.015);
    const change24h = (Math.random() - 0.5) * q.mockMid * 0.02;

    return {
      symbol: q.symbol,
      name: q.name,
      group: q.group,
      price: q.mockMid,
      change24h,
      changePercent24h: (change24h / q.mockMid) * 100,
      rsi,
      macd,
      ema20,
      ema50,
      atr,
      volatility: atr / q.mockMid * 100,
    };
  });
}

export default async function ScreenerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("screener");

  const pairs = generateMockData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <MarketScreener pairs={pairs} />
    </div>
  );
}
