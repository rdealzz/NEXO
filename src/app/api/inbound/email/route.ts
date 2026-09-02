import { NextResponse } from "next/server";
import { z } from "zod";

import { ownerForInboundEmail } from "@/lib/inbound/resolve";
import { reportFor } from "@/lib/inbound/report";
import { isConfigured, SUPPORTED_DOC_TYPES, SUPPORTED_IMAGE_TYPES } from "@/lib/nexo/extract";
import { ingest } from "@/lib/nexo/ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * E-mail encaminhado para <slug>@INBOUND_EMAIL_DOMAIN.
 *
 * Formato genérico de propósito: qualquer provedor de inbound parse (Resend,
 * Postmark, SendGrid, Cloudflare Email Workers) consegue montar este JSON com
 * poucas linhas de cola, e trocar de provedor não mexe no NEXO.
 */
const BodySchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  from: z.string(),
  subject: z.string().default(""),
  text: z.string().default(""),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content_type: z.string(),
        content_base64: z.string(),
      }),
    )
    .default([]),
});

const ANEXOS_ACEITOS = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOC_TYPES] as readonly string[];

export async function POST(request: Request) {
  const secret = process.env.INBOUND_SECRET;
  if (!secret || request.headers.get("x-nexo-secret") !== secret) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isConfigured()) {
    return NextResponse.json({ error: "motor de interpretação não configurado" }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "payload inválido", details: parsed.error.issues }, { status: 400 });
  }

  const { to, from, subject, text, attachments } = parsed.data;
  const recipients = Array.isArray(to) ? to : [to];

  const ownerId = await ownerForInboundEmail(recipients, from);
  if (!ownerId) {
    // 200 de propósito: o provedor não deve reenfileirar um e-mail que nunca
    // vai ter dono. O que dá para dizer, dizemos no corpo.
    return NextResponse.json({ ignored: "remetente ou endereço não reconhecido" });
  }

  const anexo = attachments.find((a) => ANEXOS_ACEITOS.includes(a.content_type));
  const fileData = anexo ? new Uint8Array(Buffer.from(anexo.content_base64, "base64")) : undefined;

  try {
    const result = await ingest({
      ownerId,
      input: {
        kind: "email",
        text: [subject, text].filter(Boolean).join("\n\n"),
        file:
          anexo && fileData
            ? { base64: anexo.content_base64, mediaType: anexo.content_type, name: anexo.filename }
            : undefined,
      },
      fileData,
      // De fora não há tela de revisão: o que ficou claro vira lembrete agora.
      autoCreate: true,
    });

    return NextResponse.json({
      capture_id: result.capture.id,
      created: result.created.length,
      reply: reportFor(result, process.env.NEXT_PUBLIC_SITE_URL ?? null),
    });
  } catch (error) {
    console.error("[inbound:email]", error);
    return NextResponse.json({ error: "não consegui interpretar este e-mail" }, { status: 502 });
  }
}
