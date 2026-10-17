"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { trackInternalEvent } from "@/lib/internal-analytics";
import { VIP_PLANS, type VipPlanKey } from "@/lib/vip-plans";
import { cn } from "@/lib/utils";

type PayPalNamespace = {
  Buttons: (config: {
    style?: {
      layout?: "vertical" | "horizontal";
      color?: "gold" | "blue" | "silver" | "white" | "black";
      shape?: "rect" | "pill";
      label?: "paypal" | "checkout" | "buynow" | "pay" | "installment";
    };
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: (err: unknown) => void;
  }) => {
    render: (selector: string | HTMLElement) => Promise<void>;
    close?: () => void;
  };
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

type Copy = {
  selectPlan: string;
  monthly: string;
  quarterly: string;
  perMonth: string;
  popular: string;
  paypalButtonLoading: string;
  paypalConfigured: string;
  paypalMissingConfig: string;
  paymentSuccess: string;
  paymentError: string;
};

export function PayPalVipCheckout({
  clientId,
  copy,
}: {
  clientId: string | undefined;
  copy: Copy;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [planKey, setPlanKey] = useState<VipPlanKey>("quarterly");
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    searchParams.get("payment") === "success" ? "success" : "idle",
  );
  const buttonRef = useRef<HTMLDivElement>(null);
  const paypalButtonRef = useRef<ReturnType<PayPalNamespace["Buttons"]> | null>(null);

  const plans = useMemo(() => [VIP_PLANS.monthly, VIP_PLANS.quarterly], []);
  const canRenderPayPal = Boolean(
    clientId && scriptReady && typeof window !== "undefined" && window.paypal,
  );

  useEffect(() => {
    if (!canRenderPayPal || !buttonRef.current || !window.paypal) return;

    buttonRef.current.innerHTML = "";
    paypalButtonRef.current?.close?.();

    const paypalButton = window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "checkout",
      },
      createOrder: async () => {
        setStatus("loading");
        const res = await fetch("/api/paypal/vip/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planKey }),
        });
        const data = (await res.json()) as { id?: string; error?: string };
        if (!res.ok || !data.id) {
          setStatus("error");
          throw new Error(data.error ?? "create_order_failed");
        }
        const properties = { surface: "upgrade_vip_page", cta: planKey };
        track(ANALYTICS_EVENTS.vipOrderCreate, properties);
        trackInternalEvent(ANALYTICS_EVENTS.vipOrderCreate, properties);
        return data.id;
      },
      onApprove: async (data) => {
        const res = await fetch("/api/paypal/vip/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderID, plan: planKey }),
        });
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setStatus("success");
        router.replace("?payment=success", { scroll: false });
        router.refresh();
      },
      onError: () => setStatus("error"),
    });

    paypalButtonRef.current = paypalButton;
    void paypalButton.render(buttonRef.current).catch(() => setStatus("error"));

    return () => {
      paypalButton.close?.();
    };
  }, [canRenderPayPal, planKey, router]);

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-6">
      {clientId ? (
        <Script
          id="paypal-sdk"
          src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
            clientId,
          )}&currency=USD&intent=capture`}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
          onError={() => setStatus("error")}
        />
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-foreground">{copy.selectPlan}</h2>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="size-3.5 text-amber-500" aria-hidden />
          {clientId ? copy.paypalConfigured : copy.paypalMissingConfig}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const selected = plan.key === planKey;
          return (
            <Button
              key={plan.key}
              type="button"
              variant={selected ? "default" : "outline"}
              className={cn(
                "h-auto min-h-24 flex-col items-start justify-center gap-2 p-4 text-left",
                selected ? "ring-3 ring-primary/20" : "bg-background/70",
              )}
              onClick={() => {
                setStatus("idle");
                setPlanKey(plan.key);
              }}
              aria-pressed={selected}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="text-base font-semibold">
                  {plan.key === "monthly" ? copy.monthly : copy.quarterly}
                </span>
                {plan.key === "quarterly" ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-black">
                    {copy.popular}
                  </span>
                ) : null}
              </span>
              <span className="text-2xl font-bold">${plan.price}</span>
              <span className="text-xs opacity-80">
                ${plan.pricePerMonth}
                {copy.perMonth}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="min-h-36 rounded-lg border border-border bg-background/70 p-3">
        {clientId ? (
          <>
            {!scriptReady ? (
              <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {copy.paypalButtonLoading}
              </div>
            ) : null}
            <div ref={buttonRef} aria-live="polite" />
          </>
        ) : (
          <div className="flex min-h-28 items-center justify-center text-center text-sm text-muted-foreground">
            {copy.paypalMissingConfig}
          </div>
        )}
      </div>

      {status === "success" ? (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" aria-hidden />
          {copy.paymentSuccess}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {copy.paymentError}
        </p>
      ) : null}
      {status === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {copy.paypalButtonLoading}
        </p>
      ) : null}
    </section>
  );
}
