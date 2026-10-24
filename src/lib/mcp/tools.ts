/** Tool MCP công khai, chỉ đọc — bọc lại dữ liệu sẵn có của site cho AI assistant. */
import { z } from "zod";
import { resolveQuotes } from "@/lib/quotes/resolve-quotes";
import { resolveCalendarEvents } from "@/lib/calendar/resolve-calendar";
import type { Impact } from "@/lib/calendar/types";
import { fetchScreenerPairs } from "@/lib/screener/screener-data";
import { currencyStrengthScores } from "@/lib/market/currency-strength";
import { getMarketVolatilityState, type OverlapWindow } from "@/lib/market/session-overlaps";
import { getSiteUrl } from "@/lib/site-url";
import { roundToSymbolPrecision } from "@/lib/calculators";
import { computePositionSize } from "@/lib/mcp/position-size";
import type { McpServerInfo, McpTool } from "@/lib/mcp/protocol";

const DISCLAIMER = "Educational information only, not investment advice. Data comes from third-party feeds and may lag.";

const symbolList = z
  .array(z.string().min(3).max(12))
  .max(30)
  .optional()
  .describe("Symbols without slash, e.g. [\"EURUSD\", \"XAUUSD\"]. Omit for all.");

const normalize = (s: string) => s.replace("/", "").toUpperCase();

const IMPACT_RANK: Record<Impact, number> = { low: 0, medium: 1, high: 2 };

/** Làm tròn mọi field số (indicator) — bớt token cho model mà không mất ý nghĩa. */
function roundFields<T extends Record<string, unknown>>(row: T, decimals = 3): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, typeof v === "number" ? Number(v.toFixed(decimals)) : v]),
  ) as T;
}

function overlapJson(o: OverlapWindow | null) {
  return o ? { key: o.key, level: o.level, start: o.start.toISOString(), end: o.end.toISOString() } : null;
}

function defineTool<S extends z.ZodObject>(tool: {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  run: (args: z.output<S>) => Promise<unknown>;
}): McpTool {
  return tool as McpTool;
}

export const MCP_SERVER_INFO: McpServerInfo = {
  name: "socialforex",
  title: "SocialForex",
  version: "0.1.0",
  instructions:
    "Live forex/gold/crypto quotes, economic calendar, technical screener, currency strength, " +
    "trading sessions and a position-size calculator from toolforex.xyz. " +
    "Always remind users that this is not investment advice and link them to the returned `link` for details.",
};

export const MCP_TOOLS: McpTool[] = [
  defineTool({
    name: "get_quotes",
    title: "Live quotes",
    description: "Current bid/ask and daily % change for forex majors/minors, gold, silver, oil and crypto.",
    inputSchema: z.object({ symbols: symbolList }),
    async run({ symbols }) {
      const data = await resolveQuotes();
      const wanted = symbols?.map(normalize);
      return {
        updatedAt: data.updatedAt,
        source: data.source,
        quotes: data.quotes
          .filter((q) => !wanted || wanted.includes(normalize(q.symbol)))
          .map((q) => ({ ...q, mid: roundToSymbolPrecision((q.bid + q.ask) / 2, q.symbol) })),
        link: `${getSiteUrl()}/quotes`,
        disclaimer: DISCLAIMER,
      };
    },
  }),
  defineTool({
    name: "get_economic_calendar",
    title: "Economic calendar",
    description:
      "Upcoming (and optionally recent) macro events with impact, forecast, previous and actual values. Times are UTC.",
    inputSchema: z.object({
      currencies: z
        .array(z.string().length(3))
        .max(10)
        .optional()
        .describe("ISO currency codes, e.g. [\"USD\", \"EUR\"]. Omit for all."),
      minImpact: z.enum(["low", "medium", "high"]).default("medium"),
      hoursAhead: z.number().min(1).max(168).default(24),
      hoursBack: z.number().min(0).max(72).default(0).describe("Include events released in the last N hours."),
    }),
    async run({ currencies, minImpact, hoursAhead, hoursBack }) {
      const { events, source, syncedAt } = await resolveCalendarEvents();
      const now = Date.now();
      const from = now - hoursBack * 3_600_000;
      const to = now + hoursAhead * 3_600_000;
      const wanted = currencies?.map((c) => c.toUpperCase());
      const filtered = events
        .filter((e) => {
          const t = new Date(e.timeUtc).getTime();
          return (
            t >= from &&
            t <= to &&
            IMPACT_RANK[e.impact] >= IMPACT_RANK[minImpact] &&
            (!wanted || wanted.includes(e.currency.toUpperCase()))
          );
        })
        .sort((a, b) => a.timeUtc.localeCompare(b.timeUtc))
        .slice(0, 50);
      return { source, syncedAt, events: filtered, link: `${getSiteUrl()}/calendar`, disclaimer: DISCLAIMER };
    },
  }),
  defineTool({
    name: "get_screener",
    title: "Technical screener",
    description:
      "Per-symbol technicals: TradingView recommendation per timeframe (M15/H1/H4/D1, -1 strong sell … +1 strong buy), " +
      "RSI, ADX, MACD, Bollinger position, stochastic state and ATR.",
    inputSchema: z.object({ symbols: symbolList }),
    async run({ symbols }) {
      const pairs = await fetchScreenerPairs();
      const wanted = symbols?.map(normalize);
      return {
        pairs: pairs
          .filter((p) => !wanted || wanted.includes(normalize(p.symbol)))
          .map((p) => ({ ...roundFields(p), price: roundToSymbolPrecision(p.price, p.symbol) })),
        link: `${getSiteUrl()}/screener`,
        disclaimer: DISCLAIMER,
      };
    },
  }),
  defineTool({
    name: "get_currency_strength",
    title: "Currency strength",
    description:
      "Relative strength of the 8 major currencies, derived from today's % change across available pairs. Sorted strongest first.",
    inputSchema: z.object({}),
    async run() {
      const data = await resolveQuotes();
      const scores = [...currencyStrengthScores(data.quotes)]
        .map(([currency, score]) => ({ currency, score: Number(score.toFixed(3)) }))
        .sort((a, b) => b.score - a.score);
      return { updatedAt: data.updatedAt, source: data.source, strength: scores, link: `${getSiteUrl()}/heatmap` };
    },
  }),
  defineTool({
    name: "get_market_sessions",
    title: "Trading sessions",
    description:
      "Whether the forex market is open, active sessions (Sydney/Tokyo/London/New York), current and upcoming overlaps.",
    inputSchema: z.object({}),
    async run() {
      const s = getMarketVolatilityState(new Date());
      return {
        now: new Date().toISOString(),
        marketOpen: s.marketOpen,
        nextForexOpen: s.nextForexOpen?.toISOString() ?? null,
        activeSessions: s.activeSessions,
        currentOverlap: overlapJson(s.currentOverlap),
        nextHighVolatility: overlapJson(s.nextHighVolatility),
        upcomingOverlaps: s.upcomingOverlaps.map(overlapJson),
      };
    },
  }),
  defineTool({
    name: "calculate_position_size",
    title: "Position size calculator",
    description:
      "Lot size so that hitting the stop loss loses `riskPct` % of the balance. Account currency is assumed to be USD.",
    inputSchema: z.object({
      symbol: z.string().min(3).max(12).describe("e.g. EURUSD, XAUUSD, USDJPY"),
      balance: z.number().positive().describe("Account balance in USD"),
      riskPct: z.number().positive().max(100).describe("Risk per trade in %, e.g. 1"),
      entry: z.number().positive(),
      stopLoss: z.number().positive(),
      leverage: z.number().positive().max(5000).optional().describe("e.g. 500 for 1:500 — adds required margin"),
    }),
    async run(args) {
      return { ...computePositionSize(args), link: `${getSiteUrl()}/tools` };
    },
  }),
];
