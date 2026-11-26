import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";
import {
  ensureSettings,
  publicSettings,
  updateSettings,
} from "../../../../lib/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;
  const s = await ensureSettings(auth.panel.id);
  return json({ settings: publicSettings(s) });
}

export async function PATCH(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  let body: {
    remind3Days?: boolean;
    remind6Days?: boolean;
    morningSummary?: boolean;
    morningHour?: number;
    timezone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const s = await updateSettings(auth.panel.id, body);
  return json({ ok: true, settings: publicSettings(s) });
}
