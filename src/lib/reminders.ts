import { sql } from "./db";
import { newId } from "./ids";
import { addMessage } from "./panels";
import { expirationStatus, listExpirations } from "./expirations";

export type PanelSettings = {
  panel_id: string;
  remind_3_days: boolean;
  remind_6_days: boolean;
  morning_summary: boolean;
  morning_hour: number;
  timezone: string;
  last_remind_3_on: string | null;
  last_remind_6_on: string | null;
  last_morning_on: string | null;
};

function todayInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function hourInTz(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

export async function ensureSettings(panelId: string): Promise<PanelSettings> {
  await sql(
    `insert into panel_settings (panel_id) values ($1) on conflict do nothing`,
    [panelId],
  );
  const rows = await sql<PanelSettings>(
    "select * from panel_settings where panel_id = $1",
    [panelId],
  );
  return rows[0]!;
}

export async function listAllSettings(): Promise<PanelSettings[]> {
  return sql<PanelSettings>("select * from panel_settings");
}

async function alreadyLogged(
  panelId: string,
  kind: string,
  day: string,
  expirationId?: string,
): Promise<boolean> {
  const rows = await sql(
    `select 1 from reminder_log
     where panel_id = $1 and kind = $2 and sent_on = $3::date
       and ($4::text is null or expiration_id = $4)
     limit 1`,
    [panelId, kind, day, expirationId ?? null],
  );
  return Boolean(rows[0]);
}

async function logReminder(
  panelId: string,
  kind: string,
  day: string,
  expirationId?: string,
): Promise<void> {
  await sql(
    `insert into reminder_log (id, panel_id, kind, expiration_id, sent_on)
     values ($1, $2, $3, $4, $5::date)`,
    [newId("rem"), panelId, kind, expirationId ?? null, day],
  );
}

export async function runPanelReminders(panelId: string): Promise<{
  sent: number;
  details: string[];
}> {
  const settings = await ensureSettings(panelId);
  const tz = settings.timezone || "Europe/Berlin";
  const day = todayInTz(tz);
  const hour = hourInTz(tz);
  const details: string[] = [];
  let sent = 0;

  const rows = await listExpirations(panelId);

  async function sendDue(days: 3 | 6, enabled: boolean) {
    if (!enabled) return;
    const kind = `due_${days}`;
    for (const e of rows) {
      const st = expirationStatus(e.expires_at);
      if (st.daysLeft !== days) continue;
      if (await alreadyLogged(panelId, kind, day, e.id)) continue;
      const when = new Date(e.expires_at).toLocaleString("ro-RO", {
        timeZone: tz,
      });
      const text = [
        `Mesaj pentru ${e.client_name}${e.app_name ? ` · ${e.app_name}` : ""} (expiră peste ${days} zile, ${when})`,
        "",
        `Bună, ${e.client_name}. Te informăm că abonamentul expiră pe ${when} (${days} zile rămase).`,
        "Pentru a evita întreruperea, te rugăm să prelungești înainte de această dată.",
        "Dacă ai plătit deja, ignoră acest mesaj.",
      ].join("\n");
      await addMessage(panelId, {
        author_sub: "reminders",
        author_name: "Memento",
        role: "assistant",
        content: text,
      });
      await logReminder(panelId, kind, day, e.id);
      sent += 1;
      details.push(`${kind}:${e.client_name}`);
    }
    if (days === 3) {
      await sql(
        `update panel_settings set last_remind_3_on = $2::date, updated_at = now() where panel_id = $1`,
        [panelId, day],
      );
    } else {
      await sql(
        `update panel_settings set last_remind_6_on = $2::date, updated_at = now() where panel_id = $1`,
        [panelId, day],
      );
    }
  }

  await sendDue(3, settings.remind_3_days);
  await sendDue(6, settings.remind_6_days);

  if (
    settings.morning_summary &&
    hour === settings.morning_hour &&
    settings.last_morning_on !== day
  ) {
    if (!(await alreadyLogged(panelId, "morning", day))) {
      const lines =
        rows.length === 0
          ? ["Niciun termen pe panou."]
          : rows.slice(0, 20).map((e) => {
              const st = expirationStatus(e.expires_at);
              return `• ${e.client_name}${e.app_name ? ` · ${e.app_name}` : ""} — ${st.label}`;
            });
      await addMessage(panelId, {
        author_sub: "reminders",
        author_name: "Rezumat",
        role: "assistant",
        content: [`Rezumat dimineață (${tz})`, ...lines].join("\n"),
      });
      await logReminder(panelId, "morning", day);
      await sql(
        `update panel_settings set last_morning_on = $2::date, updated_at = now() where panel_id = $1`,
        [panelId, day],
      );
      sent += 1;
      details.push("morning");
    }
  }

  return { sent, details };
}

export async function runAllReminders(): Promise<{
  panels: number;
  sent: number;
}> {
  const panels = await sql<{ id: string }>("select id from panels");
  let sent = 0;
  for (const p of panels) {
    const r = await runPanelReminders(p.id);
    sent += r.sent;
  }
  return { panels: panels.length, sent };
}
