import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDER_CONFIG, SELECTABLE_MODELS, type AiProvider } from "@/lib/ai/provider";
import { AiModelForm } from "./ai-model-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("aiModelSettings") };
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Claude (Anthropic)",
  deepseek: "DeepSeek",
  openai: "ChatGPT (OpenAI)",
  groq: "Groq (Llama)",
};

export default async function AdminAiModelSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const setting = await prisma.aiModelSetting.upsert({
    where: { id: "default" },
    create: {},
    update: {},
  });

  const providers = (Object.keys(PROVIDER_CONFIG) as AiProvider[]).map((id) => {
    const config = PROVIDER_CONFIG[id];
    return {
      id,
      name: PROVIDER_LABELS[id],
      models: SELECTABLE_MODELS[id],
      hasKey: Boolean(process.env[config.envKey]?.trim()),
    };
  });

  const currentProvider = providers.some((p) => p.id === setting.provider)
    ? setting.provider
    : "deepseek";
  const currentModel = setting.model ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          <Bot className="mr-2 inline-block size-5" aria-hidden />
          {t("aiModelSettings")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("aiModelSettingsDesc")}</p>
      </div>

      <Card className="border-border/70 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("aiModelSettingsChoose")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AiModelForm
            providers={providers}
            currentProvider={currentProvider}
            currentModel={currentModel}
          />
        </CardContent>
      </Card>

      <p className="max-w-2xl text-xs text-muted-foreground">{t("aiModelSettingsHint")}</p>
    </div>
  );
}
