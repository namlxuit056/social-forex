import Link from "next/link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ebookResources } from "@/lib/content/resources";
import { pageCtas } from "@/lib/page-cta-presets";

export const metadata = {
  title: "Tài liệu & Ebook",
  description:
    "Kho tài liệu PDF, ebook và liên kết hữu ích cho trader forex.",
};

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Kho tài liệu
        </h1>
        <p className="mt-2 text-muted-foreground">
          PDF và liên kết ngoài — thay{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">href</code>{" "}
          khi có file thật.
        </p>
      </div>
      <ul className="space-y-3">
        {ebookResources.map((r) => (
          <li
            key={r.title}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 ring-1 ring-foreground/5"
          >
            <div>
              <span className="font-medium text-foreground">{r.title}</span>
              {r.note && (
                <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>
              )}
            </div>
            <Link
              href={r.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {r.kind === "pdf" ? "Tải / xem" : "Mở"}
            </Link>
          </li>
        ))}
      </ul>
      <PageCtaRow heading="Tiếp theo" items={[...pageCtas.learn, ...pageCtas.community]} />
    </div>
  );
}
