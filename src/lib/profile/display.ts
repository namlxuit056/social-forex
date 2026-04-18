/** Public profile: display label, initials, and signal list `author` query (privacy-safe). */

export function getPublicDisplayLabel(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const n = name?.trim();
  if (n) return n;
  const e = email?.trim();
  if (e) return e.includes("@") ? (e.split("@")[0] ?? e) : e;
  return "Trader";
}

export function getSignalsAuthorQuery(name: string | null | undefined): string {
  return name?.trim() ?? "";
}

export function getInitialsFromLabel(label: string): string {
  const raw = label.trim();
  if (!raw || raw === "—") return "?";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
      .toUpperCase()
      .slice(0, 2);
  }
  return raw.slice(0, 2).toUpperCase();
}
