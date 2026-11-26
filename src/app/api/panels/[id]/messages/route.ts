import { canAccessPanel, getAppUser, json } from "../../../../../lib/auth";
import { generateReply, openaiEnabled } from "../../../../../lib/chat";
import {
  helpText,
  parseCommand,
} from "../../../../../lib/commands";
import {
  expirationStatus,
  listExpirations,
} from "../../../../../lib/expirations";
import { ocrImageBase64, parseAppBannerText } from "../../../../../lib/ocr";
import {
  addMessage,
  getPanel,
  listMessages,
} from "../../../../../lib/panels";
import { takeRateLimit } from "../../../../../lib/rateLimit";
import { listTestJobs, runSimulatedTest } from "../../../../../lib/tests";

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

  let body: {
    content?: string;
    imageBase64?: string;
    mimeType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  const image = body.imageBase64?.trim() ?? "";
  let content = body.content?.trim() ?? "";

  if (image) {
    if (image.length > 2_500_000) {
      return json({ error: "Imaginea e prea mare." }, 400);
    }
    const ocr = await ocrImageBase64(image, body.mimeType || "image/jpeg");
    if (ocr.source === "none" && !content) {
      content =
        "[poză app] OCR vision e oprit. Lipește textul de pe bară (ex. Your MAC : AA:BB:…) sau activează OCR_AI_ENABLED.";
    } else {
      const label = [
        "[poză app]",
        ocr.appName && `App: ${ocr.appName}`,
        ocr.macAddress && `MAC: ${ocr.macAddress}`,
        ocr.trialDays != null && `Trial: ${ocr.trialDays} zile`,
        content,
      ]
        .filter(Boolean)
        .join("\n");
      content = label || "[poză app — fără text recunoscut]";
      if (ocr.macAddress || ocr.appName) {
        content += `\n\nSugestie:\n.efectueaza test ${ocr.appName || "APP"} ${ocr.macAddress || "MAC"} Nume 24h`;
      }
    }
  }

  if (!content) return json({ error: "Mesajul e gol." }, 400);
  if (content.length > 4000) {
    return json({ error: "Mesajul e prea lung (max 4000)." }, 400);
  }

  const postLimit = await takeRateLimit(
    `msg:${user.sub}:${panel.id}`,
    40,
    10 * 60 * 1000,
  );
  if (!postLimit.ok) {
    return json(
      {
        error: `Prea multe mesaje. Reîncearcă în ~${postLimit.retryAfterSec}s.`,
      },
      429,
    );
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

  const command = parseCommand(content);
  let replyText: string;
  let sample = false;
  let meta: Record<string, unknown> | undefined;

  if (image && !command) {
    const parsed = parseAppBannerText(content);
    replyText = parsed.macAddress
      ? [
          "Am citit din poză:",
          parsed.appName && `Aplicație: ${parsed.appName}`,
          `MAC: ${parsed.macAddress}`,
          parsed.trialDays != null && `Trial: ${parsed.trialDays} zile`,
          "",
          "Confirmă cu:",
          `.efectueaza test ${parsed.appName || "SMARTONE"} ${parsed.macAddress} Nume 24h`,
        ]
          .filter(Boolean)
          .join("\n")
      : "Nu am putut citi MAC-ul din poză. Scrie manual: `.efectueaza test SMARTONE AA:BB:CC:DD:EE:FF Nume 24h`";
    meta = { ocr: parsed };
  } else if (command?.kind === "help") {
    replyText = helpText();
  } else if (command?.kind === "lista_expirari") {
    const items = await listExpirations(panel.id);
    if (items.length === 0) {
      replyText = "Nu există termene pe acest panou.";
    } else {
      replyText = [
        "Termene pe panou:",
        ...items.slice(0, 15).map((e) => {
          const st = expirationStatus(e.expires_at);
          return `• ${e.client_name}${e.app_name ? ` · ${e.app_name}` : ""}${e.mac_address ? ` · ${e.mac_address}` : ""} — ${st.label} (${new Date(e.expires_at).toLocaleString("ro-RO")})`;
        }),
      ].join("\n");
    }
  } else if (command?.kind === "lista_teste") {
    const jobs = await listTestJobs(panel.id);
    if (jobs.length === 0) {
      replyText = "Niciun test pe acest panou.";
    } else {
      replyText = [
        "Joburi test:",
        ...jobs.slice(0, 10).map(
          (j) =>
            `• [${j.status}] ${j.app_name || "?"} ${j.mac_address || ""} ${j.client_name} ${j.duration_hours}h`,
        ),
      ].join("\n");
    }
  } else if (command?.kind === "test") {
    const result = await runSimulatedTest({
      panelId: panel.id,
      userSub: user.sub,
      command,
      rawInput: content,
    });
    replyText = result.reply;
    meta = { testJobId: result.job.id, status: result.job.status };
  } else if (openaiEnabled()) {
    const aiLimit = await takeRateLimit(`openai:${user.sub}`, 20, 10 * 60 * 1000);
    if (!aiLimit.ok) {
      replyText = `Limită AI atinsă. Folosește comenzile (.efectueaza test, .ajutor) sau reîncearcă în ~${aiLimit.retryAfterSec}s.`;
      sample = true;
    } else {
      const reply = await generateReply({
        systemPrompt: panel.system_prompt,
        history: recent,
        userMessage: content,
      });
      replyText = reply.content;
      sample = reply.sample;
    }
  } else {
    const reply = await generateReply({
      systemPrompt: panel.system_prompt,
      history: recent,
      userMessage: content,
    });
    replyText = reply.content;
    sample = reply.sample;
  }

  const assistantMsg = await addMessage(panel.id, {
    author_sub: "assistant",
    author_name: "Chatbot",
    role: "assistant",
    content: replyText,
  });

  return json({
    sample,
    meta,
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
