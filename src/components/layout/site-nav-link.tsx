"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof Link> & {
  activeClassName?: string;
};

export function SiteNavLink({
  href,
  className,
  activeClassName,
  ...props
}: Props) {
  const pathname = usePathname();
  const hrefString = typeof href === "string" ? href : href.pathname;
  const isActive =
    hrefString === "/"
      ? pathname === "/"
      : pathname === hrefString || pathname.startsWith(`${hrefString}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(className, isActive && activeClassName)}
      {...props}
    />
  );
}
