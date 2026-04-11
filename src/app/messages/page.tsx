import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Tin nhắn</h1>
      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {conversations.length === 0 && (
          <li className="p-6 text-zinc-500">
            Chưa có hội thoại. Mở hồ sơ trader (ví dụ từ{" "}
            <Link href="/leaderboard" className="text-emerald-500">
              BXH
            </Link>
            ) và bấm <strong>Nhắn tin</strong>.
          </li>
        )}
        {conversations.map((c) => (
          <li key={c.otherId}>
            <Link
              href={`/messages/${c.otherId}`}
              className="flex items-center justify-between gap-4 p-4 transition hover:bg-zinc-900/50"
            >
              <div>
                <span className="font-medium text-zinc-100">
                  {c.other?.name ?? c.other?.email ?? c.otherId}
                </span>
                <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                  {c.last.body}
                </p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                {new Date(c.last.createdAt).toLocaleString("vi-VN")}
                {c.unread > 0 && (
                  <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-white">
                    {c.unread}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
