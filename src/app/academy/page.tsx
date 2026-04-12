import Link from "next/link";
import { Disclaimer } from "@/components/layout/disclaimer";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { academyLessons } from "@/lib/content/academy";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Academy",
  description:
    "Học giao dịch forex từ cơ bản đến nâng cao: quản lý rủi ro, price action, tin tức và SMC.",
};

const levelLabel = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

export default function AcademyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Academy / Wiki
        </h1>
        <p className="mt-2 text-muted-foreground">
          Nội dung tĩnh trong code — chuyển sang CMS hoặc MDX khi có nhiều bài.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {academyLessons.map((lesson) => (
          <li
            key={lesson.slug}
            className="rounded-xl border border-border bg-card/50 p-5 ring-1 ring-foreground/5"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              {levelLabel[lesson.level]}
            </span>
            <h2 className="mt-2 font-heading text-lg font-medium text-foreground">
              {lesson.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{lesson.summary}</p>
            <Link
              href={`/academy/${lesson.slug}`}
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "mt-4 h-auto px-0",
              )}
            >
              Chi tiết →
            </Link>
          </li>
        ))}
      </ul>
      <Disclaimer variant="compact" />
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.learn, ...pageCtas.explore]} />
    </div>
  );
}
