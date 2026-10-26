import { Bot, Loader2, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import { renderAiMarkdown } from "@/lib/ai-markdown";
import type { Tone } from "@/lib/ui/status-map";
import {
  TRADING_AGENTS_REPORT_KEYS,
  isRunFinished,
  syncTradingAgentsRun,
} from "@/lib/trading-agents/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/ui/status-badge";
import { Link } from "@/i18n/navigation";
import { TradingAgentsRunForm } from "./run-form";
import { TradingAgentsRunPoller } from "./run-poller";

export const dynamic = "force-dynamic";

const RATING_TONE: Record<string, Tone> = {
  Buy: "success",
  Overweight: "success",
  Hold: "neutral",
  Underweight: "danger",
  Sell: "danger",
  REVIEW: "warning",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tradingAgents");
  return { title: t("title"), description: t("description") };
}

function Gate({ title, hint, href, cta }: { title: string; hint: string; href: string; cta: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <Sparkles className="size-12 text-primary/40" />
        <div>
          <h3 className="font-heading text-lg font-medium text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {cta}
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function TradingAgentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tradingAgents");
  const { run: runId } = await searchParams;

  const header = (
    <div>
      <h1 className="font-heading text-xl font-semibold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
    </div>
  );

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return (
      <div className="space-y-6">
        {header}
        <Gate
          title={t("loginRequired")}
          hint={t("loginHint")}
          href="/auth/signin?callbackUrl=/trading-agents"
          cta={t("signIn")}
        />
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true, role: true },
  });
  if (dbUser?.role !== "ADMIN" && !isVipActive(dbUser?.vipUntil)) {
    return (
      <div className="space-y-6">
        {header}
        <Gate title={t("vipRequired")} hint={t("vipRequiredHint")} href="/upgrade-vip" cta={t("upgradeVip")} />
      </div>
    );
  }

  // Runs are market analysis, not personal data, so a shared (reused) run is viewable by any VIP.
  const selectedRow = runId ? await prisma.tradingAgentsRun.findUnique({ where: { id: runId } }) : null;
  const selected = selectedRow ? await syncTradingAgentsRun(selectedRow) : null;

  const history = await prisma.tradingAgentsRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, symbol: true, tradeDate: true, status: true, rating: true },
  });

  const reports = (selected?.reports ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      {header}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="size-5 text-primary" aria-hidden />
            {t("newRun")}
          </CardTitle>
          <CardDescription>{t("newRunDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TradingAgentsRunForm symbols={QUOTE_DEFINITIONS.map((d) => d.symbol)} />
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              {selected.symbol}
              <span className="text-sm font-normal text-muted-foreground">{selected.tradeDate}</span>
              {selected.rating ? (
                <ToneBadge tone={RATING_TONE[selected.rating] ?? "neutral"}>
                  {t(`rating.${selected.rating}`)}
                </ToneBadge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRunFinished(selected.status) ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t("running")}
                <TradingAgentsRunPoller runId={selected.id} />
              </div>
            ) : null}
            {selected.status === "ERROR" ? (
              <p role="alert" className="text-sm text-danger">
                {t("failed")} <span className="text-muted-foreground">({selected.error})</span>
              </p>
            ) : null}
            {selected.decision ? (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold">{t("finalDecision")}</h2>
                <div
                  className="article-body text-sm"
                  dangerouslySetInnerHTML={{ __html: renderAiMarkdown(selected.decision) }}
                />
              </section>
            ) : null}
            {TRADING_AGENTS_REPORT_KEYS.filter((k) => reports[k]).map((k) => (
              <details key={k} className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">{t(`report.${k}`)}</summary>
                <div
                  className="article-body mt-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: renderAiMarkdown(reports[k]) }}
                />
              </details>
            ))}
            <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
          </CardContent>
        </Card>
      ) : null}

      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("history")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {history.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/trading-agents?run=${r.id}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                  >
                    <span className="font-medium">
                      {r.symbol} <span className="font-normal text-muted-foreground">{r.tradeDate}</span>
                    </span>
                    {r.rating ? (
                      <ToneBadge tone={RATING_TONE[r.rating] ?? "neutral"}>{t(`rating.${r.rating}`)}</ToneBadge>
                    ) : (
                      <ToneBadge tone={r.status === "ERROR" ? "danger" : "info"}>{t(`status.${r.status}`)}</ToneBadge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
