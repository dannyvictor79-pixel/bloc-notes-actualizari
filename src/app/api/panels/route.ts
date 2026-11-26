import { getAppUser, json } from "../../../lib/auth";
import { createFriendPanel, listPanelsForUser } from "../../../lib/panels";
import {
  ensureSettings,
  publicSettings,
} from "../../../lib/reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  const panels = await listPanelsForUser(user);
  return json({
    panels: panels.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      kind: p.kind,
      inviteToken: user.isAdmin ? p.invite_token : undefined,
      apiKey: user.isAdmin ? p.api_key : undefined,
      createdAt: p.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  if (!user.isAdmin) {
    return json({ error: "Doar adminul poate crea panouri pentru prieteni." }, 403);
  }

  let body: {
    name?: string;
    friendEmail?: string;
    friendName?: string;
    systemPrompt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  try {
    const panel = await createFriendPanel(user, {
      name: body.name ?? "",
      friendEmail: body.friendEmail,
      friendName: body.friendName,
      systemPrompt: body.systemPrompt,
    });
    const settings = publicSettings(await ensureSettings(panel.id));
    return json(
      {
        panel: {
          id: panel.id,
          slug: panel.slug,
          name: panel.name,
          kind: panel.kind,
          inviteToken: panel.invite_token,
          apiKey: panel.api_key,
          systemPrompt: panel.system_prompt,
          createdAt: panel.created_at,
          settings,
        },
      },
      201,
    );
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Eroare la creare." },
      400,
    );
  }
}
