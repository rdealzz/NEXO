import { NextResponse } from "next/server";

import { store } from "@/lib/db";
import { analyzeCapture, isConfigured, UnsupportedFileError } from "@/lib/nexo/extract";
import { suggestFollowUps } from "@/lib/nexo/rules";
import { CaptureKindSchema, type CaptureKind } from "@/lib/nexo/schema";
import { attachOwner, currentOwner } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Recebe qualquer coisa e devolve o que aquilo deveria virar. Nada é salvo como lembrete ainda. */
export async function POST(request: Request) {
  const owner = await currentOwner();

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY não configurada. Veja o README para rodar localmente." },
      { status: 503 },
    );
  }

  let kind: CaptureKind = "texto";
  let text: string | undefined;
  let followUp: string | undefined;
  let file: { base64: string; mediaType: string; name: string } | undefined;

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
      file = {
        base64: Buffer.from(await upload.arrayBuffer()).toString("base64"),
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
    const analysis = await analyzeCapture({ kind, text, file, followUp });
    const capture = await store().createCapture(owner.id, {
      kind,
      summary: analysis.summary,
      raw_text: text?.trim() ?? null,
      file_name: file?.name ?? null,
      analysis,
    });

    return attachOwner(
      NextResponse.json({
        capture_id: capture.id,
        analysis,
        follow_ups: suggestFollowUps(analysis),
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
