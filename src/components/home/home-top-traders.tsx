import { ArrowRight, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicDisplayLabel } from "@/lib/profile/display";
import {
  TRADER_STATS_MIN_SAMPLE,
  winRatePercent,
} from "@/lib/signals/public-performance-math";
import { cn } from "@/lib/utils";

type TraderRow = {
  userId: string;
  label: string;
  image: string | null;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
};

async function fetchTopTraders(): Promise<TraderRow[]> {
  const closed = await prisma.signal.findMany({
    where: { status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] } },
    select: {
      authorId: true,
      status: true,
      author: { select: { name: true, email: true, image: true } },
    },
  });

  const map = new Map<
    string,
    { wins: number; losses: number; label: string; image: string | null }
  >();
  for (const s of closed) {
    const label = getPublicDisplayLabel(s.author?.name ?? null, s.author?.email ?? null);
    const cur = map.get(s.authorId) ?? { wins: 0, losses: 0, label, image: s.author?.image ?? null };
    if (s.status === "CLOSED_WIN") cur.wins += 1;
    if (s.status === "CLOSED_LOSS") cur.losses += 1;
    map.set(s.authorId, cur);
  }

  return [...map.entries()]
    .map(([userId, v]) => {
      const total = v.wins + v.losses;
      return { userId, ...v, total, winRate: winRatePercent(v.wins, total) };
    })
    .filter((r) => r.total >= TRADER_STATS_MIN_SAMPLE)
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
    .slice(0, 6);
}

const RANK_RING = [
  "ring-amber-400/50",
  "ring-slate-400/40",
  "ring-amber-600/45",
];

const RANK_NUM_CLASS = [
  "bg-amber-400/15 text-amber-500",
  "bg-slate-400/15 text-slate-400",
  "bg-amber-600/15 text-amber-600",
];

export async function HomeTopTraders() {
  const t = await getTranslations("home");
  const traders = await fetchTopTraders();

  if (traders.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {t("topTradersTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("topTradersSubtitle")}
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
        >
          {t("topTradersViewAll")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {traders.map((trader, i) => {
          const initials = trader.label.slice(0, 2).toUpperCase();
          const isTop3 = i < 3;
          const ringClass = RANK_RING[i] ?? "ring-border/50";
          const numClass = RANK_NUM_CLASS[i] ?? "bg-muted text-muted-foreground";

          return (
            <Link
              key={trader.userId}
              href={`/u/${trader.userId}`}
              className={cn(
                "group relative flex flex-col items-center rounded-xl border px-3 py-4 text-center transition-all hover:border-primary/40 hover:bg-card",
                isTop3
                  ? "border-border bg-card/70 ring-1 ring-foreground/5"
                  : "border-border/60 bg-card/40",
              )}
            >
              {/* Rank + Trophy */}
              <div className="mb-3 flex w-full items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
                    numClass,
                  )}
                >
                  #{i + 1}
                </span>
                {i === 0 && (
                  <Trophy className="size-4 text-amber-400" aria-hidden />
                )}
              </div>

              {/* Avatar */}
              <div
                className={cn(
                  "mb-3 flex size-12 items-center justify-center overflow-hidden rounded-full ring-2",
                  ringClass,
                )}
              >
                {trader.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL from OAuth
                  <img
                    src={trader.image}
                    alt={trader.label}
                    width={48}
                    height={48}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-muted text-sm font-semibold text-muted-foreground">
                    {initials}
                  </span>
                )}
              </div>

              {/* Name */}
              <p className="w-full truncate text-sm font-medium text-foreground group-hover:text-primary">
                {trader.label}
              </p>

              {/* Win rate */}
              <p
                className={cn(
                  "mt-1.5 font-mono text-2xl font-bold tabular-nums leading-none",
                  trader.winRate >= 60
                    ? "text-emerald-500"
                    : trader.winRate >= 50
                      ? "text-foreground"
                      : "text-red-500",
                )}
              >
                {trader.winRate}%
              </p>

              {/* W/L counts */}
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="text-emerald-500/80">{trader.wins}W</span>
                {" / "}
                <span className="text-red-500/80">{trader.losses}L</span>
              </p>

              {/* Win rate bar */}
              <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    trader.winRate >= 50 ? "bg-emerald-500" : "bg-red-500",
                  )}
                  style={{ width: `${trader.winRate}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
