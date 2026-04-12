import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { LineChart, Shield } from "lucide-react";

export const metadata = { title: "Đăng nhập" };

function SignInFormFallback() {
  return (
    <div className="mx-auto h-64 max-w-md animate-pulse rounded-xl bg-muted/40" />
  );
}

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <LineChart className="size-6 text-primary" aria-hidden />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground">
          Đăng nhập Social Forex
        </h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="size-3.5 shrink-0" aria-hidden />
          Kết nối an toàn tới bảng điều khiển giao dịch & cộng đồng.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Tài khoản demo (sau seed):{" "}
          <span className="font-mono text-foreground/90">
            demo@social-forex.local
          </span>{" "}
          /{" "}
          <span className="font-mono text-foreground/90">demo1234</span>
        </p>
      </div>
      <Suspense fallback={<SignInFormFallback />}>
        <SignInForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
