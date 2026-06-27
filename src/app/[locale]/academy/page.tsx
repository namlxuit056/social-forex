import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { BreadcrumbNav } from "@/components/seo/breadcrumb-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAcademyLessons } from "@/lib/content/academy";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  const academyLessons = getAcademyLessons(locale);

  const session = await auth();
  const completedSlugs = new Set<string>();
  if (session?.user?.id) {
    const progress = await prisma.academyProgress.findMany({
      where: { userId: session.user.id, completed: true },
      select: { lessonSlug: true },
    });
    progress.forEach((p) => completedSlugs.add(p.lessonSlug));
  }

  const totalLessons = academyLessons.length;
  const completedCount = academyLessons.filter((l) =>
    completedSlugs.has(l.slug),
  ).length;

  const levelLabel: Record<string, string> = {
    beginner: t("beginner"),
    intermediate: t("intermediate"),
    advanced: t("advanced"),
  };

  return (
    <div className="space-y-8">
      <BreadcrumbNav
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("title") },
        ]}
      />
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>

        {session?.user && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("progressCount", {
                  done: completedCount,
                  total: totalLessons,
                })}
              </span>
              <span className="font-medium text-foreground">
                {Math.round((completedCount / totalLessons) * 100)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.round((completedCount / totalLessons) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {academyLessons.map((lesson) => {
          const done = completedSlugs.has(lesson.slug);
          return (
            <li
              key={lesson.slug}
              className={cn(
                "rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5",
                done && "border-primary/30 bg-primary/5 ring-primary/10",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-primary">
                  {levelLabel[lesson.level] ?? lesson.level}
                </span>
                {done && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
              <h2 className="mt-2 font-heading text-lg font-medium text-foreground">
                {lesson.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {lesson.summary}
              </p>
              <Link
                href={`/academy/${lesson.slug}`}
                className={cn(
                  buttonVariants({ variant: "link", size: "sm" }),
                  "mt-4 h-auto px-0",
                )}
              >
                {done ? t("completedBadge") + " · " : ""}
                {t("detail")}
              </Link>
            </li>
          );
        })}
      </ul>
      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
