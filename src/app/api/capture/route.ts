import { NextResponse } from "next/server";

import { acessoDoDono, deveTravar } from "@/lib/assinatura/porta";
import { isConfigured, UnsupportedFileError } from "@/lib/nexo/extract";
import { ingest } from "@/lib/nexo/ingest";
import { CaptureKindSchema, type CaptureKind } from "@/lib/nexo/schema";
import { attachOwner, currentOwner } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Recebe qualquer coisa e devolve o que aquilo deveria virar. Nada é salvo como lembrete ainda. */
export async function POST(request: Request) {
  const owner = await currentOwner();

  // A trava não pode ser só de tela: sem esta checagem, quem soubesse o endereço
  // continuaria capturando de graça pelo fetch.
  if (deveTravar(await acessoDoDono(owner))) {
    return NextResponse.json(
      { error: "Seu acesso venceu. Escolha um plano para continuar mandando coisas." },
      { status: 402 },
    );
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY não configurada. Veja o README para rodar localmente." },
      { status: 503 },
    );
  }

  let kind: CaptureKind = "texto";
  let text: string | undefined;
  let followUp: string | undefined;
  let file: { base64: string; mediaType: string; name: string } | undefined;
  let fileData: Uint8Array | undefined;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const parsedKind = CaptureKindSchema.safeParse(form.get("kind"));
    if (parsedKind.success) kind = parsedKind.data;
    text = (form.get("text") as string | null) ?? undefined;
    followUp = (form.get("followUp") as string | null) ?? undefined;

    const upload = form.get("file");
    if (upload instanceof File && upload.size > 0) {
      if (upload.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "Arquivo acima de 10 MB." }, { status: 413 });
      }
      fileData = new Uint8Array(await upload.arrayBuffer());
      file = {
        base64: Buffer.from(fileData).toString("base64"),
        mediaType: upload.type,
        name: upload.name,
      };
    }
  } else {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsedKind = CaptureKindSchema.safeParse(body.kind);
    if (parsedKind.success) kind = parsedKind.data;
    if (typeof body.text === "string") text = body.text;
    if (typeof body.followUp === "string") followUp = body.followUp;
  }

  if (!text?.trim() && !file) {
    return NextResponse.json({ error: "Manda alguma coisa: um texto, uma foto ou um arquivo." }, { status: 400 });
  }

  try {
    // Dentro do app nada é criado sem a tela de revisão confirmar.
    const result = await ingest({
      ownerId: owner.id,
      input: { kind, text, file, followUp },
      fileData,
      autoCreate: false,
    });

    return attachOwner(
      NextResponse.json({
        capture_id: result.capture.id,
        analysis: result.analysis,
        follow_ups: result.followUps,
      }),
      owner,
    );
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return NextResponse.json(
        { error: "Por enquanto entendo imagens (PNG, JPG, WEBP, GIF) e PDF." },
        { status: 415 },
      );
    }
    console.error("[capture]", error);
    return NextResponse.json({ error: "Não consegui interpretar isso agora. Tenta de novo?" }, { status: 502 });
  }
}
