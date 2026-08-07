import { prisma } from "@/lib/prisma";
import { getPipSize } from "@/lib/mt5/pip-size";
import { commandExpiresAt } from "@/lib/mt5/command-ttl";

export type TrailingStopRunSummary = { processed: number; updated: number; removed: number };

/** Scans every TrailingStopConfig, queues a TRAIL_UPDATE MT5 command when price has
 * moved far enough to tighten the stop, and drops configs whose position is gone.
 * Shared by the cron (/api/mt5/trailing-stop/run) and the manual "Run now" trigger in
 * /admin/crons. */
export async function runTrailingStopUpdate(): Promise<TrailingStopRunSummary> {
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

      // Avoid stacking duplicate trail updates for the same ticket while the EA
      // is still catching up on a previous one (common during fast-moving markets).
      const alreadyQueued = await prisma.mt5Command.findFirst({
        where: {
          connectionId: config.connectionId,
          ticket: config.ticket,
          type: "TRAIL_UPDATE",
          status: { in: ["PENDING", "SENT"] },
        },
        select: { id: true },
      });
      if (alreadyQueued) continue;

      // The final SL is recomputed by the EA from the live price at execution time
      // (see ModifyTrailingStopByTicket in SocialForexBridge.mq5) rather than the
      // stale snapshot price used here, which only decides whether a trail is due.
      await prisma.mt5Command.create({
        data: {
          connectionId: config.connectionId,
          type: "TRAIL_UPDATE",
          ticket: config.ticket,
          trailDistancePips: config.distancePips,
          takeProfit,
          expiresAt: commandExpiresAt("TRAIL_UPDATE"),
        },
      });
      updated += 1;
    } catch (err) {
      console.error(`trailing-stop: failed to process config ${config.id}`, err);
    }
  }

  return { processed, updated, removed };
}
