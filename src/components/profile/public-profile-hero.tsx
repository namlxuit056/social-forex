import type { ReactNode } from "react";
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
}: Props) {
  const initials = getInitialsFromLabel(displayLabel);

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card/50 ring-1 ring-foreground/5"
      aria-labelledby="public-profile-heading"
    >
      <div className="relative h-24 bg-linear-to-br from-primary/25 via-primary/10 to-muted/40 sm:h-32">
        <MarketDuelAnimation />
      </div>

      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="-mt-8 mb-3 flex items-end justify-between sm:-mt-10">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-card",
              "size-16 sm:size-20",
            )}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL from OAuth
              <img
                src={imageUrl}
                alt=""
                width={80}
                height={80}
                className="size-full object-cover"
                loading="eager"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="flex size-full items-center justify-center text-sm font-semibold uppercase text-muted-foreground sm:text-base"
                aria-hidden
              >
                {initials}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </div>

        <div>
          <h1
            id="public-profile-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {displayLabel}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{joinedLine}</p>
          {bio ? (
            <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">
              {bio}
            </p>
          ) : null}
        </div>

        <dl className="mt-4 flex gap-6 border-t border-border/50 pt-4">
          <div>
            <dd className="text-lg font-semibold text-foreground">{followerCount}</dd>
            <dt className="text-xs text-muted-foreground">{followersLabel}</dt>
          </div>
          <div>
            <dd className="text-lg font-semibold text-foreground">{followingCount}</dd>
            <dt className="text-xs text-muted-foreground">{followingLabel}</dt>
          </div>
          <div>
            <dd className="text-lg font-semibold text-foreground">{threadCount}</dd>
            <dt className="text-xs text-muted-foreground">{threadsLabel}</dt>
          </div>
        </dl>
      </div>
    </section>
  );
}
