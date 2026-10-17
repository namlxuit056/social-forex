"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const storageKey = (key: string) => `social-forex:last-list:${key}`;

/** Call from a list page so its detail pages can return to the same filters. */
export function useRememberListUrl(key: string) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        storageKey(key),
        window.location.pathname + window.location.search,
      );
    } catch {
      /* storage blocked: the back link falls back to the plain list */
    }
  }, [key, query]);
}

/**
 * "Back to list" that returns to the list the visitor last looked at (same
 * filters and page, remembered via `useRememberListUrl`), falling back to
 * `href` for direct visits and shared links.
 */
export function HistoryBackLink({
  href,
  listKey,
  children,
  className,
}: {
  href: string;
  listKey: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        let saved: string | null = null;
        try {
          saved = window.sessionStorage.getItem(storageKey(listKey));
        } catch {
          saved = null;
        }
        if (saved) {
          event.preventDefault();
          router.push(saved);
        }
      }}
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
