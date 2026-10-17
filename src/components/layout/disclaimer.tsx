import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

export async function Disclaimer({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  const t = await getTranslations("disclaimer");

  if (variant === "compact") {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground/70">
        <TriangleAlert className="mr-1 inline-block size-3 align-text-top" />
        {t("compact")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-950/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
        <TriangleAlert className="size-3.5" />
        {t("title")}
      </div>
      <p className="mt-1">
        {t.rich("body", {
          b: (chunks) => <strong className="text-foreground/90">{chunks}</strong>,
        })}
      </p>
    </div>
  );
}
