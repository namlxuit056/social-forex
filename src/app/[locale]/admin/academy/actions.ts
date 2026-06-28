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

const bulkSchema = z.object({
  count: z.coerce.number().int().min(1).max(10),
});

async function saveLesson(topic: string, level: LessonLevel) {
  const generated = await generateAcademyLesson(topic, level);

  let slug = generated.slug;
  const conflict = await prisma.academyLesson.findUnique({ where: { slug } });
  if (conflict) slug = `${slug}-${Date.now().toString(36)}`;

  await prisma.academyLesson.create({
    data: {
      slug,
      level: generated.level,
      titleVi: generated.titleVi,
      titleEn: generated.titleEn,
      summaryVi: generated.summaryVi,
      summaryEn: generated.summaryEn,
      bodyVi: generated.bodyVi,
      bodyEn: generated.bodyEn,
      keywordsVi: generated.keywordsVi,
      keywordsEn: generated.keywordsEn,
      imageUrl: generated.imageUrl,
      published: false,
      quizzes: {
        create: generated.quizzes.map((q) => ({
          questionVi: q.questionVi,
          questionEn: q.questionEn,
          optionsVi: q.optionsVi,
          optionsEn: q.optionsEn,
          correctIndex: q.correctIndex,
          order: q.order,
        })),
      },
    },
  });
}

export type BulkGenerateState = {
  created: number;
  failed: number;
  errors: string[];
} | null;

export async function bulkGenerateAcademyLessonsAction(
  _prevState: BulkGenerateState,
  formData: FormData,
): Promise<BulkGenerateState> {
  await requireAdmin();

  const parsed = bulkSchema.safeParse({ count: formData.get("count") });
  if (!parsed.success) return { created: 0, failed: 0, errors: ["Số bài không hợp lệ (1–10)."] };

  const { count } = parsed.data;

  const existing = await prisma.academyLesson.findMany({ select: { titleEn: true } });
  const existingTitles = existing.map((l) => l.titleEn);

  let topics;
  try {
    topics = await generateTopicIdeas(count, existingTitles);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi tạo ý tưởng chủ đề";
    return { created: 0, failed: count, errors: [msg] };
  }

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < topics.length; i++) {
    if (i > 0) {
      // 5-second gap between lessons to avoid provider rate-limiting
      await new Promise((r) => setTimeout(r, 5000));
    }
    try {
      await saveLesson(topics[i].topic, topics[i].level);
      created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(`"${topics[i].topic}": ${msg.slice(0, 120)}`);
    }
  }

  revalidatePath("/admin/academy");
  revalidatePath("/academy");

  return { created, failed: topics.length - created, errors };
}

export async function publishAcademyLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.academyLesson.update({ where: { id }, data: { published: true } });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
}

export async function unpublishAcademyLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.academyLesson.update({ where: { id }, data: { published: false } });
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
