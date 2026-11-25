import { getAppUser, json } from "../../../lib/auth";
import { listPanelsForUser } from "../../../lib/panels";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  const panels = await listPanelsForUser(user);
  return json({
    user: {
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      simulated: user.simulated,
    },
    panels: panels.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      kind: p.kind,
      inviteToken: user.isAdmin ? p.invite_token : undefined,
      apiKey: user.isAdmin ? p.api_key : undefined,
      systemPrompt: user.isAdmin ? p.system_prompt : undefined,
      createdAt: p.created_at,
    })),
  });
}
