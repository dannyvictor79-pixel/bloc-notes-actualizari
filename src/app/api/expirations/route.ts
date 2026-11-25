import { canAccessPanel, getAppUser, json } from "../../../lib/auth";
import {
  addExpiration,
  expirationStatus,
  listAllExpirations,
  listExpirations,
} from "../../../lib/expirations";
import { getPanel, listPanelsForUser } from "../../../lib/panels";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const panelId = url.searchParams.get("panelId");

  let rows;
  if (panelId) {
    if (!(await canAccessPanel(panelId, user))) {
      return json({ error: "Nu ai acces." }, 403);
    }
    rows = await listExpirations(panelId);
  } else if (user.isAdmin) {
    rows = await listAllExpirations();
  } else {
    const panels = await listPanelsForUser(user);
    const all = await Promise.all(panels.map((p) => listExpirations(p.id)));
    rows = all.flat();
  }

  return json({
    expirations: rows.map((e) => {
      const st = expirationStatus(e.expires_at);
      return {
        id: e.id,
        panelId: e.panel_id,
        clientName: e.client_name,
        appName: e.app_name,
        macAddress: e.mac_address,
        expiresAt: e.expires_at,
        source: e.source,
        note: e.note,
        statusLabel: st.label,
        tone: st.tone,
        daysLeft: st.daysLeft,
      };
    }),
  });
}

export async function POST(request: Request) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;

  let body: {
    panelId?: string;
    clientName?: string;
    appName?: string;
    macAddress?: string;
    expiresAt?: string;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const panelId = body.panelId?.trim() ?? "";
  if (!panelId) return json({ error: "panelId lipsește." }, 400);
  if (!(await canAccessPanel(panelId, user))) {
    return json({ error: "Nu ai acces." }, 403);
  }
  const panel = await getPanel(panelId);
  if (!panel) return json({ error: "Panoul nu există." }, 404);

  const clientName = body.clientName?.trim() ?? "";
  if (!clientName) return json({ error: "Numele e obligatoriu." }, 400);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return json({ error: "Data expirării e invalidă." }, 400);
  }

  const row = await addExpiration({
    panelId,
    clientName,
    appName: body.appName,
    macAddress: body.macAddress,
    expiresAt,
    source: "manual",
    note: body.note,
  });
  const st = expirationStatus(row.expires_at);
  return json(
    {
      expiration: {
        id: row.id,
        panelId: row.panel_id,
        clientName: row.client_name,
        appName: row.app_name,
        macAddress: row.mac_address,
        expiresAt: row.expires_at,
        statusLabel: st.label,
        tone: st.tone,
        daysLeft: st.daysLeft,
      },
    },
    201,
  );
}
