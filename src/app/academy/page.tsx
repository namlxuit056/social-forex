import Link from "next/link";
import { academyLessons } from "@/lib/content/academy";

export const metadata = { title: "Academy" };

const levelLabel = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export default function AcademyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Academy / Wiki</h1>
        <p className="mt-2 text-zinc-400">
          Nội dung tĩnh trong code — chuyển sang CMS hoặc MDX khi có nhiều bài.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {academyLessons.map((lesson) => (
          <li
            key={lesson.slug}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-emerald-500/90">
              {levelLabel[lesson.level]}
            </span>
            <h2 className="mt-2 text-lg font-medium text-white">{lesson.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{lesson.summary}</p>
            <Link
              href={`/academy/${lesson.slug}`}
              className="mt-4 inline-block text-sm text-emerald-500 hover:underline"
            >
              Chi tiết (skeleton)
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
