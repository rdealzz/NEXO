import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { CaptureAnalysisSchema, type CaptureAnalysis, type CaptureKind } from "./schema";
import { SYSTEM_PROMPT, todayInSaoPaulo, weekdayInSaoPaulo } from "./prompt";

const MODEL = "claude-opus-5";

export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export const SUPPORTED_DOC_TYPES = ["application/pdf"] as const;

export type CaptureInput = {
  kind: CaptureKind;
  /** Texto colado, transcrição do áudio, corpo do e-mail encaminhado. */
  text?: string;
  /** Anexo já em base64, sem o prefixo data:. */
  file?: { base64: string; mediaType: string; name: string };
  /** Resposta do usuário a um `clarification` da rodada anterior. */
  followUp?: string;
};

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!cached) cached = new Anthropic();
  return cached;
}

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function contentFor(input: CaptureInput): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  if (input.file) {
    const { base64, mediaType } = input.file;
    if ((SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mediaType)) {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: mediaType as (typeof SUPPORTED_IMAGE_TYPES)[number], data: base64 },
      });
    } else if ((SUPPORTED_DOC_TYPES as readonly string[]).includes(mediaType)) {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else {
      throw new UnsupportedFileError(mediaType);
    }
  }

  const today = todayInSaoPaulo();
  const parts = [
    `Hoje é ${today} (${weekdayInSaoPaulo()}), fuso America/Sao_Paulo.`,
    `Tipo do material: ${input.kind}.`,
  ];
  if (input.file) parts.push(`Arquivo anexado: ${input.file.name}.`);
  if (input.text?.trim()) parts.push(`\nConteúdo enviado pelo usuário:\n"""\n${input.text.trim()}\n"""`);
  if (input.followUp?.trim()) parts.push(`\nO usuário respondeu à sua pergunta anterior: "${input.followUp.trim()}"`);
  parts.push("\nInterprete e devolva o que precisa virar lembrete.");

  blocks.push({ type: "text", text: parts.join("\n") });
  return blocks;
}

export class UnsupportedFileError extends Error {
  constructor(readonly mediaType: string) {
    super(`Tipo de arquivo não suportado: ${mediaType}`);
    this.name = "UnsupportedFileError";
  }
}

/**
 * Única chamada de IA do produto inteiro. Depois daqui é banco, regra e
 * notificação — por isso o custo por usuário não cresce com o uso diário.
 */
export async function analyzeCapture(input: CaptureInput): Promise<CaptureAnalysis> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    // Prefixo estável primeiro: o system prompt é idêntico em toda requisição.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: contentFor(input) }],
    output_config: { format: zodOutputFormat(CaptureAnalysisSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("O modelo recusou analisar este material.");
  }
  if (!response.parsed_output) {
    throw new Error("Não consegui interpretar a resposta do modelo.");
  }
  return response.parsed_output;
}
