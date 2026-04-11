import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Đăng ký" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">Tạo tài khoản</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Mật khẩu tối thiểu 8 ký tự.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-zinc-500">
        Đã có tài khoản?{" "}
        <Link href="/auth/signin" className="text-emerald-500 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
