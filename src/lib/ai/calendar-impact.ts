import { z } from "zod";
import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import type { CalendarEvent } from "@/lib/calendar/types";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";

export const aiCalendarImpactSchema = z.object({
  summary: z.string().min(20).max(420),
  keyDrivers: z
    .array(
      z.object({
        currency: z.string().min(2).max(8),
        event: z.string().min(3).max(120),
        whyItMatters: z.string().min(12).max(260),
        bias: z.enum(["bullish", "bearish", "mixed", "volatility"]),
        affectedPairs: z.array(z.string().min(3).max(16)).min(1).max(8),
        watchLevel: z.string().min(8).max(220),
      }),
    )
    .min(1)
    .max(6),
  checklist: z.array(z.string().min(8).max(180)).min(2).max(5),
});

export type AiCalendarImpact = z.infer<typeof aiCalendarImpactSchema>;

export class AiCalendarImpactUnavailableError extends Error {
  constructor(message = "AI calendar impact service unavailable") {
    super(message);
    this.name = "AiCalendarImpactUnavailableError";
  }
}

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

function affectedPairsForCurrency(currency: string) {
  const c = currency.toUpperCase();
  const pairs = QUOTE_DEFINITIONS.filter((quote) => {
    if (quote.group === "major" || quote.group === "minor") {
      return quote.symbol.includes(c);
    }
    if (c === "USD") return ["XAUUSD", "XAGUSD", "USOIL", "BTCUSD", "ETHUSD"].includes(quote.symbol);
    return false;
  }).map((quote) => quote.symbol);

  return pairs.length > 0 ? pairs : ["No direct app pair"];
}

function compactEvent(event: CalendarEvent) {
  return {
    timeUtc: event.timeUtc,
    currency: event.currency,
    title: event.title,
    impact: event.impact,
    forecast: event.forecast ?? null,
    previous: event.previous ?? null,
    actual: event.actual ?? null,
    appPairsToConsider: affectedPairsForCurrency(event.currency),
  };
}

function buildPrompt(events: CalendarEvent[], locale: AppLocale) {
  const compact = events.map(compactEvent);

  return `Explain how these economic calendar releases can affect forex/metal/crypto pairs. This is educational only, not investment advice.

Response language: ${responseLanguage(locale)}

Rules:
- Explain what each important indicator means in plain language.
- Compare forecast, previous, and actual when available. If actual is missing, explain what traders should watch at release time.
- Bias must describe likely pressure on the currency, not a guaranteed trade.
- affectedPairs must use only the appPairsToConsider list for that event.
- Prefer high and medium impact events; merge low-impact events into the summary unless they matter as a cluster.
- Mention volatility risk around release time.
- Do not give exact entry, stop loss, take profit, or promise a direction.

Calendar events JSON:
${JSON.stringify(compact, null, 2)}

Return only valid JSON:
{
  "summary": "short overview of the main macro theme",
  "keyDrivers": [
    {
      "currency": "USD",
      "event": "Nonfarm Payrolls",
      "whyItMatters": "plain explanation of the indicator",
      "bias": "bullish" | "bearish" | "mixed" | "volatility",
      "affectedPairs": ["EURUSD", "XAUUSD"],
      "watchLevel": "what to compare at release time and what would shift bias"
    }
  ],
  "checklist": ["practical pre-news risk check"]
}`;
}

export async function getAiCalendarImpact(
  events: CalendarEvent[],
  locale: AppLocale = "vi",
): Promise<AiCalendarImpact> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiCalendarImpactUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.",
    );
  }

  const prioritized = [...events]
    .sort((a, b) => {
      const impactRank = { high: 0, medium: 1, low: 2 };
      return (
        impactRank[a.impact] - impactRank[b.impact] ||
        new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime()
      );
    })
    .slice(0, 12);

  const client = createAiClient(resolved);
  const response = await client.chat.completions.create({
    model: resolved.model,
    temperature: 0.2,
    max_tokens: 950,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a conservative macro analyst for forex education. Respond only with JSON matching the requested schema. Do not provide investment advice or trade instructions.",
      },
      { role: "user", content: buildPrompt(prioritized, locale) },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("AI returned an empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI response is not valid JSON");
  }

  const result = aiCalendarImpactSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid AI response format: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return result.data;
}
