import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { UserPlus } from "lucide-react";

export const metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
          <UserPlus className="size-6 text-primary" aria-hidden />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground">
          Tạo tài khoản
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tham gia cộng đồng, theo dõi tín hiệu và công cụ giao dịch.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link
          href="/auth/signin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
