import { NextResponse } from "next/server";

import { ownerForPhone } from "@/lib/inbound/resolve";
import { reportFor } from "@/lib/inbound/report";
import { downloadMedia, sendText } from "@/lib/inbound/whatsapp";
import { isConfigured, SUPPORTED_DOC_TYPES, SUPPORTED_IMAGE_TYPES } from "@/lib/nexo/extract";
import { ingest } from "@/lib/nexo/ingest";
import type { CaptureKind } from "@/lib/nexo/schema";
import { transcribeAudio, transcriptionConfigured } from "@/lib/nexo/transcribe";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Handshake de assinatura do webhook da Meta. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (params.get("hub.mode") === "subscribe" && esperado && params.get("hub.verify_token") === esperado) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("token inválido", { status: 403 });
}

type Mensagem = {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string };
  audio?: { id?: string };
  voice?: { id?: string };
};

const ACEITOS = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOC_TYPES] as readonly string[];

/**
 * Mensagem recebida no WhatsApp. É o caminho mais curto da promessa "joga
 * aqui": a pessoa encaminha o boleto no app que já tem aberto e pronto.
 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { entry?: { changes?: { value?: { messages?: Mensagem[] } }[] }[] }
    | null;

  const mensagens =
    payload?.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []) ??
    [];

  // A Meta reenvia o webhook em qualquer resposta que não seja 200. Erro de
  // uma mensagem não pode fazer as outras chegarem duas vezes.
  for (const mensagem of mensagens) {
    try {
      await handle(mensagem);
    } catch (error) {
      console.error("[inbound:whatsapp]", error);
      if (mensagem.from) await sendText(mensagem.from, "Deu ruim aqui do meu lado. Manda de novo?");
    }
  }

  return NextResponse.json({ received: mensagens.length });
}

async function handle(mensagem: Mensagem) {
  const from = mensagem.from;
  if (!from) return;

  const ownerId = await ownerForPhone(from);
  if (!ownerId) {
    await sendText(
      from,
      "Não reconheço este número ainda. Entre no NEXO e vincule seu telefone nas configurações para poder me mandar coisas por aqui.",
    );
    return;
  }
  if (!isConfigured()) return;

  let kind: CaptureKind = "texto";
  let text = mensagem.text?.body ?? "";
  let file: { base64: string; mediaType: string; name: string } | undefined;
  let fileData: Uint8Array | undefined;

  const midiaId = mensagem.image?.id ?? mensagem.document?.id ?? mensagem.audio?.id ?? mensagem.voice?.id;
  if (midiaId) {
    const media = await downloadMedia(midiaId);
    if (!media) {
      await sendText(from, "Não consegui baixar esse arquivo. Tenta mandar de novo?");
      return;
    }

    if (media.mediaType.startsWith("audio/")) {
      // Claude não recebe áudio, e aqui não existe navegador para transcrever.
      if (!transcriptionConfigured()) {
        await sendText(from, "Ainda não sei ouvir áudio por aqui. Me manda escrito ou em foto?");
        return;
      }
      kind = "audio";
      text = await transcribeAudio(media.data, media.fileName, media.mediaType);
    } else if (ACEITOS.includes(media.mediaType)) {
      kind = media.mediaType.startsWith("image/") ? "imagem" : "documento";
      fileData = media.data;
      file = {
        base64: Buffer.from(media.data).toString("base64"),
        mediaType: media.mediaType,
        name: media.fileName,
      };
      text = mensagem.image?.caption ?? mensagem.document?.caption ?? "";
    } else {
      await sendText(from, "Esse tipo de arquivo eu ainda não leio. Foto ou PDF funcionam.");
      return;
    }
  }

  if (!text.trim() && !file) return;

  const result = await ingest({ ownerId, input: { kind, text, file }, fileData, autoCreate: true });
  await sendText(from, reportFor(result, process.env.NEXT_PUBLIC_SITE_URL ?? null));
}
