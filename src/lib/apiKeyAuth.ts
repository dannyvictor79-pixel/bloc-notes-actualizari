import { timingSafeEqual } from "node:crypto";
import { sql } from "./db";
import type { Panel } from "./panels";
import { json } from "./auth";
import { takeRateLimit } from "./rateLimit";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (match?.[1]) return match[1].trim();
  const alt = request.headers.get("x-privat-api-key")?.trim();
  return alt || null;
}

export async function requirePanelApiKey(
  request: Request,
): Promise<{ panel: Panel } | Response> {
  const key = extractBearer(request);
  if (!key || !key.startsWith("bn_")) {
    return json(
      { error: "Lipsește API key (Authorization: Bearer bn_…)." },
      401,
    );
  }

  const limited = takeRateLimit(
    `apikey:${key.slice(0, 12)}`,
    120,
    10 * 60 * 1000,
  );
  if (!limited.ok) {
    return json(
      {
        error: `Prea multe cereri. Reîncearcă în ~${limited.retryAfterSec}s.`,
      },
      429,
    );
  }

  const rows = await sql<Panel>("select * from panels where api_key = $1", [
    key,
  ]);
  const panel = rows[0];
  if (!panel?.api_key || !safeEqual(panel.api_key, key)) {
    return json({ error: "API key invalid." }, 401);
  }
  return { panel };
}
