import { prisma } from "@/lib/prisma";
import {
  generateAcademyLesson,
  generateTopicIdeas,
  type LessonLevel,
} from "@/lib/ai/academy-generator";

export async function saveLesson(topic: string, level: LessonLevel) {
  const generated = await generateAcademyLesson(topic, level);

  let slug = generated.slug;
  const conflict = await prisma.academyLesson.findFirst({ where: { slug } });
  if (conflict) slug = `${slug}-${Date.now().toString(36)}`;

  const publishedAt = new Date();

  // Create Vietnamese lesson
  await prisma.academyLesson.create({
    data: {
      slug,
      locale: "vi",
      level: generated.level,
      title: generated.titleVi,
      summary: generated.summaryVi,
      body: generated.bodyVi,
      keywords: generated.keywordsVi,
      imageUrl: generated.imageUrl,
      status: "PUBLISHED",
      publishedAt,
      quizQuestions: generated.quizzes.map((q, i) => ({
        question: q.questionVi,
        options: q.optionsVi,
        correctIndex: q.correctIndex,
        order: i,
      })),
    },
  });

  // Create English lesson
  await prisma.academyLesson.create({
    data: {
      slug,
      locale: "en",
      level: generated.level,
      title: generated.titleEn,
      summary: generated.summaryEn,
      body: generated.bodyEn,
      keywords: generated.keywordsEn,
      imageUrl: generated.imageUrl,
      status: "PUBLISHED",
      publishedAt,
      quizQuestions: generated.quizzes.map((q, i) => ({
        question: q.questionEn,
        options: q.optionsEn,
        correctIndex: q.correctIndex,
        order: i,
      })),
    },
  });

  return slug;
}

export type AcademyAutoGenerateResult = {
  ok: boolean;
  created: Array<{ topic: string; level: LessonLevel; slug: string }>;
  errors: Array<{ topic: string; error: string }>;
};

/** Picks `count` fresh topic ideas (deduped against existing lesson titles) and generates+publishes a lesson for each. One topic failing doesn't block the others. */
export async function runAcademyAutoGenerate(count: number): Promise<AcademyAutoGenerateResult> {
  const existing = await prisma.academyLesson.findMany({
    where: { locale: "en" },
    select: { title: true },
  });
  const existingTitles = existing.map((l) => l.title);

  const topics = await generateTopicIdeas(count, existingTitles);

  const created: AcademyAutoGenerateResult["created"] = [];
  const errors: AcademyAutoGenerateResult["errors"] = [];

  for (const t of topics) {
    try {
      const slug = await saveLesson(t.topic, t.level);
      created.push({ topic: t.topic, level: t.level, slug });
    } catch (e) {
      errors.push({ topic: t.topic, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { ok: errors.length === 0, created, errors };
}
