const STATUS_I18N = {
  ACTIVE: "statusActive",
  CLOSED_WIN: "statusClosedWin",
  CLOSED_LOSS: "statusClosedLoss",
  CANCELLED: "statusCancelled",
} as const;

type StatusKey = keyof typeof STATUS_I18N;

export function signalStatusLabel(
  t: (key: string) => string,
  status: StatusKey,
): string {
  return t(STATUS_I18N[status]);
}

export function signalTierLabel(
  t: (key: string) => string,
  tier: "FREE" | "VIP",
): string {
  return tier === "VIP" ? t("detailMetaTierVip") : t("detailMetaTierFree");
}
