const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function getReferralLink(code: string, baseUrl?: string): string {
  const base = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "https://toolforex.xyz");
  return `${base}/?ref=${code}`;
}
