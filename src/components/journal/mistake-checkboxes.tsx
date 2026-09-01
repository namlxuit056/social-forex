"use client";

import { useTranslations } from "next-intl";
import { TRADE_MISTAKES, useMistakeLabels } from "@/app/[locale]/journal/use-setup-labels";

/**
 * Nhóm checkbox "Lỗi mắc phải" dùng chung cho form thêm/sửa lệnh. Mỗi ô là
 * <input name="mistakes" value="TAG"> — action đọc bằng formData.getAll("mistakes").
 */
export function MistakeCheckboxes({
  defaultSelected = [],
}: {
  defaultSelected?: string[];
}) {
  const t = useTranslations("journal");
  const labels = useMistakeLabels();
  const selected = new Set(defaultSelected);

  return (
    <details className="sm:col-span-2 lg:col-span-3" open={selected.size > 0}>
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {t("mistakesFieldLabel")}
      </summary>
      <p className="mt-1 text-xs text-muted-foreground">{t("mistakesFieldHint")}</p>
      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {TRADE_MISTAKES.map((tag) => (
          <label key={tag} className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="mistakes"
              value={tag}
              defaultChecked={selected.has(tag)}
              className="size-4 rounded border-input accent-primary"
            />
            {labels[tag]}
          </label>
        ))}
      </div>
    </details>
  );
}
