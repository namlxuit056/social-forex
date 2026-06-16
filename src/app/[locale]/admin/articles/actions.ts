"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runAiArticleAutomation } from "@/lib/ai/article-writer";

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
