export type ParsedCommand =
  | { kind: "help" }
  | { kind: "lista_expirari" }
  | null;

export function extractMac(text: string): string | null {
  const match = text.match(/([0-9A-Fa-f]{2}[-:]){5}[0-9A-Fa-f]{2}/);
  if (!match) return null;
  return match[0].toUpperCase().replace(/-/g, ":");
}

export function parseCommand(content: string): ParsedCommand {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower === ".ajutor" ||
    lower === "/ajutor" ||
    lower === ".help" ||
    lower === "/help"
  ) {
    return { kind: "help" };
  }
  if (
    lower === ".expirari" ||
    lower === ".expirări" ||
    lower === "/expirari" ||
    lower === "/lista"
  ) {
    return { kind: "lista_expirari" };
  }
  return null;
}

export function helpText(): string {
  return [
    "Comenzi pe acest panou:",
    "",
    "`.expirari` — termenele de pe panou",
    "`.ajutor` — acest mesaj",
    "",
    "Poți atașa o poză din app (ex. SMARTONE) — citesc app + MAC din text/poză.",
    "Memento 3/6 zile + rezumat 09:00: cron pe /api/cron/reminders.",
    "Robot / teste IPTV = app separat, ulterior.",
  ].join("\n");
}
