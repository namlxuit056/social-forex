import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageCtaItem = {
  href: string;
  label: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
};

export function PageCtaRow({
  heading = "Next",
  items,
  className,
}: {
  heading?: string;
  items: readonly PageCtaItem[];
  className?: string;
}) {
  const visibleItems = items.slice(0, 4);

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visibleItems.map((c, i) => (
          <Link
            key={`${c.href}-${c.label}`}
            href={c.href}
            className={cn(
              buttonVariants({
                variant: c.variant ?? (i === 0 ? "default" : "outline"),
                size: "sm",
              }),
            )}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
