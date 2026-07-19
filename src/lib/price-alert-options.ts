export const ALERT_COOLDOWN_OPTIONS = [5, 15, 30, 60] as const;
export const ALERT_COOLDOWN_DEFAULT = 15;
export type AlertCooldownMinutes = (typeof ALERT_COOLDOWN_OPTIONS)[number];
