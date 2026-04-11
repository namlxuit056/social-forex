export function isVipActive(vipUntil: Date | null | undefined): boolean {
  if (!vipUntil) return false;
  return vipUntil.getTime() > Date.now();
}
