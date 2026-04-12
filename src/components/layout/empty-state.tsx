import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PageCtaItem } from "@/components/layout/page-cta-row";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  primary?: PageCtaItem;
  secondary?: PageCtaItem[];
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  primary,
  secondary,
  className,
}: Props) {
  return (
    <Card
      className={cn(
        "border-dashed border-border bg-card/60 ring-1 ring-foreground/5",
        className,
      )}
    >
      <CardHeader className="pb-2">
        {Icon ? (
          <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-muted/80 ring-1 ring-border">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-pretty">{description}</CardDescription>
        ) : null}
      </CardHeader>
      {(primary || (secondary && secondary.length > 0)) && (
        <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {primary ? (
            <Link
              href={primary.href}
              className={cn(
                buttonVariants({
                  variant: primary.variant ?? "default",
                  size: "sm",
                }),
              )}
            >
              {primary.label}
            </Link>
          ) : null}
          {secondary?.map((s) => (
            <Link
              key={s.href + s.label}
              href={s.href}
              className={cn(
                buttonVariants({ variant: s.variant ?? "outline", size: "sm" }),
              )}
            >
              {s.label}
            </Link>
          ))}
        </CardFooter>
      )}
    </Card>
  );
}
