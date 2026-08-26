"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTopicIdeas } from "@/lib/ai/academy-generator";
import type { LessonLevel } from "@/lib/ai/academy-generator";
import { saveLesson } from "@/lib/ai/academy-auto-generate";
import { generateLessonImage } from "@/lib/ai/gemini-image";
import { pollinationsImageUrl } from "@/lib/ai/pollinations-image";

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

export async function getTopicIdeasForBulkAction(
  count: number,
): Promise<{ topics?: Array<{ topic: string; level: string }>; error?: string }> {
  try {
    await requireAdmin();

    const parsed = bulkSchema.safeParse({ count });
    if (!parsed.success) return { error: "Số bài không hợp lệ (1–10)." };

    const existing = await prisma.academyLesson.findMany({
      where: { locale: "en" },
      select: { title: true },
    });
    const existingTitles = existing.map((l) => l.title);

    const topics = await generateTopicIdeas(parsed.data.count, existingTitles);
    return { topics };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
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

export async function regenerateImageAction(formData: FormData) {
  await requireAdmin();
  const slug = formData.get("slug");
  const topic = formData.get("topic");
  if (typeof slug !== "string" || typeof topic !== "string") return;
  const imageUrl =
    (await generateLessonImage(topic, slug)) ?? pollinationsImageUrl(topic, slug);
  // Update all locale variants for this slug
  await prisma.academyLesson.updateMany({ where: { slug }, data: { imageUrl } });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
  revalidatePath(`/vi/academy/${slug}`);
  revalidatePath(`/academy/${slug}`);
}

export async function updateLessonAction(
  _prev: { ok?: boolean; error?: string } | null,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = formData.get("id");
    if (typeof id !== "string") return { error: "Missing id" };

    const title = formData.get("title");
    const summary = formData.get("summary");
    const body = formData.get("body");
    const slug = formData.get("slug");

    if (typeof title !== "string" || !title.trim()) return { error: "Tiêu đề không được để trống" };
    if (typeof summary !== "string" || !summary.trim()) return { error: "Tóm tắt không được để trống" };
    if (typeof body !== "string" || !body.trim()) return { error: "Nội dung không được để trống" };
    if (typeof slug !== "string") return { error: "Missing slug" };

    await prisma.academyLesson.update({
      where: { id },
      data: { title: title.trim(), summary: summary.trim(), body: body.trim() },
    });

    revalidatePath("/admin/academy");
    revalidatePath("/academy");
    revalidatePath(`/vi/academy/${slug}`);
    revalidatePath(`/academy/${slug}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function updateImageUrlAction(formData: FormData) {
  await requireAdmin();
  const slug = formData.get("slug");
  const imageUrl = formData.get("imageUrl");
  if (typeof slug !== "string") return;
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  await prisma.academyLesson.updateMany({
    where: { slug },
    data: { imageUrl: url || null },
  });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
  revalidatePath(`/vi/academy/${slug}`);
  revalidatePath(`/academy/${slug}`);
}

export async function deleteAcademyLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.academyLesson.delete({ where: { id } });
  revalidatePath("/admin/academy");
  revalidatePath("/academy");
}
