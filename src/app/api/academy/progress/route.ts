import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addXp } from "@/lib/add-xp";

export const runtime = "nodejs";

const progressSchema = z.object({
  lessonSlug: z.string().min(1),
  completed: z.boolean(),
  quizScore: z.number().min(0).max(100).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const userId = session.user.id;
  const { lessonSlug, completed, quizScore } = parsed.data;

  const existing = await prisma.academyProgress.findUnique({
    where: { userId_lessonSlug: { userId, lessonSlug } },
    select: { completed: true },
  });

  await prisma.academyProgress.upsert({
    where: { userId_lessonSlug: { userId, lessonSlug } },
    create: { userId, lessonSlug, completed, quizScore },
    update: { completed, ...(quizScore !== undefined ? { quizScore } : {}) },
  });

  let xpEarned = 0;
  if (completed && !existing?.completed) {
    const result = await addXp(userId, "academyComplete");
    xpEarned = result.xpEarned;
  }

  return NextResponse.json({ ok: true, xpEarned });
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progress = await prisma.academyProgress.findMany({
    where: { userId: session.user.id },
    select: { lessonSlug: true, completed: true, quizScore: true },
  });

  return NextResponse.json(progress);
}
