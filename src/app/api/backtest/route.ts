import { NextRequest, NextResponse } from "next/server";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";

export const runtime = "nodejs";

type BacktestResult = {
  symbol: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  maxDrawdown: number;
  profitFactor: number;
  avgRR: number;
  equityCurve: { x: number; y: number }[];
};

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();

  if (!symbol || !QUOTE_BY_SYMBOL[symbol]) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 7919;
  const rng = mulberry32(seed);

  const totalTrades = 100 + Math.floor(rng() * 200);
  const baseWinRate = 0.42 + rng() * 0.16;
  const rr = 1.2 + rng() * 1.0;

  let equity = 10000;
  let wins = 0;
  let losses = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let maxEquity = equity;
  let maxDrawdown = 0;
  const equityCurve: { x: number; y: number }[] = [{ x: 0, y: equity }];

  for (let i = 1; i <= totalTrades; i++) {
    const win = rng() < baseWinRate;
    const pnl = win ? rr : -1;
    equity += equity * 0.01 * pnl;

    if (win) {
      wins++;
      grossWin += Math.abs(pnl);
    } else {
      losses++;
      grossLoss += Math.abs(pnl);
    }

    if (equity > maxEquity) maxEquity = equity;
    const dd = ((maxEquity - equity) / maxEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;

    equityCurve.push({ x: i, y: Math.round(equity) });
  }

  const totalPnl = ((equity - 10000) / 10000) * 100;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const result: BacktestResult = {
    symbol,
    totalTrades,
    wins,
    losses,
    winRate: (wins / totalTrades) * 100,
    totalPnl,
    maxDrawdown,
    profitFactor,
    avgRR: rr,
    equityCurve,
  };

  return NextResponse.json(result);
}
