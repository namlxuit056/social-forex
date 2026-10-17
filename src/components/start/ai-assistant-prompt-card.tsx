"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  intro: string;
  promptText: string;
  copyLabel: string;
  copiedLabel: string;
};

export function AiAssistantPromptCard({
  title,
  intro,
  promptText,
  copyLabel,
  copiedLabel,
}: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }, [promptText]);

  return (
    <section
      className="rounded-xl border border-border bg-muted/15 p-5 md:p-6"
      aria-labelledby="ai-assistant-prompt-heading"
    >
      <h2
        id="ai-assistant-prompt-heading"
        className="font-heading text-lg font-medium text-foreground"
      >
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{intro}</p>
      <pre
        className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background/90 p-4 text-left font-mono text-xs leading-relaxed text-foreground/90"
        tabIndex={0}
      >
        {promptText}
      </pre>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={onCopy}
      >
        {copied ? copiedLabel : copyLabel}
      </Button>
    </section>
  );
}
