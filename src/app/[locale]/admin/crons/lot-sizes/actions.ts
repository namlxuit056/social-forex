"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SCREENER_LOT_DEFAULT_SYMBOL } from "@/lib/signals/screener-lot-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

const rowSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((s) => s.toUpperCase()),
  lotSize: z.coerce.number().positive().max(100),
});

export async function upsertScreenerLot(formData: FormData) {
  await requireAdmin();

  const parsed = rowSchema.safeParse({
    symbol: formData.get("symbol"),
    lotSize: formData.get("lotSize"),
  });
  if (!parsed.success) return;

  await prisma.screenerLotConfig.upsert({
    where: { symbol: parsed.data.symbol },
    create: parsed.data,
    update: { lotSize: parsed.data.lotSize },
  });

  revalidatePath("/admin/crons/lot-sizes");
}

export async function deleteScreenerLot(formData: FormData) {
  await requireAdmin();

  const id = formData.get("id");
  const symbol = formData.get("symbol");
  if (typeof id !== "string") return;
  // The DEFAULT row is the fallback lot for every other symbol — never let it be removed.
  if (symbol === SCREENER_LOT_DEFAULT_SYMBOL) return;

  await prisma.screenerLotConfig.delete({ where: { id } }).catch(() => {});

  revalidatePath("/admin/crons/lot-sizes");
}
