import { Cable, Download, KeyRound, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  { Icon: KeyRound, titleKey: "emptyMt5Step1Title", descKey: "emptyMt5Step1Desc" },
  { Icon: Download, titleKey: "emptyMt5Step2Title", descKey: "emptyMt5Step2Desc" },
  { Icon: Zap,     titleKey: "emptyMt5Step3Title", descKey: "emptyMt5Step3Desc" },
] as const;

export async function JournalMt5Prompt() {
  const t = await getTranslations("journal");

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="pb-4">
        <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Cable className="size-5 text-primary" aria-hidden />
        </div>
        <CardTitle className="font-heading text-lg">{t("emptyMt5Title")}</CardTitle>
        <CardDescription className="text-pretty leading-relaxed">
          {t("emptyMt5Desc")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map(({ Icon, titleKey, descKey }, i) => (
            <div
              key={titleKey}
              className="relative rounded-lg border border-border/60 bg-muted/20 p-4"
            >
              {/* Step connector line (sm+) */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-1/2 hidden h-px w-3 -translate-y-1/2 translate-x-full bg-border/60 sm:block" />
              )}

              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Link
          href="/mt5"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Cable className="size-4" aria-hidden />
          {t("emptyMt5Cta")}
        </Link>
        <a
          href="/downloads/social-forex.ex5"
          download="social-forex.ex5"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Download className="size-4" aria-hidden />
          {t("emptyMt5DownloadEa")}
        </a>
      </CardFooter>
    </Card>
  );
}
