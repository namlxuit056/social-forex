import { Brain, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { Card, CardContent } from "@/components/ui/card";
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
          <h1 className="font-heading text-2xl font-semibold text-foreground">
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
          <h1 className="font-heading text-2xl font-semibold text-foreground">
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
          <h1 className="font-heading text-2xl font-semibold text-foreground">
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
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
      </div>

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
