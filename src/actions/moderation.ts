"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { routing } from "@/i18n/routing";

const reportSchema = z.object({
  postId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  signalCommentId: z.string().min(1).optional(),
  reason: z.string().min(3).max(500),
});

function revalidateSignalDetail(signalId: string) {
  for (const l of routing.locales) {
    revalidatePath(`/${l}/signals/${signalId}`);
  }
}

export async function reportPost(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const t = await getTranslations("errors");

  const parsed = reportSchema.safeParse({
    postId: formData.get("postId") || undefined,
    threadId: formData.get("threadId") || undefined,
    signalCommentId: formData.get("signalCommentId") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: t("reportReasonInvalid") };

  const { postId, threadId, signalCommentId, reason } = parsed.data;
  const n = [postId, threadId, signalCommentId].filter(Boolean).length;
  if (n === 0) return { error: t("reportMissingTarget") };
  if (n > 1) return { error: t("reportOneTarget") };

  if (signalCommentId) {
    const c = await prisma.signalComment.findUnique({
      where: { id: signalCommentId },
      select: { id: true },
    });
    if (!c) return { error: t("reportTargetNotFound") };
  } else if (postId) {
    const p = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!p) return { error: t("reportTargetNotFound") };
  } else if (threadId) {
    const th = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!th) return { error: t("reportTargetNotFound") };
  }

  await prisma.forumReport.create({
    data: {
      reporterId: session.user.id,
      postId: postId ?? null,
      threadId: threadId ?? null,
      signalCommentId: signalCommentId ?? null,
      reason,
    },
  });

  return { ok: true };
}

async function requireMod(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "MOD" || user?.role === "ADMIN";
}

export async function hidePost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) return;

  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    include: { thread: { include: { category: true } } },
  });
  if (!post) return;

  await prisma.forumPost.update({
    where: { id: postId },
    data: { hidden: true },
  });

  revalidatePath(`/forum/${post.thread.category.slug}/thread/${post.thread.slug}`);
}

export async function unhidePost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const postId = formData.get("postId");
  if (typeof postId !== "string" || !postId) return;

  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    include: { thread: { include: { category: true } } },
  });
  if (!post) return;

  await prisma.forumPost.update({
    where: { id: postId },
    data: { hidden: false },
  });

  revalidatePath(`/forum/${post.thread.category.slug}/thread/${post.thread.slug}`);
}

export async function hideSignalComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const commentId = formData.get("signalCommentId");
  if (typeof commentId !== "string" || !commentId) return;

  const comment = await prisma.signalComment.findUnique({
    where: { id: commentId },
    select: { signalId: true },
  });
  if (!comment) return;

  await prisma.signalComment.update({
    where: { id: commentId },
    data: { hidden: true },
  });
  revalidateSignalDetail(comment.signalId);
  revalidatePath("/admin/reports");
}

export async function unhideSignalComment(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const commentId = formData.get("signalCommentId");
  if (typeof commentId !== "string" || !commentId) return;

  const comment = await prisma.signalComment.findUnique({
    where: { id: commentId },
    select: { signalId: true },
  });
  if (!comment) return;

  await prisma.signalComment.update({
    where: { id: commentId },
    data: { hidden: false },
  });
  revalidateSignalDetail(comment.signalId);
  revalidatePath("/admin/reports");
}

export async function deleteThread(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const threadId = formData.get("threadId");
  const categorySlug = formData.get("categorySlug");
  if (typeof threadId !== "string" || typeof categorySlug !== "string") return;

  await prisma.forumThread.delete({ where: { id: threadId } });

  revalidatePath(`/forum/${categorySlug}`);
  redirect(`/forum/${categorySlug}`);
}

export async function reviewReport(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const reportId = formData.get("reportId");
  const action = formData.get("action");
  if (typeof reportId !== "string" || typeof action !== "string") return;

  const status = action === "dismiss" ? "DISMISSED" : "REVIEWED";

  await prisma.forumReport.update({
    where: { id: reportId },
    data: {
      status,
      reviewedBy: session.user.id,
    },
  });

  revalidatePath("/admin/reports");
}

export async function toggleThreadPin(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  if (!(await requireMod(session.user.id))) return;

  const threadId = formData.get("threadId");
  if (typeof threadId !== "string" || !threadId) return;

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: { category: { select: { slug: true } } },
  });
  if (!thread) return;

  await prisma.forumThread.update({
    where: { id: threadId },
    data: { isPinned: !thread.isPinned },
  });

  revalidatePath(`/forum/${thread.category.slug}`);
}
