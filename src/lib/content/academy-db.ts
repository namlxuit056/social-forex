import { prisma } from "@/lib/prisma";
import type { Lesson } from "@/lib/content/academy";

export type DbLesson = Lesson & {
  imageUrl: string | null;
  fromDb: true;
};

export type DbQuiz = {
  id: string;
  questionVi: string;
  questionEn: string;
  optionsVi: string[];
  optionsEn: string[];
  correctIndex: number;
  order: number;
};

export async function getDbLessons(locale: string): Promise<DbLesson[]> {
  const isVi = locale === "vi";
  const rows = await prisma.academyLesson.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      level: true,
      titleVi: true,
      titleEn: true,
      summaryVi: true,
      summaryEn: true,
      bodyVi: true,
      bodyEn: true,
      keywordsVi: true,
      keywordsEn: true,
      imageUrl: true,
    },
  });

  return rows.map((r) => ({
    slug: r.slug,
    level: r.level as Lesson["level"],
    title: isVi ? r.titleVi : r.titleEn,
    summary: isVi ? r.summaryVi : r.summaryEn,
    body: isVi ? r.bodyVi : r.bodyEn,
    keywords: isVi ? r.keywordsVi : r.keywordsEn,
    imageUrl: r.imageUrl,
    fromDb: true as const,
  }));
}

export async function getDbLesson(
  slug: string,
  locale: string,
): Promise<DbLesson | null> {
  const isVi = locale === "vi";
  const row = await prisma.academyLesson.findUnique({
    where: { slug, published: true },
    select: {
      slug: true,
      level: true,
      titleVi: true,
      titleEn: true,
      summaryVi: true,
      summaryEn: true,
      bodyVi: true,
      bodyEn: true,
      keywordsVi: true,
      keywordsEn: true,
      imageUrl: true,
    },
  });

  if (!row) return null;

  return {
    slug: row.slug,
    level: row.level as Lesson["level"],
    title: isVi ? row.titleVi : row.titleEn,
    summary: isVi ? row.summaryVi : row.summaryEn,
    body: isVi ? row.bodyVi : row.bodyEn,
    keywords: isVi ? row.keywordsVi : row.keywordsEn,
    imageUrl: row.imageUrl,
    fromDb: true as const,
  };
}

export async function getDbLessonQuizzes(slug: string): Promise<DbQuiz[]> {
  const lesson = await prisma.academyLesson.findUnique({
    where: { slug, published: true },
    select: {
      quizzes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          questionVi: true,
          questionEn: true,
          optionsVi: true,
          optionsEn: true,
          correctIndex: true,
          order: true,
        },
      },
    },
  });

  return lesson?.quizzes ?? [];
}
