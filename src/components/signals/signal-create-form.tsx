"use client";

import { useCallback, useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { createSignal } from "@/actions/signals";
import { effectiveImageMime, SIGNAL_IMAGE_LIMITS } from "@/lib/signal-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const createInitial: { error?: string } | null = null;

type PendingSlot = { id: string; previewUrl: string };

export function SignalCreateForm({
  collapsible = false,
  defaultCollapsed = true,
}: {
  collapsible?: boolean;
  defaultCollapsed?: boolean;
} = {}) {
  const t = useTranslations("signals");
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(() => !collapsible || !defaultCollapsed);
  const [createState, createAction, isPending] = useActionState(
    createSignal,
    createInitial,
  );
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNeedsSignIn, setUploadNeedsSignIn] = useState(false);

  const signInForUploadHref = `/auth/signin?callbackUrl=${encodeURIComponent(
    pathname?.startsWith("/") ? pathname : "/signals",
  )}`;

  const removeUrl = useCallback((url: string) => {
    setUploadedUrls((prev) => prev.filter((u) => u !== url));
  }, []);

  const revokeAndRemoveSlot = useCallback((slot: PendingSlot) => {
    URL.revokeObjectURL(slot.previewUrl);
    setPendingSlots((prev) => prev.filter((s) => s.id !== slot.id));
  }, []);

  const revokeBatchFromIndex = useCallback((batch: PendingSlot[], fromIndex: number) => {
    for (let j = fromIndex; j < batch.length; j++) {
      URL.revokeObjectURL(batch[j].previewUrl);
    }
    const drop = new Set(batch.slice(fromIndex).map((s) => s.id));
    setPendingSlots((prev) => prev.filter((s) => !drop.has(s.id)));
  }, []);

  const onPickFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      // Phải copy FileList trước khi reset input: `value = ""` làm FileList cùng tham chiếu bị rỗng.
      const picked = e.target.files;
      const snapshot = picked?.length ? Array.from(picked) : [];
      e.target.value = "";
      if (snapshot.length === 0) return;

      setUploadError(null);
      setUploadNeedsSignIn(false);
      const remaining =
        SIGNAL_IMAGE_LIMITS.MAX_IMAGES - uploadedUrls.length - pendingSlots.length;
      if (remaining <= 0) return;

      const rawList = snapshot.slice(0, remaining);
      const valid: File[] = [];
      for (const file of rawList) {
        if (!effectiveImageMime(file)) {
          setUploadNeedsSignIn(false);
          setUploadError(t("imageInvalidType"));
          return;
        }
        if (file.size > SIGNAL_IMAGE_LIMITS.MAX_BYTES) {
          setUploadNeedsSignIn(false);
          setUploadError(t("imageTooLarge"));
          return;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;

      const batch: PendingSlot[] = valid.map((file) => ({
        id: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(file),
      }));
      setPendingSlots((prev) => [...prev, ...batch]);
      setUploading(true);

      try {
        for (let i = 0; i < valid.length; i++) {
          const file = valid[i];
          const slot = batch[i];

          const fd = new FormData();
          fd.append("file", file);
          const uploadUrl = new URL(
            "/api/signal-images/upload",
            window.location.origin,
          ).toString();
          const res = await fetch(uploadUrl, {
            method: "POST",
            body: fd,
            credentials: "include",
          });

          let data: { url?: string; error?: string; message?: string } = {};
          try {
            data = (await res.json()) as typeof data;
          } catch {
            /* non-JSON response */
          }

          if (res.status === 401) {
            setUploadNeedsSignIn(true);
            setUploadError(t("imageUploadNeedLogin"));
            revokeBatchFromIndex(batch, i);
            break;
          }

          if (res.status === 503 && data.error === "not_configured") {
            setUploadNeedsSignIn(false);
            setUploadError(t("imagesNotConfigured"));
            revokeBatchFromIndex(batch, i);
            break;
          }

          if (!res.ok) {
            setUploadNeedsSignIn(false);
            const hint =
              data.message ??
              (data.error === "rate_limited"
                ? t("imageUploadRateLimited")
                : null) ??
              data.error ??
              t("imageUploadFailed");
            setUploadError(hint);
            revokeBatchFromIndex(batch, i);
            break;
          }

          if (data.url) {
            setUploadedUrls((prev) =>
              [...prev, data.url!].slice(0, SIGNAL_IMAGE_LIMITS.MAX_IMAGES),
            );
          }
          revokeAndRemoveSlot(slot);
        }
      } catch {
        setUploadNeedsSignIn(false);
        setUploadError(t("imageUploadFailed"));
        setPendingSlots((prev) => {
          const batchIds = new Set(batch.map((b) => b.id));
          return prev.filter((s) => {
            if (batchIds.has(s.id)) {
              URL.revokeObjectURL(s.previewUrl);
              return false;
            }
            return true;
          });
        });
      } finally {
        setUploading(false);
      }
    },
    [
      uploadedUrls.length,
      pendingSlots.length,
      t,
      revokeAndRemoveSlot,
      revokeBatchFromIndex,
    ],
  );

  const selectClass =
    "mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

  const fileInputClass = cn(
    "h-8 max-w-xs min-w-0 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none file:mr-2 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
    uploading ||
      uploadedUrls.length + pendingSlots.length >= SIGNAL_IMAGE_LIMITS.MAX_IMAGES
      ? "pointer-events-none opacity-50"
      : null,
  );

  return (
    <Card>
      <CardHeader className={cn(collapsible && "space-y-3")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle>{t("postSignal")}</CardTitle>
            <CardDescription>{t("vipNote")}</CardDescription>
          </div>
          {collapsible ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  {t("collapseForm")}
                  <ChevronUp className="size-4" aria-hidden />
                </>
              ) : (
                <>
                  {t("expandForm")}
                  <ChevronDown className="size-4" aria-hidden />
                </>
              )}
            </Button>
          ) : null}
        </div>
        {collapsible && expanded ? (
          <p>
            <a
              href="#signal-list"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("skipToList")}
            </a>
          </p>
        ) : null}
      </CardHeader>
      {(!collapsible || expanded) && (
      <CardContent className="space-y-6">
        {/*
          File input ngoài <form action={createAction}> để tránh xung đột Server Action
          và đảm bảo onChange/fetch chạy đúng (không bọc Base UI Field.Control).
        */}
        <div>
          <Label htmlFor="signal-images">{t("images")}</Label>
          <p className="mt-1 text-xs text-muted-foreground">{t("imagesHint")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id="signal-images"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              disabled={
                uploading ||
                uploadedUrls.length + pendingSlots.length >=
                  SIGNAL_IMAGE_LIMITS.MAX_IMAGES
              }
              onChange={onPickFiles}
              className={fileInputClass}
            />
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-destructive">
              {uploadError}
              {uploadNeedsSignIn ? (
                <>
                  {" "}
                  <Link
                    href={signInForUploadHref}
                    className="font-medium underline underline-offset-2 hover:text-destructive/90"
                  >
                    {t("imageUploadSignInLink")}
                  </Link>
                </>
              ) : null}
            </p>
          )}
          {(uploadedUrls.length > 0 || pendingSlots.length > 0) && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {uploadedUrls.map((url) => (
                <li
                  key={url}
                  className="relative inline-block rounded-md border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-16 max-w-[120px] rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow hover:bg-destructive hover:text-destructive-foreground"
                    aria-label={t("removeImage")}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
              {pendingSlots.map((slot) => (
                <li
                  key={slot.id}
                  className="relative inline-block overflow-hidden rounded-md border border-primary/30 ring-2 ring-primary/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.previewUrl}
                    alt=""
                    className="h-16 max-w-[120px] rounded-md object-cover opacity-90"
                  />
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/55 backdrop-blur-[2px]"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span className="max-w-[100px] truncate px-1 text-center text-[10px] font-medium text-foreground">
                      {t("imagesUploading")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          action={createAction}
          className="grid gap-4 sm:grid-cols-2"
          aria-busy={isPending}
        >
          <fieldset
            disabled={isPending}
            className="contents min-w-0 border-0 p-0"
          >
          {uploadedUrls.map((url) => (
            <input key={url} type="hidden" name="imageUrls" value={url} />
          ))}

          <div className="sm:col-span-2">
            <Label htmlFor="signal-symbol">{t("symbol")}</Label>
            <Input
              id="signal-symbol"
              name="symbol"
              required
              placeholder="XAUUSD"
              className="mt-1.5 font-mono uppercase"
            />
          </div>
          <div>
            <Label htmlFor="signal-direction">{t("directionLabel")}</Label>
            <select
              id="signal-direction"
              name="direction"
              className={selectClass}
            >
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>
          <div>
            <Label htmlFor="signal-tier">{t("tierLabel")}</Label>
            <select id="signal-tier" name="tier" className={selectClass}>
              <option value="FREE">FREE</option>
              <option value="VIP">VIP</option>
            </select>
          </div>
          <div>
            <Label htmlFor="signal-entry">{t("entryField")}</Label>
            <Input
              id="signal-entry"
              name="entry"
              type="number"
              step="any"
              required
              className="mt-1.5 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="signal-sl">{t("stopLossField")}</Label>
            <Input
              id="signal-sl"
              name="stopLoss"
              type="number"
              step="any"
              className="mt-1.5 font-mono"
            />
          </div>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="signal-tp1">{t("tp1Field")}</Label>
              <Input
                id="signal-tp1"
                name="takeProfit"
                type="number"
                step="any"
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="signal-tp2">{t("tp2Field")}</Label>
              <Input
                id="signal-tp2"
                name="takeProfit2"
                type="number"
                step="any"
                className="mt-1.5 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="signal-tp3">{t("tp3Field")}</Label>
              <Input
                id="signal-tp3"
                name="takeProfit3"
                type="number"
                step="any"
                className="mt-1.5 font-mono"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="signal-notes">{t("notes")}</Label>
            <Textarea
              id="signal-notes"
              name="notes"
              rows={2}
              className="mt-1.5"
            />
          </div>
          {createState?.error && (
            <p className="text-sm text-destructive sm:col-span-2">
              {createState.error}
            </p>
          )}
          <Button
            type="submit"
            className="sm:col-span-2 gap-2"
            disabled={uploading || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                {t("postingSignal")}
              </>
            ) : (
              t("postSignal")
            )}
          </Button>
          </fieldset>
        </form>
      </CardContent>
      )}
    </Card>
  );
}
