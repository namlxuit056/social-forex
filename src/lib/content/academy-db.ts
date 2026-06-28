import { prisma } from "@/lib/prisma";
import type { Lesson } from "@/lib/content/academy";

export type DbLesson = Lesson & {
  imageUrl: string | null;
  fromDb: true;
};

export type DbQuiz = {
  question: string;
  options: string[];
  correctIndex: number;
  order: number;
};

export async function getDbLessons(locale: string): Promise<DbLesson[]> {
  const rows = await prisma.academyLesson.findMany({
    where: { locale, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      level: true,
      title: true,
      summary: true,
      body: true,
      keywords: true,
      imageUrl: true,
    },
  });

  return rows.map((r) => ({
    slug: r.slug,
    level: r.level as Lesson["level"],
    title: r.title,
    summary: r.summary,
    body: r.body,
    keywords: r.keywords,
    imageUrl: r.imageUrl,
    fromDb: true as const,
  }));
}

export async function getDbLesson(
  slug: string,
  locale: string,
): Promise<DbLesson | null> {
  const row = await prisma.academyLesson.findFirst({
    where: { slug, locale, status: "PUBLISHED" },
    select: {
      slug: true,
      level: true,
      title: true,
      summary: true,
      body: true,
      keywords: true,
      imageUrl: true,
    },
  });

  if (!row) return null;

  return {
    slug: row.slug,
    level: row.level as Lesson["level"],
    title: row.title,
    summary: row.summary,
    body: row.body,
    keywords: row.keywords,
    imageUrl: row.imageUrl,
    fromDb: true as const,
  };
}

export async function getDbLessonQuizzes(slug: string, locale: string): Promise<DbQuiz[]> {
  const lesson = await prisma.academyLesson.findFirst({
    where: { slug, locale, status: "PUBLISHED" },
    select: { quizQuestions: true },
  });

  if (!lesson?.quizQuestions) return [];

  const raw = lesson.quizQuestions;
  if (!Array.isArray(raw)) return [];

  return (raw as DbQuiz[]).filter(
    (q) => q && typeof q.question === "string" && Array.isArray(q.options),
  );
}
