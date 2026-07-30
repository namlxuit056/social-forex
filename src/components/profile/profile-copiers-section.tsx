import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getInitialsFromLabel, getPublicDisplayLabel } from "@/lib/profile/display";
import { CopierBlockButton } from "@/components/copy-trade/copier-block-button";
import { parseLivePositions } from "./public-live-positions";

const MAX_COPIERS = 100;

function modeSummary(
  tCopy: (key: string) => string,
  copier: { mode: string; fixedLot: number | null; riskPercent: number | null; lotPercent: number | null },
): string {
  if (copier.mode === "PERCENT") return `${tCopy("modePercent")}: ${copier.riskPercent ?? "—"}%`;
  if (copier.mode === "RATIO") return `${tCopy("modeRatio")}: ${copier.lotPercent ?? "—"}%`;
  return `${tCopy("modeLot")}: ${copier.fixedLot ?? "—"}`;
}

/**
 * Only the provider being copied should ever see this — it surfaces each
 * follower's live balance/positions, which is otherwise private data.
 */
export async function ProfileCopiersSection({
  profileUserId,
  viewerUserId,
  locale,
}: {
  profileUserId: string;
  viewerUserId: string | null | undefined;
  locale: string;
}) {
  if (!viewerUserId || viewerUserId !== profileUserId) return null;

  const t = await getTranslations("profile");
  const tCopy = await getTranslations("copyTrade");

  const [copiers, totalCount] = await Promise.all([
    prisma.copyTrade.findMany({
      where: { providerId: profileUserId, isActive: true },
      orderBy: { createdAt: "desc" },
      take: MAX_COPIERS,
      select: {
        id: true,
        mode: true,
        fixedLot: true,
        riskPercent: true,
        lotPercent: true,
        blockedByProvider: true,
        follower: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            mt5Connections: {
              where: { revokedAt: null },
              orderBy: { lastSeenAt: "desc" },
              take: 1,
              select: {
                accountCurrency: true,
                balance: true,
                equity: true,
                lastPositions: true,
                lastSeenAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.copyTrade.count({ where: { providerId: profileUserId, isActive: true } }),
  ]);

  if (copiers.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        {t("profileCopiersEmpty")}
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {totalCount > copiers.length ? (
        <p className="text-xs text-muted-foreground">
          {t("profileCopiersTruncated", { shown: copiers.length, total: totalCount })}
        </p>
      ) : null}
      {copiers.map((copier) => {
        const conn = copier.follower.mt5Connections[0];
        const positions = conn ? parseLivePositions(conn.lastPositions) : [];
        const floatingPnl =
          conn?.balance != null && conn?.equity != null ? conn.equity - conn.balance : null;
        const floatingPnlPercent =
          floatingPnl != null && conn?.balance ? (floatingPnl / conn.balance) * 100 : null;
        const label = getPublicDisplayLabel(copier.follower.name, copier.follower.email);
        const initials = getInitialsFromLabel(label);

        return (
          <div
            key={copier.id}
            className="space-y-3 rounded-lg border border-border/60 bg-card/55 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/u/${copier.follower.id}`}
                className="flex min-w-0 items-center gap-2 font-medium text-primary"
              >
                <span className="inline-flex size-8 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                  {copier.follower.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={copier.follower.image}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[0.6rem] font-semibold uppercase text-muted-foreground">
                      {initials}
                    </span>
                  )}
                </span>
                <span className="truncate">{label}</span>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {copier.blockedByProvider ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {tCopy("blockedBadge")}
                  </span>
                ) : null}
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  {modeSummary(tCopy, copier)}
                </span>
                <CopierBlockButton copyTradeId={copier.id} initialBlocked={copier.blockedByProvider} />
              </div>
            </div>

            {conn ? (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-muted/25 px-2 py-1.5">
                  <p className="text-muted-foreground">{t("profileBalance")}</p>
                  <p className="font-mono text-foreground">
                    {conn.balance == null ? "—" : `${conn.balance.toFixed(2)} ${conn.accountCurrency ?? ""}`}
                  </p>
                </div>
                <div className="rounded-md bg-muted/25 px-2 py-1.5">
                  <p className="text-muted-foreground">{t("profileEquity")}</p>
                  <p className="font-mono text-foreground">
                    {conn.equity == null ? "—" : `${conn.equity.toFixed(2)} ${conn.accountCurrency ?? ""}`}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-md px-2 py-1.5",
                    floatingPnl == null
                      ? "bg-muted/25"
                      : floatingPnl >= 0
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10",
                  )}
                >
                  <p className={cn("text-muted-foreground", floatingPnl == null ? "" : floatingPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                    {t("profileFloatingPnl")}
                  </p>
                  <p
                    className={cn(
                      "font-mono",
                      floatingPnl == null
                        ? "text-foreground"
                        : floatingPnl >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {floatingPnl == null
                      ? "—"
                      : `${floatingPnl >= 0 ? "+" : ""}${floatingPnl.toFixed(2)}${floatingPnlPercent == null ? "" : ` (${floatingPnl >= 0 ? "+" : ""}${floatingPnlPercent.toFixed(1)}%)`}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("profileCopierNoBridge")}</p>
            )}

            {conn ? (
              positions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {positions.map((position) => {
                    const isBuy = position.type.toUpperCase().startsWith("BUY");
                    const isSell = position.type.toUpperCase().startsWith("SELL");
                    return (
                      <span
                        key={position.ticket}
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-xs",
                          isBuy
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : isSell
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {position.symbol} {position.type} {position.volume ?? "—"}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("profileNoLivePositions")}</p>
              )
            ) : null}

            {conn?.lastSeenAt ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                {t("liveLastSeen")}{" "}
                {conn.lastSeenAt.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
