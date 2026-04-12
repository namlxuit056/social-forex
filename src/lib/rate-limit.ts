const store = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key);
  }
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { ok: boolean; remaining: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { ok: entry.count <= maxRequests, remaining };
}
