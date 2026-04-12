import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const blocks = [
  {
    title: "Utility",
    desc: "Position size, pivot, margin; máy tính gắn với thực hành.",
    href: "/tools",
  },
  {
    title: "Real-time",
    desc: "Bảng giá demo + pipeline WebSocket/API broker khi bạn tích hợp.",
    href: "/quotes",
  },
  {
    title: "Social",
    desc: "Diễn đàn, tín hiệu (free/VIP), BXH và hồ sơ trader.",
    href: "/forum",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Forex · Cộng đồng · Dữ liệu
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Một nền tảng cho trader cần{" "}
          <span className="text-primary">công cụ</span>,{" "}
          <span className="text-chart-3">số liệu</span> và{" "}
          <span className="text-chart-4">người cùng chiến tuyến</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Next.js, Prisma, Auth.js và route cho quotes, calendar, tools, chart,
          forum, signals, analytics, academy. Đăng nhập để vào Dashboard; giai
          đoạn tiếp theo: giá thật, thanh toán VIP và moderation.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/quotes" className={cn(buttonVariants({ size: "lg" }))}>
            Xem tỷ giá
          </Link>
          <Link
            href="/academy"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-border",
            )}
          >
            Academy
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
            )}
          >
            Dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {blocks.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group rounded-2xl border border-border bg-card/50 p-6 ring-1 ring-foreground/5 transition hover:border-primary/30 hover:bg-card"
          >
            <h2 className="font-heading text-lg font-medium text-foreground group-hover:text-primary">
              {b.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {b.desc}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
