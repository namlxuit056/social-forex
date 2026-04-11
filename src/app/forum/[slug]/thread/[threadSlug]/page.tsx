import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ReplyForm } from "@/components/forum/reply-form";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string; threadSlug: string }>;
};

export const dynamic = "force-dynamic";

export default async function ForumThreadPage({ params }: Props) {
  const { slug, threadSlug } = await params;
  const session = await auth();

  const thread = await prisma.forumThread.findFirst({
    where: {
      slug: threadSlug,
      category: { slug },
    },
    include: {
      category: true,
      author: { select: { id: true, name: true, email: true } },
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!thread) notFound();

  return (
    <div className="space-y-8">
      <Link href={`/forum/${slug}`} className="text-sm text-emerald-500 hover:underline">
        ← {thread.category.name}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-white">{thread.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {thread.author?.name ?? thread.author?.email} ·{" "}
          {new Date(thread.createdAt).toLocaleString("vi-VN")}
        </p>
      </header>

      <div className="space-y-6">
        {thread.posts.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <div className="mb-2 text-xs text-zinc-500">
              {p.author?.name ?? p.author?.email} ·{" "}
              {new Date(p.createdAt).toLocaleString("vi-VN")}
            </div>
            <div className="whitespace-pre-wrap text-zinc-300">{p.body}</div>
          </article>
        ))}
      </div>

      {session?.user ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
          <ReplyForm threadId={thread.id} categorySlug={slug} />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          <Link href="/auth/signin" className="text-emerald-500 hover:underline">
            Đăng nhập
          </Link>{" "}
          để trả lời.
        </p>
      )}
    </div>
  );
}
