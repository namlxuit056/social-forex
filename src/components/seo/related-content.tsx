import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { Lesson } from "@/lib/content/academy";

type ArticleSummary = {
  slug: string;
  title: string;
  keyword: string;
  summary: string;
};

export async function RelatedLessons({
  lessons,
  label,
}: {
  lessons: Lesson[];
  label: string;
}) {
  const tAcademy = await getTranslations("academy");
  if (lessons.length === 0) return null;

  return (
    <section aria-label={label} className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {label}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => (
          <Link
            key={lesson.slug}
            href={`/academy/${lesson.slug}`}
            className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-card"
          >
            <Badge variant="outline" className="mb-2 text-[10px]">
              {tAcademy(lesson.level)}
            </Badge>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary">
              {lesson.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {lesson.summary}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RelatedArticles({
  articles,
  label,
}: {
  articles: ArticleSummary[];
  label: string;
}) {
  if (articles.length === 0) return null;

  return (
    <section aria-label={label} className="space-y-3">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {label}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-card"
          >
            <Badge variant="outline" className="mb-2 text-[10px]">
              {article.keyword}
            </Badge>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary">
              {article.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {article.summary}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
