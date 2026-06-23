"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BacktestResult = {
  symbol: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  maxDrawdown: number;
  profitFactor: number;
  avgRR: number;
  equityCurve: { x: number; y: number }[];
};

type Props = {
  initialResult?: BacktestResult | null;
};

export function RealBacktest({ initialResult }: Props) {
  const t = useTranslations("backtest");
  const [symbol, setSymbol] = useState("XAUUSD");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(initialResult ?? null);
  const [error, setError] = useState("");

  async function handleRun() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/backtest?symbol=${symbol}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Backtest failed");
        return;
      }
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-40">
          <Label>{t("symbol")}</Label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="XAUUSD"
            className="mt-1.5 font-mono"
          />
        </div>
        <Button onClick={() => void handleRun()} disabled={loading}>
          {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <BarChart3 className="mr-1 size-4" />}
          {t("runBacktest")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 bg-card/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t("winRate")}</p>
                <p className={cn("mt-1 font-mono text-2xl font-bold", result.winRate >= 50 ? "text-green-500" : "text-red-500")}>
                  {result.winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">{result.wins}W / {result.losses}L</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t("totalPnl")}</p>
                <p className={cn("mt-1 font-mono text-2xl font-bold", result.totalPnl >= 0 ? "text-green-500" : "text-red-500")}>
                  {result.totalPnl >= 0 ? "+" : ""}{result.totalPnl.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t("profitFactor")}</p>
                <p className={cn("mt-1 font-mono text-2xl font-bold", result.profitFactor >= 1 ? "text-green-500" : "text-red-500")}>
                  {result.profitFactor.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{t("maxDrawdown")}</p>
                <p className="mt-1 font-mono text-2xl font-bold text-red-500">
                  -{result.maxDrawdown.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {result.equityCurve.length > 0 && (
            <Card className="border-border/60 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("equityCurve")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 relative">
                  <svg viewBox="0 0 400 150" className="w-full h-full">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-primary"
                      points={result.equityCurve.map((p, i) => {
                        const x = (i / (result.equityCurve.length - 1)) * 400;
                        const minY = Math.min(...result.equityCurve.map((e) => e.y));
                        const maxY = Math.max(...result.equityCurve.map((e) => e.y));
                        const range = maxY - minY || 1;
                        const y = 140 - ((p.y - minY) / range) * 130;
                        return `${x},${y}`;
                      }).join(" ")}
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
