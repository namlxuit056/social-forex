import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonEditForm } from "./lesson-edit-form";
import { ImageUrlForm } from "./image-url-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Sửa bài học: ${slug}` };
}

export default async function EditAcademyLessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") redirect("/admin");

  const lessons = await prisma.academyLesson.findMany({
    where: { slug },
    select: {
      id: true,
      slug: true,
      locale: true,
      level: true,
      status: true,
      title: true,
      summary: true,
      body: true,
      imageUrl: true,
    },
    orderBy: { locale: "asc" },
  });

  if (lessons.length === 0) notFound();

  const vi = lessons.find((l) => l.locale === "vi");
  const en = lessons.find((l) => l.locale === "en");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/academy"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Danh sách bài học
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <BookOpen className="mr-2 inline-block size-5" aria-hidden />
          Sửa bài học
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">/academy/{slug}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant={lessons[0]?.status === "PUBLISHED" ? "default" : "outline"}>
            {lessons[0]?.status ?? "DRAFT"}
          </Badge>
          <Badge variant="secondary">{lessons[0]?.level}</Badge>
        </div>
      </div>

      <ImageUrlForm slug={slug} currentImageUrl={vi?.imageUrl ?? en?.imageUrl ?? null} />

      <div className="grid gap-6 lg:grid-cols-2">
        {vi && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🇻🇳 Tiếng Việt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LessonEditForm
                id={vi.id}
                slug={slug}
                locale="vi"
                defaultTitle={vi.title}
                defaultSummary={vi.summary}
                defaultBody={vi.body}
              />
            </CardContent>
          </Card>
        )}

        {en && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                🇬🇧 English
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LessonEditForm
                id={en.id}
                slug={slug}
                locale="en"
                defaultTitle={en.title}
                defaultSummary={en.summary}
                defaultBody={en.body}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
