"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import {
  createMt5BridgeToken,
  hashMt5BridgeToken,
  maskMt5BridgeToken,
} from "@/lib/mt5-bridge";
import { prisma } from "@/lib/prisma";

const createConnectionSchema = z.object({
  name: z.string().trim().min(1).max(80).default("MT5 Bridge"),
});

export async function createMt5Connection(
  _prev: { token?: string; error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/mt5");

  const parsed = createConnectionSchema.safeParse({
    name: formData.get("name") || "MT5 Bridge",
  });
  if (!parsed.success) return { error: "Invalid connection name." };

  const token = createMt5BridgeToken();
  await prisma.mt5Connection.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      tokenHash: hashMt5BridgeToken(token),
      tokenLast4: maskMt5BridgeToken(token),
    },
  });

  revalidatePath("/mt5");
  return { token };
}

export async function revokeMt5Connection(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/mt5");

  const connectionId = formData.get("connectionId");
  if (typeof connectionId !== "string" || !connectionId) return;

  await prisma.mt5Connection.updateMany({
    where: { id: connectionId, userId: session.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/mt5");
}
