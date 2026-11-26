import { sql } from "./db";

type MemoryBucket = { count: number; resetAt: number };

type Store = Map<string, MemoryBucket>;

const g = globalThis as typeof globalThis & { __privatRateLimit?: Store };
g.__privatRateLimit ??= new Map();

function memoryTake(
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

/**
 * Prefer Postgres-backed windows so limits hold across instances.
 * Falls back to memory if the DB is unavailable.
 */
export async function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs).toISOString();
  try {
    const rows = await sql<{ hit_count: number; reset_at: string }>(
      "select hit_count, reset_at from rate_limits where bucket_key = $1",
      [key],
    );
    const row = rows[0];
    if (!row || new Date(row.reset_at).getTime() <= now) {
      await sql(
        `insert into rate_limits (bucket_key, hit_count, reset_at)
         values ($1, 1, $2)
         on conflict (bucket_key) do update
           set hit_count = 1, reset_at = excluded.reset_at`,
        [key, resetAt],
      );
      return { ok: true };
    }
    if (row.hit_count >= limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((new Date(row.reset_at).getTime() - now) / 1000),
        ),
      };
    }
    await sql(
      "update rate_limits set hit_count = hit_count + 1 where bucket_key = $1",
      [key],
    );
    return { ok: true };
  } catch {
    return memoryTake(key, limit, windowMs);
  }
}
