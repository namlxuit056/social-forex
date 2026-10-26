import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ArrowLeft, PenLine } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArticleEditForm } from "@/components/articles/article-edit-form";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("aiArticlesWriteNew") };
}

export default async function NewArticlePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") redirect("/admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("aiArticlesBackToList")}
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <PenLine className="mr-2 inline-block size-5" aria-hidden />
          {t("aiArticlesWriteNew")}
        </h1>
      </div>

      <ArticleEditForm
        keyword=""
        locale={locale === "en" ? "en" : "vi"}
        status="DRAFT"
        defaultTitle=""
        defaultSummary=""
        defaultMetaDescription=""
        defaultBody=""
        cancelHref="/admin/articles"
      />
    </div>
  );
}
