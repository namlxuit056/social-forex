"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
}

interface Props {
  lessonSlug: string;
  question: string;
  options: Option[];
  correctIndex: number;
  initialScore?: number | null;
}

export function AcademyQuiz({
  lessonSlug,
  question,
  options,
  correctIndex,
  initialScore,
}: Props) {
  const t = useTranslations("academy");
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(initialScore != null);
  const [score, setScore] = useState<number | null>(initialScore ?? null);
  const [xpEarned, setXpEarned] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isCorrect = selected === correctIndex;

  function handleSubmit() {
    if (selected === null) return;
    const quizScore = isCorrect ? 100 : 0;

    startTransition(async () => {
      const res = await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonSlug,
          completed: isCorrect,
          quizScore,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(quizScore);
        setSubmitted(true);
        if (data.xpEarned > 0) setXpEarned(data.xpEarned);
      }
    });
  }

  function handleRetry() {
    setSelected(null);
    setSubmitted(false);
    setScore(null);
    setXpEarned(0);
  }

  const alreadyPassed = submitted && score === 100;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-heading text-base font-semibold text-foreground">
        {t("quizTitle")}
      </h3>
      <p className="text-sm text-foreground/90">{question}</p>

      <ul className="space-y-2">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const showResult = submitted;
          const isRight = i === correctIndex;

          return (
            <li key={i}>
              <button
                disabled={submitted || isPending}
                onClick={() => setSelected(i)}
                className={cn(
                  "w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                  !submitted && isSelected
                    ? "border-primary bg-primary/10 text-foreground"
                    : !submitted
                      ? "border-border hover:border-primary/50 hover:bg-muted/50 text-foreground/80"
                      : showResult && isRight
                        ? "border-green-500/60 bg-green-500/10 text-foreground"
                        : showResult && isSelected && !isRight
                          ? "border-red-500/60 bg-red-500/10 text-foreground"
                          : "border-border text-muted-foreground",
                )}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>

      {!submitted ? (
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={selected === null || isPending}
          className="gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("quizSubmit")}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          {alreadyPassed ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              {xpEarned > 0
                ? t("quizCorrect", { xp: xpEarned })
                : t("completedBadge")}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="h-4 w-4" />
              {t("quizWrong")}
            </div>
          )}
          {!alreadyPassed && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              {t("quizRetry")}
            </Button>
          )}
          {xpEarned > 0 && (
            <p className="text-xs text-primary font-medium">
              +{xpEarned} XP {t("lessonCompleted")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
