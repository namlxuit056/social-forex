import { ShieldCheck, Trophy, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates } from "@/lib/site-url";
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
  return { title: t("title"), alternates: localeAlternates("/leaderboard", locale) };
}

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function daysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

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
  copierCount: number;
  lastCopyDaysAgo: number | null;
};

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ timeframe?: string; sortBy?: string; limit?: string }>;
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

  const parsedLimit = Number.parseInt(resolvedSearchParams?.limit ?? "", 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.ceil(parsedLimit / PAGE_SIZE) * PAGE_SIZE, 500)
      : PAGE_SIZE;

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
      mode: "LOT" | "PERCENT" | "RATIO";
      fixedLot: number | null;
      riskPercent: number | null;
      lotPercent: number | null;
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
          lotPercent: true,
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
        lotPercent: ct.lotPercent,
        xauusdLot: ct.xauusdLot,
        btcusdLot: ct.btcusdLot,
      });
    for (const f of follows) followingSet.add(f.followingId);
  }

  // Copier social proof: count + most recent subscription per provider (public data)
  const copyTradeRows = await prisma.copyTrade.findMany({
    where: { providerId: { in: userIds }, isActive: true },
    select: { providerId: true, createdAt: true, lastCopiedAt: true },
  });
  const copierStatsMap = new Map<string, { count: number; lastActivityAt: Date }>();
  for (const row of copyTradeRows) {
    // Real copy activity if the follower's EA has ever opened a position; fall
    // back to sign-up time so a fresh subscription still shows something.
    const activityAt = row.lastCopiedAt ?? row.createdAt;
    const cur = copierStatsMap.get(row.providerId);
    if (!cur) {
      copierStatsMap.set(row.providerId, { count: 1, lastActivityAt: activityAt });
    } else {
      cur.count += 1;
      if (activityAt > cur.lastActivityAt) cur.lastActivityAt = activityAt;
    }
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
      const copierStats = copierStatsMap.get(userId);
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
        copierCount: copierStats?.count ?? 0,
        lastCopyDaysAgo: copierStats ? daysSince(copierStats.lastActivityAt) : null,
      };
    })
    .filter((r) => r.total >= 3);

  const totalRows = rows.length;

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

  const visibleRows = rows.slice(0, limit);
  const hasMore = totalRows > visibleRows.length;
  const loadMoreHref = `/leaderboard?timeframe=${tf}${
    sortBy !== "pf" ? `&sortBy=${sortBy}` : ""
  }&limit=${limit + PAGE_SIZE}`;

  const filters = [
    { key: "30d", label: t("filter30d") },
    { key: "90d", label: t("filter90d") },
    { key: "all", label: t("filterAll") },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
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
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-border-strong bg-muted text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                aria-current={isActive ? "true" : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-border-strong bg-muted text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                {visibleRows.map((r, i) => (
                  <tr key={r.userId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 text-foreground">
                      <Link href={`/u/${r.userId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                        {r.name}
                      </Link>
                      {r.copierCount > 0 && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Users className="size-3" />
                          {t("copiersCount", { count: r.copierCount })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">{r.wins}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{r.losses}</td>
                    <td className="px-4 py-3 font-mono">{r.winRate !== null ? `${r.winRate}%` : "—"}</td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        r.profitFactor === null
                          ? "text-muted-foreground"
                          : r.profitFactor >= 1
                            ? "text-success"
                            : "text-danger"
                      }`}
                    >
                      {r.profitFactor !== null ? r.profitFactor.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.hasMt5 ? (
                        <ShieldCheck className="size-4 text-success" />
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
                        <span className="font-mono tabular-nums">{r.xp}</span>
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
                            currentLotPercent={copyTradeMap.get(r.userId)?.lotPercent}
                            currentXauusdLot={copyTradeMap.get(r.userId)?.xauusdLot}
                            currentBtcusdLot={copyTradeMap.get(r.userId)?.btcusdLot}
                            providerWinRate={r.winRate}
                            providerClosedSignals={r.total}
                            providerCopierCount={r.copierCount}
                            providerLastCopyDaysAgo={r.lastCopyDaysAgo}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {t("showingCount", { shown: visibleRows.length, total: totalRows })}
            </p>
            {hasMore && (
              <Link
                href={loadMoreHref}
                scroll={false}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t("loadMore")}
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("minTradesHint")}</p>
          <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaTable} />
        </>
      )}
    </div>
  );
}
