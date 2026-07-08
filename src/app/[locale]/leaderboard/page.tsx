import { ShieldCheck, Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { StreakBadge } from "@/components/signals/streak-badge";
import { CopyTradeButton } from "@/components/copy-trade/copy-trade-button";
import { FollowButton } from "@/components/social/follow-button";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { getLevel } from "@/lib/xp";
import { auth } from "@/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

function getSince(tf: string): Date | undefined {
  const now = Date.now();
  if (tf === "30d") return new Date(now - 30 * 86400_000);
  if (tf === "90d") return new Date(now - 90 * 86400_000);
  return undefined;
}

type Row = {
  userId: string;
  name: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number | null;
  profitFactor: number | null;
  hasMt5: boolean;
  streakSignal: number;
  xp: number;
};

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ timeframe?: string; sortBy?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");
  const tCommon = await getTranslations("common");
  const ctaEmpty = await pageCtaItems("community", "explore");
  const ctaTable = await pageCtaItems("community", "trading");

  const tf = ["30d", "90d"].includes(resolvedSearchParams?.timeframe ?? "")
    ? resolvedSearchParams!.timeframe
    : "all";

  const sortBy = resolvedSearchParams?.sortBy === "xp" ? "xp" : "pf";

  const since = getSince(tf ?? "all");

  const closed = await prisma.signal.findMany({
    where: {
      status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] },
      ...(since ? { closedAt: { gte: since } } : {}),
    },
    select: {
      authorId: true,
      status: true,
      author: { select: { name: true, email: true } },
    },
  });

  const map = new Map<string, { wins: number; losses: number; label: string }>();
  for (const s of closed) {
    const label = s.author?.name ?? s.author?.email ?? s.authorId;
    const cur = map.get(s.authorId) ?? { wins: 0, losses: 0, label };
    if (s.status === "CLOSED_WIN") cur.wins += 1;
    if (s.status === "CLOSED_LOSS") cur.losses += 1;
    cur.label = label;
    map.set(s.authorId, cur);
  }

  const userIds = [...map.keys()];

  const session = await auth();
  const copyTradeMap = new Map<
    string,
    {
      token: string;
      mode: "LOT" | "PERCENT";
      fixedLot: number | null;
      riskPercent: number | null;
      xauusdLot: number | null;
      btcusdLot: number | null;
    }
  >();
  const followingSet = new Set<string>();
  if (session?.user?.id) {
    const [copyTrades, follows] = await Promise.all([
      prisma.copyTrade.findMany({
        where: { followerId: session.user.id, providerId: { in: userIds }, isActive: true },
        select: {
          providerId: true,
          token: true,
          mode: true,
          fixedLot: true,
          riskPercent: true,
          xauusdLot: true,
          btcusdLot: true,
        },
      }),
      prisma.userFollow.findMany({
        where: { followerId: session.user.id, followingId: { in: userIds } },
        select: { followingId: true },
      }),
    ]);
    for (const ct of copyTrades)
      copyTradeMap.set(ct.providerId, {
        token: ct.token,
        mode: ct.mode,
        fixedLot: ct.fixedLot,
        riskPercent: ct.riskPercent,
        xauusdLot: ct.xauusdLot,
        btcusdLot: ct.btcusdLot,
      });
    for (const f of follows) followingSet.add(f.followingId);
  }

  // Query profit factor data from TradeJournal
  const journalRows = await prisma.tradeJournal.findMany({
    where: {
      userId: { in: userIds },
      result: { in: ["WIN", "LOSS"] },
      pnl: { not: null },
      ...(since ? { closedAt: { gte: since } } : {}),
    },
    select: { userId: true, result: true, pnl: true },
  });

  const pfMap = new Map<string, { grossWin: number; grossLoss: number }>();
  for (const row of journalRows) {
    const cur = pfMap.get(row.userId) ?? { grossWin: 0, grossLoss: 0 };
    if (row.result === "WIN") cur.grossWin += row.pnl ?? 0;
    else cur.grossLoss += Math.abs(row.pnl ?? 0);
    pfMap.set(row.userId, cur);
  }

  // Query MT5 connections
  const mt5Rows = await prisma.mt5Connection.findMany({
    where: { userId: { in: userIds }, revokedAt: null },
    select: { userId: true },
  });
  const mt5Set = new Set(mt5Rows.map((r) => r.userId));

  const streakRows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, streakSignal: true, xp: true },
  });
  const streakSignalMap = new Map(streakRows.map((r) => [r.id, r.streakSignal]));
  const xpMap = new Map(streakRows.map((r) => [r.id, r.xp]));

  const rows: Row[] = [...map.entries()]
    .map(([userId, v]) => {
      const total = v.wins + v.losses;
      const winRate = total > 0 ? Math.round((v.wins / total) * 1000) / 10 : null;
      const pfData = pfMap.get(userId);
      const profitFactor =
        pfData && pfData.grossLoss > 0
          ? pfData.grossWin / pfData.grossLoss
          : pfData && pfData.grossWin > 0
            ? null
            : null;
      return {
        userId,
        name: v.label,
        wins: v.wins,
        losses: v.losses,
        total,
        winRate,
        profitFactor,
        hasMt5: mt5Set.has(userId),
        streakSignal: streakSignalMap.get(userId) ?? 0,
        xp: xpMap.get(userId) ?? 0,
      };
    })
    .filter((r) => r.total >= 3);

  rows.sort((a, b) => {
    if (sortBy === "xp") {
      if (b.xp !== a.xp) return b.xp - a.xp;
      const aPF = a.profitFactor ?? -Infinity;
      const bPF = b.profitFactor ?? -Infinity;
      if (bPF !== aPF) return bPF - aPF;
      return (b.winRate ?? 0) - (a.winRate ?? 0);
    }
    const aPF = a.profitFactor ?? -Infinity;
    const bPF = b.profitFactor ?? -Infinity;
    if (bPF !== aPF) return bPF - aPF;
    if ((b.winRate ?? 0) !== (a.winRate ?? 0)) return (b.winRate ?? 0) - (a.winRate ?? 0);
    return b.total - a.total;
  });

  const filters = [
    { key: "30d", label: t("filter30d") },
    { key: "90d", label: t("filter90d") },
    { key: "all", label: t("filterAll") },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const isActive = tf === f.key;
            return (
              <Link
                key={f.key}
                href={`/leaderboard?timeframe=${f.key}${sortBy !== "pf" ? `&sortBy=${sortBy}` : ""}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <span className="text-muted-foreground">·</span>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "pf", label: t("sortByPf") },
            { key: "xp", label: t("sortByXp") },
          ] as const).map((s) => {
            const isActive = sortBy === s.key;
            return (
              <Link
                key={s.key}
                href={`/leaderboard?timeframe=${tf}${s.key !== "pf" ? `&sortBy=${s.key}` : ""}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Trophy}
            title={t("empty")}
            description={t("emptyHint")}
            primary={{ href: "/signals", label: t("goToSignals") }}
          />
          <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaEmpty} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-160 text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("rank")}</th>
                  <th className="px-4 py-3">{t("trader")}</th>
                  <th className="px-4 py-3">{t("wins")}</th>
                  <th className="px-4 py-3">{t("losses")}</th>
                  <th className="px-4 py-3">{t("winRate")}</th>
                  <th className="px-4 py-3">{t("profitFactor")}</th>
                  <th className="px-4 py-3">{t("mt5Verified")}</th>
                  <th className="px-4 py-3">Streak</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={r.userId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 text-foreground">
                      <Link href={`/u/${r.userId}`} className="font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-primary">{r.wins}</td>
                    <td className="px-4 py-3 text-destructive">{r.losses}</td>
                    <td className="px-4 py-3 font-mono">{r.winRate !== null ? `${r.winRate}%` : "—"}</td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        r.profitFactor === null
                          ? "text-muted-foreground"
                          : r.profitFactor >= 1
                            ? "text-emerald-400"
                            : "text-red-400"
                      }`}
                    >
                      {r.profitFactor !== null ? r.profitFactor.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.hasMt5 ? (
                        <ShieldCheck className="size-4 text-emerald-400" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.streakSignal >= 1 ? (
                        <StreakBadge count={r.streakSignal} type="signal" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-primary">{r.xp}</span>
                        <span className="text-xs text-muted-foreground">Lv.{getLevel(r.xp)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {session?.user?.id !== r.userId && (
                        <div className="flex items-center gap-2">
                          <FollowButton
                            userId={r.userId}
                            isFollowing={followingSet.has(r.userId)}
                          />
                          <CopyTradeButton
                            providerId={r.userId}
                            providerName={r.name}
                            isSubscribed={copyTradeMap.has(r.userId)}
                            existingToken={copyTradeMap.get(r.userId)?.token}
                            currentMode={copyTradeMap.get(r.userId)?.mode}
                            currentFixedLot={copyTradeMap.get(r.userId)?.fixedLot}
                            currentRiskPercent={copyTradeMap.get(r.userId)?.riskPercent}
                            currentXauusdLot={copyTradeMap.get(r.userId)?.xauusdLot}
                            currentBtcusdLot={copyTradeMap.get(r.userId)?.btcusdLot}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{t("minTradesHint")}</p>
          <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaTable} />
        </>
      )}
    </div>
  );
}
