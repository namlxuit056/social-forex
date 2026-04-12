import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline",
        className,
      )}
    >
      <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
