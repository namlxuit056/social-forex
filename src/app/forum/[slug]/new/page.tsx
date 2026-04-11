import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function NewThreadPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/forum/${slug}/new`);
  }

  const category = await prisma.forumCategory.findUnique({
    where: { slug },
  });
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/forum/${slug}`}
        className="text-sm text-emerald-500 hover:underline"
      >
        ← {category.name}
      </Link>
      <h1 className="text-2xl font-semibold text-white">Chủ đề mới</h1>
      <NewThreadForm categorySlug={slug} />
    </div>
  );
}
