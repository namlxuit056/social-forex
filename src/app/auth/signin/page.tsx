import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Đăng nhập" };

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">Đăng nhập</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Tài khoản demo:{" "}
          <span className="font-mono text-zinc-400">demo@social-forex.local</span>{" "}
          / <span className="font-mono text-zinc-400">demo1234</span> (sau khi seed)
        </p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-zinc-500">
        Chưa có tài khoản?{" "}
        <Link href="/auth/register" className="text-emerald-500 hover:underline">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
