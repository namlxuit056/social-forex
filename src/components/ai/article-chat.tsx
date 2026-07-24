"use client";

import { FormEvent, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiAdvisorMessage,
  AiAdvisorResponse,
  AiSuggestError,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const MAX_MESSAGES_TO_SEND = 12;

type ChatMessage = AiAdvisorMessage & { id: string };

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ArticleChat({ articleId }: { articleId: string }) {
  const t = useTranslations("articleChat");
  const tc = useTranslations("common");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const quickPrompts = [t("quickCrossed"), t("quickStillValid"), t("quickWhatNow")];

  async function submitMessage(content: string) {
    const text = content.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const payloadMessages = nextMessages
        .slice(-MAX_MESSAGES_TO_SEND)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/ai/article-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, messages: payloadMessages }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as AiSuggestError;
        setError(errBody.error ?? t("error"));
        return;
      }

      const data = (await res.json()) as AiAdvisorResponse;
      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: data.message.content },
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

      {messages.length > 0 ? (
        <div className="mt-4 space-y-3">
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
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/70 bg-muted/35 text-foreground",
                  )}
                >
                  {message.content}
                </div>
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

      {error ? (
        <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4">
        {messages.length === 0 ? (
          <div className="mb-3 grid gap-1.5 sm:grid-cols-3">
            {quickPrompts.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto justify-start gap-1.5 whitespace-normal py-2 text-left text-xs"
                disabled={loading}
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
            disabled={loading}
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
            disabled={loading || !draft.trim()}
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
    </section>
  );
}
