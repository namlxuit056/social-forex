import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

export const metadata = {
  title: "Diễn đàn",
  description:
    "Diễn đàn forex tiếng Việt — thảo luận chiến lược, chia sẻ kinh nghiệm, hỏi đáp cộng đồng.",
};

export const dynamic = "force-dynamic";

export default async function ForumPage() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Diễn đàn
          </h1>
          <p className="mt-2 text-muted-foreground">
            Vào từng chủ đề để xem thread, tạo bài mới và trả lời.
          </p>
        </div>
        <Link
          href="/forum/search"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Tìm chủ đề
        </Link>
      </div>
      {categories.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Chưa có danh mục diễn đàn"
          description="Chạy seed để tạo category và thread mẫu, hoặc thêm dữ liệu qua Prisma Studio."
          primary={{ href: "/", label: "Về trang chủ" }}
          secondary={[
            { href: "/signals", label: "Phòng tín hiệu" },
            { href: "/academy", label: "Academy" },
          ]}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
            >
              <Link
                href={`/forum/${c.slug}`}
                className="font-heading text-lg font-medium text-primary hover:underline"
              >
                {c.name}
              </Link>
              {c.description && (
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
