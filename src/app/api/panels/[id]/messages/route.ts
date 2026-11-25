import { canAccessPanel, getAppUser, json } from "../../../../../lib/auth";
import { generateReply } from "../../../../../lib/chat";
import {
  addMessage,
  getPanel,
  listMessages,
} from "../../../../../lib/panels";

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
  const messages = await listMessages(panel.id);
  return json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      authorName: m.author_name,
      createdAt: m.created_at,
    })),
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const user = await getAppUser(request);
  if (user instanceof Response) return user;
  const { id } = await ctx.params;
  const panel = await getPanel(id);
  if (!panel) return json({ error: "Panoul nu există." }, 404);
  if (!(await canAccessPanel(panel.id, user))) {
    return json({ error: "Nu ai acces la acest panou." }, 403);
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const content = body.content?.trim() ?? "";
  if (!content) return json({ error: "Mesajul e gol." }, 400);
  if (content.length > 4000) {
    return json({ error: "Mesajul e prea lung (max 4000)." }, 400);
  }

  const recent = await listMessages(panel.id);
  if (recent.length > 180) {
    return json(
      { error: "Panoul are prea multe mesaje. Creează un panou nou." },
      429,
    );
  }

  const userMsg = await addMessage(panel.id, {
    author_sub: user.sub,
    author_name: user.name,
    role: "user",
    content,
  });

  const reply = await generateReply({
    systemPrompt: panel.system_prompt,
    history: recent,
    userMessage: content,
  });

  const assistantMsg = await addMessage(panel.id, {
    author_sub: "assistant",
    author_name: "Chatbot",
    role: "assistant",
    content: reply.content,
  });

  return json({
    sample: reply.sample,
    messages: [
      {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        authorName: userMsg.author_name,
        createdAt: userMsg.created_at,
      },
      {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        authorName: assistantMsg.author_name,
        createdAt: assistantMsg.created_at,
      },
    ],
  });
}
