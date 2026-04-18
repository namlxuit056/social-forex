import type { ReactNode } from "react";
import { getInitialsFromLabel } from "@/lib/profile/display";
import { cn } from "@/lib/utils";

type Props = {
  displayLabel: string;
  imageUrl: string | null;
  subtitle: string;
  joinedLine: string;
  bio: string | null;
  actions: ReactNode;
};

export function PublicProfileHero({
  displayLabel,
  imageUrl,
  subtitle,
  joinedLine,
  bio,
  actions,
}: Props) {
  const initials = getInitialsFromLabel(displayLabel);

  return (
    <section
      className="rounded-xl border border-border bg-card/50 p-4 ring-1 ring-foreground/5 sm:p-6"
      aria-labelledby="public-profile-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4 sm:gap-5">
          <div
            className={cn(
              "relative shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border",
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
          <div className="min-w-0 flex-1">
            <h1
              id="public-profile-heading"
              className="font-heading text-2xl font-semibold tracking-tight text-foreground"
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
        </div>
        <div className="flex flex-wrap gap-2 sm:min-w-48 sm:justify-end sm:pt-1">
          {actions}
        </div>
      </div>
    </section>
  );
}
