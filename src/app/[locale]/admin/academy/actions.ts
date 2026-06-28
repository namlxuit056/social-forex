"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAcademyLesson } from "@/lib/ai/academy-generator";
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
  const generated = await generateAcademyLesson(topic, level as LessonLevel);

  let slug = generated.slug;
  const existing = await prisma.academyLesson.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

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

  revalidatePath("/admin/academy");
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
