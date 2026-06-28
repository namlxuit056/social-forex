import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider } from "@/lib/ai/provider";
import type { AiAdvisorMessage } from "@/lib/ai/types";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";
import type { QuoteRow } from "@/lib/quotes/types";

const MAX_CONTEXT_MESSAGES = 10;

export class AiAdvisorUnavailableError extends Error {
  constructor(message = "AI advisor service unavailable") {
    super(message);
    this.name = "AiAdvisorUnavailableError";
  }
}

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

function formatQuote(quote: QuoteRow) {
  const mid = (quote.bid + quote.ask) / 2;
  const digits = quote.bid >= 100 ? 2 : 5;

  return `${quote.symbol} (${quote.name}): bid=${quote.bid}, ask=${quote.ask}, mid=${mid.toFixed(digits)}, change=${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%`;
}

export function detectAdvisorSymbols(messages: AiAdvisorMessage[]) {
  const text = messages.map((message) => message.content).join(" ").toUpperCase();
  const compactText = text.replace(/[^A-Z0-9]/g, "");
  const aliases: Array<[RegExp, string]> = [
    [/\b(GOLD|XAU|VANG|VÀNG)\b/u, "XAUUSD"],
    [/\b(SILVER|XAG|BAC|BẠC)\b/u, "XAGUSD"],
    [/\b(OIL|WTI|USOIL|DẦU|DAU)\b/u, "USOIL"],
    [/\b(BTC|BITCOIN)\b/u, "BTCUSD"],
    [/\b(ETH|ETHEREUM)\b/u, "ETHUSD"],
  ];

  const detected = new Set<string>();
  for (const symbol of Object.keys(QUOTE_BY_SYMBOL)) {
    if (compactText.includes(symbol.toUpperCase())) detected.add(symbol);
  }
  for (const [pattern, symbol] of aliases) {
    if (pattern.test(text) && QUOTE_BY_SYMBOL[symbol]) detected.add(symbol);
  }

  return [...detected];
}

function buildSystemPrompt(locale: AppLocale, quotes: QuoteRow[]) {
  const quoteContext =
    quotes.length > 0
      ? quotes.map(formatQuote).join("\n")
      : "No live quote context was detected in the user's message.";

  return `You are Social Forex AI Advisor, a conservative trading education assistant for forex, metals, energy and crypto learners.

Response language: ${responseLanguage(locale)}

Rules:
- Educational guidance only. Do not present yourself as a licensed financial advisor.
- Do not promise profit, certainty, or a guaranteed setup.
- If the user asks whether to enter a trade now, answer with a risk checklist, invalidation logic, and what data to verify instead of issuing a command.
- Prefer practical, concise answers with risk management, position sizing, calendar/news awareness, and broker-platform verification.
- When discussing a trade idea, mention that the user must decide and verify live prices on their broker platform.
- If the question is outside trading education or platform usage, keep the answer brief and redirect to the relevant trading workflow.

Live quote context when available:
${quoteContext}`;
}

export async function getAiAdvisorReply({
  messages,
  locale,
  quotes,
}: {
  messages: AiAdvisorMessage[];
  locale: AppLocale;
  quotes: QuoteRow[];
}): Promise<string> {
  const resolved = resolveAiProvider();
  if (!resolved) {
    throw new AiAdvisorUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);
  const contextMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.35 } : {}),
    max_tokens: 700,
    messages: [
      { role: "system", content: buildSystemPrompt(locale, quotes) },
      ...contextMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("AI returned an empty response");

  return content;
}
