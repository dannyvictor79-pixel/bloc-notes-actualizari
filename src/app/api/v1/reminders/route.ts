import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";
import { expirationStatus, listExpirations } from "../../../../lib/expirations";
import { addMessage } from "../../../../lib/panels";

export const dynamic = "force-dynamic";

/**
 * Trimite pe chat memento-uri (înlocuiește mesajele Telegram 3 zile / rezumat).
 * body: { mode: "due" | "summary", withinDays?: number }
 */
export async function POST(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  let body: { mode?: string; withinDays?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const mode = body.mode === "summary" ? "summary" : "due";
  const withinDays =
    typeof body.withinDays === "number" && body.withinDays > 0
      ? Math.min(body.withinDays, 30)
      : 3;

  const rows = await listExpirations(auth.panel.id);
  const annotated = rows.map((e) => ({
    e,
    st: expirationStatus(e.expires_at),
  }));

  let lines: string[];
  if (mode === "summary") {
    lines = [
      `Rezumat termene — ${auth.panel.name}`,
      ...annotated.slice(0, 20).map(
        ({ e, st }) =>
          `• ${e.client_name}${e.app_name ? ` (${e.app_name})` : ""} — ${st.label} · ${new Date(e.expires_at).toLocaleString("ro-RO")}`,
      ),
    ];
    if (annotated.length === 0) lines.push("Niciun termen pe panou.");
  } else {
    const due = annotated.filter(
      ({ st }) => st.daysLeft >= 0 && st.daysLeft <= withinDays,
    );
    if (due.length === 0) {
      return json({
        ok: true,
        sent: false,
        reason: `Niciun termen în următoarele ${withinDays} zile.`,
      });
    }
    lines = due.map(({ e, st }) => {
      const when = new Date(e.expires_at).toLocaleString("ro-RO");
      return [
        `Mesaj pentru ${e.client_name}${e.app_name ? ` · ${e.app_name}` : ""} (expiră peste ${st.daysLeft} zile, ${when})`,
        "",
        `Bună, ${e.client_name}. Te informăm că abonamentul expiră pe ${when} (${st.daysLeft} zile rămase).`,
        "Pentru a evita întreruperea, te rugăm să prelungești înainte de această dată.",
        "Dacă ai plătit deja, ignoră acest mesaj.",
      ].join("\n");
    });
  }

  const text = lines.join("\n\n—\n\n");
  const message = await addMessage(auth.panel.id, {
    author_sub: "bloc-notes",
    author_name: "Bloc notes",
    role: "assistant",
    content: text.slice(0, 8000),
  });

  return json({
    ok: true,
    sent: true,
    mode,
    messageId: message.id,
  });
}
