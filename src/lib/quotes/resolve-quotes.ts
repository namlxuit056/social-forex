import { buildQuotes } from "@/lib/quotes/providers/mock";
import { fetchYahooQuotes } from "@/lib/quotes/providers/yahoo";
import type { QuotesApiResponse } from "@/lib/quotes/types";

const TTL_MS = 20_000;
let cache: { at: number; payload: QuotesApiResponse } | null = null;

function tickFromTime() {
  return Math.floor(Date.now() / 3000);
}

function envProvider(): "yahoo" | "mock" {
  const p = process.env.QUOTES_PROVIDER?.toLowerCase();
  if (p === "mock") return "mock";
  return "yahoo";
}

/**
 * Nguồn tỷ giá: Yahoo (mặc định) hoặc mock; khi Yahoo lỗi → mock_fallback + warning.
 */
export async function resolveQuotes(): Promise<QuotesApiResponse> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return cache.payload;
  }

  const updatedAt = new Date().toISOString();
  const provider = envProvider();

  if (provider === "mock") {
    const payload: QuotesApiResponse = {
      updatedAt,
      quotes: buildQuotes(tickFromTime()),
      source: "mock",
      warning: "QUOTES_PROVIDER=mock — dữ liệu giả lập.",
    };
    cache = { at: now, payload };
    return payload;
  }

  try {
    const quotes = await fetchYahooQuotes();
    const payload: QuotesApiResponse = {
      updatedAt,
      quotes,
      source: "yahoo",
    };
    cache = { at: now, payload };
    return payload;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const payload: QuotesApiResponse = {
      updatedAt,
      quotes: buildQuotes(tickFromTime()),
      source: "mock_fallback",
      warning: `Không lấy được Yahoo Finance (${message}). Đang hiển thị dữ liệu mô phỏng.`,
    };
    cache = { at: now, payload };
    return payload;
  }
}
