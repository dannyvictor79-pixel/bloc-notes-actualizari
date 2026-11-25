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

export async function resolveUser(
  identity: VerifiedIdentity,
): Promise<AppUser> {
  await ensureBootstrap(identity);
  const adminSub = await getSetting("admin_sub");
  return {
    sub: identity.sub,
    email: identity.email ?? "",
    name: identity.name || identity.email || "Utilizator",
    isAdmin: adminSub === identity.sub,
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

async function getSetting(key: string): Promise<string | null> {
  const rows = await sql<{ value: string }>(
    "select value from settings where key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await sql(
    `insert into settings (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    [key, value],
  );
}

async function ensureBootstrap(identity: VerifiedIdentity): Promise<void> {
  const adminSub = await getSetting("admin_sub");
  if (adminSub) {
    await ensureAdminPanel(adminSub, identity);
    return;
  }

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
