import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DmCompose } from "@/components/messages/dm-compose";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ userId: string }> };

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({ params }: Props) {
  const { userId: otherId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/messages/${otherId}`);
  }
  const me = session.user.id;

  if (otherId === me) {
    redirect("/messages");
  }

  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, name: true, email: true },
  });
  if (!other) notFound();

  await prisma.directMessage.updateMany({
    where: {
      recipientId: me,
      senderId: otherId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const thread = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, recipientId: otherId },
        { senderId: otherId, recipientId: me },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/messages" className="text-sm text-emerald-500 hover:underline">
          ← Hội thoại
        </Link>
        <Link
          href={`/u/${otherId}`}
          className="text-lg font-medium text-white hover:text-emerald-400"
        >
          {other.name ?? other.email ?? "Trader"}
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        {thread.length === 0 && (
          <p className="text-sm text-zinc-500">Chưa có tin nhắn — gửi lời chào bên dưới.</p>
        )}
        {thread.map((m) => {
          const mine = m.senderId === me;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                mine
                  ? "ml-auto bg-emerald-900/40 text-emerald-100"
                  : "bg-zinc-800 text-zinc-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {new Date(m.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          );
        })}
      </div>

      <DmCompose recipientId={otherId} />
    </div>
  );
}
