import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import type { AppLocale } from "./api-locale";

export function pickErrors(locale: AppLocale) {
  return locale === "en" ? en.errors : vi.errors;
}

type AiBundle = (typeof en)["ai"];

export function pickAi(locale: AppLocale): AiBundle {
  return locale === "en" ? en.ai : vi.ai;
}
