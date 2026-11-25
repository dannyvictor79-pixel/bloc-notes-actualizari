import { canAccessPanel, getAppUser, json } from "../../../../lib/auth";
import {
  deletePanel,
  getPanel,
  listMembers,
  rotateInvite,
} from "../../../../lib/panels";
import { sql } from "../../../../lib/db";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const panel = await getPanel(id);
  if (!panel) return json({ error: "Panoul nu există." }, 404);
  if (!(await canAccessPanel(panel.id, user))) {
    return json({ error: "Nu ai acces la acest panou." }, 403);
  }
  const members = user.isAdmin ? await listMembers(panel.id) : [];
  return json({
    panel: {
      id: panel.id,
      slug: panel.slug,
      name: panel.name,
      kind: panel.kind,
      inviteToken: user.isAdmin ? panel.invite_token : undefined,
      systemPrompt: user.isAdmin ? panel.system_prompt : undefined,
      createdAt: panel.created_at,
    },
    members: members.map((m) => ({
      email: m.member_email,
      name: m.member_name,
      role: m.role,
      pending: m.member_sub.startsWith("invite:"),
      joinedAt: m.joined_at,
    })),
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  if (!user.isAdmin) return json({ error: "Doar adminul poate edita." }, 403);
  const { id } = await ctx.params;
  const panel = await getPanel(id);
  if (!panel) return json({ error: "Panoul nu există." }, 404);

  let body: {
    name?: string;
    systemPrompt?: string;
    rotateInvite?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  if (typeof body.name === "string" && body.name.trim()) {
    await sql("update panels set name = $1 where id = $2", [
      body.name.trim().slice(0, 80),
      id,
    ]);
  }
  if (typeof body.systemPrompt === "string") {
    await sql("update panels set system_prompt = $1 where id = $2", [
      body.systemPrompt.slice(0, 4000),
      id,
    ]);
  }
  let inviteToken = panel.invite_token;
  if (body.rotateInvite) {
    inviteToken = await rotateInvite(id);
  }

  const updated = await getPanel(id);
  return json({
    panel: {
      id: updated!.id,
      slug: updated!.slug,
      name: updated!.name,
      kind: updated!.kind,
      inviteToken,
      systemPrompt: updated!.system_prompt,
      createdAt: updated!.created_at,
    },
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  if (!user.isAdmin) return json({ error: "Doar adminul poate șterge." }, 403);
  const { id } = await ctx.params;
  try {
    await deletePanel(id);
    return json({ ok: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Eroare la ștergere." },
      400,
    );
  }
}
