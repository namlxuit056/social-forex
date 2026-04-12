import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuoteRow } from "@/lib/quotes/types";

function jitter(seed: number, magnitude: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * magnitude;
}

/** Giả lập bid/ask/spread — dùng khi provider=mock hoặc fallback. */
export function buildQuotes(tick: number): QuoteRow[] {
  return QUOTE_DEFINITIONS.map((row, i) => {
    const mid = row.mockMid;
    const spread =
      row.group === "crypto"
        ? mid * 0.00015
        : row.group === "metal"
          ? mid * 0.00008
          : row.group === "energy"
            ? 0.02
            : row.symbol.includes("JPY")
              ? 0.015
              : 0.00012;
    const move = jitter(tick + i * 17, mid * 0.00025);
    const bid = mid + move - spread / 2;
    const ask = mid + move + spread / 2;
    const changePct = jitter(tick + i, 0.12);
    return {
      symbol: row.symbol,
      name: row.name,
      group: row.group,
      bid: Number(bid.toFixed(row.group === "crypto" ? 2 : 5)),
      ask: Number(ask.toFixed(row.group === "crypto" ? 2 : 5)),
      changePct: Number(changePct.toFixed(2)),
    };
  });
}
