"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const reportSchema = z.object({
  postId: z.string().min(1).optional(),
  threadId: z.string().min(1).optional(),
  reason: z.string().min(3).max(500),
});

export async function reportPost(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = reportSchema.safeParse({
    postId: formData.get("postId") || undefined,
    threadId: formData.get("threadId") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Lý do không hợp lệ." };

  const { postId, threadId, reason } = parsed.data;
  if (!postId && !threadId) return { error: "Thiếu đối tượng báo cáo." };

  await prisma.forumReport.create({
    data: {
      reporterId: session.user.id,
      postId: postId ?? null,
      threadId: threadId ?? null,
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
