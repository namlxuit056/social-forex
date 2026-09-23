"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

async function getActiveConnection(userId: string) {
  return prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
}

const enableSchema = z.object({
  ticket: z.string().min(1),
  distancePips: z.coerce.number().positive().max(1000),
});

export async function enableTrailingStop(ticket: string, distancePips: number): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = enableSchema.safeParse({ ticket, distancePips });
  if (!parsed.success) return { error: "invalid_params" };

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.trailingStopConfig.upsert({
    where: { connectionId_ticket: { connectionId: connection.id, ticket: parsed.data.ticket } },
    create: { connectionId: connection.id, ticket: parsed.data.ticket, distancePips: parsed.data.distancePips },
    update: { distancePips: parsed.data.distancePips },
  });

  revalidateLocalizedPath("/mt5");
  revalidateLocalizedPath("/positions");

  return {};
}

export async function disableTrailingStop(ticket: string): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await getActiveConnection(session.user.id);
  if (!connection) return { error: "no_connection" };

  await prisma.trailingStopConfig.deleteMany({
    where: { connectionId: connection.id, ticket },
  });

  revalidateLocalizedPath("/mt5");
  revalidateLocalizedPath("/positions");

  return {};
}
