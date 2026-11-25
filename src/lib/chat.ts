import type { Message } from "./panels";

type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export function openaiEnabled(): boolean {
  return (process.env.OPENAI_API_KEY?.trim() ?? "") !== "";
}

export async function generateReply(options: {
  systemPrompt: string;
  history: Message[];
  userMessage: string;
}): Promise<{ content: string; sample: boolean }> {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!key) {
    return {
      sample: true,
      content: sampleReply(options.userMessage),
    };
  }

  // Keep the outbound payload small: system + last few turns only.
  const history: ChatTurn[] = [
    {
      role: "system",
      content:
        options.systemPrompt ||
        "Ești un chatbot privat, util și concis. Răspunde în limba utilizatorului.",
    },
    ...options.history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.slice(0, 2000),
      })),
    { role: "user", content: options.userMessage.slice(0, 2000) },
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
      max_tokens: 700,
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
    return "Salut! Sunt chatbotul tău privat (mod demo — adaugă cheia OpenAI pentru răspunsuri reale). Cu ce te ajut?";
  }
  if (/(salut|bună|buna|hello|hi)\b/.test(q)) {
    return "Salut! Sunt aici pe panoul tău privat. Întreabă-mă orice — acum rulez pe date de exemplu până adaugi cheia OpenAI.";
  }
  if (/(ajutor|help|ce poți|ce poti)/.test(q)) {
    return "Pot discuta pe acest panou, ține minte conversația și răspunde pe tonul setat de admin. După ce legi OpenAI, răspunsurile vor veni de la model.";
  }
  const preview =
    userMessage.length > 120 ? `${userMessage.slice(0, 117)}…` : userMessage;
  return `Am primit: „${preview}”.\n\nAcesta e un răspuns demo (fără cheie OpenAI). Conversația e salvată pe panou; când adaugi cheia, același chat va folosi modelul real.`;
}
