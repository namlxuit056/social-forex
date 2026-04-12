"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");
  const [isPending, startTransition] = useTransition();

  const nextLocale = locale === "vi" ? "en" : "vi";

  function handleSwitch() {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      disabled={isPending}
      className="gap-1 text-xs"
      title={t(nextLocale)}
    >
      <Globe className="size-3.5" />
      {routing.locales.includes(locale as "vi" | "en")
        ? locale.toUpperCase()
        : "VI"}
    </Button>
  );
}
