import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  HelpCircle,
  Settings2,
  Terminal,
  Zap,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("copyTrade");
  return { title: t("metaTitle"), description: t("metaDescription") };
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
      num: 1,
      icon: ExternalLink,
      title: t("step1Title"),
      desc: t("step1Desc"),
      details: [t("step1Detail1"), t("step1Detail2"), t("step1Detail3")],
      tip: t("step1Tip"),
    },
    {
      num: 2,
      icon: Settings2,
      title: t("step2Title"),
      desc: t("step2Desc"),
      details: [
        t("step2Detail1"),
        t("step2Detail2"),
        t("step2Detail3"),
        t("step2Detail4"),
        t("step2Detail6"),
        t("step2Detail5"),
      ],
    },
    {
      num: 3,
      icon: Terminal,
      title: t("step3Title"),
      desc: t("step3Desc"),
      details: [t("step3Detail1"), t("step3Detail2"), t("step3Detail3")],
      warning: t("tokenWarning"),
    },
    {
      num: 4,
      icon: Download,
      title: t("step4Title"),
      desc: t("step4Desc"),
      details: [t("step4Detail1"), t("step4Detail2"), t("step4Detail3")],
      codeLines: [t("step4PathHint"), t("step4AllowUrl")],
      codeHighlight: t("step4AllowUrlValue"),
    },
    {
      num: 5,
      icon: Settings2,
      title: t("step5Title"),
      desc: t("step5Desc"),
      details: [
        t("step5Detail1"),
        t("step5Detail2"),
        t("step5Detail3"),
        t("step5Detail4"),
      ],
    },
    {
      num: 6,
      icon: Zap,
      title: t("step6Title"),
      desc: t("step6Desc"),
      details: [t("step6Detail1"), t("step6Detail2"), t("step6Detail3")],
      tip: t("step6AlgoNote"),
    },
  ];

  const eaParams = [
    {
      name: t("param_endpoint"),
      def: t("param_endpoint_default"),
      desc: t("param_endpoint_desc"),
    },
    {
      name: t("param_token"),
      def: t("param_token_default"),
      desc: t("param_token_desc"),
    },
    {
      name: t("param_poll"),
      def: t("param_poll_default"),
      desc: t("param_poll_desc"),
    },
    {
      name: t("param_autotrade"),
      def: t("param_autotrade_default"),
      desc: t("param_autotrade_desc"),
    },
    {
      name: t("param_slippage"),
      def: t("param_slippage_default"),
      desc: t("param_slippage_desc"),
    },
    {
      name: t("param_magic"),
      def: t("param_magic_default"),
      desc: t("param_magic_desc"),
    },
  ];

  const troubleshoot = [
    { q: t("ts1Q"), a: t("ts1A") },
    { q: t("ts2Q"), a: t("ts2A") },
    { q: t("ts3Q"), a: t("ts3A") },
    { q: t("ts4Q"), a: t("ts4A") },
  ];

  const requirements = [
    t("req1"),
    t("req2"),
    t("req3"),
    t("req4"),
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div>
        <Badge variant="outline" className="mb-3 text-xs">
          {t("badge")}
        </Badge>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("heroDesc")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/downloads/social-forex-cp.ex5"
            download="social-forex-cp.ex5"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-4" />
            {t("downloadEX5")}
          </a>
          <a
            href="/downloads/SocialForexCopyTrade.mq5"
            download="SocialForexCopyTrade.mq5"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="size-4" />
            {t("downloadMQ5")}
          </a>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {t("findTraders")}
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>

      {/* Requirements */}
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("requirementsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                {req}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.num} className="flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {step.num}
                </div>
                {step.num < steps.length && (
                  <div className="mt-2 w-px flex-1 bg-border/60" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 pb-6">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">
                    {step.title}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>

                <ul className="mt-3 space-y-1.5">
                  {step.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
                      {d}
                    </li>
                  ))}
                </ul>

                {"codeLines" in step && step.codeLines && (
                  <div className="mt-3 space-y-1.5">
                    {step.codeLines.map((line, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border/60 bg-muted/50 px-3 py-2 font-mono text-xs text-foreground"
                      >
                        {line}
                      </div>
                    ))}
                    {"codeHighlight" in step && step.codeHighlight && (
                      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-xs text-primary">
                        {step.codeHighlight}
                      </div>
                    )}
                  </div>
                )}

                {"tip" in step && step.tip && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-600 dark:text-blue-400">
                    <HelpCircle className="mt-0.5 size-4 shrink-0" />
                    {step.tip}
                  </div>
                )}

                {"warning" in step && step.warning && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {step.warning}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* EA Parameters */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t("eaParamsTitle")}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-foreground">
                  {t("paramName")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">
                  {t("paramDefault")}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">
                  {t("paramDesc")}
                </th>
              </tr>
            </thead>
            <tbody>
              {eaParams.map((p, i) => (
                <tr
                  key={i}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-primary">
                    {p.name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {p.def}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Separator />

      {/* Troubleshooting */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t("troubleshootTitle")}
        </h2>
        <div className="space-y-3">
          {troubleshoot.map((item, i) => (
            <Card key={i} className="border-border/60 bg-card/50">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-foreground">{item.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Risk Warning */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div>
            <h3 className="font-medium text-foreground">{t("warningTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("warningText")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="flex flex-wrap gap-3">
        <a
          href="/downloads/social-forex-cp.ex5"
          download="social-forex-cp.ex5"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="size-4" />
          {t("downloadEX5")}
        </a>
        <a
          href="/downloads/SocialForexCopyTrade.mq5"
          download="SocialForexCopyTrade.mq5"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Download className="size-4" />
          {t("downloadMQ5")}
        </a>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          {t("findTraders")}
          <ExternalLink className="size-4" />
        </Link>
      </div>
    </div>
  );
}
