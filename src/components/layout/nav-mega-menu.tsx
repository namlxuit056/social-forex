"use client";

import { useTranslations } from "next-intl";
import { BookOpen, ChevronDown, MessageSquare, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteNavLink } from "@/components/layout/site-nav-link";
import { usePathname } from "@/i18n/navigation";

const iconMap = {
  marketTools: Wrench,
  community: MessageSquare,
  learning: BookOpen,
} as const;

export function NavMegaMenu({
  labelKey,
  items,
}: {
  labelKey: keyof typeof iconMap;
  items: readonly { href: string; key: string }[];
}) {
  const Icon = iconMap[labelKey];
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isAnyActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <div className="group relative">
      <button
        className={cn(
          "inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-item-hover hover:text-foreground",
          isAnyActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {t(labelKey)}
        <ChevronDown className="size-3 shrink-0 transition-transform duration-200 group-hover:rotate-180" />
      </button>

      {/* transparent bridge prevents gap flicker */}
      <div className="invisible absolute left-0 top-full z-50 pt-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
        <div className="min-w-52 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <div className="grid grid-cols-2 gap-1">
            {items.map((item) => (
              <SiteNavLink
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-item-hover hover:text-foreground"
                activeClassName="bg-muted text-foreground font-medium"
              >
                {t(item.key)}
              </SiteNavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
