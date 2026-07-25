import type { AppLocale } from "@/lib/api-locale";
import { createAiClient, resolveAiProvider, resolveMaxTokens } from "@/lib/ai/provider";
import type { AiAdvisorMessage } from "@/lib/ai/types";
import {
  extractSymbolFromKeyword,
  getSymbolTechnicalContext,
  formatTechnicalContextBlock,
} from "@/lib/ai/forex-chart";

const MAX_CONTEXT_MESSAGES = 10;
const MAX_ARTICLE_CHARS = 4000;

export class AiArticleChatUnavailableError extends Error {
  constructor(message = "AI article chat service unavailable") {
    super(message);
    this.name = "AiArticleChatUnavailableError";
  }
}

function responseLanguage(locale: AppLocale) {
  return locale === "en"
    ? "English. Do not use Vietnamese words or Vietnamese sentence structure."
    : "Vietnamese.";
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSystemPrompt({
  locale,
  title,
  summary,
  bodyText,
  technicalSummary,
}: {
  locale: AppLocale;
  title: string;
  summary: string;
  bodyText: string;
  technicalSummary: string | null;
}) {
  const technicalBlock = technicalSummary
    ? `## Live technical data (use this to re-check the original call — the market may have moved since the article was written)\n${technicalSummary}`
    : "## No live technical data available for this symbol right now — rely on what the reader tells you plus the article's own levels.";

  return `You are Social Forex AI, following up in a chat attached to an article you already published on the site.

Original article:
Title: ${title}
Summary: ${summary}
Full body:
${bodyText}

${technicalBlock}

Response language: ${responseLanguage(locale)}

Rules:
- The reader is asking about price action relative to what this article said (e.g. "price already broke above X, what now?"). Re-evaluate the article's original bias, entry zone and invalidation level against what the reader describes and the live technical data above.
- Be explicit: state whether the original bias/zone is still valid, invalidated, or needs a new zone — and why, citing specific levels from the article and/or the live data.
- Educational analysis only. Never promise profit or a guaranteed outcome. Remind the reader to verify the live price on their own broker platform before acting.
- Keep answers focused and concise — this is a follow-up chat, not a new full article.
- If the reader's question is unrelated to this article's market/symbol, answer briefly and steer back to the article's topic.`;
}

export async function getAiArticleChatReply({
  article,
  messages,
  locale,
}: {
  article: { title: string; summary: string; body: string; keyword: string };
  messages: AiAdvisorMessage[];
  locale: AppLocale;
}): Promise<string> {
  const resolved = await resolveAiProvider();
  if (!resolved) {
    throw new AiArticleChatUnavailableError(
      "No AI API key configured. Add GROQ_API_KEY or OPENAI_API_KEY to .env.",
    );
  }

  const symbolInfo = extractSymbolFromKeyword(article.keyword);
  const technicalCtx = symbolInfo
    ? await getSymbolTechnicalContext(symbolInfo.symbol, symbolInfo.group).catch(() => null)
    : null;
  const technicalSummary = technicalCtx ? formatTechnicalContextBlock(technicalCtx) : null;

  const client = createAiClient(resolved);
  const contextMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  const response = await client.chat.completions.create({
    model: resolved.model,
    ...(resolved.supportsTemperature ? { temperature: 0.35 } : {}),
    max_tokens: resolveMaxTokens(resolved, 700),
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({
          locale,
          title: article.title,
          summary: article.summary,
          bodyText: stripHtml(article.body).slice(0, MAX_ARTICLE_CHARS),
          technicalSummary,
        }),
      },
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
