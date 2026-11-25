export type TestCommand = {
  kind: "test";
  appName: string;
  macAddress: string;
  clientName: string;
  durationHours: 24 | 48;
};

export type ParsedCommand =
  | TestCommand
  | { kind: "help" }
  | { kind: "lista_teste" }
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
  if (lower === ".teste" || lower === "/teste") {
    return { kind: "lista_teste" };
  }
  if (
    lower === ".expirari" ||
    lower === ".expirări" ||
    lower === "/expirari" ||
    lower === "/lista"
  ) {
    return { kind: "lista_expirari" };
  }

  const isTest =
    /^\.(efectueaza|efectuează)(\s+test)?\b/i.test(trimmed) ||
    /^\.test\b/i.test(trimmed) ||
    /^\/(efectueaza|efectuează)(\s+test)?\b/i.test(trimmed) ||
    /^\/test\b/i.test(trimmed);

  if (!isTest) return null;

  const body = trimmed
    .replace(/^\.(efectueaza|efectuează)(\s+test)?\b/i, "")
    .replace(/^\.test\b/i, "")
    .replace(/^\/(efectueaza|efectuează)(\s+test)?\b/i, "")
    .replace(/^\/test\b/i, "")
    .trim();

  const durationHours: 24 | 48 = /\b48\s*h?\b/i.test(body)
    ? 48
    : /\b24\s*h?\b/i.test(body)
      ? 24
      : 24;

  const macAddress = extractMac(body) ?? "";

  const withoutMac = macAddress
    ? body.replace(new RegExp(macAddress.replace(/:/g, "[:\\-]"), "i"), " ")
    : body;
  const cleaned = withoutMac
    .replace(/\b(24|48)\s*h\b/gi, " ")
    .replace(/\b(24|48)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  let appName = "";
  let clientName = "";

  if (parts.length >= 2) {
    appName = parts[0]!;
    clientName = parts.slice(1).join(" ");
  } else if (parts.length === 1) {
    const token = parts[0]!;
    if (/^[A-Za-z0-9._-]{2,40}$/.test(token) && /[A-Za-z]/.test(token)) {
      appName = token;
    } else {
      clientName = token;
    }
  }

  // SMARTONE-style banner hints from photos transcribed as text
  if (!appName) {
    const appMatch = body.match(/\b(SMARTONE|IBO|IBOPLAYER|SMART\s*IPTV|XCIPTV)\b/i);
    if (appMatch) appName = appMatch[1]!.replace(/\s+/g, "").toUpperCase();
  }

  return {
    kind: "test",
    appName: appName || "necunoscută",
    macAddress,
    clientName: clientName || "Client",
    durationHours,
  };
}

export function helpText(): string {
  return [
    "Comenzi (înlocuiesc botul Telegram pe acest panou):",
    "",
    "`.efectueaza test SMARTONE 58:96:0A:B3:E2:84 Ion 24h`",
    "`.test IBO AA:BB:CC:DD:EE:FF Maria 48h`",
    "`.expirari` — termenele de pe panou",
    "`.teste` — joburile de test",
    "`.ajutor` — acest mesaj",
    "",
    "Poți atașa o poză din app (ex. SMARTONE cu MAC pe bară) — citesc app + MAC.",
    "Testul e simulat până legăm panoul IPTV real.",
    "Memento 3/6 zile + rezumat 09:00: cron pe /api/cron/reminders.",
  ].join("\n");
}
