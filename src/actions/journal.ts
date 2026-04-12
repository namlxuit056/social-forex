"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const tradeSchema = z.object({
  symbol: z.string().min(2).max(32),
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.coerce.number().positive(),
  stopLoss: z.coerce.number().optional().nullable(),
  takeProfit: z.coerce.number().optional().nullable(),
  exitPrice: z.coerce.number().optional().nullable(),
  lotSize: z.coerce.number().positive().optional().nullable(),
  result: z.enum(["WIN", "LOSS", "BREAKEVEN", "PENDING"]),
  pnl: z.coerce.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  openedAt: z.coerce.date().optional(),
  closedAt: z.coerce.date().optional().nullable(),
});

function parseOptNum(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createTrade(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const parsed = tradeSchema.safeParse({
    symbol: formData.get("symbol"),
    direction: formData.get("direction"),
    entry: formData.get("entry"),
    stopLoss: parseOptNum(formData, "stopLoss"),
    takeProfit: parseOptNum(formData, "takeProfit"),
    exitPrice: parseOptNum(formData, "exitPrice"),
    lotSize: parseOptNum(formData, "lotSize"),
    result: formData.get("result") || "PENDING",
    pnl: parseOptNum(formData, "pnl"),
    notes: (formData.get("notes") as string) || null,
    openedAt: formData.get("openedAt") || undefined,
    closedAt: formData.get("closedAt") || null,
  });

  const te = await getTranslations("errors");

  if (!parsed.success) return { error: te("journalInvalidData") };

  const d = parsed.data;
  await prisma.tradeJournal.create({
    data: {
      userId: session.user.id,
      symbol: d.symbol.toUpperCase(),
      direction: d.direction,
      entry: d.entry,
      stopLoss: d.stopLoss,
      takeProfit: d.takeProfit,
      exitPrice: d.exitPrice,
      lotSize: d.lotSize,
      result: d.result,
      pnl: d.pnl,
      notes: d.notes,
      openedAt: d.openedAt,
      closedAt: d.closedAt,
    },
  });

  revalidatePath("/journal");
  return { ok: true };
}

export async function updateTrade(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const te = await getTranslations("errors");

  const tradeId = formData.get("tradeId") as string;
  if (!tradeId) return { error: te("missingTradeId") };

  const trade = await prisma.tradeJournal.findUnique({
    where: { id: tradeId },
  });
  if (!trade || trade.userId !== session.user.id) {
    return { error: te("journalForbidden") };
  }

  const parsed = tradeSchema.safeParse({
    symbol: formData.get("symbol"),
    direction: formData.get("direction"),
    entry: formData.get("entry"),
    stopLoss: parseOptNum(formData, "stopLoss"),
    takeProfit: parseOptNum(formData, "takeProfit"),
    exitPrice: parseOptNum(formData, "exitPrice"),
    lotSize: parseOptNum(formData, "lotSize"),
    result: formData.get("result") || "PENDING",
    pnl: parseOptNum(formData, "pnl"),
    notes: (formData.get("notes") as string) || null,
    openedAt: formData.get("openedAt") || undefined,
    closedAt: formData.get("closedAt") || null,
  });

  if (!parsed.success) return { error: te("journalInvalidData") };

  const d = parsed.data;
  await prisma.tradeJournal.update({
    where: { id: tradeId },
    data: {
      symbol: d.symbol.toUpperCase(),
      direction: d.direction,
      entry: d.entry,
      stopLoss: d.stopLoss,
      takeProfit: d.takeProfit,
      exitPrice: d.exitPrice,
      lotSize: d.lotSize,
      result: d.result,
      pnl: d.pnl,
      notes: d.notes,
      openedAt: d.openedAt,
      closedAt: d.closedAt,
    },
  });

  revalidatePath("/journal");
  return { ok: true };
}

export async function deleteTrade(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const tradeId = formData.get("tradeId") as string;
  if (!tradeId) return;

  const trade = await prisma.tradeJournal.findUnique({
    where: { id: tradeId },
  });
  if (!trade || trade.userId !== session.user.id) return;

  await prisma.tradeJournal.delete({ where: { id: tradeId } });
  revalidatePath("/journal");
}
