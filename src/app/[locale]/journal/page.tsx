import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignupPrompt } from "@/components/analytics/signup-prompt";
import { EmptyState } from "@/components/layout/empty-state";
import { JournalStats } from "./journal-stats";
import { JournalTable } from "./journal-table";
import { JournalForm } from "./journal-form";
import { JournalLivePanel, type LivePosition } from "./journal-live-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("journal");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("journal");

  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <EmptyState
          title={t("loginRequired")}
          description={t("loginHint")}
          primary={{ href: "/auth/signin?callbackUrl=/journal", label: t("loginRequired") }}
        />
        <SignupPrompt
          surface="journal"
          title={t("signupPromptTitle")}
          description={t("signupPromptDesc")}
          ctaLabel={t("signupPromptCta")}
          href="/auth/register?callbackUrl=/journal"
        />
      </div>
    );
  }

  const [trades, mt5Connection] = await Promise.all([
    prisma.tradeJournal.findMany({
      where: { userId: session.user.id },
      orderBy: { openedAt: "desc" },
      take: 200,
    }),
    prisma.mt5Connection.findFirst({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  const closed = trades.filter((t) => t.result !== "PENDING");
  const wins = closed.filter((t) => t.result === "WIN").length;
  const losses = closed.filter((t) => t.result === "LOSS").length;
  const breakevens = closed.filter((t) => t.result === "BREAKEVEN").length;
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const avgPnl = closed.length > 0 ? totalPnl / closed.length : 0;
  const winRate =
    wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : 0;

  const livePositions: LivePosition[] = [];
  if (mt5Connection && Array.isArray(mt5Connection.lastPositions)) {
    for (const p of mt5Connection.lastPositions as Record<string, unknown>[]) {
      const ticket = p.ticket != null ? String(p.ticket) : null;
      const symbol = typeof p.symbol === "string" ? p.symbol : null;
      const type = typeof p.type === "string" ? p.type : null;
      if (!ticket || !symbol || !type) continue;
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      livePositions.push({
        ticket,
        symbol,
        type,
        volume: num(p.volume),
        priceOpen: num(p.priceOpen),
        priceCurrent: num(p.priceCurrent),
        stopLoss: num(p.stopLoss),
        takeProfit: num(p.takeProfit),
        profit: num(p.profit),
      });
    }
  }

  const mt5Account = mt5Connection
    ? {
        balance: mt5Connection.balance,
        equity: mt5Connection.equity,
        margin: mt5Connection.margin,
        freeMargin: mt5Connection.freeMargin,
        currency: mt5Connection.accountCurrency,
        openPositions: mt5Connection.openPositions,
        lastSeenAt: mt5Connection.lastSeenAt?.toISOString() ?? null,
      }
    : null;

  const serialized = trades.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    direction: t.direction,
    entry: t.entry,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    exitPrice: t.exitPrice,
    lotSize: t.lotSize,
    result: t.result,
    pnl: t.pnl,
    notes: t.notes,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <JournalStats
        total={trades.length}
        wins={wins}
        losses={losses}
        breakevens={breakevens}
        winRate={winRate}
        totalPnl={totalPnl}
        avgPnl={avgPnl}
      />

      <JournalLivePanel
        account={mt5Account}
        positions={livePositions}
        locale={locale}
      />

      <JournalForm />

      {trades.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : (
        <JournalTable trades={serialized} locale={locale} />
      )}
    </div>
  );
}
