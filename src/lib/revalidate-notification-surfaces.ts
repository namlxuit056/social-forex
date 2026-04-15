import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

export function revalidateNotificationSurfaces() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`, "layout");
  }
}
