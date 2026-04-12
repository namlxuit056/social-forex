import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { academyLessons } from "@/lib/content/academy";
import { pageCtaItems } from "@/lib/page-cta-i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("academy");
  return { title: t("title"), description: t("description") };
}

export default async function AcademyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("academy");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("learn", "explore");

  const levelLabel: Record<string, string> = {
    beginner: t("beginner"),
    intermediate: t("intermediate"),
    advanced: t("advanced"),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {academyLessons.map((lesson) => (
          <li
            key={lesson.slug}
            className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              {levelLabel[lesson.level] ?? lesson.level}
            </span>
            <h2 className="mt-2 font-heading text-lg font-medium text-foreground">
              {lesson.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{lesson.summary}</p>
            <Link
              href={`/academy/${lesson.slug}`}
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "mt-4 h-auto px-0",
              )}
            >
              {t("detail")}
            </Link>
          </li>
        ))}
      </ul>
      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("next")} items={ctaRow} />
    </div>
  );
}
