import Link from "next/link";
import { notFound } from "next/navigation";
import { academyLessons } from "@/lib/content/academy";

type Props = { params: Promise<{ slug: string }> };

export default async function AcademyLessonPage({ params }: Props) {
  const { slug } = await params;
  const lesson = academyLessons.find((l) => l.slug === slug);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <Link href="/academy" className="text-sm text-emerald-500 hover:underline">
        ← Academy
      </Link>
      <article className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-white">{lesson.title}</h1>
        <p className="text-zinc-400">{lesson.summary}</p>
        <p className="text-zinc-500">
          Nội dung đầy đủ sẽ viết bằng MDX hoặc rich text — đây là trang placeholder.
        </p>
      </article>
    </div>
  );
}
