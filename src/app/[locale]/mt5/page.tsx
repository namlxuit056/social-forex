import { Activity, Cable, CircleSlash, Clock, KeyRound, Server } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { revokeMt5Connection } from "@/actions/mt5-bridge";
import { CreateMt5ConnectionForm } from "./create-connection-form";
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

export const dynamic = "force-dynamic";

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
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("endpointLabel")}
              </p>
              <code className="mt-2 block overflow-x-auto rounded-md bg-muted/40 px-3 py-2 text-xs text-foreground ring-1 ring-border">
                {endpoint}
              </code>
            </div>
            <ol className="space-y-2 text-muted-foreground">
              <li>{t("setupStep1")}</li>
              <li>{t("setupStep2")}</li>
              <li>{t("setupStep3")}</li>
            </ol>
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
          <Link
            href="/journal"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("openJournal")}
          </Link>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="grid gap-4">
            {connections.map((connection) => {
              const latest = connection.snapshots[0];
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
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {t("snapshotReceived", {
                          date: latest.receivedAt.toLocaleString(locale),
                        })}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
