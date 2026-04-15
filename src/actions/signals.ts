"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { rateLimit } from "@/lib/rate-limit";
import { parseAndValidateImageUrls } from "@/lib/signal-images";
import { notifySignalSubscribers } from "@/lib/signals/notify-on-signal-create";

const SIGNAL_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

function optNum(fd: FormData, key: string): number | undefined {
  const raw = fd.get(key);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const createSignalSchema = z.object({
  symbol: z.string().min(3).max(32),
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.coerce.number().positive(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  takeProfit2: z.number().optional(),
  takeProfit3: z.number().optional(),
  tier: z.enum(["FREE", "VIP"]),
  notes: z.string().max(2000).optional(),
});

export async function createSignal(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const parsed = createSignalSchema.safeParse({
    symbol: formData.get("symbol"),
    direction: formData.get("direction"),
    entry: formData.get("entry"),
    stopLoss: optNum(formData, "stopLoss"),
    takeProfit: optNum(formData, "takeProfit"),
    takeProfit2: optNum(formData, "takeProfit2"),
    takeProfit3: optNum(formData, "takeProfit3"),
    tier: formData.get("tier"),
    notes: (formData.get("notes") as string) || undefined,
  });
  const t = await getTranslations("errors");

  if (!parsed.success) {
    return { error: t("invalidData") };
  }

  const { ok } = rateLimit(`signal:${userId}`, 5, 60_000);
  if (!ok) return { error: t("rateLimitSignal") };

  const data = parsed.data;
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (data.tier === "VIP" && !isVipActive(dbUser?.vipUntil)) {
    return { error: t("vipSignalOnly") };
  }

  const imageUrlFields = formData.getAll("imageUrls");
  const imagesParsed = parseAndValidateImageUrls(imageUrlFields);
  if (!imagesParsed.ok) {
    return { error: t(imagesParsed.errorKey) };
  }

  const signal = await prisma.signal.create({
    data: {
      authorId: userId,
      symbol: data.symbol.toUpperCase(),
      direction: data.direction,
      entry: data.entry,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      takeProfit2: data.takeProfit2,
      takeProfit3: data.takeProfit3,
      tier: data.tier,
      notes: data.notes,
      images:
        imagesParsed.urls.length > 0
          ? {
              create: imagesParsed.urls.map((url, sortOrder) => ({
                url,
                sortOrder,
              })),
            }
          : undefined,
    },
  });

  try {
    await notifySignalSubscribers({
      id: signal.id,
      symbol: signal.symbol,
      tier: signal.tier,
      authorId: signal.authorId,
    });
  } catch {
    // Non-blocking: signal already created
  }

  revalidatePath("/signals");
  revalidatePath(`/signals/${signal.id}`);
  revalidatePath("/leaderboard");
  redirect("/signals");
}

const closeSignalSchema = z.object({
  signalId: z.string().min(1),
  status: z.enum(["CLOSED_WIN", "CLOSED_LOSS", "CANCELLED"]),
});

export async function closeSignal(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;

  const t = await getTranslations("errors");

  const parsed = closeSignalSchema.safeParse({
    signalId: formData.get("signalId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: t("signalCloseInvalid") };
  }

  const { signalId, status } = parsed.data;
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  });
  if (!signal || signal.authorId !== userId) {
    return { error: t("forbidden") };
  }
  if (signal.status !== "ACTIVE") {
    return { error: t("signalAlreadyClosed") };
  }

  await prisma.signal.update({
    where: { id: signalId },
    data: { status, closedAt: new Date() },
  });

  revalidatePath("/signals");
  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/leaderboard");
  return { ok: true };
}

const updateSignalSchema = z.object({
  signalId: z.string().min(1),
  stopLoss: z.number().optional().nullable(),
  takeProfit: z.number().optional().nullable(),
  takeProfit2: z.number().optional().nullable(),
  takeProfit3: z.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

function numOrEmpty(fd: FormData, key: string): number | null | undefined {
  const raw = fd.get(key);
  if (raw === null) return undefined;
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function updateSignal(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;
  const t = await getTranslations("errors");

  const parsed = updateSignalSchema.safeParse({
    signalId: formData.get("signalId"),
    stopLoss: numOrEmpty(formData, "stopLoss"),
    takeProfit: numOrEmpty(formData, "takeProfit"),
    takeProfit2: numOrEmpty(formData, "takeProfit2"),
    takeProfit3: numOrEmpty(formData, "takeProfit3"),
    notes: (() => {
      const v = formData.get("notes");
      if (v === null) return undefined;
      return String(v).trim() === "" ? null : String(v);
    })(),
  });
  if (!parsed.success) {
    return { error: t("invalidData") };
  }

  const { signalId, stopLoss, takeProfit, takeProfit2, takeProfit3, notes } =
    parsed.data;

  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
  });
  if (!signal || signal.authorId !== userId) {
    return { error: t("signalEditForbidden") };
  }
  if (signal.status !== "ACTIVE") {
    return { error: t("signalEditNotActive") };
  }
  const elapsed = Date.now() - signal.createdAt.getTime();
  if (elapsed > SIGNAL_EDIT_WINDOW_MS) {
    return { error: t("signalEditWindowExpired") };
  }

  const data: {
    stopLoss?: number | null;
    takeProfit?: number | null;
    takeProfit2?: number | null;
    takeProfit3?: number | null;
    notes?: string | null;
  } = {};
  const logs: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[] = [];

  const numFields: {
    key: "stopLoss" | "takeProfit" | "takeProfit2" | "takeProfit3";
    next: number | null | undefined;
    label: string;
  }[] = [
    { key: "stopLoss", next: stopLoss, label: "stopLoss" },
    { key: "takeProfit", next: takeProfit, label: "takeProfit" },
    { key: "takeProfit2", next: takeProfit2, label: "takeProfit2" },
    { key: "takeProfit3", next: takeProfit3, label: "takeProfit3" },
  ];

  for (const { key, next, label } of numFields) {
    if (next === undefined) continue;
    const prev = signal[key];
    const prevStr =
      prev === null || prev === undefined ? null : String(prev);
    const nextStr = next === null ? null : String(next);
    if (prevStr === nextStr) continue;
    data[key] = next;
    logs.push({
      field: label,
      oldValue: prevStr,
      newValue: nextStr,
    });
  }

  if (notes !== undefined) {
    const prevStr = signal.notes ?? null;
    const nextStr = notes ?? null;
    if (prevStr !== nextStr) {
      data.notes = notes;
      logs.push({
        field: "notes",
        oldValue: prevStr,
        newValue: nextStr,
      });
    }
  }

  if (Object.keys(data).length === 0) {
    return { error: t("signalEditNoChanges") };
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.signal.update({
        where: { id: signalId },
        data,
      });
      if (logs.length > 0) {
        await tx.signalEditLog.createMany({
          data: logs.map((l) => ({
            signalId,
            userId,
            field: l.field,
            oldValue: l.oldValue,
            newValue: l.newValue,
          })),
        });
      }
    },
  );

  revalidatePath("/signals");
  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/leaderboard");
  return { ok: true };
}
