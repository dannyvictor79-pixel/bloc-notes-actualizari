import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";

export const dynamic = "force-dynamic";

/** Discovery for Bloc notes: canal chat + termene (fără robot/teste). */
export async function GET(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  return json({
    ok: true,
    channel: "privat",
    replaces: "telegram",
    panel: { id: auth.panel.id, name: auth.panel.name, kind: auth.panel.kind },
    robotReady: false,
    testsEnabled: false,
    endpoints: {
      me: "GET /api/v1/me",
      capabilities: "GET /api/v1/capabilities",
      sendMessage: "POST /api/v1/messages",
      listMessages: "GET /api/v1/messages",
      listExpirations: "GET /api/v1/expirations",
      addExpiration: "POST /api/v1/expirations",
      reminders: "POST /api/v1/reminders",
      settings: "GET|PATCH /api/v1/settings",
      ocr: "POST /api/v1/ocr",
      cronReminders: "POST /api/cron/reminders (CRON_SECRET)",
    },
    telegramMap: {
      sendMessage: "sendMessage(text)",
      getMe: "ping() / capabilities()",
      list: "listExpirations()",
      addTerm: "addExpiration({ clientName, expiresAt, ... })",
      remind3Days: "sendDueReminders(3) or cron",
      morningSummary: "sendMorningSummary() or cron",
    },
  });
}
