import { json } from "../../../../lib/auth";
import { extractBearer, safeEqual } from "../../../../lib/apiKeyAuth";
import { runAllReminders } from "../../../../lib/reminders";
import { takeRateLimit } from "../../../../lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Cron extern (Bloc notes / VPS): POST cu header
 * Authorization: Bearer <CRON_SECRET>
 * Rulează memento 3/6 zile + rezumat la morning_hour (Europe/Berlin).
 * Auth = secret dedicat (nu Cursor identity) — doar pentru automation.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) {
    return json({ error: "CRON_SECRET nu este configurat." }, 503);
  }
  const token = extractBearer(request);
  if (!token || !safeEqual(token, secret)) {
    return json({ error: "Neautorizat." }, 401);
  }

  const limited = await takeRateLimit("cron:reminders", 30, 60 * 60 * 1000);
  if (!limited.ok) {
    return json({ error: "Prea dese apelurile cron." }, 429);
  }

  const result = await runAllReminders();
  return json({ ok: true, ...result });
}
