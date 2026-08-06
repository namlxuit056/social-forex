# Journal AI Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a VIP-only, persistent "AI Chat" tab to `/journal` where users discuss losses, ask for improvement ideas, and get a pre-trade reference checklist from an AI that has access to their trade-history stats.

**Architecture:** Mirrors the existing `ArticleChatMessage` chat pattern (non-streaming request/response, Prisma-persisted history, VIP gate) but scoped per-user instead of per-article, and feeds the AI the same stats context `buildJournalAnalysisContext()` already builds for the weekly review feature.

**Tech Stack:** Next.js 16 App Router, Prisma 7, next-intl, Zod, existing `src/lib/ai/provider.ts` multi-provider client (no new dependencies).

---

## Task 1: Prisma schema — `JournalChatMessage` model

**Files:**
- Modify: `prisma/schema.prisma:132` (User relations block)
- Modify: `prisma/schema.prisma:699` (end of file, after `ArticleChatMessage`)

- [ ] **Step 1: Add the relation field to `User`**

In `prisma/schema.prisma`, find this line (currently line 132):

```prisma
  articleChatMessages  ArticleChatMessage[]
```

Add a new line directly after it:

```prisma
  articleChatMessages  ArticleChatMessage[]
  journalChatMessages  JournalChatMessage[]
```

- [ ] **Step 2: Add the `JournalChatMessage` model**

At the end of `prisma/schema.prisma`, after the closing `}` of `ArticleChatMessage` (currently line 698), append:

```prisma

/// Single ongoing per-user chat thread in the Journal "AI Chat" tab — loss
/// review, improvement coaching, and pre-trade reference checklists, all in
/// one continuous thread (not split per trade).
model JournalChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String
  content   String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

- [ ] **Step 3: Generate and apply the migration**

Run: `npm run docker:up` (if Postgres isn't already running), then:

```bash
npm run db:migrate
```

When prompted for a migration name, use `add_journal_chat_message`.

Expected: migration applies cleanly, `src/generated/prisma` regenerates, and the CLI reports the new table created.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(journal): add JournalChatMessage model for journal AI chat"
```

---

## Task 2: Shared types for the journal chat API

**Files:**
- Modify: `src/lib/ai/types.ts:92-114` (alongside the existing `AiArticleChat*` types)

- [ ] **Step 1: Add the request schema and response types**

In `src/lib/ai/types.ts`, directly after the existing block:

```ts
export type AiArticleChatSendResponse = {
  userMessage: AiArticleChatMessage;
  assistantMessage: AiArticleChatMessage;
  disclaimer: string;
};
```

insert:

```ts
export const aiJournalChatRequestSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export type AiJournalChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AiJournalChatHistoryResponse = {
  messages: AiJournalChatMessage[];
};

export type AiJournalChatSendResponse = {
  userMessage: AiJournalChatMessage;
  assistantMessage: AiJournalChatMessage;
  disclaimer: string;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/types.ts
git commit -m "feat(journal): add journal chat request/response types"
```

---

## Task 3: `src/lib/ai/journal-chat.ts` — prompt + AI call

**Files:**
- Create: `src/lib/ai/journal-chat.ts`

This mirrors `src/lib/ai/article-chat.ts` (context slicing, error class, client call shape) but builds its system prompt from `buildJournalAnalysisContext()` (already exported by `src/lib/ai/journal-analysis.ts`) instead of an article body.

- [ ] **Step 1: Write the file**

```ts
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
- If the trader's message is unrelated to their trading/journal, answer briefly and steer back to journal topics.`;
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
```

- [ ] **Step 2: Export `JournalAnalysisTrade` from `journal-analysis.ts` if not already exported**

Read `src/lib/ai/journal-analysis.ts:9` — `JournalAnalysisTrade` is already declared with `export type JournalAnalysisTrade = {...}`, so no change needed there. Confirm by running:

```bash
grep -n "export type JournalAnalysisTrade" src/lib/ai/journal-analysis.ts
```

Expected: one match at line 9.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/journal-chat.ts
git commit -m "feat(journal): add journal chat AI prompt and reply builder"
```

---

## Task 4: API route `/api/ai/journal-chat`

**Files:**
- Create: `src/app/api/ai/journal-chat/route.ts`

Mirrors `src/app/api/ai/article-chat/route.ts`, but:
- No `articleId` — history/query is scoped by `userId` alone.
- `GET` fetches the **most recent** N messages (`orderBy: desc` + `take`, then reversed) since this thread is long-running, unlike the naturally-short per-article thread.
- `POST` fetches `TradeJournal` rows for context instead of an article row.

- [ ] **Step 1: Write the route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AiJournalChatUnavailableError,
  getAiJournalChatReply,
} from "@/lib/ai/journal-chat";
import {
  aiJournalChatRequestSchema,
  type AiAdvisorMessage,
  type AiJournalChatHistoryResponse,
  type AiJournalChatSendResponse,
  type AiSuggestError,
} from "@/lib/ai/types";
import { localeFromRequest, type AppLocale } from "@/lib/api-locale";
import { pickAi } from "@/lib/messages-pick";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isVipActive } from "@/lib/vip";

const HISTORY_LIMIT = 50;
const CONTEXT_LIMIT = 20;
const TRADES_FOR_CONTEXT = 200;

function errorJson(error: string, status: number, retryAfterMs?: number) {
  const body: AiSuggestError = { error, retryAfterMs };
  return NextResponse.json(body, { status });
}

function toRole(role: string): "user" | "assistant" {
  return role === "assistant" ? "assistant" : "user";
}

async function requireVipUser(loc: AppLocale) {
  const ai = pickAi(loc);
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: errorJson(ai.apiJournalChatLoginRequired, 401) } as const;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });
  if (!isVipActive(user?.vipUntil)) {
    return { error: errorJson(ai.apiJournalChatVipOnly, 403) } as const;
  }
  return { userId } as const;
}

export async function GET(req: NextRequest) {
  const loc = localeFromRequest(req);
  const auth_ = await requireVipUser(loc);
  if ("error" in auth_) return auth_.error;

  const recent = await prisma.journalChatMessage.findMany({
    where: { userId: auth_.userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const body: AiJournalChatHistoryResponse = {
    messages: recent
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        role: toRole(m.role),
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
  };

  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  const loc = localeFromRequest(req);
  const ai = pickAi(loc);

  const hasAiKey =
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENAI_API_KEY?.trim();
  if (!hasAiKey) {
    return errorJson(ai.apiNotConfigured, 503);
  }

  const parsed = aiJournalChatRequestSchema.safeParse(
    await req.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return errorJson(ai.apiJournalChatInvalidRequest, 400);
  }

  const auth_ = await requireVipUser(loc);
  if ("error" in auth_) return auth_.error;
  const { userId } = auth_;

  const rateLimitKey = `ai-journal-chat:${userId}`;
  const windowMs = 5 * 60_000;
  const { ok, remaining } = rateLimit(rateLimitKey, 12, windowMs);
  if (!ok) {
    return errorJson(ai.apiJournalChatRateLimitVip, 429, remaining === 0 ? windowMs : undefined);
  }

  try {
    const [trades, historyDesc] = await Promise.all([
      prisma.tradeJournal.findMany({
        where: { userId },
        orderBy: { openedAt: "desc" },
        take: TRADES_FOR_CONTEXT,
        select: {
          symbol: true,
          direction: true,
          entry: true,
          stopLoss: true,
          takeProfit: true,
          exitPrice: true,
          lotSize: true,
          result: true,
          pnl: true,
          notes: true,
          openedAt: true,
          closedAt: true,
        },
      }),
      prisma.journalChatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: CONTEXT_LIMIT,
        select: { role: true, content: true },
      }),
    ]);

    const contextMessages: AiAdvisorMessage[] = [
      ...historyDesc
        .slice()
        .reverse()
        .map((m) => ({ role: toRole(m.role), content: m.content })),
      { role: "user" as const, content: parsed.data.content },
    ];

    const reply = await getAiJournalChatReply({
      trades,
      messages: contextMessages,
      locale: loc,
    });

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.journalChatMessage.create({
        data: { userId, role: "user", content: parsed.data.content },
      }),
      prisma.journalChatMessage.create({
        data: { userId, role: "assistant", content: reply },
      }),
    ]);

    const response: AiJournalChatSendResponse = {
      userMessage: {
        id: userMessage.id,
        role: "user",
        content: userMessage.content,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: "assistant",
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      disclaimer: ai.apiDisclaimer,
    };

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof AiJournalChatUnavailableError) {
      return errorJson(e.message, 503);
    }
    const msg = e instanceof Error ? e.message : ai.apiUnknownError;
    return errorJson(ai.apiAnalyzeFailed.replace("{message}", msg), 500);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only about the not-yet-added `ai.apiJournalChat*` message keys if TS checks message key literals (it won't — `pickAi` returns a plain object type, keys are checked structurally against the JSON, so this will only fail once we reference `ai.apiJournalChatLoginRequired` etc. if those keys don't exist yet in `en.json`/`vi.json`). Since `AiBundle` is `typeof en["ai"]`, missing keys **will** fail type-check. Do Task 5 (i18n keys) before this type-check step is expected to pass cleanly — if run now, expect errors like `Property 'apiJournalChatLoginRequired' does not exist on type ...`. That's expected at this point; re-run after Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/journal-chat/route.ts
git commit -m "feat(journal): add /api/ai/journal-chat route"
```

---

## Task 5: i18n keys

**Files:**
- Modify: `messages/vi.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add `api*` keys to the `ai` namespace in `messages/vi.json`**

Find this line (the last key before the closing brace of `"ai"`, currently around line 1623):

```json
    "apiDisclaimer": "Đề xuất AI chỉ mang tính tham khảo và giáo dục, không phải tư vấn đầu tư. Bạn tự chịu trách nhiệm về mọi quyết định giao dịch."
```

Change it to add a comma and four new keys directly after (still inside the `"ai"` object):

```json
    "apiDisclaimer": "Đề xuất AI chỉ mang tính tham khảo và giáo dục, không phải tư vấn đầu tư. Bạn tự chịu trách nhiệm về mọi quyết định giao dịch.",
    "apiJournalChatLoginRequired": "Vui lòng đăng nhập để dùng tính năng chat AI trong nhật ký.",
    "apiJournalChatVipOnly": "Tính năng chat AI trong nhật ký chỉ dành cho thành viên VIP.",
    "apiJournalChatInvalidRequest": "Nội dung chat không hợp lệ hoặc quá dài.",
    "apiJournalChatRateLimitVip": "Giới hạn 12 câu hỏi/5 phút. Vui lòng chờ."
```

- [ ] **Step 2: Add the matching keys to `messages/en.json`**

Find the equivalent `apiDisclaimer` line in `messages/en.json` (inside `"ai"`) and apply the same edit with English copy:

```json
    "apiDisclaimer": "AI suggestions are for educational reference only, not investment advice. You are solely responsible for your trading decisions.",
    "apiJournalChatLoginRequired": "Sign in to use the journal AI chat.",
    "apiJournalChatVipOnly": "The journal AI chat is a VIP-only feature.",
    "apiJournalChatInvalidRequest": "Chat content is invalid or too long.",
    "apiJournalChatRateLimitVip": "Limit of 12 questions/5 minutes. Please wait."
```

(Confirm the exact existing English wording of `apiDisclaimer` with `grep -n '"apiDisclaimer"' messages/en.json` before editing — reuse it verbatim, only append the four new keys after it.)

- [ ] **Step 3: Add the `journalChat` namespace to `messages/vi.json`**

Find the `"articleChat"` block's closing brace (currently line 985: `  },` right after `"loginRequiredHint": "Đăng nhập để dùng tính năng chat AI này."`). Insert a new top-level namespace directly after it:

```json
  "journalChat": {
    "title": "Chat AI với nhật ký giao dịch",
    "subtitle": "Hỏi vì sao thua lỗ, tìm phương pháp cải thiện, hoặc tham khảo trước khi vào lệnh — AI dùng thống kê nhật ký của bạn để trả lời.",
    "placeholder": "Ví dụ: sao tuần này tôi thua nhiều với XAUUSD?",
    "quickLossReview": "Vì sao tôi hay thua lệnh gần đây?",
    "quickImprove": "Tìm phương pháp cải thiện win rate",
    "quickPreTrade": "Tôi định vào lệnh, cho tôi tham khảo trước",
    "thinking": "AI đang trả lời...",
    "loadingHistory": "Đang tải lịch sử chat...",
    "disclaimer": "Chỉ mang tính giáo dục, không phải khuyến nghị đầu tư. Bạn tự chịu trách nhiệm về quyết định giao dịch.",
    "error": "Không thể trả lời lúc này. Vui lòng thử lại.",
    "vipRequiredHint": "Tính năng chat AI trong nhật ký chỉ dành cho thành viên VIP.",
    "vipRequiredCta": "Nâng cấp VIP",
    "loginRequiredHint": "Đăng nhập để dùng tính năng chat AI trong nhật ký."
  },
```

- [ ] **Step 4: Add the matching `journalChat` namespace to `messages/en.json`**

Same insertion point (after the `"articleChat"` block) in `messages/en.json`:

```json
  "journalChat": {
    "title": "AI Chat with your trading journal",
    "subtitle": "Ask why you lost money, find ways to improve, or get a pre-trade reference check — the AI uses your own journal stats to answer.",
    "placeholder": "e.g. why did I lose so much on XAUUSD this week?",
    "quickLossReview": "Why do I keep losing on recent trades?",
    "quickImprove": "Find ways to improve my win rate",
    "quickPreTrade": "I'm about to enter a trade, give me a reference check",
    "thinking": "AI is answering...",
    "loadingHistory": "Loading chat history...",
    "disclaimer": "Educational only, not investment advice. You are solely responsible for your trading decisions.",
    "error": "Could not answer right now. Please try again.",
    "vipRequiredHint": "The journal AI chat is a VIP-only feature.",
    "vipRequiredCta": "Upgrade to VIP",
    "loginRequiredHint": "Sign in to use the journal AI chat."
  },
```

- [ ] **Step 5: Add `tabChat` to the `journal` namespace in both files**

In `messages/vi.json`, find (currently line 1739):

```json
    "tabStats": "Nâng cao",
```

Change to:

```json
    "tabStats": "Nâng cao",
    "tabChat": "AI Chat",
```

In `messages/en.json`, find (currently line 1739):

```json
    "tabStats": "Advanced",
```

Change to:

```json
    "tabStats": "Advanced",
    "tabChat": "AI Chat",
```

- [ ] **Step 6: Validate both JSON files parse and type-check**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/vi.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('ok')"
npx tsc --noEmit
```

Expected: `ok`, and the `tsc` errors from Task 4 Step 2 about missing `ai.apiJournalChat*` keys are now gone.

- [ ] **Step 7: Commit**

```bash
git add messages/vi.json messages/en.json
git commit -m "feat(journal): add i18n keys for journal AI chat"
```

---

## Task 6: `JournalChat` component

**Files:**
- Create: `src/app/[locale]/journal/journal-chat.tsx`

Mirrors `src/components/ai/article-chat.tsx` structure exactly (same VIP-gate UI, same message list rendering with `marked`), with journal-specific copy/quick-prompts and no `articleId` param.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { marked } from "marked";
import { Bot, Lock, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiJournalChatHistoryResponse,
  AiJournalChatMessage,
  AiJournalChatSendResponse,
  AiSuggestError,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type ChatMessage = Pick<AiJournalChatMessage, "id" | "role" | "content">;

function renderAiMarkdown(content: string) {
  return marked.parse(content, { async: false }) as string;
}

type Props = {
  isLoggedIn: boolean;
  isVip: boolean;
};

export function JournalChat({ isLoggedIn, isVip }: Props) {
  const t = useTranslations("journalChat");
  const tc = useTranslations("common");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const quickPrompts = [t("quickLossReview"), t("quickImprove"), t("quickPreTrade")];

  useEffect(() => {
    if (!isVip) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/ai/journal-chat");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as AiJournalChatHistoryResponse;
        if (!cancelled) setMessages(data.messages);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVip]);

  async function submitMessage(content: string) {
    const text = content.trim();
    if (!text || loading) return;

    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/journal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as AiSuggestError;
        setError(errBody.error ?? t("error"));
        return;
      }

      const data = (await res.json()) as AiJournalChatSendResponse;
      setMessages((current) => [
        ...current,
        { id: data.userMessage.id, role: "user", content: data.userMessage.content },
        { id: data.assistantMessage.id, role: "assistant", content: data.assistantMessage.content },
      ]);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(draft);
  }

  const inputDisabled = loading || !historyLoaded;

  return (
    <section className="rounded-xl border border-border bg-card/50 p-4 ring-1 ring-foreground/5 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bot className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-sm font-semibold text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {!isVip ? (
        <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-border/70 bg-muted/35 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {isLoggedIn ? t("vipRequiredHint") : t("loginRequiredHint")}
          </p>
          <Link
            href={
              isLoggedIn
                ? "/upgrade-vip"
                : { pathname: "/auth/signin", query: { callbackUrl: "/upgrade-vip" } }
            }
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
          >
            {isLoggedIn ? t("vipRequiredCta") : tc("signIn")}
          </Link>
        </div>
      ) : !historyLoaded ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t("loadingHistory")}
        </div>
      ) : messages.length > 0 ? (
        <div className="mt-4 max-h-112 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                    isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {isUser ? (
                    <UserRound className="size-3.5" aria-hidden />
                  ) : (
                    <Bot className="size-3.5" aria-hidden />
                  )}
                </span>
                {isUser ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground">
                    {message.content}
                  </div>
                ) : (
                  <div
                    className="chat-message-body max-w-[85%] rounded-lg border border-border/70 bg-muted/35 px-3 py-2 text-sm leading-relaxed text-foreground"
                    dangerouslySetInnerHTML={{ __html: renderAiMarkdown(message.content) }}
                  />
                )}
              </div>
            );
          })}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("thinking")}
            </div>
          ) : null}
        </div>
      ) : null}

      {isVip && error ? (
        <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {isVip ? (
        <form onSubmit={onSubmit} className="mt-4">
          {historyLoaded && messages.length === 0 ? (
            <div className="mb-3 grid gap-1.5 sm:grid-cols-3">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start gap-1.5 whitespace-normal py-2 text-left text-xs"
                  disabled={inputDisabled}
                  onClick={() => void submitMessage(prompt)}
                >
                  <Sparkles className="size-3.5 shrink-0" aria-hidden />
                  {prompt}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("placeholder")}
              className="max-h-36 min-h-12 resize-none bg-background"
              disabled={inputDisabled}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage(draft);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0"
              disabled={inputDisabled || !draft.trim()}
              aria-label={tc("send")}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
        </form>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/journal/journal-chat.tsx"
git commit -m "feat(journal): add JournalChat component"
```

---

## Task 7: Wire the new tab into `/journal`

**Files:**
- Modify: `src/app/[locale]/journal/page.tsx:1-23` (imports)
- Modify: `src/app/[locale]/journal/page.tsx:93-100` (`activeTab` computation)
- Modify: `src/app/[locale]/journal/page.tsx:102-120` (data fetching — add `isVip` lookup)
- Modify: `src/app/[locale]/journal/page.tsx:258-300` (tab nav)
- Modify: `src/app/[locale]/journal/page.tsx:302-339` (tab content)

- [ ] **Step 1: Import `JournalChat` and `isVipActive`**

At `src/app/[locale]/journal/page.tsx:17-22`, the imports currently read:

```ts
import { JournalCalendar } from "./journal-calendar";
import { JournalAdvancedStats } from "./journal-advanced-stats";
import { RiskCalculator } from "@/components/tools/risk-calculator";
import { countTrailingLosses } from "@/lib/journal/loss-streak";
import { computeRStats } from "@/lib/journal/r-multiple";
import type { AiJournalAnalysis } from "@/lib/ai/types";
```

Change to:

```ts
import { JournalCalendar } from "./journal-calendar";
import { JournalAdvancedStats } from "./journal-advanced-stats";
import { JournalChat } from "./journal-chat";
import { RiskCalculator } from "@/components/tools/risk-calculator";
import { countTrailingLosses } from "@/lib/journal/loss-streak";
import { computeRStats } from "@/lib/journal/r-multiple";
import { isVipActive } from "@/lib/vip";
import type { AiJournalAnalysis } from "@/lib/ai/types";
```

- [ ] **Step 2: Widen the `tab` searchParam type and `activeTab` computation**

At `src/app/[locale]/journal/page.tsx:52-60`, the `searchParams` type currently reads:

```ts
  searchParams?: Promise<{
    symbol?: string;
    direction?: string;
    entry?: string;
    stopLoss?: string;
    takeProfit?: string;
    from?: string;
    tab?: string;
  }>;
```

This already accepts any string for `tab`, so no change needed here.

At `src/app/[locale]/journal/page.tsx:93-100`, currently:

```ts
  const activeTab =
    query?.tab === "weekly"
      ? "weekly"
      : query?.tab === "edge"
        ? "edge"
        : query?.tab === "stats"
          ? "stats"
          : "trades";
```

Change to:

```ts
  const activeTab =
    query?.tab === "weekly"
      ? "weekly"
      : query?.tab === "edge"
        ? "edge"
        : query?.tab === "stats"
          ? "stats"
          : query?.tab === "chat"
            ? "chat"
            : "trades";
```

- [ ] **Step 3: Fetch `vipUntil` for the current user**

At `src/app/[locale]/journal/page.tsx:102-120`, currently:

```ts
  const [tradesRaw, mt5Connection, weeklyReviewsRaw] = await Promise.all([
    prisma.tradeJournal.findMany({
      where: { userId: session.user.id },
      orderBy: { openedAt: "desc" },
      take: TRADES_CAP + 1,
    }),
    prisma.mt5Connection.findFirst({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      include: { user: { select: { copyTradingPaused: true } } },
    }),
    activeTab === "weekly"
      ? prisma.aiWeeklyJournalReview.findMany({
          where: { userId: session.user.id },
          orderBy: { weekStart: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);
```

Change to:

```ts
  const [tradesRaw, mt5Connection, weeklyReviewsRaw, chatUser] = await Promise.all([
    prisma.tradeJournal.findMany({
      where: { userId: session.user.id },
      orderBy: { openedAt: "desc" },
      take: TRADES_CAP + 1,
    }),
    prisma.mt5Connection.findFirst({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
      include: { user: { select: { copyTradingPaused: true } } },
    }),
    activeTab === "weekly"
      ? prisma.aiWeeklyJournalReview.findMany({
          where: { userId: session.user.id },
          orderBy: { weekStart: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { vipUntil: true },
    }),
  ]);

  const isVip = isVipActive(chatUser?.vipUntil);
```

- [ ] **Step 4: Add the "AI Chat" tab link**

At `src/app/[locale]/journal/page.tsx:290-299`, currently:

```tsx
        <Link
          href="/journal?tab=stats"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "stats"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabStats")}
        </Link>
      </nav>
```

Change to:

```tsx
        <Link
          href="/journal?tab=stats"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "stats"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabStats")}
        </Link>
        <Link
          href="/journal?tab=chat"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "chat"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabChat")}
        </Link>
      </nav>
```

- [ ] **Step 5: Render `JournalChat` for the new tab**

At `src/app/[locale]/journal/page.tsx:302-339`, currently:

```tsx
      {activeTab === "weekly" ? (
        <JournalWeeklyReview reviews={weeklyReviews} />
      ) : activeTab === "edge" ? (
        <JournalEdgeAnalytics trades={serialized} />
      ) : activeTab === "stats" ? (
        <div className="space-y-6">
          <JournalCalendar trades={serialized} locale={locale} />
          <JournalAdvancedStats
            trades={serialized}
            locale={locale}
            accountBalance={mt5Connection?.balance ?? mt5Connection?.equity ?? null}
          />
        </div>
      ) : (
```

Change to:

```tsx
      {activeTab === "weekly" ? (
        <JournalWeeklyReview reviews={weeklyReviews} />
      ) : activeTab === "edge" ? (
        <JournalEdgeAnalytics trades={serialized} />
      ) : activeTab === "stats" ? (
        <div className="space-y-6">
          <JournalCalendar trades={serialized} locale={locale} />
          <JournalAdvancedStats
            trades={serialized}
            locale={locale}
            accountBalance={mt5Connection?.balance ?? mt5Connection?.equity ?? null}
          />
        </div>
      ) : activeTab === "chat" ? (
        <JournalChat isLoggedIn={true} isVip={isVip} />
      ) : (
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/journal/page.tsx"
git commit -m "feat(journal): wire AI Chat tab into journal page"
```

---

## Task 8: Lint, build, manual verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: no errors. Fix any issues surfaced (unused imports, etc.) before proceeding.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build completes successfully (this also runs `prisma generate` + `migrate deploy`, confirming the schema changes are valid).

- [ ] **Step 3: Manual verification on dev server**

```bash
npm run docker:up
npm run dev
```

In a browser:
1. Sign in as a non-VIP user, go to `/journal?tab=chat` — confirm the lock/teaser UI renders with the "Upgrade to VIP" CTA and no textarea.
2. Sign in as a VIP user (or set `vipUntil` in the future for a test user via Prisma Studio: `npm run db:studio`), go to `/journal?tab=chat` — confirm:
   - History loads (empty on first visit).
   - Quick-prompt buttons appear when there's no history yet.
   - Sending a message (e.g. "vì sao tôi hay thua với XAUUSD?") returns an AI reply and both messages persist after a page reload.
   - Sending an unrelated pre-trade question works without crashing if `TradeJournal` is empty (`tradeCount === 0` case — verify the AI still responds sensibly, e.g. "not enough data yet").

Expected: all four checks pass. If any AI provider key is missing in `.env`, expect a graceful `503 apiNotConfigured` error banner instead of a crash — that's acceptable for local verification without a key configured.

- [ ] **Step 4: Final commit (if verification required fixes)**

If Steps 1-3 required code changes, commit them with an appropriate `fix(journal): ...` message following the same commit process as prior tasks. If no changes were needed, skip this step — the feature is complete as of Task 7's commit.

---

## Self-Review Notes (for the plan author, not a task)

- **Spec coverage:** all 4 numbered decisions in the spec (single thread, stats-only context, new tab, VIP-only) are implemented in Tasks 1–7. The "most recent N messages" GET fix (spec's deliberate deviation from `article-chat`) is implemented in Task 4. Out-of-scope items (streaming, real-time quotes, per-trade threads, clear-history button) are correctly absent from every task.
- **No tests added:** `buildJournalAnalysisContext` (reused, not modified) and `getAiJournalChatReply` (calls a live AI client) have no existing test-file precedent — `journal-analysis.ts` itself is untested in this codebase, and `advisor.test.ts`'s only tested export is a pure regex-matching helper with no equivalent here. Task 8 relies on `lint` + `build` + manual verification instead, consistent with how `article-chat.ts`/`journal-analysis.ts` shipped.
