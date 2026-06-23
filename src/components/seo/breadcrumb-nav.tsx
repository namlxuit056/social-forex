import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * Visible breadcrumb navigation with JSON-LD hidden inside.
 * When `href` is omitted the item renders as plain text (current page).
 */
export function BreadcrumbNav({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
              {isLast || !item.href ? (
                <span className="font-medium text-foreground">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="transition hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
