"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SCREENER_LOT_DEFAULT_SYMBOL, type ScreenerLotRow } from "@/lib/signals/screener-lot-config";

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

export type UpsertScreenerLotResult =
  | { ok: true; row: ScreenerLotRow }
  | { ok: false; error: string };

export async function upsertScreenerLot(
  symbol: string,
  lotSize: number,
): Promise<UpsertScreenerLotResult> {
  await requireAdmin();

  const parsed = rowSchema.safeParse({ symbol, lotSize });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const row = await prisma.screenerLotConfig.upsert({
    where: { symbol: parsed.data.symbol },
    create: parsed.data,
    update: { lotSize: parsed.data.lotSize },
    select: { id: true, symbol: true, lotSize: true },
  });

  revalidateLocalizedPath("/admin/crons/lot-sizes");
  return { ok: true, row };
}

export type DeleteScreenerLotResult = { ok: true } | { ok: false; error: string };

export async function deleteScreenerLot(id: string, symbol: string): Promise<DeleteScreenerLotResult> {
  await requireAdmin();

  // The DEFAULT row is the fallback lot for every other symbol — never let it be removed.
  if (symbol === SCREENER_LOT_DEFAULT_SYMBOL) {
    return { ok: false, error: "Không thể xoá dòng DEFAULT (lot mặc định)." };
  }

  try {
    await prisma.screenerLotConfig.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Không tìm thấy dòng này (có thể đã bị xoá)." };
  }

  revalidateLocalizedPath("/admin/crons/lot-sizes");
  return { ok: true };
}
