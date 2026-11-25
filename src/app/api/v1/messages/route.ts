import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";
import { addMessage, listMessages } from "../../../../lib/panels";

export const dynamic = "force-dynamic";

/** Trimite un mesaj pe chatul panoului (echivalent mesaj Telegram). */
export async function POST(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  let body: { text?: string; parseMode?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const text = body.text?.trim() ?? "";
  if (!text) return json({ error: "text e obligatoriu." }, 400);
  if (text.length > 4000) {
    return json({ error: "text prea lung (max 4000)." }, 400);
  }

  const recent = await listMessages(auth.panel.id);
  if (recent.length > 180) {
    return json({ error: "Panoul are prea multe mesaje." }, 429);
  }

  const message = await addMessage(auth.panel.id, {
    author_sub: "bloc-notes",
    author_name: "Bloc notes",
    role: "assistant",
    content: text,
  });

  return json({
    ok: true,
    message: {
      id: message.id,
      content: message.content,
      createdAt: message.created_at,
    },
  });
}

export async function GET(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;
  const messages = await listMessages(auth.panel.id);
  return json({
    messages: messages.slice(-50).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      authorName: m.author_name,
      createdAt: m.created_at,
    })),
  });
}
