"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAcademyLesson, generateTopicIdeas } from "@/lib/ai/academy-generator";
import type { LessonLevel } from "@/lib/ai/academy-generator";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

const generateSchema = z.object({
  topic: z.string().min(3).max(100).trim(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
});

/** Used by the single-lesson <form action={}> — must return void */
export async function generateAcademyLessonAction(formData: FormData) {
  await requireAdmin();

  const parsed = generateSchema.safeParse({
    topic: formData.get("topic"),
    level: formData.get("level") || "intermediate",
  });
  if (!parsed.success) return;

  const { topic, level } = parsed.data;
  await saveLesson(topic, level as LessonLevel);

  revalidatePath("/admin/academy");
}

/** Used by BulkGenerateForm — returns { error } so the real message reaches the client */
export async function generateAcademyLessonForBulkAction(
  topic: string,
  level: string,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();

    const parsed = generateSchema.safeParse({ topic, level: level || "intermediate" });
    if (!parsed.success) return { error: "Chủ đề không hợp lệ." };

    await saveLesson(parsed.data.topic, parsed.data.level as LessonLevel);

    revalidatePath("/admin/academy");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

const bulkSchema = z.object({
  count: z.coerce.number().int().min(1).max(10),
});

async function saveLesson(topic: string, level: LessonLevel) {
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
}

export async function getTopicIdeasForBulkAction(
  count: number,
): Promise<Array<{ topic: string; level: string }>> {
  await requireAdmin();

  const parsed = bulkSchema.safeParse({ count });
  if (!parsed.success) throw new Error("Số bài không hợp lệ (1–10).");

  const existing = await prisma.academyLesson.findMany({
    where: { locale: "en" },
    select: { title: true },
  });
  const existingTitles = existing.map((l) => l.title);

  return generateTopicIdeas(parsed.data.count, existingTitles);
}

export async function publishAcademyLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.academyLesson.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
}

export async function unpublishAcademyLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.academyLesson.update({
    where: { id },
    data: { status: "DRAFT", publishedAt: null },
  });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
}

export async function deleteAcademyLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.academyLesson.delete({ where: { id } });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
}
