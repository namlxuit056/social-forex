"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DbQuiz } from "@/lib/content/academy-db";

interface Props {
  lessonSlug: string;
  quizzes: DbQuiz[];
  locale: string;
  initialScore?: number | null;
}

export function AcademyAiQuiz({ lessonSlug, quizzes, initialScore }: Props) {
  const t = useTranslations("academy");

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(initialScore != null);
  const [score, setScore] = useState<number | null>(initialScore ?? null);
  const [xpEarned, setXpEarned] = useState(0);
  const [isPending, startTransition] = useTransition();

  const quiz = quizzes[currentIdx];
  if (!quiz) return null;

  const selectedForCurrent = selections[currentIdx] ?? null;
  const isLastQuestion = currentIdx === quizzes.length - 1;
  const allAnswered = quizzes.every((_, i) => selections[i] !== undefined);

  function handleSelect(optionIdx: number) {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [currentIdx]: optionIdx }));
  }

  function handleNext() {
    if (currentIdx < quizzes.length - 1) {
      setCurrentIdx((i) => i + 1);
    }
  }

  function handleSubmitAll() {
    const correct = quizzes.filter((q, i) => selections[i] === q.correctIndex).length;
    const finalScore = Math.round((correct / quizzes.length) * 100);

    startTransition(async () => {
      const res = await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonSlug,
          completed: finalScore >= 75,
          quizScore: finalScore,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(finalScore);
        setSubmitted(true);
        if (data.xpEarned > 0) setXpEarned(data.xpEarned);
      }
    });
  }

  function handleRetry() {
    setCurrentIdx(0);
    setSelections({});
    setSubmitted(false);
    setScore(null);
    setXpEarned(0);
  }

  if (submitted && score !== null) {
    const correct = Math.round((score / 100) * quizzes.length);
    const passed = score >= 75;
    return (
      <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
        <h3 className="font-heading text-base font-semibold text-foreground">
          {t("quizTitle")}
        </h3>
        <div
          className={cn(
            "flex items-center gap-2 text-sm",
            passed ? "text-green-400" : "text-red-400",
          )}
        >
          {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          <span>
            {t("quizResult", { correct, total: quizzes.length, score })}
            {xpEarned > 0 && ` · +${xpEarned} XP`}
          </span>
        </div>
        {quizzes.map((q, i) => {
          const userAnswer = selections[i];
          const isCorrect = userAnswer === q.correctIndex;
          return (
            <div
              key={i}
              className="space-y-1 rounded-lg border border-border/50 bg-muted/20 p-3"
            >
              <p className="text-xs font-medium text-foreground/80">
                {i + 1}. {q.question}
              </p>
              {q.options.map((opt, oi) => (
                <div
                  key={oi}
                  className={cn(
                    "rounded px-3 py-1.5 text-xs",
                    oi === q.correctIndex
                      ? "bg-green-500/15 text-green-400"
                      : oi === userAnswer && !isCorrect
                        ? "bg-red-500/15 text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                  {oi === q.correctIndex && " ✓"}
                  {oi === userAnswer && !isCorrect && " ✗"}
                </div>
              ))}
            </div>
          );
        })}
        {!passed && (
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t("quizRetry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-foreground">
          {t("quizTitle")}
        </h3>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1}/{quizzes.length}
        </span>
      </div>

      <p className="text-sm text-foreground/90">{quiz.question}</p>

      <ul className="space-y-2">
        {quiz.options.map((opt, i) => (
          <li key={i}>
            <button
              disabled={isPending}
              onClick={() => handleSelect(i)}
              className={cn(
                "w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                selectedForCurrent === i
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border hover:border-primary/50 hover:bg-muted/50 text-foreground/80",
              )}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        {!isLastQuestion && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleNext}
            disabled={selectedForCurrent === null || isPending}
          >
            {t("aiQuizNext")}
          </Button>
        )}
        {allAnswered && (
          <Button size="sm" onClick={handleSubmitAll} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("quizSubmit")}
          </Button>
        )}
      </div>
    </div>
  );
}
