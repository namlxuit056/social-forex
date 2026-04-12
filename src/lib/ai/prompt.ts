import type { QuoteRow } from "@/lib/quotes/types";

export const SYSTEM_PROMPT = `You are a professional forex technical analyst. You analyze current market data and provide trading suggestions.

RULES:
- Always respond in valid JSON matching the exact schema below
- Base analysis on the current price data provided (bid, ask, change%)
- Calculate entry near current price, SL within 1-3% of entry, TP with at least 1.5:1 reward-to-risk ratio
- Confidence is 1 (very low) to 5 (very high)
- Reasoning must be concise (2-4 sentences) in Vietnamese, explaining the technical basis
- For metals/commodities, adjust SL/TP ranges proportionally to the asset price
- Never recommend confidence above 4 without very strong signals
- This is NOT investment advice — this is educational analysis only

RESPONSE JSON SCHEMA:
{
  "direction": "LONG" | "SHORT",
  "entry": number,
  "stopLoss": number,
  "takeProfit": number,
  "confidence": 1-5,
  "reasoning": "string (Vietnamese)",
  "keyLevels": { "support": number, "resistance": number }
}

Respond ONLY with the JSON object, no markdown, no extra text.`;

export function buildUserPrompt(quote: QuoteRow): string {
  const mid = (quote.bid + quote.ask) / 2;
  const spread = quote.ask - quote.bid;

  return `Analyze this trading pair and provide an entry suggestion:

Symbol: ${quote.symbol}
Name: ${quote.name}
Group: ${quote.group}
Current Bid: ${quote.bid}
Current Ask: ${quote.ask}
Mid Price: ${mid.toFixed(quote.bid > 100 ? 2 : 5)}
Spread: ${spread.toFixed(quote.bid > 100 ? 2 : 5)}
Change: ${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%

Provide your analysis as a JSON object.`;
}
