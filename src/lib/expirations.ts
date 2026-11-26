import { sql } from "./db";
import { newId } from "./ids";

export type Expiration = {
  id: string;
  panel_id: string;
  client_name: string;
  app_name: string;
  mac_address: string;
  expires_at: string;
  source: string;
  note: string;
  created_at: string;
};

export async function listExpirations(panelId: string): Promise<Expiration[]> {
  return sql<Expiration>(
    `select * from expirations
     where panel_id = $1
     order by expires_at asc
     limit 100`,
    [panelId],
  );
}

export async function listAllExpirations(): Promise<Expiration[]> {
  return sql<Expiration>(
    `select * from expirations order by expires_at asc limit 200`,
  );
}

export async function addExpiration(input: {
  panelId: string;
  clientName: string;
  appName?: string;
  macAddress?: string;
  expiresAt: Date;
  source?: string;
  note?: string;
}): Promise<Expiration> {
  const id = newId("exp");
  await sql(
    `insert into expirations
      (id, panel_id, client_name, app_name, mac_address, expires_at, source, note)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      input.panelId,
      input.clientName.slice(0, 120),
      (input.appName ?? "").slice(0, 80),
      (input.macAddress ?? "").slice(0, 32),
      input.expiresAt.toISOString(),
      input.source ?? "manual",
      input.note ?? "",
    ],
  );
  const rows = await sql<Expiration>(
    "select * from expirations where id = $1",
    [id],
  );
  return rows[0]!;
}

export function expirationStatus(expiresAt: string | Date): {
  label: string;
  tone: "ok" | "today" | "soon" | "expired";
  daysLeft: number;
} {
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  const daysLeft = Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return { label: "Expirat", tone: "expired", daysLeft };
  if (daysLeft === 0) return { label: "Expiră astăzi", tone: "today", daysLeft };
  if (daysLeft <= 3)
    return { label: `Expiră în ${daysLeft} zile`, tone: "soon", daysLeft };
  if (daysLeft <= 6)
    return { label: `Expiră în ${daysLeft} zile`, tone: "soon", daysLeft };
  return { label: `Expiră în ${daysLeft} zile`, tone: "ok", daysLeft };
}
