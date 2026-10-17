import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { BreadcrumbNav } from "@/components/seo/breadcrumb-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAcademyLessons, getPriceActionPathLessons } from "@/lib/content/academy";
import { absoluteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";
import { getDbLessons } from "@/lib/content/academy-db";
import { PatternDiagram } from "@/components/academy/pattern-diagram";
import { LessonImage } from "@/components/academy/lesson-image";
import { pageCtaItems } from "@/lib/page-cta-i18n";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("academy");
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: absoluteUrl("/academy", locale),
      languages: {
        vi: absoluteUrl("/academy", "vi"),
        en: absoluteUrl("/academy", "en"),
        "x-default": absoluteUrl("/academy", routing.defaultLocale),
      },
    },
  };
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
  const [dbLessons, hardcodedLessons] = await Promise.all([
    getDbLessons(locale),
    Promise.resolve(getAcademyLessons(locale)),
  ]);
  const dbSlugs = new Set(dbLessons.map((l) => l.slug));
  const uniqueHardcoded = hardcodedLessons.filter((l) => !dbSlugs.has(l.slug));
  const academyLessons = [...dbLessons, ...uniqueHardcoded];

  const priceActionLessons = getPriceActionPathLessons(locale);
  const priceActionSlugs = new Set(priceActionLessons.map((l) => l.slug));
  const otherLessons = academyLessons.filter(
    (l) => !priceActionSlugs.has(l.slug),
  );

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

  function renderLessonCard(
    lesson: (typeof academyLessons)[number],
    step?: number,
  ) {
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
            {step ? `${step}. ` : ""}
            {levelLabel[lesson.level] ?? lesson.level}
          </span>
          {done && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          )}
        </div>
        <h2 className="mt-2 font-heading text-lg font-medium text-foreground">
          {lesson.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{lesson.summary}</p>
        {"imageUrl" in lesson &&
          ((lesson as { imageUrl?: string | null }).imageUrl ? (
            <LessonImage
              src={(lesson as { imageUrl: string }).imageUrl}
              alt={lesson.title}
              slug={lesson.slug}
              imgClassName="mt-3 h-32 w-full rounded-lg object-cover opacity-80"
            />
          ) : (
            <div className="mt-3 h-32 w-full overflow-hidden rounded-lg border border-border/50 bg-card/40 p-2">
              <PatternDiagram slug={lesson.slug} />
            </div>
          ))}
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
  }

  return (
    <div className="space-y-8">
      <BreadcrumbNav
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("title") },
        ]}
      />
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
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

      {priceActionLessons.length > 0 && (
        <section className="rounded-2xl border border-primary/20 bg-primary/3 p-5">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {t("priceActionSectionTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("priceActionSectionDesc")}
          </p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {priceActionLessons.map((lesson, i) =>
              renderLessonCard(lesson, i + 1),
            )}
          </ul>
        </section>
      )}

      {otherLessons.length > 0 && (
        <section>
          {priceActionLessons.length > 0 && (
            <h2 className="mb-4 font-heading text-xl font-semibold text-foreground">
              {t("otherLessonsTitle")}
            </h2>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {otherLessons.map((lesson) => renderLessonCard(lesson))}
          </ul>
        </section>
      )}
      <Disclaimer variant="compact" />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
