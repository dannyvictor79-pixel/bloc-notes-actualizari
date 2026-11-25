import { sql } from "./db";
import type { AppUser } from "./auth";
import { newId, newToken, slugify } from "./ids";

export type Panel = {
  id: string;
  slug: string;
  name: string;
  kind: "admin" | "friend";
  invite_token: string;
  system_prompt: string;
  created_by_sub: string;
  created_at: string;
};

export type PanelMember = {
  panel_id: string;
  member_sub: string;
  member_email: string;
  member_name: string;
  role: "owner" | "member";
  joined_at: string;
};

export type Message = {
  id: string;
  panel_id: string;
  author_sub: string;
  author_name: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export async function listPanelsForUser(user: AppUser): Promise<Panel[]> {
  if (user.isAdmin) {
    return sql<Panel>("select * from panels order by created_at asc");
  }
  return sql<Panel>(
    `select p.* from panels p
     inner join panel_members m on m.panel_id = p.id
     where m.member_sub = $1
     order by p.created_at asc`,
    [user.sub],
  );
}

export async function getPanel(id: string): Promise<Panel | null> {
  const rows = await sql<Panel>("select * from panels where id = $1", [id]);
  return rows[0] ?? null;
}

export async function getPanelByInvite(token: string): Promise<Panel | null> {
  const rows = await sql<Panel>(
    "select * from panels where invite_token = $1",
    [token],
  );
  return rows[0] ?? null;
}

export async function createFriendPanel(
  user: AppUser,
  input: {
    name: string;
    friendEmail?: string;
    friendName?: string;
    systemPrompt?: string;
  },
): Promise<Panel> {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Numele panoului este obligatoriu.");

  const id = newId("panel");
  let slug = slugify(name);
  const clash = await sql("select 1 from panels where slug = $1", [slug]);
  if (clash[0]) slug = `${slug}-${id.slice(-6)}`;

  const invite = newToken();
  const prompt =
    input.systemPrompt?.trim() ||
    `Ești asistentul panoului „${name}”. Răspunde util, prietenos și în română când utilizatorul scrie în română.`;

  await sql(
    `insert into panels (id, slug, name, kind, invite_token, system_prompt, created_by_sub)
     values ($1, $2, $3, 'friend', $4, $5, $6)`,
    [id, slug, name, invite, prompt, user.sub],
  );

  await sql(
    `insert into panel_members (panel_id, member_sub, member_email, member_name, role)
     values ($1, $2, $3, $4, 'owner')`,
    [id, user.sub, user.email, user.name],
  );

  const email = input.friendEmail?.trim().toLowerCase() ?? "";
  if (email) {
    await sql(
      `insert into panel_members (panel_id, member_sub, member_email, member_name, role)
       values ($1, $2, $3, $4, 'member')
       on conflict do nothing`,
      [
        id,
        `invite:${email}`,
        email,
        input.friendName?.trim() || email.split("@")[0] || "Prieten",
      ],
    );
  }

  const panel = await getPanel(id);
  if (!panel) throw new Error("Panoul nu a putut fi creat.");
  return panel;
}

export async function deletePanel(panelId: string): Promise<void> {
  const panel = await getPanel(panelId);
  if (!panel) return;
  if (panel.kind === "admin") {
    throw new Error("Panoul admin nu poate fi șters.");
  }
  await sql("delete from panels where id = $1", [panelId]);
}

export async function rotateInvite(panelId: string): Promise<string> {
  const token = newToken();
  await sql("update panels set invite_token = $1 where id = $2", [
    token,
    panelId,
  ]);
  return token;
}

export async function listMembers(panelId: string): Promise<PanelMember[]> {
  return sql<PanelMember>(
    "select * from panel_members where panel_id = $1 order by joined_at asc",
    [panelId],
  );
}

export async function claimInvite(
  token: string,
  user: AppUser,
): Promise<Panel> {
  const panel = await getPanelByInvite(token);
  if (!panel) throw new Error("Invitația nu este validă.");

  const existing = await sql(
    "select 1 from panel_members where panel_id = $1 and member_sub = $2",
    [panel.id, user.sub],
  );
  if (!existing[0]) {
    if (user.email) {
      await sql(
        "delete from panel_members where panel_id = $1 and member_sub = $2",
        [panel.id, `invite:${user.email.toLowerCase()}`],
      );
    }
    await sql(
      `insert into panel_members (panel_id, member_sub, member_email, member_name, role)
       values ($1, $2, $3, $4, $5)
       on conflict do nothing`,
      [
        panel.id,
        user.sub,
        user.email,
        user.name,
        panel.kind === "admin" ? "owner" : "member",
      ],
    );
  }
  return panel;
}

export async function listMessages(panelId: string): Promise<Message[]> {
  return sql<Message>(
    "select * from messages where panel_id = $1 order by created_at asc limit 200",
    [panelId],
  );
}

export async function addMessage(
  panelId: string,
  msg: {
    author_sub: string;
    author_name: string;
    role: "user" | "assistant" | "system";
    content: string;
  },
): Promise<Message> {
  const id = newId("msg");
  await sql(
    `insert into messages (id, panel_id, author_sub, author_name, role, content)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      panelId,
      msg.author_sub,
      msg.author_name,
      msg.role,
      msg.content.slice(0, 8000),
    ],
  );
  const rows = await sql<Message>("select * from messages where id = $1", [id]);
  return rows[0]!;
}
