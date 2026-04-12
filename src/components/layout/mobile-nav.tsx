"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const primaryNavKeys = [
  { href: "/quotes", key: "quotes" },
  { href: "/calendar", key: "calendar" },
  { href: "/chart", key: "chart" },
  { href: "/tools", key: "tools" },
  { href: "/signals", key: "signals" },
  { href: "/forum", key: "forum" },
] as const;

const secondaryNavKeys = [
  { href: "/heatmap", key: "heatmap" },
  { href: "/sentiment", key: "sentiment" },
  { href: "/leaderboard", key: "leaderboard" },
  { href: "/journal", key: "journal" },
  { href: "/backtest", key: "backtest" },
  { href: "/academy", key: "academy" },
  { href: "/webinar", key: "webinar" },
  { href: "/resources", key: "resources" },
  { href: "/brokers", key: "brokers" },
  { href: "/messages", key: "messages" },
  { href: "/partners", key: "partners" },
  { href: "/forum/search", key: "searchTopics" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-background/95 backdrop-blur-lg">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
            <div className="flex flex-wrap gap-1.5">
              {primaryNavKeys.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  {t(item.key)}
                </Link>
              ))}
            </div>
            <div className="border-t border-border/50 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {secondaryNavKeys.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
