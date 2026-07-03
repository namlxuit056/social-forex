"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Scissors,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { closePosition, modifyPosition } from "@/actions/mt5-commands";
import { getPipSize } from "@/lib/mt5/pip-size";
import { ModifyDialog } from "./modify-dialog";
import { PartialCloseDialog } from "./partial-close-dialog";
import { LockProfitMenu } from "./lock-profit-menu";
import type { LivePosition } from "@/app/[locale]/journal/journal-live-panel";

type SortKey = "symbol" | "profit" | "openedAt" | null;
type SortDir = "asc" | "desc";

function fmt(v: number | null, d = 5) {
  return v == null ? "—" : v.toFixed(d);
}

function fmtProfit(v: number | null) {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}`;
}

function SideBadge({ type }: { type: string }) {
  const isBuy = type.toUpperCase().startsWith("BUY");
  return (
    <Badge
      variant={isBuy ? "default" : "destructive"}
      className={cn("min-w-16 justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", !isBuy && "bg-destructive text-white")}
    >
      {isBuy ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {type}
    </Badge>
  );
}

function PL({ value, className }: { value: number | null; className?: string }) {
  const v = value ?? 0;
  return (
    <span className={cn("font-mono font-semibold tabular-nums", v >= 0 ? "text-emerald-500" : "text-red-500", className)}>
      {fmtProfit(value)}
    </span>
  );
}

function estimateRisk(p: LivePosition, equity: number | null) {
  if (p.priceOpen == null || p.priceCurrent == null || p.stopLoss == null || p.profit == null || equity == null || equity <= 0) {
    return null;
  }
  const isBuy = p.type.toUpperCase().startsWith("BUY");
  const dir = isBuy ? 1 : -1;
  const priceDiff = (p.priceCurrent - p.priceOpen) * dir;
  const pipSize = getPipSize(p.symbol);
  if (Math.abs(priceDiff) < pipSize * 0.5) return null;
  const valuePerUnit = p.profit / priceDiff;
  const slDistancePrice = Math.abs(p.priceOpen - p.stopLoss);
  const riskAmount = Math.abs(valuePerUnit) * slDistancePrice;
  const riskPct = (riskAmount / equity) * 100;
  const slDistancePips = slDistancePrice / pipSize;
  return { riskAmount, riskPct, slDistancePips };
}

function RiskCell({ p, equity, currency }: { p: LivePosition; equity: number | null; currency: string | null }) {
  const risk = estimateRisk(p, equity);
  if (!risk) {
    return <span className="font-mono text-xs tabular-nums text-muted-foreground">—</span>;
  }
  const tone = risk.riskPct > 5 ? "text-red-500" : risk.riskPct > 2 ? "text-amber-500" : "text-muted-foreground";
  return (
    <span className={cn("font-mono text-xs font-semibold tabular-nums", tone)}>
      -{risk.riskAmount.toFixed(2)} {currency ?? ""} ({risk.riskPct.toFixed(1)}%)
    </span>
  );
}

function openedAgo(openedAt: string | null) {
  if (!openedAt) return "—";
  const d = new Date(openedAt);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${formatDistanceToNowStrict(d)} ago`;
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs tabular-nums", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Activity className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No open positions</p>
      <p className="text-xs text-muted-foreground">New trades from your EA will appear here automatically.</p>
    </div>
  );
}

function FilterEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Activity className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No positions match the filter</p>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-1 font-medium text-inherit",
        align === "right" && "flex-row-reverse",
      )}
    >
      {label}
      {active && (dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
    </button>
  );
}

type Props = {
  positions: LivePosition[];
  currency: string | null;
  equity: number | null;
};

export function PositionsTable({ positions, currency, equity }: Props) {
  const [modifyTarget, setModifyTarget] = useState<LivePosition | null>(null);
  const [partialCloseTarget, setPartialCloseTarget] = useState<LivePosition | null>(null);
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const [movingBE, setMovingBE] = useState<Set<string>>(new Set());
  const [selectedRaw, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [sideFilter, setSideFilter] = useState<"all" | "buy" | "sell">("all");
  const [, startTransition] = useTransition();

  const selected = useMemo(() => {
    const tickets = new Set(positions.map((p) => p.ticket));
    return new Set([...selectedRaw].filter((t) => tickets.has(t)));
  }, [selectedRaw, positions]);

  const symbols = useMemo(() => Array.from(new Set(positions.map((p) => p.symbol))).sort(), [positions]);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      if (symbolFilter !== "all" && p.symbol !== symbolFilter) return false;
      if (sideFilter !== "all") {
        const isBuy = p.type.toUpperCase().startsWith("BUY");
        if (sideFilter === "buy" && !isBuy) return false;
        if (sideFilter === "sell" && isBuy) return false;
      }
      return true;
    });
  }, [positions, symbolFilter, sideFilter]);

  const sortedPositions = useMemo(() => {
    if (!sortKey) return filteredPositions;
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filteredPositions].sort((a, b) => {
      if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * dirMul;
      if (sortKey === "profit") return ((a.profit ?? 0) - (b.profit ?? 0)) * dirMul;
      const aTime = a.openedAt ? new Date(a.openedAt).getTime() : null;
      const bTime = b.openedAt ? new Date(b.openedAt).getTime() : null;
      if (aTime == null && bTime == null) return 0;
      if (aTime == null) return 1;
      if (bTime == null) return -1;
      return (aTime - bTime) * dirMul;
    });
  }, [filteredPositions, sortKey, sortDir]);

  function toggleSort(key: Exclude<SortKey, null>) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  function toggleSelected(ticket: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticket)) next.delete(ticket);
      else next.add(ticket);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === sortedPositions.length ? new Set() : new Set(sortedPositions.map((p) => p.ticket)),
    );
  }

  function handleClose(ticket: string) {
    setClosing((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await closePosition(ticket);
    });
  }

  function handleCloseSelected() {
    const tickets = Array.from(selected);
    setClosing((prev) => new Set([...prev, ...tickets]));
    startTransition(async () => {
      await Promise.all(tickets.map((ticket) => closePosition(ticket)));
      setSelected(new Set());
    });
  }

  function handleLockProfit(ticket: string, newSl: number) {
    const p = positions.find((pos) => pos.ticket === ticket);
    if (!p) return;
    setMovingBE((prev) => new Set(prev).add(ticket));
    startTransition(async () => {
      await modifyPosition(ticket, newSl, p.takeProfit);
    });
  }

  const allSelected = sortedPositions.length > 0 && selected.size === sortedPositions.length;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">Open Positions</h2>
          <span className="text-xs text-muted-foreground">{positions.length} active</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button size="sm" variant="destructive" className="gap-1.5" />}
              >
                <X className="size-3.5" />
                Close Selected ({selected.size})
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Close {selected.size} position{selected.size !== 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This queues a CLOSE_POSITION command for each selected ticket. Your MT5 EA will close them on the next heartbeat. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCloseSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, close selected
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {positions.length > 0 && (
            <>
              <Select value={symbolFilter} onValueChange={(v) => v && setSymbolFilter(v)}>
                <SelectTrigger size="sm">
                  <SelectValue placeholder="All symbols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All symbols</SelectItem>
                  {symbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sideFilter} onValueChange={(v) => v && setSideFilter(v as "all" | "buy" | "sell")}>
                <SelectTrigger size="sm">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      {positions.length === 0 ? (
        <EmptyState />
      ) : sortedPositions.length === 0 ? (
        <FilterEmptyState />
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-235 border-collapse text-sm">
              <thead>
                <tr className="border-t border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border accent-primary"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-medium">Ticket</th>
                  <th className="px-3 py-3 text-left font-medium">
                    <SortHeader
                      label="Symbol"
                      active={sortKey === "symbol"}
                      dir={sortDir}
                      onClick={() => toggleSort("symbol")}
                    />
                  </th>
                  <th className="px-3 py-3 text-left font-medium">Type</th>
                  <th className="px-3 py-3 text-right font-medium">Lot</th>
                  <th className="px-3 py-3 text-right font-medium">Entry</th>
                  <th className="px-3 py-3 text-right font-medium">Current</th>
                  <th className="px-3 py-3 text-right font-medium">SL</th>
                  <th className="px-3 py-3 text-right font-medium">TP</th>
                  <th className="px-3 py-3 text-right font-medium">
                    <SortHeader
                      label={`P/L ${currency ?? ""}`}
                      active={sortKey === "profit"}
                      dir={sortDir}
                      onClick={() => toggleSort("profit")}
                      align="right"
                    />
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Risk</th>
                  <th className="px-3 py-3 text-right font-medium">
                    <SortHeader
                      label="Opened"
                      active={sortKey === "openedAt"}
                      dir={sortDir}
                      onClick={() => toggleSort("openedAt")}
                      align="right"
                    />
                  </th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((p) => {
                  const isClosing = closing.has(p.ticket);
                  const isMovingBE = movingBE.has(p.ticket);
                  return (
                    <tr key={p.ticket} className={cn("border-t border-border transition-colors hover:bg-muted/40", isClosing && "opacity-40")}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border accent-primary"
                          checked={selected.has(p.ticket)}
                          onChange={() => toggleSelected(p.ticket)}
                          aria-label={`Select position ${p.ticket}`}
                        />
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-muted-foreground">{p.ticket}</td>
                      <td className="px-3 py-4 font-semibold">{p.symbol}</td>
                      <td className="px-3 py-4">
                        <SideBadge type={p.type} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(p.volume, 2)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(p.priceOpen)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums">{fmt(p.priceCurrent)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{fmt(p.stopLoss)}</td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-muted-foreground">{fmt(p.takeProfit)}</td>
                      <td className="px-3 py-4 text-right">
                        <PL value={p.profit} />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <RiskCell p={p} equity={equity} currency={currency} />
                      </td>
                      <td className="px-3 py-4 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {openedAgo(p.openedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <LockProfitMenu
                            position={p}
                            disabled={isClosing}
                            queued={isMovingBE}
                            onLock={handleLockProfit}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPartialCloseTarget(p)}
                            disabled={isClosing || p.volume == null || p.volume <= 0}
                            className="gap-1.5"
                          >
                            <Scissors className="size-3.5" />
                            Partial
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModifyTarget(p)}
                            disabled={isClosing}
                            className="gap-1.5"
                          >
                            <SlidersHorizontal className="size-3.5" />
                            Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClose(p.ticket)}
                            disabled={isClosing}
                            className="gap-1.5"
                          >
                            <X className="size-3.5" />
                            {isClosing ? "Queued" : "Close"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 p-3 md:hidden">
            {sortedPositions.map((p) => {
              const isClosing = closing.has(p.ticket);
              const isMovingBE = movingBE.has(p.ticket);
              const risk = estimateRisk(p, equity);
              return (
                <div key={p.ticket} className={cn("relative rounded-xl border border-border bg-background p-4 transition-opacity", isClosing && "opacity-40")}>
                  <input
                    type="checkbox"
                    className="absolute left-3 top-3 size-4 rounded border-border accent-primary"
                    checked={selected.has(p.ticket)}
                    onChange={() => toggleSelected(p.ticket)}
                    aria-label={`Select position ${p.ticket}`}
                  />
                  <div className="flex items-start justify-between gap-3 pl-6">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{p.symbol}</span>
                      <SideBadge type={p.type} />
                    </div>
                    <div className="text-right">
                      <PL value={p.profit} className="text-base" />
                      <p className="text-[11px] text-muted-foreground">P/L {currency ?? ""}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Row label="Lot" value={fmt(p.volume, 2)} />
                    <Row label="Ticket" value={p.ticket} muted />
                    <Row label="Entry" value={fmt(p.priceOpen)} />
                    <Row label="Current" value={fmt(p.priceCurrent)} />
                    <Row label="SL" value={fmt(p.stopLoss)} muted />
                    <Row label="TP" value={fmt(p.takeProfit)} muted />
                    <Row label="Opened" value={openedAgo(p.openedAt)} muted />
                    <Row label="Risk" value={risk ? `-${risk.riskAmount.toFixed(2)} (${risk.riskPct.toFixed(1)}%)` : "—"} muted />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <LockProfitMenu
                      position={p}
                      disabled={isClosing}
                      queued={isMovingBE}
                      onLock={handleLockProfit}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPartialCloseTarget(p)}
                      disabled={isClosing || p.volume == null || p.volume <= 0}
                      className="flex-1 gap-1.5"
                    >
                      <Scissors className="size-3.5" />
                      Partial
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModifyTarget(p)}
                      disabled={isClosing}
                      className="flex-1 gap-1.5"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleClose(p.ticket)}
                      disabled={isClosing}
                      className="flex-1 gap-1.5"
                    >
                      <X className="size-3.5" />
                      {isClosing ? "Queued" : "Close"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {modifyTarget && (
        <ModifyDialog
          open
          onOpenChange={(v) => { if (!v) setModifyTarget(null); }}
          ticket={modifyTarget.ticket}
          symbol={modifyTarget.symbol}
          currentSl={modifyTarget.stopLoss}
          currentTp={modifyTarget.takeProfit}
        />
      )}

      {partialCloseTarget && (
        <PartialCloseDialog
          open
          onOpenChange={(v) => { if (!v) setPartialCloseTarget(null); }}
          ticket={partialCloseTarget.ticket}
          symbol={partialCloseTarget.symbol}
          maxVolume={partialCloseTarget.volume ?? 0}
        />
      )}
    </div>
  );
}
