import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import {
  avgR,
  buildEquityCurve,
  maxDrawdownR,
  profitFactorR,
  signalR,
  type ClosedSignalForEquity,
} from "@/lib/signals/provider-equity";
import { TrackRecordTable } from "./track-record-table";
import { cn } from "@/lib/utils";

function fmtR(v: number) {
  const sign = v >= 0 ? "+" : "-";
  return `${sign}${Math.abs(v).toFixed(1)}R`;
}

function Tile({ label, value, tone }: { label: string; value: string; tone: "pos" | "neg" | "neutral" }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-base font-bold tabular-nums",
          tone === "pos" && "text-emerald-500",
          tone === "neg" && "text-red-500",
          tone === "neutral" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export async function TrackRecordSection({
  profileUserId,
  locale,
}: {
  profileUserId: string;
  locale: string;
}) {
  const t = await getTranslations("profile");

  const signals = await prisma.signal.findMany({
    where: {
      authorId: profileUserId,
      status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] },
      closedAt: { not: null },
    },
    select: {
      id: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      status: true,
      createdAt: true,
      closedAt: true,
    },
    orderBy: { closedAt: "desc" },
  });

  if (signals.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t("trackRecord.empty")}
      </section>
    );
  }

  const closed = signals.map((s) => ({
    ...s,
    status: s.status as ClosedSignalForEquity["status"],
    closedAt: s.closedAt!,
  }));

  const maxDD = maxDrawdownR(buildEquityCurve(closed));
  const pf = profitFactorR(closed);
  const avg = avgR(closed);

  const rows = closed.map((s) => ({
    id: s.id,
    symbol: s.symbol,
    direction: s.direction,
    entry: s.entry,
    stopLoss: s.stopLoss,
    takeProfit: s.takeProfit,
    status: s.status,
    r: Math.round(signalR(s) * 100) / 100,
    openedAt: s.createdAt.toISOString(),
    closedAt: s.closedAt.toISOString(),
  }));

  const symbols = Array.from(new Set(rows.map((r) => r.symbol))).sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Tile
          label={t("trackRecord.tileMaxDrawdown")}
          value={maxDD === 0 ? "—" : fmtR(maxDD)}
          tone={maxDD === 0 ? "neutral" : "neg"}
        />
        <Tile
          label={t("trackRecord.tileProfitFactor")}
          value={pf === Infinity ? "∞" : pf === 0 ? "—" : pf.toFixed(2)}
          tone={pf === 0 ? "neutral" : pf >= 1 ? "pos" : "neg"}
        />
        <Tile label={t("trackRecord.tileAvgR")} value={fmtR(avg)} tone={avg >= 0 ? "pos" : "neg"} />
      </div>
      <TrackRecordTable rows={rows} symbols={symbols} locale={locale} />
    </div>
  );
}
