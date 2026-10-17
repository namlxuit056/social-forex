"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  addTelegramBroadcaster,
  removeTelegramBroadcaster,
  type TelegramBroadcasterState,
} from "./actions";

interface Broadcaster {
  userId: string;
  email: string;
  name: string | null;
  addedAt: string;
}

export function BroadcasterManager({
  broadcasters,
  locale,
  broadcastAll,
}: {
  broadcasters: Broadcaster[];
  locale: string;
  broadcastAll: boolean;
}) {
  const t = useTranslations("admin");
  const formRef = useRef<HTMLFormElement>(null);
  const [addState, addAction, adding] = useActionState<
    TelegramBroadcasterState,
    FormData
  >(addTelegramBroadcaster, null);

  useEffect(() => {
    if (addState && "ok" in addState) formRef.current?.reset();
  }, [addState]);

  return (
    <div className="space-y-4">
      {broadcastAll && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t("telegramSignalsBroadcastAll")}</span>
        </div>
      )}

      <form ref={formRef} action={addAction} className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder={t("telegramSignalsEmailPlaceholder")}
          className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={adding}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {adding ? "…" : t("telegramSignalsAdd")}
        </button>
      </form>
      {addState && "error" in addState && (
        <p className="text-xs text-destructive">{addState.error}</p>
      )}
      {addState && "ok" in addState && (
        <p className="text-xs text-emerald-600">{t("telegramSignalsAdded")}</p>
      )}

      {broadcasters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("telegramSignalsEmpty")}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {broadcasters.map((b) => (
            <BroadcasterRow key={b.userId} broadcaster={b} locale={locale} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BroadcasterRow({
  broadcaster,
  locale,
}: {
  broadcaster: Broadcaster;
  locale: string;
}) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<
    TelegramBroadcasterState,
    FormData
  >(removeTelegramBroadcaster, null);

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs">{broadcaster.email}</p>
        {broadcaster.name && (
          <p className="truncate text-xs text-muted-foreground">
            {broadcaster.name}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {new Date(broadcaster.addedAt).toLocaleDateString(locale)}
        </p>
      </div>
      <form action={action} className="flex items-center gap-1.5">
        <input type="hidden" name="userId" value={broadcaster.userId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-7 items-center gap-1 rounded border border-input px-2 text-[11px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="size-3" aria-hidden />
          {pending ? "…" : t("telegramSignalsRemove")}
        </button>
        {state && "error" in state && (
          <span className="text-[11px] text-destructive">{state.error}</span>
        )}
      </form>
    </li>
  );
}
