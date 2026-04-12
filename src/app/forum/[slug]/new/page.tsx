import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/layout/back-link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { prisma } from "@/lib/prisma";
import { pageCtas } from "@/lib/page-cta-presets";

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
    <div className="mx-auto max-w-2xl space-y-8">
      <BackLink href={`/forum/${slug}`}>{category.name}</BackLink>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Chủ đề mới
        </h1>
        <p className="mt-2 text-muted-foreground">
          Tiêu đề rõ ràng giúp người khác tìm và tham gia thảo luận.
        </p>
      </div>
      <NewThreadForm categorySlug={slug} />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.community, ...pageCtas.trading]} />
    </div>
  );
}
