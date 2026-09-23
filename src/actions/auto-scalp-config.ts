"use server";

import { revalidateLocalizedPath } from "@/lib/revalidate-locales";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { z } from "zod";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";

const VALID_SYMBOLS = QUOTE_DEFINITIONS.map((d) => d.symbol);

const globalConfigSchema = z.object({
  enabled: z.boolean(),
  minScore: z.coerce.number().int().min(50).max(95),
  minConfidence: z.coerce.number().int().min(1).max(5),
  maxPerDay: z.coerce.number().int().min(1).max(20),
});

export type AutoScalpGlobalConfig = z.infer<typeof globalConfigSchema>;

export type AutoScalpSymbolRow = {
  id: string;
  symbol: string;
  enabled: boolean;
  lotSize: number;
  lastTradeAt: Date | null;
};

export type AutoScalpFullConfig = AutoScalpGlobalConfig & {
  symbols: AutoScalpSymbolRow[];
};

function symbolLimit(isVip: boolean) {
  return isVip ? 10 : 3;
}

async function requireVip(userId: string): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  return isVipActive(dbUser?.vipUntil);
}

export async function getAutoScalpConfig(): Promise<AutoScalpFullConfig | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const config = await prisma.autoScalpConfig.findUnique({
    where: { userId: session.user.id },
    include: {
      symbols: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!config) return null;

  return {
    enabled: config.enabled,
    minScore: config.minScore,
    minConfidence: config.minConfidence,
    maxPerDay: config.maxPerDay,
    symbols: config.symbols.map((s) => ({
      id: s.id,
      symbol: s.symbol,
      enabled: s.enabled,
      lotSize: s.lotSize,
      lastTradeAt: s.lastTradeAt,
    })),
  };
}

export async function saveAutoScalpConfig(
  data: AutoScalpGlobalConfig,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const userId = session.user.id;

  if (!(await requireVip(userId))) return { ok: false, error: "vip_required" };

  const parsed = globalConfigSchema.safeParse(data);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    return { ok: false, error: `invalid_data: ${detail}` };
  }

  await prisma.autoScalpConfig.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  revalidateLocalizedPath("/scalping");
  return { ok: true };
}

export async function addAutoScalpSymbol(
  symbol: string,
  lotSize: number,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const userId = session.user.id;

  if (!(await requireVip(userId))) return { ok: false, error: "vip_required" };
  if (!VALID_SYMBOLS.includes(symbol)) return { ok: false, error: "invalid_symbol" };
  if (lotSize < 0.01 || lotSize > 100) return { ok: false, error: "invalid_lot" };

  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { vipUntil: true } });
  const vip = isVipActive(dbUser?.vipUntil);
  const limit = symbolLimit(vip);

  let config = await prisma.autoScalpConfig.findUnique({ where: { userId }, select: { id: true } });
  if (!config) {
    config = await prisma.autoScalpConfig.create({
      data: { userId },
      select: { id: true },
    });
  }

  const existing = await prisma.autoScalpSymbol.count({ where: { configId: config.id } });
  if (existing >= limit) return { ok: false, error: "limit_reached" };

  await prisma.autoScalpSymbol.upsert({
    where: { configId_symbol: { configId: config.id, symbol } },
    create: { configId: config.id, symbol, lotSize, enabled: true },
    update: { lotSize, enabled: true },
  });

  revalidateLocalizedPath("/scalping");
  return { ok: true };
}

export async function removeAutoScalpSymbol(
  symbolId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const userId = session.user.id;

  const config = await prisma.autoScalpConfig.findUnique({ where: { userId }, select: { id: true } });
  if (!config) return { ok: false, error: "not_found" };

  await prisma.autoScalpSymbol.deleteMany({
    where: { id: symbolId, configId: config.id },
  });

  revalidateLocalizedPath("/scalping");
  return { ok: true };
}

export async function toggleAutoScalpSymbol(
  symbolId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" };
  const userId = session.user.id;

  const config = await prisma.autoScalpConfig.findUnique({ where: { userId }, select: { id: true } });
  if (!config) return { ok: false, error: "not_found" };

  await prisma.autoScalpSymbol.updateMany({
    where: { id: symbolId, configId: config.id },
    data: { enabled },
  });

  revalidateLocalizedPath("/scalping");
  return { ok: true };
}
