"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ImageDown, RefreshCw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateTodaysPost,
  sendPostToTelegram,
  type DailyPostActionResult,
} from "./actions";

export type DailyPostView = {
  id: string;
  day: string;
  bias: string;
  headline: string;
  telegramText: string;
  facebookText: string;
  videoScript: string;
  chartImageUrl: string | null;
  telegramSentAt: string | null;
  telegramError: string | null;
};

/** Telegram text is stored as HTML for the bot; the copy is for pasting by hand. */
function telegramPlain(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Đã copy" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-sans text-sm leading-relaxed text-foreground">
        {text}
      </pre>
    </div>
  );
}

function ResultBadge({ result }: { result: DailyPostActionResult | null }) {
  if (!result) return null;
  return (
    <p role="status" className={result.ok ? "text-sm text-success" : "text-sm text-danger"}>
      {result.message}
    </p>
  );
}

function PostCard({ post, isToday }: { post: DailyPostView; isToday: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DailyPostActionResult | null>(null);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {post.day} · thiên hướng {post.bias}
          {post.telegramSentAt
            ? ` · đã đăng Telegram ${new Date(post.telegramSentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
            : " · chưa đăng Telegram"}
        </p>
        <CardTitle className="text-base">{post.headline}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {post.chartImageUrl ? (
            <a
              href={post.chartImageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm hover:bg-item-hover"
            >
              <ImageDown className="size-4" />
              Ảnh biểu đồ
            </a>
          ) : null}
          {!post.telegramSentAt ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(async () => setResult(await sendPostToTelegram(post.id)))}
            >
              <Send />
              {pending ? "Đang đăng…" : "Đăng Telegram"}
            </Button>
          ) : null}
          {isToday ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(async () => setResult(await generateTodaysPost(true)))}
            >
              <RefreshCw />
              Viết lại
            </Button>
          ) : null}
          <ResultBadge result={result} />
        </div>
        {post.telegramError ? (
          <p className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
            Lỗi Telegram: {post.telegramError}
          </p>
        ) : null}
        <CopyBlock label="Facebook (nhóm trader)" text={post.facebookText} />
        <CopyBlock label="Kịch bản video TikTok / Shorts" text={post.videoScript} />
        <CopyBlock label="Telegram (bản text)" text={telegramPlain(post.telegramText)} />
      </CardContent>
    </Card>
  );
}

export function DailyPostPanel({ posts, today }: { posts: DailyPostView[]; today: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DailyPostActionResult | null>(null);
  const hasToday = posts.some((p) => p.day === today);

  return (
    <div className="space-y-4">
      {!hasToday ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Chưa có bài hôm nay ({today}). Cron tự viết lúc 07:30 thứ 2–6; bấm để viết ngay (chưa đăng Telegram).
            </p>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(async () => setResult(await generateTodaysPost(false)))}
            >
              <Sparkles />
              {pending ? "AI đang viết…" : "Viết bài hôm nay"}
            </Button>
            <ResultBadge result={result} />
          </CardContent>
        </Card>
      ) : null}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} isToday={post.day === today} />
      ))}
    </div>
  );
}
