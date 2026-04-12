import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pageCtas } from "@/lib/page-cta-presets";
import { MessageCircle } from "lucide-react";

export const metadata = { title: "Tin nhắn" };

export const dynamic = "force-dynamic";

export default async function MessagesIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/messages");
  }
  const me = session.user.id;

  const msgs = await prisma.directMessage.findMany({
    where: {
      OR: [{ senderId: me }, { recipientId: me }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  const seen = new Set<string>();
  const latest: {
    otherId: string;
    last: (typeof msgs)[0];
  }[] = [];

  for (const m of msgs) {
    const otherId = m.senderId === me ? m.recipientId : m.senderId;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    latest.push({ otherId, last: m });
  }

  const conversations = await Promise.all(
    latest.map(async ({ otherId, last }) => {
      const unread = await prisma.directMessage.count({
        where: {
          recipientId: me,
          senderId: otherId,
          readAt: null,
        },
      });
      const other = last.senderId === me ? last.recipient : last.sender;
      return { otherId, last, unread, other };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Tin nhắn
        </h1>
        <p className="mt-2 text-muted-foreground">
          Hội thoại 1–1 với trader khác (sau khi đăng nhập).
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={MessageCircle}
            title="Chưa có hội thoại"
            description="Mở hồ sơ trader từ BXH hoặc diễn đàn và bấm Nhắn tin để bắt đầu."
            primary={{ href: "/leaderboard", label: "Mở bảng xếp hạng" }}
            secondary={[
              { href: "/forum", label: "Diễn đàn" },
              { href: "/signals", label: "Tín hiệu" },
            ]}
          />
          <PageCtaRow heading="Tiếp theo" items={[...pageCtas.community, ...pageCtas.explore]} />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {conversations.map((c) => (
              <li key={c.otherId}>
                <Link
                  href={`/messages/${c.otherId}`}
                  className="flex items-center justify-between gap-4 p-4 transition hover:bg-muted/40"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {c.other?.name ?? c.other?.email ?? c.otherId}
                    </span>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {c.last.body}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(c.last.createdAt).toLocaleString("vi-VN")}
                    {c.unread > 0 && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <PageCtaRow heading="Tiếp theo" items={[...pageCtas.community, ...pageCtas.explore]} />
        </>
      )}
    </div>
  );
}
