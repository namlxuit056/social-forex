import { Brain, Download, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { AiProposalsPanel } from "@/components/mt5/ai-proposals-panel";
import { RequestAnalysisForm } from "@/components/mt5/request-analysis-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aiTradeProposal");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function AiTradeProposalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aiTradeProposal");

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <Card className="border-border/60 bg-card/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Brain className="size-12 text-primary/40" />
            <div>
              <h3 className="font-heading text-lg font-medium text-foreground">
                {t("loginRequired")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("loginHint")}
              </p>
            </div>
            <Link
              href="/auth/signin?callbackUrl=/ai-trade-proposals"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("signIn")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipUntil: true },
  });

  if (!isVipActive(dbUser?.vipUntil)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <Card className="border-border/60 bg-card/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Sparkles className="size-12 text-primary/40" />
            <div>
              <h3 className="font-heading text-lg font-medium text-foreground">
                {t("vipRequired")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("vipRequiredHint")}
              </p>
            </div>
            <Link
              href="/upgrade-vip"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("upgradeVip")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!connection) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        <Card className="border-border/60 bg-card/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Sparkles className="size-12 text-primary/40" />
            <div>
              <h3 className="font-heading text-lg font-medium text-foreground">
                {t("mt5Required")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("mt5RequiredHint")}
              </p>
            </div>
            <Link
              href="/mt5"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("connectMt5")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const proposals = await prisma.aiTradeProposal.findMany({
    where: {
      userId,
      status: "PENDING_REVIEW",
    },
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

  const serialized = proposals.map((p) => ({
    ...p,
    createdAt: p.createdAt,
    direction: p.direction as "LONG" | "SHORT",
    checklist: p.checklist as { label: string; status: "pass" | "warn" | "fail"; detail: string }[] | null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="size-5 text-primary" aria-hidden />
            {t("setupTitle")}
          </CardTitle>
          <CardDescription>{t("setupDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("downloadLabel")}
            </p>
            <a
              href="/downloads/social-forex-ai.ex5"
              download="social-forex-ai.ex5"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              {t("downloadBtn")}
            </a>
            <p className="text-xs text-muted-foreground">{t("downloadHint")}</p>
          </div>

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
                  <span>
                    {key === "setupStep6" ? (
                      <>
                        {t(key)}{" "}
                        <Link href="/mt5" className="font-medium text-primary hover:underline">
                          MT5 Bridge
                        </Link>
                        .
                      </>
                    ) : (
                      t(key)
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {t("setupNote")}
          </p>
        </CardContent>
      </Card>

      <RequestAnalysisForm hasConnection={true} />

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">
          {t("pendingProposals")}
        </h2>
        <AiProposalsPanel proposals={serialized} locale={locale} />
      </div>
    </div>
  );
}
