/**
 * Transcrição de áudio.
 *
 * A API do Claude não recebe áudio, e o áudio que chega pelo WhatsApp não pode
 * ser transcrito no navegador — não há navegador nenhum nesse caminho. Então
 * esta é a única peça do NEXO que fala com outro provedor: um POST multipart
 * para um endpoint compatível com a API de transcrição da OpenAI (a própria
 * OpenAI, ou Groq com whisper-large-v3, que é mais barato).
 *
 * Dentro do app o caminho continua sendo a Web Speech API, no dispositivo: lá
 * o áudio nunca sobe.
 */
const DEFAULT_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "whisper-1";

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.TRANSCRIPTION_API_KEY);
}

export class TranscriptionUnavailableError extends Error {
  constructor() {
    super("Transcrição de áudio não configurada (TRANSCRIPTION_API_KEY).");
    this.name = "TranscriptionUnavailableError";
  }
}

export async function transcribeAudio(data: Uint8Array, fileName: string, mediaType: string): Promise<string> {
  const key = process.env.TRANSCRIPTION_API_KEY;
  if (!key) throw new TranscriptionUnavailableError();

  const base = process.env.TRANSCRIPTION_API_BASE ?? DEFAULT_BASE;
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(data)], { type: mediaType }), fileName);
  form.set("model", process.env.TRANSCRIPTION_MODEL ?? DEFAULT_MODEL);
  form.set("language", "pt");

  const response = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Transcrição falhou: HTTP ${response.status} ${await response.text().catch(() => "")}`);
  }
  const body = (await response.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) throw new Error("Transcrição voltou vazia.");
  return text;
}
