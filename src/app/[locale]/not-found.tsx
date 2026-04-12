import { FileQuestion } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  const t = useTranslations("notFound");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
        <FileQuestion className="size-8 text-muted-foreground" />
      </div>
      <h1 className="font-heading text-3xl font-semibold text-foreground">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("description")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }))}>
          {tc("home")}
        </Link>
        <Link href="/quotes" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          {tn("quotes")}
        </Link>
        <Link href="/forum" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
          {tn("forum")}
        </Link>
      </div>
    </div>
  );
}
