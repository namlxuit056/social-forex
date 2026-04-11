export function slugify(input: string): string {
  const s = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 72);
  return s || "thread";
}

export function randomSuffix(len = 6): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}
