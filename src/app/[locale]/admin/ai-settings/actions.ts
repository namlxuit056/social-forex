"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  PROVIDER_CONFIG,
  SELECTABLE_MODELS,
  invalidateAiModelSettingCache,
  type AiProvider,
} from "@/lib/ai/provider";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Admin permission required.");
}

const providerKeys = Object.keys(PROVIDER_CONFIG) as [AiProvider, ...AiProvider[]];

const settingSchema = z.object({
  provider: z.enum(providerKeys),
  model: z.string().max(200).trim(),
});

export type SaveAiModelSettingState = { error: string } | { ok: true } | null;

export async function updateAiModelSetting(
  _prev: SaveAiModelSettingState,
  formData: FormData,
): Promise<SaveAiModelSettingState> {
  await requireAdmin();

  const parsed = settingSchema.safeParse({
    provider: formData.get("provider"),
    model: formData.get("model"),
  });
  if (!parsed.success) {
    return { error: "Lựa chọn không hợp lệ." };
  }

  const { provider, model } = parsed.data;
  const knownModels = SELECTABLE_MODELS[provider];
  const finalModel = model && knownModels.includes(model) ? model : null;

  await prisma.aiModelSetting.upsert({
    where: { id: "default" },
    create: { provider, model: finalModel },
    update: { provider, model: finalModel },
  });
  invalidateAiModelSettingCache();

  revalidatePath("/admin/ai-settings");
  return { ok: true };
}
