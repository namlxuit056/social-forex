import Link from "next/link";

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
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-500/90">
          Forex · Cộng đồng · Dữ liệu
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Một nền tảng cho trader cần{" "}
          <span className="text-emerald-400">công cụ</span>,{" "}
          <span className="text-sky-400">số liệu</span> và{" "}
          <span className="text-amber-400/90">người cùng chiến tuyến</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          Đã scaffold Next.js, Prisma, Auth.js, route cho quotes/calendar/tools/chart/forum/signals/analytics/academy.
          Bước tiếp: nối nhà cung cấp giá thật, thanh toán VIP và moderation.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/quotes"
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
          >
            Xem tỷ giá
          </Link>
          <Link
            href="/academy"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-200 hover:bg-zinc-900"
          >
            Academy
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {blocks.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition hover:border-emerald-900/60 hover:bg-zinc-900/70"
          >
            <h2 className="text-lg font-medium text-white group-hover:text-emerald-400">
              {b.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {b.desc}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
