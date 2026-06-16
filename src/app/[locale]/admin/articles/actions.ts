"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateArticleForCustomKeyword,
  runAiArticleAutomation,
} from "@/lib/ai/article-writer";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

const settingSchema = z.object({
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  locale: z.enum(["vi", "en"]),
  seedKeywords: z.string().max(1000),
  maxArticlesPerDay: z.coerce.number().int().min(1).max(5),
});

export async function updateAiArticleAutomation(formData: FormData) {
  await requireAdmin();
  const parsed = settingSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    autoPublish: formData.get("autoPublish") === "on",
    locale: formData.get("locale") || "vi",
    seedKeywords: formData.get("seedKeywords"),
    maxArticlesPerDay: formData.get("maxArticlesPerDay") || 1,
  });
  if (!parsed.success) return;

  const seedKeywords = parsed.data.seedKeywords
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  await prisma.aiArticleAutomationSetting.upsert({
    where: { id: "default" },
    create: {
      enabled: parsed.data.enabled,
      autoPublish: parsed.data.autoPublish,
      locale: parsed.data.locale,
      maxArticlesPerDay: parsed.data.maxArticlesPerDay,
      seedKeywords,
    },
    update: {
      enabled: parsed.data.enabled,
      autoPublish: parsed.data.autoPublish,
      locale: parsed.data.locale,
      maxArticlesPerDay: parsed.data.maxArticlesPerDay,
      seedKeywords,
    },
  });

  revalidatePath("/admin/articles");
}

export async function runAiArticleAutomationNow() {
  await requireAdmin();
  await runAiArticleAutomation();
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
}

export async function publishAiArticle(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.aiGeneratedArticle.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
}

export async function archiveAiArticle(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.aiGeneratedArticle.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
}

export async function deleteAiArticle(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.aiGeneratedArticle.delete({ where: { id } });
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
}

const generateKeywordSchema = z.object({
  keyword: z.string().min(2).max(100).trim(),
  locale: z.enum(["vi", "en"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function generateArticleForKeyword(formData: FormData) {
  await requireAdmin();
  const parsed = generateKeywordSchema.safeParse({
    keyword: formData.get("keyword"),
    locale: formData.get("locale") || "vi",
    status: formData.get("status") || "DRAFT",
  });
  if (!parsed.success) return;

  await generateArticleForCustomKeyword(parsed.data);
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
}

const updateArticleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(8).max(140).trim(),
  summary: z.string().min(30).max(280).trim(),
  metaDescription: z.string().min(50).max(180).trim(),
  body: z.string().min(100).max(12000).trim(),
});

export async function updateAiArticle(formData: FormData) {
  await requireAdmin();
  const parsed = updateArticleSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    metaDescription: formData.get("metaDescription"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;

  const { id, ...data } = parsed.data;
  await prisma.aiGeneratedArticle.update({ where: { id }, data });
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  redirect("/admin/articles");
}
