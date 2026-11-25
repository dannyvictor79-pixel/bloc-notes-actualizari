import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";
import {
  addExpiration,
  expirationStatus,
  listExpirations,
} from "../../../../lib/expirations";

export const dynamic = "force-dynamic";

/** Listează termenele panoului (ca /lista pe Telegram). */
export async function GET(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;
  const rows = await listExpirations(auth.panel.id);
  return json({
    expirations: rows.map((e) => {
      const st = expirationStatus(e.expires_at);
      return {
        id: e.id,
        clientName: e.client_name,
        appName: e.app_name,
        macAddress: e.mac_address,
        expiresAt: e.expires_at,
        source: e.source,
        note: e.note,
        statusLabel: st.label,
        daysLeft: st.daysLeft,
        tone: st.tone,
      };
    }),
  });
}

/** Adaugă un termen (format tip: dată + nume din botul Telegram). */
export async function POST(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  let body: {
    clientName?: string;
    appName?: string;
    macAddress?: string;
    expiresAt?: string;
    note?: string;
    notify?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const clientName = body.clientName?.trim() ?? "";
  if (!clientName) return json({ error: "clientName e obligatoriu." }, 400);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return json({ error: "expiresAt invalid (ISO date)." }, 400);
  }

  const row = await addExpiration({
    panelId: auth.panel.id,
    clientName,
    appName: body.appName,
    macAddress: body.macAddress,
    expiresAt,
    source: "bloc-notes",
    note: body.note,
  });

  const st = expirationStatus(row.expires_at);
  return json(
    {
      ok: true,
      expiration: {
        id: row.id,
        clientName: row.client_name,
        appName: row.app_name,
        macAddress: row.mac_address,
        expiresAt: row.expires_at,
        statusLabel: st.label,
        daysLeft: st.daysLeft,
      },
    },
    201,
  );
}
