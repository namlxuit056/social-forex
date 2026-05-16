"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  AiAdvisorMessage,
  AiAdvisorResponse,
  AiSuggestError,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const MAX_MESSAGES_TO_SEND = 12;

type ChatMessage = AiAdvisorMessage & {
  id: string;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiAdvisorChat() {
  const t = useTranslations("advisor");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("welcome"),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const quickPrompts = useMemo(
    () => [t("quickRisk"), t("quickPlan"), t("quickNews"), t("quickLot")],
    [t],
  );

  async function submitMessage(content: string) {
    const text = content.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setLoading(true);

    try {
      const payloadMessages = nextMessages
        .filter((message) => message.id !== "welcome")
        .slice(-MAX_MESSAGES_TO_SEND)
        .map(({ role, content }) => ({ role, content }));

      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as AiSuggestError;
        setError(errBody.error ?? t("error"));
        return;
      }

      const data = (await res.json()) as AiAdvisorResponse;
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.message.content,
        },
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
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      {open ? (
        <section className="flex h-[min(42rem,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-[25rem] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/25 sm:h-[38rem]">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/35 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-heading text-sm font-semibold text-foreground">
                  {t("chatTitle")}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {t("chatSubtitle")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {loading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setOpen(false)}
                aria-label={tc("close")}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-start gap-2",
                      isUser && "flex-row-reverse",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
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
                        "max-w-[min(42rem,82%)] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
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
            </div>

            {error ? (
              <div className="mx-4 mb-3 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="border-t border-border/70 bg-card/45 p-3"
            >
              {messages.length === 1 ? (
                <div className="mb-3 grid gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start whitespace-normal py-2 text-left text-xs"
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
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {t("disclaimer")}
              </p>
            </form>
          </div>
        </section>
      ) : null}

      {!open ? (
        <Button
          type="button"
          size="lg"
          className="h-12 gap-2 rounded-full px-4 shadow-xl shadow-black/25"
          onClick={() => setOpen(true)}
          aria-label={t("launcherAria")}
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="hidden sm:inline">{t("launcher")}</span>
        </Button>
      ) : null}
    </div>
  );
}
