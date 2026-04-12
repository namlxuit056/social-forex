"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { safeCallbackPath } from "@/lib/safe-redirect";

export function SignInForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(t("invalidCredentials"));
      return;
    }
    toast.success(t("signInSuccessToast"));
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="border-border/80 bg-card/80 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-xl tracking-tight">
          Truy cập tài khoản
        </CardTitle>
        <CardDescription>
          Dữ liệu được mã hóa khi chuyển tải. Không chia sẻ mật khẩu với bên thứ
          ba.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">{t("email")}</Label>
            <Input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Mật khẩu</Label>
            <Input
              id="signin-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
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
            {loading ? t("signingIn") : t("submitSignIn")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
