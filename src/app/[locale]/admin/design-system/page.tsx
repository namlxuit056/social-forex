import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DesignSystemShowcase } from "./design-system-showcase";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("designSystem");
  return { title: t("title"), robots: { index: false } };
}

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Internal reference page: hide its existence from everyone but admins.
  const session = await auth();
  if (!session?.user?.id) notFound();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") notFound();

  const t = await getTranslations("designSystem");
  return (
    <div className="space-y-10">
      <PageHeader title={t("title")} description={t("description")} />
      <DesignSystemShowcase />
    </div>
  );
}
