import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getAcademyLessons } from "@/lib/content/academy";
import { getDbLessons } from "@/lib/content/academy-db";

export async function ProfileAcademySection({
  profileUserId,
  locale,
}: {
  profileUserId: string;
  locale: string;
}) {
  const t = await getTranslations("profile");
  const tAcademy = await getTranslations("academy");

  const [dbLessons, hardcodedLessons, progress] = await Promise.all([
    getDbLessons(locale),
    Promise.resolve(getAcademyLessons(locale)),
    prisma.academyProgress.findMany({
      where: { userId: profileUserId, completed: true },
      select: { lessonSlug: true, quizScore: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const dbSlugs = new Set(dbLessons.map((l) => l.slug));
  const allLessons = [
    ...dbLessons,
    ...hardcodedLessons.filter((l) => !dbSlugs.has(l.slug)),
  ];
  const lessonBySlug = new Map(allLessons.map((l) => [l.slug, l]));

  const completedLessons = progress
    .map((p) => {
      const lesson = lessonBySlug.get(p.lessonSlug);
      if (!lesson) return null;
      return { ...lesson, quizScore: p.quizScore };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (completedLessons.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
        {t("academyNoProgress")}
      </section>
    );
  }

  const levelLabel: Record<string, string> = {
    beginner: tAcademy("beginner"),
    intermediate: tAcademy("intermediate"),
    advanced: tAcademy("advanced"),
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {t("academyProgressTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("academyProgressCount", { count: completedLessons.length })}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {completedLessons.map((lesson) => (
          <li
            key={lesson.slug}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 ring-1 ring-primary/10"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-primary">
                {levelLabel[lesson.level] ?? lesson.level}
              </span>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            </div>
            <Link
              href={`/academy/${lesson.slug}`}
              className="mt-2 block font-heading text-base font-medium text-foreground hover:underline"
            >
              {lesson.title}
            </Link>
            {lesson.quizScore !== null && lesson.quizScore !== undefined && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("academyQuizScore", { score: lesson.quizScore })}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
