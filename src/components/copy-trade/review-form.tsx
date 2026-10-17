"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { submitProviderReview } from "@/actions/copy-trade";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initial: { error?: string; ok?: boolean } | null = null;

export function ReviewForm({
  providerId,
  existingRating,
  existingComment,
}: {
  providerId: string;
  existingRating?: number;
  existingComment?: string | null;
}) {
  const t = useTranslations("copyTrade");
  const [state, formAction] = useActionState(submitProviderReview, initial);
  const [rating, setRating] = useState(existingRating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);

  if (state?.ok) {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">
        {t("reviewSubmitted")}
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
    >
      <input type="hidden" name="providerId" value={providerId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">
          {existingRating ? t("reviewEditTitle") : t("reviewWriteTitle")}
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`${n} star`}
            >
              <Star
                className={cn(
                  "size-6 transition-colors",
                  (hoverRating || rating) >= n
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <Textarea
        name="comment"
        defaultValue={existingComment ?? ""}
        maxLength={500}
        rows={3}
        placeholder={t("reviewCommentPlaceholder")}
      />
      <Button type="submit" size="sm" disabled={rating === 0}>
        {existingRating ? t("reviewUpdate") : t("reviewSubmit")}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
