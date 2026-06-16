import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArticleEditor } from "@/components/articles/article-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // used for summary + metaDescription
import { Link } from "@/i18n/navigation";
import { updateAiArticle } from "../actions";

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("aiArticlesEdit") };
}

export default async function EditAiArticlePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") redirect("/admin");

  const article = await prisma.aiGeneratedArticle.findUnique({
    where: { id },
  });
  if (!article) notFound();

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
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          <Bot className="mr-2 inline-block size-5" aria-hidden />
          {t("aiArticlesEdit")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {article.keyword} · {article.locale.toUpperCase()} · {article.status}
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t("aiArticlesEditContent")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAiArticle} className="space-y-5">
            <input type="hidden" name="id" value={article.id} />

            <div>
              <Label htmlFor="title">{t("aiArticlesFieldTitle")}</Label>
              <Input
                id="title"
                name="title"
                defaultValue={article.title}
                maxLength={140}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("aiArticlesFieldTitleHint")}
              </p>
            </div>

            <div>
              <Label htmlFor="summary">{t("aiArticlesFieldSummary")}</Label>
              <Textarea
                id="summary"
                name="summary"
                defaultValue={article.summary}
                maxLength={280}
                rows={3}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("aiArticlesFieldSummaryHint")}
              </p>
            </div>

            <div>
              <Label htmlFor="metaDescription">
                {t("aiArticlesFieldMeta")}
              </Label>
              <Textarea
                id="metaDescription"
                name="metaDescription"
                defaultValue={article.metaDescription}
                maxLength={180}
                rows={2}
                className="mt-1.5"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("aiArticlesFieldMetaHint")}
              </p>
            </div>

            <div>
              <Label className="mb-1.5 block">{t("aiArticlesFieldBody")}</Label>
              <ArticleEditor
                name="body"
                defaultValue={article.body}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("aiArticlesFieldBodyHint")}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">{t("saveSettings")}</Button>
              <Link
                href="/admin/articles"
                className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm hover:bg-accent"
              >
                {t("cancel")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
