import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ebookResources } from "@/lib/content/resources";
import { pageCtas } from "@/lib/page-cta-presets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resources");
  return { title: t("title"), description: t("description") };
}

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resources");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <ul className="space-y-3">
        {ebookResources.map((r) => (
          <li
            key={r.title}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 ring-1 ring-foreground/5"
          >
            <div>
              <span className="font-medium text-foreground">{r.title}</span>
              {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
            </div>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {r.kind === "pdf" ? t("download") : t("open")}
            </a>
          </li>
        ))}
      </ul>
      <PageCtaRow heading="→" items={[...pageCtas.learn, ...pageCtas.community]} />
    </div>
  );
}
