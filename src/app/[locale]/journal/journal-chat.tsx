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
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
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
        <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-border bg-muted/35 px-4 py-3">
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
                    className="chat-message-body max-w-[85%] rounded-lg border border-border bg-muted/35 px-3 py-2 text-sm leading-relaxed text-foreground"
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
