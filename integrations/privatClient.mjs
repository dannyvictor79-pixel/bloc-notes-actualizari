/**
 * Client Bloc notes → Privat (înlocuiește apelurile Telegram).
 *
 * În setările prietenului, în loc de token Telegram:
 *   PRIVAT_BASE_URL=https://privat-chat.apps.grok.bot
 *   PRIVAT_API_KEY=bn_...   (din Admin Privat → panoul prietenului)
 *
 * Notă: pentru ca serverul Bloc notes să apeleze API-ul, app-ul Privat
 * trebuie să poată fi atins din afară (de obicei vizibilitate Public în
 * Publish Settings). Datele rămân protejate de API key.
 */

export function createPrivatClient({
  baseUrl = process.env.PRIVAT_BASE_URL || "https://privat-chat.apps.grok.bot",
  apiKey = process.env.PRIVAT_API_KEY || "",
} = {}) {
  const root = baseUrl.replace(/\/$/, "");

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
    /** Echivalent „bot conectat” */
    async ping() {
      return request("/api/v1/me");
    },

    /** Echivalent sendMessage Telegram */
    async sendMessage(text) {
      return request("/api/v1/messages", { method: "POST", body: { text } });
    },

    /** Echivalent /lista */
    async listExpirations() {
      return request("/api/v1/expirations");
    },

    /** Adaugă termen (ex. din mesaj `06-01-2027 14:52 Nume`) */
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

    /** Memento 3 zile (sau withinDays) — ca checkbox-ul Telegram */
    async sendDueReminders(withinDays = 3) {
      return request("/api/v1/reminders", {
        method: "POST",
        body: { mode: "due", withinDays },
      });
    },

    /** Rezumat dimineața 09:00 */
    async sendMorningSummary() {
      return request("/api/v1/reminders", {
        method: "POST",
        body: { mode: "summary" },
      });
    },

    /** Test 24h/48h din formularul panou */
    async createTest({ appName, macAddress, clientName, durationHours = 24 }) {
      return request("/api/v1/tests", {
        method: "POST",
        body: { appName, macAddress, clientName, durationHours },
      });
    },

    /** OCR poză SMARTONE / text banner */
    async ocr({ imageBase64, mimeType, text }) {
      return request("/api/v1/ocr", {
        method: "POST",
        body: { imageBase64, mimeType, text },
      });
    },
  };
}

/**
 * Cron pe VPS / Bloc notes (la fiecare oră):
 *   curl -X POST "$PRIVAT_BASE_URL/api/cron/reminders" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

/** Exemplu drop-in peste un vechi helper Telegram */
export async function sendViaPrivatInsteadOfTelegram(text) {
  const client = createPrivatClient();
  return client.sendMessage(text);
}
