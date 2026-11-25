type Bucket = { count: number; resetAt: number };

type Store = Map<string, Bucket>;

const g = globalThis as typeof globalThis & { __privatRateLimit?: Store };
g.__privatRateLimit ??= new Map();

/** Sliding fixed window: max `limit` hits per `windowMs` for a key. */
export function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const store = g.__privatRateLimit!;
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}
