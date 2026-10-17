"use client";

import { useState } from "react";
import { Loader2, Copy, Check } from "lucide-react";

type PromptResponse = {
  symbol: string;
  quote: { bid: number; ask: number; changePct: number };
  quoteSource: string;
  tvAvailable: boolean;
  newsRiskLevel: string | null;
  provider: { provider: string; model: string; temperature: number | null; maxTokens: number } | null;
  systemPrompt: string;
  userPrompt: string;
  generatedAt: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Đã copy" : "Copy"}
    </button>
  );
}

export function ScalpingPromptInspector({ symbols }: { symbols: string[] }) {
  const [symbol, setSymbol] = useState(symbols.includes("XAUUSD") ? "XAUUSD" : symbols[0]);
  const [data, setData] = useState<PromptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scalping/prompt?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
        return;
      }
      setData(json as PromptResponse);
    } catch {
      setError("Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {data ? "Tải lại" : "Tải prompt"}
        </button>
        <span className="text-xs text-muted-foreground">
          Prompt thật mà cron Auto-Scalp gửi lên AI cho cặp này ngay lúc này (context TradingView + tin tức nhúng sẵn).
        </span>
      </div>

      {error && <p className="text-xs text-destructive">Lỗi: {error}</p>}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <span>
              Provider: <span className="font-mono font-medium">{data.provider?.provider ?? "—"}</span> /{" "}
              <span className="font-mono">{data.provider?.model ?? "—"}</span>
            </span>
            <span>temperature: <span className="font-mono">{data.provider?.temperature ?? "n/a"}</span></span>
            <span>max_tokens: <span className="font-mono">{data.provider?.maxTokens ?? "—"}</span></span>
            <span>quote: <span className="font-mono">{data.quoteSource}</span> {data.quote.bid}/{data.quote.ask}</span>
            <span>TV context: <span className="font-mono">{data.tvAvailable ? "có" : "KHÔNG"}</span></span>
            <span>news risk: <span className="font-mono">{data.newsRiskLevel ?? "—"}</span></span>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                System prompt (role: system)
              </p>
              <CopyButton text={data.systemPrompt} />
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-[11px] leading-relaxed">
              {data.systemPrompt}
            </pre>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                User prompt (role: user)
              </p>
              <CopyButton text={data.userPrompt} />
            </div>
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-[11px] leading-relaxed">
              {data.userPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
