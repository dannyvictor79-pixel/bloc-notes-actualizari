import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";

export const dynamic = "force-dynamic";

/** Bloc notes: verifică API key-ul panoului (înlocuiește „bot conectat”). */
export async function GET(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;
  return json({
    ok: true,
    panel: {
      id: auth.panel.id,
      name: auth.panel.name,
      kind: auth.panel.kind,
      slug: auth.panel.slug,
    },
    channel: "privat",
    replaces: "telegram",
  });
}
