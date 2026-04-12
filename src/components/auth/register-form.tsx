"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setLoading(false);
      const msg = data.error ?? "Không thể đăng ký.";
      setError(msg);
      toast.error("Đăng ký không thành công", { description: msg });
      return;
    }
    const sign = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (sign?.error) {
      const msg =
        "Đã tạo tài khoản nhưng đăng nhập thất bại — hãy thử đăng nhập.";
      setError(msg);
      toast.warning("Cần đăng nhập thủ công", { description: msg });
      return;
    }
    toast.success("Chào mừng đến Social Forex");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="border-border/80 bg-card/80 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-heading text-xl tracking-tight">
          Tạo tài khoản mới
        </CardTitle>
        <CardDescription>
          Mật khẩu tối thiểu 8 ký tự. Bằng việc đăng ký, bạn đồng ý với điều
          khoản sử dụng và công bố rủi ro giao dịch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">Tên hiển thị</Label>
            <Input
              id="register-name"
              required
              minLength={2}
              autoComplete="name"
              placeholder="Tên của bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">Email</Label>
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
            <Label htmlFor="register-password">Mật khẩu</Label>
            <Input
              id="register-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
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
            {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
