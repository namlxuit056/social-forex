"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Print / Save-as-PDF trigger for the journal report page. Hidden when printing. */
export function ReportPrintButton({ autoPrompt = false }: { autoPrompt?: boolean }) {
  const t = useTranslations("journal");

  useEffect(() => {
    if (!autoPrompt) return;
    const id = setTimeout(() => window.print(), 400);
    return () => clearTimeout(id);
  }, [autoPrompt]);

  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="gap-1.5 print:hidden"
      size="sm"
    >
      <Printer className="size-4" />
      {t("reportPrint")}
    </Button>
  );
}
