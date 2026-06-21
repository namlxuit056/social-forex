import type { ReactNode } from "react";
import { Award, BadgeCheck, TrendingUp } from "lucide-react";
import { MarketDuelAnimation } from "@/components/profile/market-duel-animation";
import { getInitialsFromLabel } from "@/lib/profile/display";
import { cn } from "@/lib/utils";

type Props = {
  displayLabel: string;
  imageUrl: string | null;
  subtitle: string;
  joinedLine: string;
  bio: string | null;
  actions: ReactNode;
  followerCount: number;
  followingCount: number;
  threadCount: number;
  followersLabel: string;
  followingLabel: string;
  threadsLabel: string;
  badges?: string[];
  socialProof?: {
    totalSignals: number;
    xp: number;
    level: number;
    signalsLabel: string;
    xpLabel: string;
  };
};

export function PublicProfileHero({
  displayLabel,
  imageUrl,
  subtitle,
  joinedLine,
  bio,
  actions,
  followerCount,
  followingCount,
  threadCount,
  followersLabel,
  followingLabel,
  threadsLabel,
  badges = [],
  socialProof,
}: Props) {
  const initials = getInitialsFromLabel(displayLabel);

  return (
    <section
      className="overflow-hidden rounded-xl border border-border/70 bg-card/60 ring-1 ring-foreground/5"
      aria-labelledby="public-profile-heading"
    >
      <div className="relative h-24 bg-gradient-to-br from-emerald-600/25 via-primary/10 to-red-500/20 sm:h-28">
        <MarketDuelAnimation />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
      </div>

      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="-mt-10 grid gap-4 sm:-mt-12 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div className="flex items-end gap-3">
            <div
              className={cn(
                "relative shrink-0 overflow-hidden rounded-full bg-muted ring-4 ring-card shadow-lg shadow-primary/10",
                "size-20 sm:size-24",
              )}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL from OAuth
                <img
                  src={imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  className="size-full object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="flex size-full items-center justify-center text-lg font-semibold uppercase text-muted-foreground sm:text-xl"
                  aria-hidden
                >
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0 pb-1 sm:hidden">
              <h1
                id="public-profile-heading"
                className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground"
              >
                {displayLabel}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="hidden min-w-0 pb-1 sm:block">
            <h1
              id="public-profile-heading"
              className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground"
            >
              {displayLabel}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-52 sm:items-end">
            <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{joinedLine}</p>
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-200"
              >
                <BadgeCheck className="size-3" aria-hidden />
                {badge}
              </span>
            ))}
          </div>
          {bio ? (
            <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">
              {bio}
            </p>
          ) : null}
        </div>

        {socialProof && socialProof.totalSignals > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <TrendingUp className="size-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold text-foreground">{socialProof.totalSignals}</p>
                <p className="text-[11px] text-muted-foreground">{socialProof.signalsLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <Award className="size-4 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">Lv.{socialProof.level}</p>
                <p className="text-[11px] text-muted-foreground">{socialProof.xp} {socialProof.xpLabel}</p>
              </div>
            </div>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 sm:max-w-sm">
          <div className="rounded-lg bg-muted/20 px-3 py-2">
            <dd className="text-lg font-semibold text-foreground">{followerCount}</dd>
            <dt className="text-xs text-muted-foreground">{followersLabel}</dt>
          </div>
          <div className="rounded-lg bg-muted/20 px-3 py-2">
            <dd className="text-lg font-semibold text-foreground">{followingCount}</dd>
            <dt className="text-xs text-muted-foreground">{followingLabel}</dt>
          </div>
          <div className="rounded-lg bg-muted/20 px-3 py-2">
            <dd className="text-lg font-semibold text-foreground">{threadCount}</dd>
            <dt className="text-xs text-muted-foreground">{threadsLabel}</dt>
          </div>
        </dl>
      </div>
    </section>
  );
}
