import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Bot, FileText, Play, Settings } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  archiveAiArticle,
  publishAiArticle,
  runAiArticleAutomationNow,
  updateAiArticleAutomation,
} from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("aiArticles") };
}

function formatDate(value: Date | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminAiArticlesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const [setting, articles] = await Promise.all([
    prisma.aiArticleAutomationSetting.upsert({
      where: { id: "default" },
      create: {},
      update: {},
    }),
    prisma.aiGeneratedArticle.findMany({
      orderBy: { generatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          <Bot className="mr-2 inline-block size-5" aria-hidden />
          {t("aiArticles")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("aiArticlesDesc")}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="size-4 text-primary" aria-hidden />
              {t("aiArticlesSettings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAiArticleAutomation} className="space-y-4">
              <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 text-sm">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={setting.enabled}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block font-medium text-foreground">
                    {t("aiArticlesEnable")}
                  </span>
                  <span className="text-muted-foreground">
                    {t("aiArticlesEnableHint")}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <input
                  type="checkbox"
                  name="autoPublish"
                  defaultChecked={setting.autoPublish}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block font-medium text-foreground">
                    {t("aiArticlesAutoPublish")}
                  </span>
                  <span className="text-muted-foreground">
                    {t("aiArticlesAutoPublishHint")}
                  </span>
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="locale">{t("aiArticlesLocale")}</Label>
                  <select
                    id="locale"
                    name="locale"
                    defaultValue={setting.locale}
                    className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="vi">VI</option>
                    <option value="en">EN</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="maxArticlesPerDay">
                    {t("aiArticlesDailyLimit")}
                  </Label>
                  <Input
                    id="maxArticlesPerDay"
                    name="maxArticlesPerDay"
                    type="number"
                    min="1"
                    max="5"
                    defaultValue={setting.maxArticlesPerDay}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="seedKeywords">{t("aiArticlesSeedKeywords")}</Label>
                <Textarea
                  id="seedKeywords"
                  name="seedKeywords"
                  rows={5}
                  defaultValue={setting.seedKeywords.join("\n")}
                  className="mt-1.5 font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">{t("saveSettings")}</Button>
              </div>
            </form>

            <form action={runAiArticleAutomationNow} className="mt-3">
              <Button type="submit" variant="outline">
                <Play className="mr-2 size-4" aria-hidden />
                {t("aiArticlesRunNow")}
              </Button>
            </form>

            <p className="mt-3 text-xs text-muted-foreground">
              {t("aiArticlesLastRun", {
                date: formatDate(setting.lastRunAt, locale),
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" aria-hidden />
              {t("aiArticlesRecent")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("aiArticlesEmpty")}
              </p>
            ) : (
              articles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-lg border border-border/60 bg-card/45 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{article.status}</Badge>
                    <Badge variant="secondary">{article.keyword}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(article.generatedAt, locale)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-foreground">
                    {article.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {article.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {article.status !== "PUBLISHED" ? (
                      <form action={publishAiArticle}>
                        <input type="hidden" name="id" value={article.id} />
                        <Button type="submit" size="sm">
                          {t("publish")}
                        </Button>
                      </form>
                    ) : (
                      <Link
                        href={`/articles/${article.slug}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        {t("view")}
                      </Link>
                    )}
                    {article.status !== "ARCHIVED" ? (
                      <form action={archiveAiArticle}>
                        <input type="hidden" name="id" value={article.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          {t("archive")}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
