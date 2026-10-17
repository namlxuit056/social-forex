"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getInitialsFromLabel } from "@/lib/profile/display";

const INITIAL_VISIBLE = 12;

export type FollowerListItem = {
  id: string;
  userId: string;
  label: string;
  image: string | null;
};

type Props = {
  items: FollowerListItem[];
  totalCount: number;
};

export function ProfileFollowersSection({ items, totalCount }: Props) {
  const t = useTranslations("profile");
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const fetchedCount = items.length;
  const visibleItems = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = !expanded && fetchedCount > INITIAL_VISIBLE;

  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {t("followersListTitle")}
      </h2>
      {totalCount > fetchedCount ? (
        <p className="text-xs text-muted-foreground">
          {t("followersListTruncated", {
            shown: fetchedCount,
            total: totalCount,
          })}
        </p>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {visibleItems.map((row) => {
          const label = row.label;
          const initials = getInitialsFromLabel(label);
          return (
            <li key={row.id}>
              <Link
                href={`/u/${row.userId}`}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-muted/15 px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <span className="inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                  {row.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.image}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[0.65rem] font-semibold uppercase text-muted-foreground">
                      {initials}
                    </span>
                  )}
                </span>
                <span className="min-w-0 truncate font-medium text-primary">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-2 text-primary"
          onClick={() => setExpanded(true)}
        >
          {t("followersLoadMore", {
            count: fetchedCount - INITIAL_VISIBLE,
          })}
        </Button>
      ) : null}
      {expanded && fetchedCount > INITIAL_VISIBLE ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-2 text-muted-foreground"
          onClick={() => setExpanded(false)}
        >
          {t("followersShowLess")}
        </Button>
      ) : null}
    </div>
  );
}
