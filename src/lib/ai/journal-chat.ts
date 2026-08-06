import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import type { AiAdvisorMessage } from "@/lib/ai/types";
import { buildJournalAnalysisContext, type JournalAnalysisTrade } from "@/lib/ai/journal-analysis";

const MAX_CONTEXT_MESSAGES = 10;

export class AiJournalChatUnavailableError extends Error {
  constructor(message = "AI journal chat service unavailable") {
    super(message);
    this.name = "AiJournalChatUnavailableError";
  }
}

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

function buildSystemPrompt(locale: AppLocale, context: ReturnType<typeof buildJournalAnalysisContext>) {
  return `You are Social Forex AI, chatting with a trader inside their own trading journal.

Response language: ${responseLanguage(locale)}

The trader's journal statistics (their real trade history — use this as your primary evidence):
${JSON.stringify(context)}

Rules:
- This is one continuous chat thread covering three kinds of questions — read the trader's message to tell which one applies:
  1. Loss review ("why did I lose so much yesterday/this week?"): cross-reference "recentTrades" and "symbolStats" for matching dates, symbols, or notes and point out concrete patterns. If the data is too thin to explain a specific loss, say so plainly instead of guessing.
  2. Improvement coaching ("how do I get better?", "find me a method"): ground suggestions in "totals" (win rate, profit factor, avg win/loss) and "symbolStats"/"directionStats" — cite the actual numbers, don't give generic advice.
  3. Pre-trade check-in (the trader describes a trade they are about to place, not one already in the journal): respond with a risk checklist — position sizing, R:R versus their historical average, invalidation level, and how their past results on that symbol/setup look. Never tell them to enter or skip the trade, and never promise an outcome.
- Educational coaching only. Not financial advice. Do not promise profit or guarantee a result.
- Be direct but supportive, like a professional mentor reviewing a trader's log.
- Keep answers focused — this is a chat, not a full report. Use short paragraphs or bullet points.
- If the trader's message is unrelated to their trading/journal, answer briefly and steer back to journal topics.
- This chat has no live price feed or market data — never imply current prices or market conditions, and tell the trader to check the live price on their own broker platform.`;
}

export async function getAiJournalChatReply({
  trades,
  messages,
  locale,
}: {
  trades: JournalAnalysisTrade[];
  messages: AiAdvisorMessage[];
  locale: AppLocale;
}): Promise<string> {
  const resolved = await resolveAiProvider();
  if (!resolved) {
    throw new AiJournalChatUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.",
    );
  }

  const client = createAiClient(resolved);
  const context = buildJournalAnalysisContext(trades);
  const contextMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.35 } : {}),
    max_tokens: resolveMaxTokens(resolved, 800),
    messages: [
      { role: "system", content: buildSystemPrompt(locale, context) },
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
