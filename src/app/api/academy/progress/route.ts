import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  await prisma.academyProgress.upsert({
    where: {
      userId_lessonSlug: {
        userId: session.user.id,
        lessonSlug: parsed.data.lessonSlug,
      },
    },
    create: {
      userId: session.user.id,
      lessonSlug: parsed.data.lessonSlug,
      completed: parsed.data.completed,
      quizScore: parsed.data.quizScore,
    },
    update: {
      completed: parsed.data.completed,
      quizScore: parsed.data.quizScore,
    },
  });

  return NextResponse.json({ ok: true });
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
