"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parseSupportAmount,
  SUPPORT_MAX_AMOUNT,
  SUPPORT_MIN_AMOUNT,
  SUPPORT_PRESET_AMOUNTS,
} from "@/lib/support-amount";
import { cn } from "@/lib/utils";

type PayPalButtons = {
  render: (selector: string | HTMLElement) => Promise<void>;
  close?: () => void;
};

type PayPalSdk = {
  Buttons: (config: {
    style?: Record<string, string>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError: (err: unknown) => void;
  }) => PayPalButtons;
};

type Copy = {
  chooseAmount: string;
  customAmount: string;
  invalidAmount: string;
  loading: string;
  missingConfig: string;
  success: string;
  error: string;
};

export function PayPalSupportCheckout({
  clientId,
  copy,
}: {
  clientId: string | undefined;
  copy: Copy;
}) {
  const [preset, setPreset] = useState<number | null>(5);
  const [custom, setCustom] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [paidAmount, setPaidAmount] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  const amount = parseSupportAmount(preset ?? custom);
  // PayPal buttons are rendered once; createOrder reads the latest amount from here.
  const amountRef = useRef(amount);
  useEffect(() => {
    amountRef.current = amount;
  }, [amount]);

  useEffect(() => {
    const paypal = (window as unknown as { paypal?: PayPalSdk }).paypal;
    if (!clientId || !scriptReady || !paypal || !buttonRef.current) return;

    buttonRef.current.innerHTML = "";
    const buttons = paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "rect", label: "pay" },
      createOrder: async () => {
        setStatus("loading");
        const res = await fetch("/api/paypal/support/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountRef.current }),
        });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok || !data.id) {
          setStatus("error");
          throw new Error(data.error ?? "create_order_failed");
        }
        return data.id;
      },
      onApprove: async (data) => {
        const res = await fetch("/api/paypal/support/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID }),
        });
        const result = (await res.json()) as { amount?: string | null };
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setPaidAmount(result.amount ?? null);
        setStatus("success");
      },
      onCancel: () => setStatus("idle"),
      onError: () => setStatus("error"),
    });
    void buttons.render(buttonRef.current).catch(() => setStatus("error"));

    return () => buttons.close?.();
  }, [clientId, scriptReady]);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      {clientId ? (
        <Script
          id="paypal-sdk"
          src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`}
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() => setStatus("error")}
        />
      ) : null}

      <h2 className="text-base font-semibold text-foreground">{copy.chooseAmount}</h2>

      <div className="grid grid-cols-4 gap-2">
        {SUPPORT_PRESET_AMOUNTS.map((value) => (
          <Button
            key={value}
            type="button"
            variant={preset === value ? "default" : "outline"}
            className={cn("h-12 text-base font-semibold", preset === value && "ring-3 ring-primary/20")}
            aria-pressed={preset === value}
            onClick={() => {
              setPreset(value);
              setCustom("");
            }}
          >
            ${value}
          </Button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm text-muted-foreground">{copy.customAmount}</span>
        <Input
          inputMode="decimal"
          placeholder={`${SUPPORT_MIN_AMOUNT}–${SUPPORT_MAX_AMOUNT} USD`}
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setPreset(null);
          }}
          aria-invalid={custom !== "" && !amount}
        />
      </label>
      {custom !== "" && !amount ? (
        <p className="text-sm text-destructive">{copy.invalidAmount}</p>
      ) : null}

      <div
        className={cn(
          "min-h-28 rounded-lg border border-border bg-background/70 p-3",
          !amount && "pointer-events-none opacity-50",
        )}
      >
        {!clientId ? (
          <p className="flex min-h-20 items-center justify-center text-center text-sm text-muted-foreground">
            {copy.missingConfig}
          </p>
        ) : !scriptReady ? (
          <p className="flex min-h-20 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {copy.loading}
          </p>
        ) : null}
        <div ref={buttonRef} aria-live="polite" />
      </div>

      {status === "success" ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {copy.success.replace("{amount}", paidAmount ? `$${paidAmount}` : "")}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {copy.error}
        </p>
      ) : null}
    </section>
  );
}
