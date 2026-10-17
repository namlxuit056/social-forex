"use client";

import { Activity, Bot, ScanSearch, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
};

export function BottomAppNav({ userId }: Props) {
  const pathname = usePathname();
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const profileHref = pathname.startsWith("/u/") ? pathname : `/u/${userId}`;

  const items = [
    { href: profileHref, label: tc("profile"), icon: UserRound },
    { href: "/screener", label: tn("screener"), icon: ScanSearch },
    { href: "/ai-trade-proposals", label: tn("aiTradeProposal"), icon: Bot },
    { href: "/positions", label: tn("positions"), icon: Activity },
  ] as const;

  return (
    <nav
      aria-label={tn("mobileAppMenuAria")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "text-primary",
              )}
            >
              <item.icon className="size-5" aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
