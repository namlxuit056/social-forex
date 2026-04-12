import Link from "next/link";
import { auth } from "@/auth";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { pageCtas } from "@/lib/page-cta-presets";
import { User } from "lucide-react";

export const metadata = { title: "Hồ sơ" };

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={User}
          title="Đăng nhập để xem hồ sơ"
          description="Quản lý tên hiển thị, VIP và liên kết hồ sơ công khai."
          primary={{
            href: "/auth/signin?callbackUrl=/profile",
            label: "Đăng nhập",
          }}
          secondary={[{ href: "/auth/register", label: "Đăng ký" }]}
        />
        <PageCtaRow heading="Tiếp theo" items={[...pageCtas.explore, ...pageCtas.community]} />
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { vipUntil: true },
  });
  const vip = isVipActive(dbUser?.vipUntil);

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        Hồ sơ
      </h1>
      <div className="rounded-xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5">
        <h2 className="font-medium text-foreground">Tài khoản</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-4">
            <dt className="text-muted-foreground">Tên</dt>
            <dd className="text-foreground">{session.user.name ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{session.user.email ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-foreground">Hồ sơ công khai</dt>
            <dd>
              <Link
                href={`/u/${session.user.id}`}
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                Xem trang /u/…
              </Link>
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-muted-foreground">Tin nhắn</dt>
            <dd>
              <Link
                href="/messages"
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                Hộp thư
              </Link>
            </dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-muted-foreground">VIP</dt>
            <dd className={vip ? "text-primary" : "text-muted-foreground"}>
              {vip
                ? `Đang hoạt động đến ${dbUser?.vipUntil?.toLocaleString("vi-VN")}`
                : "Chưa kích hoạt"}
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-muted-foreground">
          Kích hoạt VIP quản trị: POST{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            /api/admin/vip
          </code>{" "}
          với{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            ADMIN_SECRET
          </code>
          . Thanh toán tự động (Stripe) có thể gắn sau.
        </p>
      </div>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.explore, ...pageCtas.community]} />
    </div>
  );
}
