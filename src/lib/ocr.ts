import { extractMac } from "./commands";

export type OcrResult = {
  appName: string;
  macAddress: string;
  trialDays: number | null;
  rawText: string;
  source: "vision" | "text" | "none";
};

const APP_RE =
  /\b(SMARTONE|IBO(?:PLAYER)?|SMART\s*IPTV|XCIPTV|TIVIMATE|OTT\s*PLAYER)\b/i;

function ocrAiEnabled(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  const opted = (process.env.OCR_AI_ENABLED ?? "").trim().toLowerCase();
  return (
    key !== "" && (opted === "1" || opted === "true" || opted === "yes")
  );
}

export function parseAppBannerText(text: string): OcrResult {
  const macAddress = extractMac(text) ?? "";
  const appMatch = text.match(APP_RE);
  const appName = appMatch
    ? appMatch[1]!.replace(/\s+/g, "").toUpperCase()
    : "";
  const trial =
    text.match(/expire[s]?\s+in\s+(\d+)\s+day/i) ||
    text.match(/expir[ăa]\s+(?:în|in)\s+(\d+)\s+zi/i) ||
    text.match(/trial period[^\d]*(\d+)\s+Day/i);
  return {
    appName,
    macAddress,
    trialDays: trial ? Number(trial[1]) : null,
    rawText: text.slice(0, 2000),
    source: macAddress || appName ? "text" : "none",
  };
}

/**
 * Vision OCR only when OCR_AI_ENABLED is set (opt-in).
 * Otherwise returns empty — caller should ask for pasted banner text.
 */
export async function ocrImageBase64(
  imageBase64: string,
  mimeType = "image/jpeg",
): Promise<OcrResult> {
  if (!ocrAiEnabled()) {
    return {
      appName: "",
      macAddress: "",
      trialDays: null,
      rawText: "",
      source: "none",
    };
  }

  const key = process.env.OPENAI_API_KEY!.trim();
  const dataUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:${mimeType};base64,${imageBase64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Extract from this IPTV/app screenshot as JSON only: {"appName":"","macAddress":"","trialDays":null}. MAC like AA:BB:CC:DD:EE:FF. appName e.g. SMARTONE. trialDays number of days left if shown.',
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("ocr_error", response.status);
    return {
      appName: "",
      macAddress: "",
      trialDays: null,
      rawText: "",
      source: "none",
    };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { ...parseAppBannerText(raw), source: "vision" };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      appName?: string;
      macAddress?: string;
      trialDays?: number | null;
    };
    const mac =
      extractMac(parsed.macAddress ?? "") || extractMac(raw) || "";
    return {
      appName: (parsed.appName ?? "").replace(/\s+/g, "").toUpperCase(),
      macAddress: mac,
      trialDays:
        typeof parsed.trialDays === "number" ? parsed.trialDays : null,
      rawText: raw.slice(0, 2000),
      source: "vision",
    };
  } catch {
    return { ...parseAppBannerText(raw), source: "vision" };
  }
}
