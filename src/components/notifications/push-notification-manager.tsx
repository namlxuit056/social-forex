"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type VapidConfig = {
  enabled: boolean;
  publicKey?: string;
};

export function PushNotificationManager() {
  const t = useTranslations("notifications");
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapid, setVapid] = useState<VapidConfig | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);

    fetch("/api/push/vapid-key")
      .then((r) => r.json())
      .then((data: VapidConfig) => setVapid(data))
      .catch(() => {});

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  async function subscribe() {
    if (!vapid?.publicKey) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as unknown as ArrayBuffer,
      });

      const p256dhKey = sub.getKey("p256dh");
      const authKey = sub.getKey("auth");

      function arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }

      const p256dh = p256dhKey ? arrayBufferToBase64(p256dhKey) : "";
      const auth = authKey ? arrayBufferToBase64(authKey) : "";

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh,
          auth,
        }),
      });

      setSubscribed(true);
      toast.success(t("pushEnabled"));
    } catch {
      toast.error(t("pushFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success(t("pushDisabled"));
    } catch {
      toast.error(t("pushFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!supported || !vapid?.enabled) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="size-4 text-primary" />
        ) : (
          <BellOff className="size-4 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {subscribed ? t("pushEnabled") : t("pushDisabled")}
          </p>
          <p className="text-xs text-muted-foreground">
            {subscribed ? t("pushEnabledHint") : t("pushDisabledHint")}
          </p>
        </div>
      </div>
      <Button
        variant={subscribed ? "outline" : "default"}
        size="sm"
        onClick={() => (subscribed ? void unsubscribe() : void subscribe())}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : subscribed ? (
          t("pushUnsubscribe")
        ) : (
          t("pushSubscribe")
        )}
      </Button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
