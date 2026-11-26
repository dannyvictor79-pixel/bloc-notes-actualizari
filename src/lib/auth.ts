import {
  getIdentity,
  requireIdentity,
  type VerifiedIdentity,
} from "../../cursor/identity";
import { sql } from "./db";
import { newId, newToken, slugify } from "./ids";

export type AppUser = {
  sub: string;
  email: string;
  name: string;
  isAdmin: boolean;
  simulated: boolean;
};

const NO_STORE = { "cache-control": "private, no-store" };

function isPublishedHost(): boolean {
  return Boolean(
    process.env.CURSOR_APP_ID?.trim() || process.env.VERCEL?.trim(),
  );
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export async function requirePerson(
  request: Request,
): Promise<VerifiedIdentity | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (identity.kind === "key") {
    return json({ error: "Cheile API nu pot folosi chatul." }, 403);
  }
  return identity;
}

/**
 * Admin rules:
 * - Private published app: signed-in person is the only viewer → admin.
 * - Team / shared: APP_OWNER_EMAIL must match a verified email.
 * - Local (no CURSOR_APP_ID): simulated viewer may admin for Preview.
 */
export function computeIsAdmin(identity: VerifiedIdentity): boolean {
  if (identity.kind !== "person") return false;
  if (identity.simulated && isPublishedHost()) return false;

  // Private Cursor apps admit only the owner — treat them as admin.
  if (
    isPublishedHost() &&
    !identity.simulated &&
    identity.appVisibility === "private"
  ) {
    return true;
  }

  const ownerEmail = process.env.APP_OWNER_EMAIL?.trim().toLowerCase() ?? "";
  const viewerEmail = (identity.email ?? "").trim().toLowerCase();
  if (!ownerEmail || !viewerEmail || viewerEmail !== ownerEmail) return false;
  if (identity.emailVerified === false) return false;
  return true;
}

export async function resolveUser(
  identity: VerifiedIdentity,
): Promise<AppUser> {
  const isAdmin = computeIsAdmin(identity);
  if (isAdmin) {
    await ensureAdminRecords(identity);
  }

  return {
    sub: identity.sub,
    email: identity.email ?? "",
    name: identity.name || identity.email || "Utilizator",
    isAdmin,
    simulated: Boolean(identity.simulated),
  };
}

export async function getAppUser(
  request: Request,
): Promise<AppUser | Response> {
  const identity = await requirePerson(request);
  if (identity instanceof Response) return identity;
  return resolveUser(identity);
}

async function setSetting(key: string, value: string): Promise<void> {
  await sql(
    `insert into settings (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    [key, value],
  );
}

async function ensureAdminRecords(identity: VerifiedIdentity): Promise<void> {
  await setSetting("admin_sub", identity.sub);
  await setSetting("admin_email", identity.email ?? "");
  await setSetting("admin_name", identity.name || "Admin");
  await ensureAdminPanel(identity.sub, identity);
}

async function ensureAdminPanel(
  adminSub: string,
  identity: VerifiedIdentity,
): Promise<void> {
  const existing = await sql<{ id: string }>(
    "select id from panels where kind = 'admin' limit 1",
  );
  if (existing[0]) {
    const member = await sql(
      "select 1 from panel_members where panel_id = $1 and member_sub = $2",
      [existing[0].id, adminSub],
    );
    if (!member[0] && identity.sub === adminSub) {
      await sql(
        `insert into panel_members (panel_id, member_sub, member_email, member_name, role)
         values ($1, $2, $3, $4, 'owner')
         on conflict do nothing`,
        [
          existing[0].id,
          adminSub,
          identity.email ?? "",
          identity.name || "Admin",
        ],
      );
    }
    return;
  }

  if (identity.sub !== adminSub) return;

  const id = newId("panel");
  const invite = newToken();
  const apiKey = `bn_${newToken()}`;
  await sql(
    `insert into panels (id, slug, name, kind, invite_token, api_key, system_prompt, created_by_sub)
     values ($1, $2, $3, 'admin', $4, $5, $6, $7)`,
    [
      id,
      slugify("panou-admin"),
      "Panou Admin",
      invite,
      apiKey,
      "Ești asistentul personal al administratorului. Comenzi: .efectueaza test, .expirari, .teste, .ajutor. Răspunde clar, în română.",
      adminSub,
    ],
  );
  await sql(
    `insert into panel_members (panel_id, member_sub, member_email, member_name, role)
     values ($1, $2, $3, $4, 'owner')`,
    [id, adminSub, identity.email ?? "", identity.name || "Admin"],
  );
  await sql(
    `insert into panel_settings (panel_id) values ($1) on conflict do nothing`,
    [id],
  );
}

export async function canAccessPanel(
  panelId: string,
  user: AppUser,
): Promise<boolean> {
  if (user.isAdmin) return true;
  const rows = await sql(
    "select 1 from panel_members where panel_id = $1 and member_sub = $2",
    [panelId, user.sub],
  );
  return Boolean(rows[0]);
}

export async function optionalIdentity(request: Request) {
  return getIdentity(request);
}
