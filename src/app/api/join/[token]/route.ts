import { getAppUser, json } from "../../../../lib/auth";
import { claimInvite } from "../../../../lib/panels";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  const { token } = await ctx.params;
  try {
    const panel = await claimInvite(token, user);
    return json({
      panel: {
        id: panel.id,
        name: panel.name,
        kind: panel.kind,
      },
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : "Invitație invalidă.",
      },
      400,
    );
  }
}
