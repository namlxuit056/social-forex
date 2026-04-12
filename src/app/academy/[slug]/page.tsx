import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/layout/back-link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { Card, CardContent } from "@/components/ui/card";
import { academyLessons } from "@/lib/content/academy";
import { pageCtas } from "@/lib/page-cta-presets";

type Props = { params: Promise<{ slug: string }> };

export default async function AcademyLessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = academyLessons.find((l) => l.slug === slug);
  if (!lesson) notFound();

  return (
    <div className="space-y-8">
      <BackLink href="/academy">Academy</BackLink>
      <article className="max-w-2xl space-y-4">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {lesson.title}
        </h1>
        <p className="text-muted-foreground">{lesson.summary}</p>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nội dung đầy đủ sẽ viết bằng MDX hoặc rich text — đây là trang
            placeholder. Khi có nội dung, phần này thay bằng bài học chi tiết +
            ví dụ.
          </CardContent>
        </Card>
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
