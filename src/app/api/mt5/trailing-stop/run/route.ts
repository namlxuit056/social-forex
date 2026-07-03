import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPipSize } from "@/lib/mt5/pip-size";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === expected || req.nextUrl.searchParams.get("secret") === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const configs = await prisma.trailingStopConfig.findMany({
    include: { connection: { select: { id: true, lastPositions: true } } },
  });

  let processed = 0;
  let updated = 0;
  let removed = 0;

  for (const config of configs) {
    processed += 1;
    try {
      const positions = Array.isArray(config.connection.lastPositions)
        ? (config.connection.lastPositions as Record<string, unknown>[])
        : [];
      const pos = positions.find((p) => p.ticket != null && String(p.ticket) === config.ticket);

      if (!pos) {
        await prisma.trailingStopConfig.delete({ where: { id: config.id } });
        removed += 1;
        continue;
      }

      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const symbol = typeof pos.symbol === "string" ? pos.symbol : null;
      const type = typeof pos.type === "string" ? pos.type : null;
      const priceOpen = num(pos.priceOpen);
      const priceCurrent = num(pos.priceCurrent);
      const stopLoss = num(pos.stopLoss);
      const takeProfit = num(pos.takeProfit);

      if (!symbol || !type || priceOpen == null || priceCurrent == null) continue;

      const isBuy = type.toUpperCase().startsWith("BUY");
      const dir = isBuy ? 1 : -1;
      const pipSize = getPipSize(symbol);
      const distance = config.distancePips * pipSize;

      const profitDistance = (priceCurrent - priceOpen) * dir;
      if (profitDistance <= distance) continue;

      const candidateSl = priceCurrent - dir * distance;

      const shouldUpdate = isBuy
        ? stopLoss == null || candidateSl > stopLoss + pipSize * 0.5
        : stopLoss == null || candidateSl < stopLoss - pipSize * 0.5;

      if (!shouldUpdate) continue;

      await prisma.mt5Command.create({
        data: {
          connectionId: config.connectionId,
          type: "MODIFY_POSITION",
          ticket: config.ticket,
          stopLoss: candidateSl,
          takeProfit,
        },
      });
      updated += 1;
    } catch (err) {
      console.error(`trailing-stop: failed to process config ${config.id}`, err);
    }
  }

  return NextResponse.json({ processed, updated, removed });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
