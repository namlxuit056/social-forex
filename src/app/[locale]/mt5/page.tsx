import { Activity, Cable, CircleSlash, Clock, Download, KeyRound, Server } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { revokeMt5Connection } from "@/actions/mt5-bridge";
import { CreateMt5ConnectionForm } from "./create-connection-form";
import { Mt5AutoRefresh } from "./mt5-auto-refresh";
import { Link, redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { AiProposalsPanel } from "@/components/mt5/ai-proposals-panel";
import { RequestAnalysisForm } from "@/components/mt5/request-analysis-form";

type AiProposal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: "LONG" | "SHORT";
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  confidence: number | null;
  qualityScore: number | null;
  reasoning: string;
  checklist: { label: string; status: "pass" | "warn" | "fail"; detail: string }[] | null;
  createdAt: Date;
};

export const dynamic = "force-dynamic";

type Mt5Position = {
  ticket: string;
  symbol: string;
  type: string;
  volume: number | null;
  priceOpen: number | null;
  priceCurrent: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number | null;
  swap: number | null;
  openedAt: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mt5");
  return { title: t("title"), description: t("metaDescription") };
}

function formatDate(date: Date | null, locale: string) {
  return date ? date.toLocaleString(locale) : "—";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asPosition(value: unknown): Mt5Position | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const ticket = typeof row.ticket === "string" ? row.ticket : String(row.ticket ?? "");
  const symbol = typeof row.symbol === "string" ? row.symbol : "";
  const type = typeof row.type === "string" ? row.type : "";
  if (!ticket || !symbol || !type) return null;

  return {
    ticket,
    symbol,
    type,
    volume: asNumber(row.volume),
    priceOpen: asNumber(row.priceOpen),
    priceCurrent: asNumber(row.priceCurrent),
    stopLoss: asNumber(row.stopLoss),
    takeProfit: asNumber(row.takeProfit),
    profit: asNumber(row.profit),
    swap: asNumber(row.swap),
    openedAt: typeof row.openedAt === "string" ? row.openedAt : null,
  };
}

function snapshotPositions(value: unknown): Mt5Position[] {
  if (!Array.isArray(value)) return [];
  return value.map(asPosition).filter((p): p is Mt5Position => Boolean(p));
}

function formatMaybeNumber(value: number | null, digits = 2) {
  return value == null ? "—" : value.toFixed(digits);
}

export default async function Mt5Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mt5");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect({
      href: { pathname: "/auth/signin", query: { callbackUrl: "/mt5" } },
      locale,
    });
  }

  const connections = await prisma.mt5Connection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      snapshots: {
        orderBy: { receivedAt: "desc" },
        take: 1,
      },
    },
  });

  const pendingProposals = await prisma.aiTradeProposal.findMany({
    where: { userId, status: "PENDING_REVIEW" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      symbol: true,
      timeframe: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      confidence: true,
      qualityScore: true,
      reasoning: true,
      checklist: true,
      createdAt: true,
    },
  });

  const endpoint = `${getSiteUrl()}/api/mt5/bridge`;

  return (
    <div className="space-y-8">
      <section className="border-b border-border pb-7">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("subtitle")}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="size-5 text-primary" aria-hidden />
              {t("createTitle")}
            </CardTitle>
            <CardDescription>{t("createDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateMt5ConnectionForm
              labels={{
                name: t("connectionName"),
                namePlaceholder: t("connectionNamePlaceholder"),
                submit: t("createToken"),
                tokenTitle: t("tokenTitle"),
                tokenHint: t("tokenHint"),
                error: t("createError"),
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="size-5 text-primary" aria-hidden />
              {t("setupTitle")}
            </CardTitle>
            <CardDescription>{t("setupDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            {/* Download */}
            <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("downloadLabel")}
              </p>
              <a
                href="/downloads/social-forex.ex5"
                download="social-forex.ex5"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
              >
                <Download className="size-4 shrink-0" aria-hidden />
                {t("downloadBtn")}
              </a>
              <p className="text-xs text-muted-foreground">{t("downloadHint")}</p>
            </div>

            {/* Bridge endpoint */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("endpointLabel")}
              </p>
              <code className="mt-2 block overflow-x-auto rounded-md bg-muted/40 px-3 py-2 text-xs text-foreground ring-1 ring-border">
                {endpoint}
              </code>
            </div>

            {/* Step-by-step guide */}
            <div>
              <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("setupGuideTitle")}
              </p>
              <ol className="space-y-2.5">
                {(
                  [
                    "setupStep1",
                    "setupStep2",
                    "setupStep3",
                    "setupStep4",
                    "setupStep5",
                    "setupStep6",
                    "setupStep7",
                    "setupStep8",
                    "setupStep9",
                  ] as const
                ).map((key, i) => (
                  <li key={key} className="flex gap-2.5 text-muted-foreground">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                      {i + 1}
                    </span>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {t("riskNote")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              {t("connectionsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("connectionsDesc")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Mt5AutoRefresh label={t("autoRefresh")} />
            <Link
              href="/journal"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("openJournal")}
            </Link>
          </div>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="grid gap-4">
            {connections.map((connection) => {
              const latest = connection.snapshots[0];
              const positions = snapshotPositions(latest?.positions);
              const active = Boolean(connection.lastSeenAt && !connection.revokedAt);
              return (
                <Card key={connection.id} className="border-border/70 bg-card/70">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">{connection.name}</CardTitle>
                          <Badge variant={connection.revokedAt ? "outline" : "default"}>
                            {connection.revokedAt
                              ? t("statusRevoked")
                              : active
                                ? t("statusConnected")
                                : t("statusWaiting")}
                          </Badge>
                        </div>
                        <CardDescription className="mt-1">
                          {t("tokenLast4", { last4: connection.tokenLast4 })}
                        </CardDescription>
                      </div>
                      {!connection.revokedAt ? (
                        <form action={revokeMt5Connection}>
                          <input type="hidden" name="connectionId" value={connection.id} />
                          <Button variant="outline" size="sm">
                            <CircleSlash className="size-4" aria-hidden />
                            {t("revoke")}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric
                        icon={Clock}
                        label={t("lastSeen")}
                        value={formatDate(connection.lastSeenAt, locale)}
                      />
                      <Metric
                        icon={Cable}
                        label={t("account")}
                        value={connection.accountLogin ?? "—"}
                      />
                      <Metric
                        icon={Activity}
                        label={t("equity")}
                        value={
                          connection.equity == null
                            ? "—"
                            : `${connection.equity.toFixed(2)} ${connection.accountCurrency ?? ""}`
                        }
                      />
                      <Metric
                        icon={Server}
                        label={t("positions")}
                        value={String(connection.openPositions)}
                      />
                    </div>

                    {latest ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                          {t("snapshotReceived", {
                            date: latest.receivedAt.toLocaleString(locale),
                          })}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-foreground">
                            {t("openPositionsTitle")}
                          </h3>
                          {positions.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-border/70">
                              <table className="w-full min-w-190 text-left text-xs">
                                <thead className="bg-muted/40 text-muted-foreground">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">{t("colTicket")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colSymbol")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colType")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colVolume")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colEntry")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colCurrent")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colSl")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colTp")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colProfit")}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {positions.map((position) => (
                                    <tr key={position.ticket} className="bg-card/40">
                                      <td className="px-3 py-2 font-mono text-muted-foreground">
                                        {position.ticket}
                                      </td>
                                      <td className="px-3 py-2 font-medium text-foreground">
                                        {position.symbol}
                                      </td>
                                      <td className="px-3 py-2">
                                        <Badge
                                          variant={position.type === "BUY" ? "default" : "outline"}
                                          className="font-mono"
                                        >
                                          {position.type}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-foreground">
                                        {formatMaybeNumber(position.volume, 2)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-foreground">
                                        {formatMaybeNumber(position.priceOpen, 5)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-foreground">
                                        {formatMaybeNumber(position.priceCurrent, 5)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-foreground">
                                        {formatMaybeNumber(position.stopLoss, 5)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-foreground">
                                        {formatMaybeNumber(position.takeProfit, 5)}
                                      </td>
                                      <td
                                        className={cn(
                                          "px-3 py-2 text-right font-mono",
                                          (position.profit ?? 0) >= 0
                                            ? "text-chart-1"
                                            : "text-destructive",
                                        )}
                                      >
                                        {formatMaybeNumber(position.profit, 2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 px-3 py-3 text-sm text-muted-foreground">
                              {t("openPositionsEmpty")}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              AI Trade Proposals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              TradingView scanner → DeepSeek-R1 phân tích → xác nhận để tạo signal
            </p>
          </div>
          <RequestAnalysisForm
            hasConnection={connections.some((c) => !c.revokedAt)}
          />
        </div>
        <AiProposalsPanel proposals={pendingProposals as AiProposal[]} locale={locale} />
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p className={cn("mt-1 truncate font-mono text-sm text-foreground")}>{value}</p>
    </div>
  );
}
