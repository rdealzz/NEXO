/**
 * Cliente mínimo da WhatsApp Cloud API (Meta). Só o que o NEXO precisa:
 * baixar a mídia que a pessoa mandou e responder o que foi feito com ela.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

type Media = { data: Uint8Array; mediaType: string; fileName: string };

/** Duas etapas: o id vira uma URL temporária, e a URL exige o mesmo token. */
export async function downloadMedia(mediaId: string): Promise<Media | null> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return null;

  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: { authorization: `Bearer ${token}` } });
  if (!meta.ok) return null;
  const { url, mime_type: mediaType } = (await meta.json()) as { url?: string; mime_type?: string };
  if (!url) return null;

  const file = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!file.ok) return null;

  const extension = (mediaType ?? "application/octet-stream").split("/")[1]?.split(";")[0] ?? "bin";
  return {
    data: new Uint8Array(await file.arrayBuffer()),
    mediaType: (mediaType ?? "application/octet-stream").split(";")[0],
    fileName: `whatsapp-${mediaId}.${extension}`,
  };
}

export async function sendText(to: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return false;

  const response = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (!response.ok) console.error("[whatsapp] envio falhou", response.status, await response.text());
  return response.ok;
}
