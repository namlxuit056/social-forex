"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { updateAiModelSetting } from "./actions";
import { SubmitButton } from "./submit-button";

type ProviderInfo = {
  id: string;
  name: string;
  models: string[];
  hasKey: boolean;
};

type Props = {
  providers: ProviderInfo[];
  currentProvider: string;
  currentModel: string;
};

export function AiModelForm({ providers, currentProvider, currentModel }: Props) {
  const [state, formAction] = useActionState(updateAiModelSetting, null);
  const [provider, setProvider] = useState(currentProvider);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if ("ok" in state && state.ok) toast.success("Đã lưu cấu hình AI model.");
  }, [state]);

  const selected = providers.find((p) => p.id === provider) ?? providers[0];
  const modelOptions = selected?.models ?? [];
  const defaultModel = modelOptions.includes(currentModel) ? currentModel : (modelOptions[0] ?? "");

  return (
    <form action={formAction} className="space-y-4">
      {state && "error" in state && state.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="grid gap-2">
        <Label>Nhà cung cấp AI (Provider)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                provider === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/15 hover:bg-muted/25"
              } ${!p.hasKey ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="provider"
                value={p.id}
                checked={provider === p.id}
                onChange={() => setProvider(p.id)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="block font-medium text-foreground">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.hasKey ? "Đã cấu hình API key" : "Chưa có API key trong .env"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="model">Model</Label>
        <select
          id="model"
          name="model"
          key={provider}
          defaultValue={defaultModel}
          className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        >
          {modelOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton pendingLabel="Đang lưu...">Lưu cấu hình</SubmitButton>
    </form>
  );
}
