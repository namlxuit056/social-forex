import { getTranslations } from "next-intl/server";
import { TrackedLink } from "@/components/analytics/tracked-link";
import { BookOpen, Calendar, Shield } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { cn } from "@/lib/utils";

const icons = [Shield, Calendar, BookOpen] as const;

export async function NewcomerPathSection() {
  const t = await getTranslations("home");

  const steps = [
    {
      titleKey: "newcomerStep1Title" as const,
      descKey: "newcomerStep1Desc" as const,
      ctaKey: "newcomerStep1Cta" as const,
      href: "/academy/forex-position-sizing-1-percent-rule" as const,
    },
    {
      titleKey: "newcomerStep2Title" as const,
      descKey: "newcomerStep2Desc" as const,
      ctaKey: "newcomerStep2Cta" as const,
      href: "/calendar" as const,
    },
    {
      titleKey: "newcomerStep3Title" as const,
      descKey: "newcomerStep3Desc" as const,
      ctaKey: "newcomerStep3Cta" as const,
      href: "/academy" as const,
    },
  ] as const;

  return (
    <section
      aria-labelledby="newcomer-path-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="text-center sm:text-left">
        <h2
          id="newcomer-path-heading"
          className="font-heading text-lg font-semibold tracking-tight text-foreground"
        >
          {t("newcomerPathTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("newcomerPathIntro")}</p>
      </div>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => {
          const Icon = icons[i] ?? Shield;
          return (
            <li
              key={step.href}
              className="flex flex-col rounded-lg border border-border p-4 text-left"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {i + 1}
                </span>
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="font-heading text-base font-medium text-foreground">
                {t(step.titleKey)}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(step.descKey)}
              </p>
              <TrackedLink
                href={step.href}
                eventName={ANALYTICS_EVENTS.homepageCtaClick}
                eventProperties={{
                  cta: step.ctaKey,
                  destination: step.href,
                  surface: "newcomer_path",
                }}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "mt-4 w-full justify-center sm:w-auto",
                )}
              >
                {t(step.ctaKey)}
              </TrackedLink>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex justify-center border-t border-border pt-5">
        <TrackedLink
          href="/start"
          eventName={ANALYTICS_EVENTS.homepageCtaClick}
          eventProperties={{
            cta: "newcomer_full_path",
            destination: "/start",
            surface: "newcomer_path",
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full max-w-md sm:w-auto",
          )}
        >
          {t("newcomerFullPathCta")}
        </TrackedLink>
      </div>
    </section>
  );
}
