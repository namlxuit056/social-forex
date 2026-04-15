import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/layout/back-link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";

export default async function NewThreadPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forum");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("community", "trading");

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
          {t("newThreadPageTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("newThreadSubtitle")}</p>
      </div>
      <NewThreadForm categorySlug={slug} />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
