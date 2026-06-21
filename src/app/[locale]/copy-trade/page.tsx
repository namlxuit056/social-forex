import { getTranslations, setRequestLocale } from "next-intl/server";
import { Copy, Download, ExternalLink, Key, Settings, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("copyTrade");
  return { title: t("title"), description: t("setupInstructions") };
}

export default async function CopyTradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("copyTrade");

  const steps = [
    {
      icon: Copy,
      title: t("step1Title"),
      description: t("step1Desc"),
      details: [
        t("step1Detail1"),
        t("step1Detail2"),
        t("step1Detail3"),
      ],
    },
    {
      icon: Settings,
      title: t("step2Title"),
      description: t("step2Desc"),
      details: [
        t("step2Detail1"),
        t("step2Detail2"),
      ],
    },
    {
      icon: Key,
      title: t("step3Title"),
      description: t("step3Desc"),
      details: [
        t("step3Detail1"),
        t("step3Detail2"),
      ],
    },
    {
      icon: Download,
      title: t("step4Title"),
      description: t("step4Desc"),
      details: [
        t("step4Detail1"),
        t("step4Detail2"),
        t("step4Detail3"),
      ],
    },
    {
      icon: Zap,
      title: t("step5Title"),
      description: t("step5Desc"),
      details: [
        t("step5Detail1"),
        t("step5Detail2"),
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <div className="grid gap-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index} className="border-border/60 bg-card/50">
              <CardHeader className="flex flex-row items-start gap-4 pb-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {t("step")} {index + 1}
                    </Badge>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="ml-14">
                <ul className="space-y-2">
                  {step.details.map((detail, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/50" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-medium text-foreground">{t("warningTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("warningText")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("findTraders")}
          <ExternalLink className="size-4" />
        </Link>
        <a
          href="/docs/mt5/SocialForexCopyTrade.mq5"
          download
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Download className="size-4" />
          {t("downloadEA")}
        </a>
      </div>
    </div>
  );
}
