/**
 * Client gata de copiat în Bloc notes (înlocuiește Telegram).
 *
 * ENV în notes:
 *   PRIVAT_BASE_URL=https://privat-chat.apps.grok.bot
 *   PRIVAT_API_KEY=bn_...   (Admin Privat → panoul prietenului)
 *
 * Pentru apeluri din serverul notes, app-ul Privat trebuie accesibil
 * din afară (de obicei Public în Publish Settings). Datele = pe API key.
 *
 * Robotul IPTV se leagă ulterior — createTest() e simulat până atunci.
 */

export function createPrivatClient({
  baseUrl = process.env.PRIVAT_BASE_URL || "https://privat-chat.apps.grok.bot",
  apiKey = process.env.PRIVAT_API_KEY || "",
} = {}) {
  const root = String(baseUrl).replace(/\/$/, "");

  async function request(path, { method = "GET", body } = {}) {
    if (!apiKey) throw new Error("PRIVAT_API_KEY lipsește");
    const res = await fetch(`${root}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Privat HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    async ping() {
      return request("/api/v1/me");
    },

    async capabilities() {
      return request("/api/v1/capabilities");
    },

    /** Echivalent Telegram sendMessage */
    async sendMessage(text) {
      return request("/api/v1/messages", { method: "POST", body: { text } });
    },

    async listMessages() {
      return request("/api/v1/messages");
    },

    /** Echivalent /lista */
    async listExpirations() {
      return request("/api/v1/expirations");
    },

    async addExpiration({
      clientName,
      expiresAt,
      appName,
      macAddress,
      note,
    }) {
      return request("/api/v1/expirations", {
        method: "POST",
        body: { clientName, expiresAt, appName, macAddress, note },
      });
    },

    async sendDueReminders(withinDays = 3) {
      return request("/api/v1/reminders", {
        method: "POST",
        body: { mode: "due", withinDays },
      });
    },

    async sendMorningSummary() {
      return request("/api/v1/reminders", {
        method: "POST",
        body: { mode: "summary" },
      });
    },

    async getSettings() {
      return request("/api/v1/settings");
    },

    async updateSettings(patch) {
      return request("/api/v1/settings", { method: "PATCH", body: patch });
    },

    /** Simulat până legăm robotelul IPTV */
    async createTest({ appName, macAddress, clientName, durationHours = 24 }) {
      return request("/api/v1/tests", {
        method: "POST",
        body: { appName, macAddress, clientName, durationHours },
      });
    },

    async listTests() {
      return request("/api/v1/tests");
    },

    /** Text local / vision doar dacă OCR_AI_ENABLED e setat pe Privat */
    async ocr({ imageBase64, mimeType, text } = {}) {
      return request("/api/v1/ocr", {
        method: "POST",
        body: { imageBase64, mimeType, text },
      });
    },
  };
}

/** Drop-in peste un vechi helper de tip sendTelegram(text) */
export async function sendViaPrivatInsteadOfTelegram(text) {
  return createPrivatClient().sendMessage(text);
}
