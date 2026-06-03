"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalFormCard } from "./journal-form";

export function JournalHeader() {
  const t = useTranslations("journal");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
        </div>
        {!open && (
          <Button onClick={() => setOpen(true)} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            {t("addTrade")}
          </Button>
        )}
      </div>

      {open && <JournalFormCard onClose={() => setOpen(false)} />}
    </div>
  );
}
