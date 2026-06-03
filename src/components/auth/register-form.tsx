"use client";

import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { localizedHref } from "@/lib/localized-href";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

export function RegisterForm({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    track(ANALYTICS_EVENTS.registerView, { surface: "register_page" });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    track(ANALYTICS_EVENTS.registerSubmit, { surface: "register_page" });
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setLoading(false);
      track(ANALYTICS_EVENTS.registerFailure, {
        reason: data.error ? "api_error" : "unknown",
        surface: "register_page",
      });
      const msg = data.error ?? t("registerFailed");
      setError(msg);
      toast.error(t("registerFailTitle"), { description: msg });
      return;
    }
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (sign?.error) {
      track(ANALYTICS_EVENTS.registerFailure, {
        reason: "signin_after_create",
        surface: "register_page",
      });
      const msg = t("createdSignInFailed");
      setError(msg);
      toast.warning(t("manualSignInTitle"), { description: msg });
      return;
    }
    track(ANALYTICS_EVENTS.registerSuccess, { surface: "register_page" });
    toast.success(t("welcomeToast"));
    router.push(localizedHref(callbackUrl, locale));
    router.refresh();
  }

  return (
    <Card className="border-border/80 bg-card/80 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-xl tracking-tight">
          {t("registerTitle")}
        </CardTitle>
        <CardDescription>{t("registerValueProp")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="mb-5 grid gap-2 rounded-lg border border-border/70 bg-muted/25 p-3 text-sm text-muted-foreground">
          <li>{t("registerBenefitWatchlist")}</li>
          <li>{t("registerBenefitProgress")}</li>
          <li>{t("registerBenefitJournal")}</li>
          <li>{t("registerBenefitFollow")}</li>
        </ul>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">{t("name")}</Label>
            <Input
              id="register-name"
              required
              minLength={2}
              autoComplete="name"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">{t("email")}</Label>
            <Input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">{t("password")}</Label>
            <Input
              id="register-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? t("creatingAccount") : t("submitRegister")}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("registerPolicy")}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
