import type { Message } from "./panels";

type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export function openaiEnabled(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const optedIn = (process.env.CHAT_AI_ENABLED ?? "").trim().toLowerCase();
  // Opt-in only: avoids sending panel chat content to OpenAI by default.
  return key !== "" && (optedIn === "1" || optedIn === "true" || optedIn === "yes");
}

export async function generateReply(options: {
  systemPrompt: string;
  history: Message[];
  userMessage: string;
}): Promise<{ content: string; sample: boolean }> {
  if (!openaiEnabled()) {
    return {
      sample: true,
      content: sampleReply(options.userMessage),
    };
  }

  const key = process.env.OPENAI_API_KEY!.trim();

  // Minimal payload: generic system + current message only (no chat history).
  const history: ChatTurn[] = [
    {
      role: "system",
      content:
        "Ești un chatbot privat, util și concis. Răspunde în limba utilizatorului. Nu inventa date despre clienți.",
    },
    { role: "user", content: options.userMessage.slice(0, 1500) },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500,
      messages: history,
    }),
  });

  if (!response.ok) {
    console.error("openai_error", response.status);
    return {
      sample: true,
      content:
        "Nu am putut contacta modelul acum. Mesajul tău e salvat — încearcă din nou în câteva momente.",
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content =
    data.choices?.[0]?.message?.content?.trim() ||
    "Nu am generat un răspuns util. Reformulează, te rog.";
  return { content, sample: false };
}

function sampleReply(userMessage: string): string {
  const q = userMessage.trim().toLowerCase();
  if (!q) {
    return "Salut! Sunt chatbotul tău privat (mod local). Folosește .ajutor pentru comenzi.";
  }
  if (/(salut|bună|buna|hello|hi)\b/.test(q)) {
    return "Salut! Sunt pe panoul tău privat. Scrie `.ajutor` pentru comenzi.";
  }
  if (/(ajutor|help|ce poți|ce poti)/.test(q)) {
    return "Comenzi: .expirari, .ajutor. Poți trimite și o poză din app (SMARTONE) pentru OCR text.";
  }
  const preview =
    userMessage.length > 120 ? `${userMessage.slice(0, 117)}…` : userMessage;
  return `Am primit: „${preview}”.\n\nRăspuns local (AI chat e oprit până activezi CHAT_AI_ENABLED). Folosește comenzile cu punct.`;
}
