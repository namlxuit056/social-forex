import { redirect } from "next/navigation";
import { Bot, BookOpen, Pencil, Plus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  generateAcademyLessonAction,
  publishAcademyLesson,
  unpublishAcademyLesson,
  deleteAcademyLesson,
  regenerateImageAction,
} from "./actions";
import { SubmitButton } from "./submit-button";
import { BulkGenerateForm } from "./bulk-form";
import { EditImageForm } from "./edit-image-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Quản lý Academy AI" };
}

export default async function AdminAcademyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">Không có quyền truy cập</h1>
        <p className="text-muted-foreground">Trang này yêu cầu quyền ADMIN.</p>
      </div>
    );
  }

  const lessons = await prisma.academyLesson.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      level: true,
      locale: true,
      title: true,
      status: true,
      imageUrl: true,
      quizQuestions: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          <BookOpen className="mr-2 inline-block size-5" aria-hidden />
          Bài học Academy AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhập chủ đề mô hình nến, AI sẽ tạo bài học song ngữ + quiz + ảnh minh họa.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
        <div className="flex flex-col gap-5">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="size-4 text-primary" aria-hidden />
                Tạo bài học theo chủ đề
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={generateAcademyLessonAction} className="space-y-4">
                <div>
                  <Label htmlFor="topic">Chủ đề / Mô hình nến</Label>
                  <Input
                    id="topic"
                    name="topic"
                    placeholder="VD: Hammer Candle, Doji, Three White Soldiers..."
                    className="mt-1.5"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nhập tên tiếng Anh hoặc tiếng Việt. AI sẽ tạo nội dung song ngữ.
                  </p>
                </div>
                <div>
                  <Label htmlFor="level">Cấp độ</Label>
                  <select
                    id="level"
                    name="level"
                    defaultValue="intermediate"
                    className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="beginner">Cơ bản (Beginner)</option>
                    <option value="intermediate">Trung cấp (Intermediate)</option>
                    <option value="advanced">Nâng cao (Advanced)</option>
                  </select>
                </div>
                <SubmitButton className="w-full" pendingLabel="AI đang viết bài (~15-30 giây)...">
                  <Bot className="mr-2 size-4" aria-hidden />
                  Generate bài học
                </SubmitButton>
              </form>
            </CardContent>
          </Card>

          <BulkGenerateForm />
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-primary" aria-hidden />
              Bài học đã tạo ({lessons.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có bài học nào. Nhập chủ đề và bấm Generate.
              </p>
            ) : (
              lessons.map((lesson) => {
                const quizCount = Array.isArray(lesson.quizQuestions)
                  ? (lesson.quizQuestions as unknown[]).length
                  : 0;
                return (
                  <div
                    key={lesson.id}
                    className="rounded-lg border border-border/60 bg-card/45 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={lesson.status === "PUBLISHED" ? "default" : "outline"}>
                        {lesson.status === "PUBLISHED" ? "Published" : lesson.status === "ARCHIVED" ? "Archived" : "Draft"}
                      </Badge>
                      <Badge variant="secondary">{lesson.locale.toUpperCase()}</Badge>
                      <Badge variant="secondary">{lesson.level}</Badge>
                      {quizCount > 0 && (
                        <span className="text-xs text-muted-foreground">{quizCount} câu quiz</span>
                      )}
                      {lesson.imageUrl ? (
                        <span className="text-xs text-green-500">✓ Ảnh</span>
                      ) : (
                        <span className="text-xs text-amber-500">✗ Chưa có ảnh</span>
                      )}
                    </div>
                    <Link
                      href={`/admin/academy/${lesson.slug}`}
                      className="block text-sm font-semibold text-foreground hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">/academy/{lesson.slug}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/admin/academy/${lesson.slug}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Sửa nội dung
                      </Link>
                      {lesson.status !== "PUBLISHED" ? (
                        <form action={publishAcademyLesson}>
                          <input type="hidden" name="id" value={lesson.id} />
                          <SubmitButton size="sm" pendingLabel="Publishing...">
                            Publish
                          </SubmitButton>
                        </form>
                      ) : (
                        <form action={unpublishAcademyLesson}>
                          <input type="hidden" name="id" value={lesson.id} />
                          <SubmitButton size="sm" variant="outline" pendingLabel="Unpublishing...">
                            Unpublish
                          </SubmitButton>
                        </form>
                      )}
                      <form action={regenerateImageAction}>
                        <input type="hidden" name="slug" value={lesson.slug} />
                        <input type="hidden" name="topic" value={lesson.title} />
                        <SubmitButton size="sm" variant="outline" pendingLabel="Đang tạo ảnh...">
                          🖼 Tạo lại ảnh
                        </SubmitButton>
                      </form>
                      <form action={deleteAcademyLesson}>
                        <input type="hidden" name="id" value={lesson.id} />
                        <SubmitButton size="sm" variant="ghost" pendingLabel="Deleting...">
                          Xóa
                        </SubmitButton>
                      </form>
                    </div>
                    <EditImageForm slug={lesson.slug} currentImageUrl={lesson.imageUrl} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
