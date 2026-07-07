"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Crosshair,
  MoreHorizontal,
  Percent,
  Scissors,
  SlidersHorizontal,
  Target,
  X,
  type LucideIcon,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { closePosition, modifyPosition } from "@/actions/mt5-commands";
import { estimateStopLossForRisk, estimateTakeProfitForReward, roundToSymbolPrecision } from "@/lib/calculators";
import { getPipSize } from "@/lib/mt5/pip-size";
import { ModifyDialog } from "./modify-dialog";
import { PartialCloseDialog } from "./partial-close-dialog";
import { TrailingStopDialog } from "./trailing-stop-dialog";
import { PositionReviewDialog } from "./position-review-dialog";
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

// MT5 reports 0 (not null) for an unset SL/TP — surface it as "Not set" rather than a fake price.
function LevelValue({ value }: { value: number | null }) {
  if (value == null || value === 0) {
    return <span className="italic text-muted-foreground/70">Not set</span>;
  }
  return <>{fmt(value)}</>;
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

// Reverse-engineers $ profit per 1.0 price move from the position's own live `profit` —
// this already accounts for lot/contract size and currency conversion via the real broker
// figure, so it's more reliable than a generic contract-size table for an OPEN position.
function deriveValuePerUnit(p: LivePosition): number | null {
  if (p.priceOpen == null || p.priceCurrent == null || p.profit == null) return null;
  const isBuy = p.type.toUpperCase().startsWith("BUY");
  const dir = isBuy ? 1 : -1;
  const priceDiff = (p.priceCurrent - p.priceOpen) * dir;
  const pipSize = getPipSize(p.symbol);
  if (Math.abs(priceDiff) < pipSize * 0.5) return null;
  return p.profit / priceDiff;
}

function estimateRisk(p: LivePosition, equity: number | null) {
  if (p.priceOpen == null || p.stopLoss == null || p.stopLoss === 0 || equity == null || equity <= 0) {
    return null;
  }
  const valuePerUnit = deriveValuePerUnit(p);
  if (valuePerUnit == null) return null;
  const isBuy = p.type.toUpperCase().startsWith("BUY");
  const pipSize = getPipSize(p.symbol);
  // Only count the stop as "risk" if it sits on the adverse side of entry — once it's
  // been moved to breakeven or beyond (e.g. locked profit), there's no more downside.
  const slDistancePrice = isBuy ? p.priceOpen - p.stopLoss : p.stopLoss - p.priceOpen;
  if (slDistancePrice <= 0) {
    return { riskAmount: 0, riskPct: 0, slDistancePips: 0, protected: true };
  }
  const riskAmount = Math.abs(valuePerUnit) * slDistancePrice;
  const riskPct = (riskAmount / equity) * 100;
  const slDistancePips = slDistancePrice / pipSize;
  return { riskAmount, riskPct, slDistancePips, protected: false };
}

// $ gained if TP is hit — same reverse-engineered value-per-unit as estimateRisk, projected
// forward from entry to the TP price instead of the SL price.
function estimateTakeProfitAmount(p: LivePosition): number | null {
  if (p.priceOpen == null || p.takeProfit == null || p.takeProfit === 0) return null;
  const valuePerUnit = deriveValuePerUnit(p);
  if (valuePerUnit == null) return null;
  const isBuy = p.type.toUpperCase().startsWith("BUY");
  const tpDistancePrice = isBuy ? p.takeProfit - p.priceOpen : p.priceOpen - p.takeProfit;
  return Math.abs(valuePerUnit) * tpDistancePrice;
}

function estimateRiskReward(p: LivePosition, equity: number | null): number | null {
  const risk = estimateRisk(p, equity);
  const tpAmount = estimateTakeProfitAmount(p);
  if (!risk || risk.protected || risk.riskAmount <= 0 || tpAmount == null || tpAmount <= 0) return null;
  return tpAmount / risk.riskAmount;
}

function SlAmount({ p, equity }: { p: LivePosition; equity: number | null }) {
  const risk = estimateRisk(p, equity);
  if (!risk || risk.protected || risk.riskAmount <= 0) return null;
  return <span className="block font-mono text-[11px] text-red-500">-{risk.riskAmount.toFixed(2)}</span>;
}

function TpAmount({ p }: { p: LivePosition }) {
  const amount = estimateTakeProfitAmount(p);
  if (amount == null || amount <= 0) return null;
  return <span className="block font-mono text-[11px] text-emerald-500">+{amount.toFixed(2)}</span>;
}

function RiskCell({ p, equity, currency }: { p: LivePosition; equity: number | null; currency: string | null }) {
  const risk = estimateRisk(p, equity);
  const riskReward = estimateRiskReward(p, equity);
  if (!risk) {
    return <span className="font-mono text-xs tabular-nums text-muted-foreground">—</span>;
  }
  if (risk.protected) {
    return <span className="font-mono text-xs font-semibold tabular-nums text-emerald-500">Protected</span>;
  }
  const tone = risk.riskPct > 5 ? "text-red-500" : risk.riskPct > 2 ? "text-amber-500" : "text-muted-foreground";
  return (
    <span className="inline-flex flex-col items-end">
      <span className={cn("font-mono text-xs font-semibold tabular-nums", tone)}>
        -{risk.riskAmount.toFixed(2)} {currency ?? ""} ({risk.riskPct.toFixed(1)}%)
      </span>
      {riskReward != null && (
        <span
          className={cn(
            "font-mono text-[11px] font-semibold tabular-nums",
            riskReward >= 2
              ? "text-emerald-600 dark:text-emerald-400"
              : riskReward >= 1
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive",
          )}
        >
          R:R 1:{riskReward.toFixed(2)}
        </span>
      )}
    </span>
  );
}

function openedAgo(openedAt: string | null) {
  if (!openedAt) return "—";
  const d = new Date(openedAt);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${formatDistanceToNowStrict(d)} ago`;
}

function Row({ label, value, muted }: { label: string; value: ReactNode; muted?: boolean }) {
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

function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  variant = "outline",
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  variant?: "outline" | "destructive" | "secondary";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button size="icon" variant={variant} onClick={onClick} disabled={disabled} aria-label={label} />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

// Groups the less-frequent per-position actions behind a menu so the desktop table's sticky
// actions column stays narrow enough that the data columns don't require horizontal scrolling.
function RowActionsMenu({
  disabled,
  quickSlDisabled,
  quickSlPending,
  onQuickSl,
  quickTpDisabled,
  quickTpPending,
  onQuickTp,
  partialDisabled,
  onPartial,
  onModify,
  trailingPips,
  onTrail,
  onAiReview,
}: {
  disabled: boolean;
  quickSlDisabled: boolean;
  quickSlPending: boolean;
  onQuickSl: () => void;
  quickTpDisabled: boolean;
  quickTpPending: boolean;
  onQuickTp: () => void;
  partialDisabled: boolean;
  onPartial: () => void;
  onModify: () => void;
  trailingPips: number | null;
  onTrail: () => void;
  onAiReview: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="icon" variant="outline" disabled={disabled} aria-label="More actions" />}
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuItem onClick={onQuickSl} disabled={quickSlDisabled}>
          <Percent className="size-3.5" />
          {quickSlPending ? "SL 10% — queued" : "Set SL to 10% risk"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onQuickTp} disabled={quickTpDisabled}>
          <Target className="size-3.5" />
          {quickTpPending ? "TP 20% — queued" : "Set TP to 20% reward"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPartial} disabled={partialDisabled}>
          <Scissors className="size-3.5" />
          Partial close
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onModify}>
          <SlidersHorizontal className="size-3.5" />
          Modify SL/TP
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTrail}>
          <Crosshair className="size-3.5" />
          {trailingPips != null ? `Trailing stop — ${trailingPips}p` : "Trailing stop"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAiReview}>
          <BrainCircuit className="size-3.5" />
          AI trend check
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const [trailingTarget, setTrailingTarget] = useState<LivePosition | null>(null);
  const [aiReviewTarget, setAiReviewTarget] = useState<LivePosition | null>(null);
  const [closing, setClosing] = useState<Set<string>>(new Set());
  const [movingBE, setMovingBE] = useState<Set<string>>(new Set());
  const [quickSlPending, setQuickSlPending] = useState<Set<string>>(new Set());
  const [quickTpPending, setQuickTpPending] = useState<Set<string>>(new Set());
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

  function handleQuickStopLoss(p: LivePosition) {
    if (p.priceOpen == null || p.volume == null || equity == null) return;
    const isBuy = p.type.toUpperCase().startsWith("BUY");
    const stopLoss = estimateStopLossForRisk({
      symbol: p.symbol,
      isBuy,
      entryPrice: p.priceOpen,
      volume: p.volume,
      equity,
    });
    if (stopLoss == null) return;
    const rounded = roundToSymbolPrecision(stopLoss, p.symbol);
    setQuickSlPending((prev) => new Set(prev).add(p.ticket));
    startTransition(async () => {
      await modifyPosition(p.ticket, rounded, p.takeProfit);
    });
  }

  function handleQuickTakeProfit(p: LivePosition) {
    if (p.priceOpen == null || p.volume == null || equity == null) return;
    const isBuy = p.type.toUpperCase().startsWith("BUY");
    const takeProfit = estimateTakeProfitForReward({
      symbol: p.symbol,
      isBuy,
      entryPrice: p.priceOpen,
      volume: p.volume,
      equity,
    });
    if (takeProfit == null) return;
    const rounded = roundToSymbolPrecision(takeProfit, p.symbol);
    setQuickTpPending((prev) => new Set(prev).add(p.ticket));
    startTransition(async () => {
      await modifyPosition(p.ticket, p.stopLoss, rounded);
    });
  }

  const allSelected = sortedPositions.length > 0 && selected.size === sortedPositions.length;

  return (
    <TooltipProvider>
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
                  <SelectValue placeholder="All symbols">
                    {(v: string) => (v === "all" ? "All symbols" : v)}
                  </SelectValue>
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
                  <SelectValue placeholder="All">
                    {(v: string) => (v === "buy" ? "Buy" : v === "sell" ? "Sell" : "All")}
                  </SelectValue>
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
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-t border-border text-xs text-muted-foreground">
                  <th className="px-3 py-3 text-left font-medium">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-border accent-primary"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-2 py-3 text-left font-medium">Ticket</th>
                  <th className="px-2 py-3 text-left font-medium">
                    <SortHeader
                      label="Symbol"
                      active={sortKey === "symbol"}
                      dir={sortDir}
                      onClick={() => toggleSort("symbol")}
                    />
                  </th>
                  <th className="px-2 py-3 text-left font-medium">Type</th>
                  <th className="px-2 py-3 text-right font-medium">Lot</th>
                  <th className="px-2 py-3 text-right font-medium">Entry / Current</th>
                  <th className="px-2 py-3 text-right font-medium">SL / TP</th>
                  <th className="px-2 py-3 text-right font-medium">
                    <SortHeader
                      label={`P/L ${currency ?? ""}`}
                      active={sortKey === "profit"}
                      dir={sortDir}
                      onClick={() => toggleSort("profit")}
                      align="right"
                    />
                  </th>
                  <th className="px-2 py-3 text-right font-medium">Risk</th>
                  <th className="px-2 py-3 text-right font-medium">
                    <SortHeader
                      label="Opened"
                      active={sortKey === "openedAt"}
                      dir={sortDir}
                      onClick={() => toggleSort("openedAt")}
                      align="right"
                    />
                  </th>
                  <th className="sticky right-0 z-10 border-l border-border bg-card px-3 py-3 text-right font-medium shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((p) => {
                  const isClosing = closing.has(p.ticket);
                  const isMovingBE = movingBE.has(p.ticket);
                  const isQuickSl = quickSlPending.has(p.ticket);
                  const isQuickTp = quickTpPending.has(p.ticket);
                  return (
                    <tr key={p.ticket} className={cn("group border-t border-border transition-colors hover:bg-muted/40", isClosing && "opacity-40")}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-border accent-primary"
                          checked={selected.has(p.ticket)}
                          onChange={() => toggleSelected(p.ticket)}
                          aria-label={`Select position ${p.ticket}`}
                        />
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{p.ticket}</td>
                      <td className="px-2 py-3 font-semibold whitespace-nowrap">{p.symbol}</td>
                      <td className="px-2 py-3">
                        <SideBadge type={p.type} />
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums">{fmt(p.volume, 2)}</td>
                      <td className="px-2 py-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <span className="block text-muted-foreground">{fmt(p.priceOpen)}</span>
                        <span className="block font-semibold">{fmt(p.priceCurrent)}</span>
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        <div>
                          <LevelValue value={p.stopLoss} />
                          <SlAmount p={p} equity={equity} />
                        </div>
                        <div className="mt-1">
                          <LevelValue value={p.takeProfit} />
                          <TpAmount p={p} />
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <PL value={p.profit} />
                      </td>
                      <td className="px-2 py-3 text-right whitespace-nowrap">
                        <RiskCell p={p} equity={equity} currency={currency} />
                      </td>
                      <td className="px-2 py-3 text-right font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {openedAgo(p.openedAt)}
                      </td>
                      <td className="sticky right-0 z-10 border-l border-border bg-card px-3 py-3 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] transition-colors group-hover:bg-muted/40">
                        <div className="flex justify-end gap-1.5">
                          <LockProfitMenu
                            position={p}
                            disabled={isClosing}
                            queued={isMovingBE}
                            onLock={handleLockProfit}
                          />
                          <RowActionsMenu
                            disabled={isClosing}
                            quickSlDisabled={isClosing || isQuickSl || p.priceOpen == null || equity == null}
                            quickSlPending={isQuickSl}
                            onQuickSl={() => handleQuickStopLoss(p)}
                            quickTpDisabled={isClosing || isQuickTp || p.priceOpen == null || equity == null}
                            quickTpPending={isQuickTp}
                            onQuickTp={() => handleQuickTakeProfit(p)}
                            partialDisabled={isClosing || p.volume == null || p.volume <= 0}
                            onPartial={() => setPartialCloseTarget(p)}
                            onModify={() => setModifyTarget(p)}
                            trailingPips={p.trailingPips}
                            onTrail={() => setTrailingTarget(p)}
                            onAiReview={() => setAiReviewTarget(p)}
                          />
                          <IconAction
                            label={isClosing ? "Close — queued" : "Close position"}
                            icon={X}
                            variant="destructive"
                            onClick={() => handleClose(p.ticket)}
                            disabled={isClosing}
                          />
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
              const isQuickSl = quickSlPending.has(p.ticket);
              const isQuickTp = quickTpPending.has(p.ticket);
              const risk = estimateRisk(p, equity);
              const riskReward = estimateRiskReward(p, equity);
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
                    <Row
                      label="SL"
                      value={
                        <span className="flex flex-col items-end">
                          <LevelValue value={p.stopLoss} />
                          <SlAmount p={p} equity={equity} />
                        </span>
                      }
                      muted
                    />
                    <Row
                      label="TP"
                      value={
                        <span className="flex flex-col items-end">
                          <LevelValue value={p.takeProfit} />
                          <TpAmount p={p} />
                        </span>
                      }
                      muted
                    />
                    <Row label="Opened" value={openedAgo(p.openedAt)} muted />
                    <Row
                      label="Risk"
                      value={
                        <span className="flex flex-col items-end">
                          <span>
                            {!risk
                              ? "—"
                              : risk.protected
                                ? "Protected"
                                : `-${risk.riskAmount.toFixed(2)} (${risk.riskPct.toFixed(1)}%)`}
                          </span>
                          {riskReward != null && (
                            <span
                              className={cn(
                                "font-mono text-[11px] font-semibold",
                                riskReward >= 2
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : riskReward >= 1
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-destructive",
                              )}
                            >
                              R:R 1:{riskReward.toFixed(2)}
                            </span>
                          )}
                        </span>
                      }
                      muted
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <LockProfitMenu
                      position={p}
                      disabled={isClosing}
                      queued={isMovingBE}
                      onLock={handleLockProfit}
                      className="w-full"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStopLoss(p)}
                      disabled={isClosing || isQuickSl || p.priceOpen == null || equity == null}
                      className="w-full gap-1.5"
                      title="Set stop loss to 10% equity risk"
                    >
                      <Percent className="size-3.5" />
                      {isQuickSl ? "Queued" : "SL 10%"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickTakeProfit(p)}
                      disabled={isClosing || isQuickTp || p.priceOpen == null || equity == null}
                      className="w-full gap-1.5"
                      title="Set take profit to 20% equity reward"
                    >
                      <Target className="size-3.5" />
                      {isQuickTp ? "Queued" : "TP 20%"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPartialCloseTarget(p)}
                      disabled={isClosing || p.volume == null || p.volume <= 0}
                      className="w-full gap-1.5"
                    >
                      <Scissors className="size-3.5" />
                      Partial
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModifyTarget(p)}
                      disabled={isClosing}
                      className="w-full gap-1.5"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant={p.trailingPips != null ? "secondary" : "outline"}
                      onClick={() => setTrailingTarget(p)}
                      disabled={isClosing}
                      className="w-full gap-1.5"
                    >
                      <Crosshair className="size-3.5" />
                      {p.trailingPips != null ? `Trail ${p.trailingPips}p` : "Trail"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAiReviewTarget(p)}
                      disabled={isClosing}
                      className="w-full gap-1.5"
                    >
                      <BrainCircuit className="size-3.5" />
                      AI Check
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleClose(p.ticket)}
                      disabled={isClosing}
                      className="col-span-2 w-full gap-1.5"
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
          entryPrice={modifyTarget.priceOpen}
          volume={modifyTarget.volume}
          isBuy={modifyTarget.type.toUpperCase().startsWith("BUY")}
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

      {trailingTarget && (
        <TrailingStopDialog
          open
          onOpenChange={(v) => { if (!v) setTrailingTarget(null); }}
          ticket={trailingTarget.ticket}
          symbol={trailingTarget.symbol}
          currentDistancePips={trailingTarget.trailingPips}
        />
      )}

      {aiReviewTarget && (
        <PositionReviewDialog
          open
          onOpenChange={(v) => { if (!v) setAiReviewTarget(null); }}
          ticket={aiReviewTarget.ticket}
          symbol={aiReviewTarget.symbol}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
