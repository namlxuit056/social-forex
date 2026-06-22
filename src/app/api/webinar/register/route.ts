import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const registerSchema = z.object({
  webinarId: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const webinar = await prisma.webinar.findUnique({
    where: { id: parsed.data.webinarId },
    select: { id: true, status: true, maxAttendees: true, _count: { select: { registrations: true } } },
  });

  if (!webinar || webinar.status !== "SCHEDULED") {
    return NextResponse.json({ error: "Webinar not available" }, { status: 404 });
  }

  if (webinar.maxAttendees && webinar._count.registrations >= webinar.maxAttendees) {
    return NextResponse.json({ error: "Webinar is full" }, { status: 400 });
  }

  const existing = await prisma.webinarRegistration.findUnique({
    where: {
      webinarId_userId: {
        webinarId: parsed.data.webinarId,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already registered" }, { status: 400 });
  }

  await prisma.webinarRegistration.create({
    data: {
      webinarId: parsed.data.webinarId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
