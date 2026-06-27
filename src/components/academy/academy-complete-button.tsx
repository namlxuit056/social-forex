"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface Props {
  lessonSlug: string;
  initialCompleted: boolean;
}

export function AcademyCompleteButton({ lessonSlug, initialCompleted }: Props) {
  const t = useTranslations("academy");
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !completed;
      const res = await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonSlug, completed: next }),
      });
      if (res.ok) {
        setCompleted(next);
      }
    });
  }

  if (completed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggle}
        disabled={isPending}
        className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {t("completedBadge")}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      {t("markComplete")}
    </Button>
  );
}
