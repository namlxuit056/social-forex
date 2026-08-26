import { revalidateLocalizedPath } from "@/lib/revalidate-locales";

export function revalidateNotificationSurfaces() {
  revalidateLocalizedPath("/", "layout");
}
