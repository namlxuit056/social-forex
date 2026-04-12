"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { randomSuffix, slugify } from "@/lib/slug";
import { rateLimit } from "@/lib/rate-limit";

const createThreadSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(20000),
  categorySlug: z.string().min(1),
});

export async function createForumThread(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const t = await getTranslations("errors");

  const { ok } = rateLimit(`thread:${userId}`, 5, 60_000);
  if (!ok) return { error: t("threadCreateRateLimit") };

  const parsed = createThreadSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    categorySlug: formData.get("categorySlug"),
  });
  if (!parsed.success) {
    return { error: t("invalidThreadContent") };
  }

  const { title, body, categorySlug } = parsed.data;
  const category = await prisma.forumCategory.findUnique({
    where: { slug: categorySlug },
  });
  if (!category) {
    return { error: t("forumCategoryNotFound") };
  }

  const base = slugify(title);
  const slug = `${base}-${randomSuffix(8)}`;

  const thread = await prisma.$transaction(async (tx) => {
    const t = await tx.forumThread.create({
      data: {
        categoryId: category.id,
        authorId: userId,
        title,
        slug,
      },
    });
    await tx.forumPost.create({
      data: {
        threadId: t.id,
        authorId: userId,
        body,
      },
    });
    return t;
  });

  revalidatePath("/forum");
  revalidatePath(`/forum/${categorySlug}`);
  redirect(`/forum/${categorySlug}/thread/${thread.slug}`);
}

const replySchema = z.object({
  body: z.string().min(1).max(20000),
  threadId: z.string().min(1),
  categorySlug: z.string().min(1),
});

export async function replyForumThread(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const t = await getTranslations("errors");

  const parsed = replySchema.safeParse({
    body: formData.get("body"),
    threadId: formData.get("threadId"),
    categorySlug: formData.get("categorySlug"),
  });
  if (!parsed.success) {
    return { error: t("replyInvalid") };
  }

  const { ok } = rateLimit(`reply:${userId}`, 10, 60_000);
  if (!ok) return { error: t("replyRateLimit") };

  const { body, threadId, categorySlug } = parsed.data;
  const thread = await prisma.forumThread.findFirst({
    where: { id: threadId, category: { slug: categorySlug } },
  });
  if (!thread) {
    return { error: t("threadNotFound") };
  }

  await prisma.forumPost.create({
    data: {
      threadId: thread.id,
      authorId: userId,
      body,
    },
  });

  revalidatePath(`/forum/${categorySlug}/thread/${thread.slug}`);
  return { ok: true };
}
