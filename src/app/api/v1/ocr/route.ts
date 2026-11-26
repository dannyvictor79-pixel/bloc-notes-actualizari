import { json } from "../../../../lib/auth";
import { requirePanelApiKey } from "../../../../lib/apiKeyAuth";
import { ocrImageBase64, parseAppBannerText } from "../../../../lib/ocr";

export const dynamic = "force-dynamic";

/** OCR poză app (SMARTONE etc.) — doar pentru panoul cheii. */
export async function POST(request: Request) {
  const auth = await requirePanelApiKey(request);
  if (auth instanceof Response) return auth;

  let body: { imageBase64?: string; mimeType?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalid." }, 400);
  }

  if (body.text?.trim()) {
    return json({ ok: true, result: parseAppBannerText(body.text) });
  }

  const image = body.imageBase64?.trim() ?? "";
  if (!image) {
    return json({ error: "Trimite imageBase64 sau text." }, 400);
  }
  if (image.length > 2_500_000) {
    return json({ error: "Imaginea e prea mare." }, 400);
  }

  const result = await ocrImageBase64(image, body.mimeType || "image/jpeg");
  return json({ ok: true, panelId: auth.panel.id, result });
}
