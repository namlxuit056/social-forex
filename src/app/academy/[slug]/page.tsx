import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/layout/back-link";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Badge } from "@/components/ui/badge";
import { academyLessons } from "@/lib/content/academy";
import { pageCtas } from "@/lib/page-cta-presets";

type Props = { params: Promise<{ slug: string }> };

const levelLabel: Record<string, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export default async function AcademyLessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = academyLessons.find((l) => l.slug === slug);
  if (!lesson) notFound();

  return (
    <div className="space-y-8">
      <BackLink href="/academy">Academy</BackLink>
      <article className="max-w-2xl space-y-6">
        <div>
          <Badge variant="outline" className="mb-3 text-xs">
            {levelLabel[lesson.level] ?? lesson.level}
          </Badge>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {lesson.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{lesson.summary}</p>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90">
          {lesson.body.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="mb-3 mt-8 font-heading text-lg font-semibold text-foreground"
                >
                  {line.replace("## ", "")}
                </h2>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h3
                  key={i}
                  className="mb-2 mt-6 font-heading text-base font-medium text-foreground"
                >
                  {line.replace("### ", "")}
                </h3>
              );
            }
            if (line.startsWith("| ")) {
              return (
                <p key={i} className="font-mono text-xs text-muted-foreground">
                  {line}
                </p>
              );
            }
            if (line.startsWith("- ")) {
              return (
                <li key={i} className="ml-4 list-disc text-foreground/80">
                  {renderInlineMarkdown(line.replace(/^- /, ""))}
                </li>
              );
            }
            if (/^\d+\. /.test(line)) {
              return (
                <li key={i} className="ml-4 list-decimal text-foreground/80">
                  {renderInlineMarkdown(line.replace(/^\d+\. /, ""))}
                </li>
              );
            }
            if (line.trim() === "") {
              return <div key={i} className="h-2" />;
            }
            return (
              <p key={i} className="text-foreground/80">
                {renderInlineMarkdown(line)}
              </p>
            );
          })}
        </div>

        <Disclaimer variant="compact" />

        <p className="text-sm text-muted-foreground">
          <Link href="/academy" className="font-medium text-primary hover:underline">
            ← Danh sách bài học
          </Link>
        </p>
      </article>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.learn, ...pageCtas.trading]} />
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
