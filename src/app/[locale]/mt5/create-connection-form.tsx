"use client";

import { useActionState } from "react";
import { createMt5Connection } from "@/actions/mt5-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateMt5ConnectionForm({
  labels,
}: {
  labels: {
    name: string;
    namePlaceholder: string;
    submit: string;
    tokenTitle: string;
    tokenHint: string;
    error: string;
  };
}) {
  const [state, formAction, pending] = useActionState(createMt5Connection, null);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="mt5-connection-name">{labels.name}</Label>
          <Input
            id="mt5-connection-name"
            name="name"
            maxLength={80}
            placeholder={labels.namePlaceholder}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "..." : labels.submit}
        </Button>
      </form>

      {state?.token ? (
        <div className="rounded-lg border border-primary/30 bg-primary/8 p-3">
          <h3 className="text-sm font-medium text-foreground">{labels.tokenTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {labels.tokenHint}
          </p>
          <code className="mt-3 block overflow-x-auto rounded-md bg-background px-3 py-2 text-xs text-foreground ring-1 ring-border">
            {state.token}
          </code>
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {labels.error}
        </p>
      ) : null}
    </div>
  );
}
