import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";

import { CaptureAnalysisSchema, type CaptureAnalysis, type CaptureKind } from "./schema";
import { SYSTEM_PROMPT, todayInSaoPaulo, weekdayInSaoPaulo } from "./prompt";

/**
 * O motor de leitura do NEXO, no nível gratuito do Google Gemini.
 *
 * A escolha é econômica, não técnica: o produto precisa de um modelo com visão
 * (quase tudo que chega aqui é foto de boleto ou de nota) e o Gemini é o único
 * com visão que tem nível gratuito de verdade. O preço disso está escrito na
 * política de privacidade, sem eufemismo: no nível gratuito o Google pode usar
 * o material para melhorar os produtos dele.
 *
 * O modelo é variável de ambiente porque catálogo e nível gratuito mudam com
 * frequência maior que a deste arquivo: quando o padrão sair do gratuito, muda
 * uma variável em vez de um deploy.
 */
const MODELO = process.env.GEMINI_MODEL || "gemini-2.0-flash";

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

function chave(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export function isConfigured(): boolean {
  return Boolean(chave());
}

let cliente: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (!cliente) cliente = new GoogleGenAI({ apiKey: chave() });
  return cliente;
}

export class UnsupportedFileError extends Error {
  // Campo declarado à mão em vez de `constructor(readonly ...)`: o parameter
  // property do TypeScript não sobrevive ao strip-only do Node, e sem isto o
  // módulo não pode ser importado por um teste.
  readonly mediaType: string;

  constructor(mediaType: string) {
    super(`Tipo de arquivo não suportado: ${mediaType}`);
    this.name = "UnsupportedFileError";
    this.mediaType = mediaType;
  }
}

/**
 * O schema sai do Zod e vai no request. Duas garantias em série de propósito:
 * o schema restringe o que o modelo pode devolver, e o Zod confere depois. A
 * segunda existe porque a primeira é promessa de provedor — e promessa de
 * provedor não é tipo.
 */
export const SCHEMA_JSON = z.toJSONSchema(CaptureAnalysisSchema, { io: "output" });

function partes(input: CaptureInput): Part[] {
  const lista: Part[] = [];

  if (input.file) {
    const { base64, mediaType } = input.file;
    const aceito =
      (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mediaType) ||
      (SUPPORTED_DOC_TYPES as readonly string[]).includes(mediaType);
    if (!aceito) throw new UnsupportedFileError(mediaType);
    lista.push({ inlineData: { mimeType: mediaType, data: base64 } });
  }

  const hoje = todayInSaoPaulo();
  const trechos = [
    `Hoje é ${hoje} (${weekdayInSaoPaulo()}), fuso America/Sao_Paulo.`,
    `Tipo do material: ${input.kind}.`,
  ];
  if (input.file) trechos.push(`Arquivo anexado: ${input.file.name}.`);
  if (input.text?.trim()) trechos.push(`\nConteúdo enviado pelo usuário:\n"""\n${input.text.trim()}\n"""`);
  if (input.followUp?.trim()) {
    trechos.push(`\nO usuário respondeu à sua pergunta anterior: "${input.followUp.trim()}"`);
  }
  trechos.push("\nInterprete e devolva o que precisa virar lembrete.");

  lista.push({ text: trechos.join("\n") });
  return lista;
}

/**
 * Preenche o que o modelo pode ter deixado de fora.
 *
 * Um campo anulável vira `anyOf` no JSON Schema, e nem todo provedor honra isso
 * — o mais comum é simplesmente omitir a chave. Omissão viraria erro de
 * validação e a captura morreria inteira por causa de um `null` ausente. Aqui a
 * ausência é lida como o que ela quer dizer: não achei nada.
 *
 * O preenchimento é guiado pelo próprio schema, não por uma lista escrita à
 * mão. São doze campos anuláveis hoje, quase todos aninhados (`entity`,
 * `purchase`, cada item de `reminders`) — uma lista manual desatualizaria no
 * primeiro campo novo, e desatualizaria calada.
 */
type DefZod = {
  type?: string;
  shape?: Record<string, unknown>;
  innerType?: unknown;
  element?: unknown;
};

function def(schema: unknown): DefZod | null {
  if (!schema || typeof schema !== "object") return null;
  const alvo = schema as { def?: DefZod; _zod?: { def?: DefZod } };
  return alvo.def ?? alvo._zod?.def ?? null;
}

/** Atravessa nullable/optional/default até o tipo de verdade. */
function miolo(schema: unknown): { def: DefZod | null; anulavel: boolean } {
  let atual = schema;
  let anulavel = false;
  for (let volta = 0; volta < 10; volta += 1) {
    const d = def(atual);
    if (!d) return { def: null, anulavel };
    if (d.type === "nullable" || d.type === "optional" || d.type === "default") {
      anulavel = true;
      atual = d.innerType;
      continue;
    }
    return { def: d, anulavel };
  }
  return { def: null, anulavel };
}

export function completar(bruto: unknown, schema: unknown = CaptureAnalysisSchema): unknown {
  const { def: d } = miolo(schema);
  if (!d) return bruto;

  if (d.type === "array" && Array.isArray(bruto)) {
    return bruto.map((item) => completar(item, d.element));
  }

  if (d.type !== "object" || !d.shape) return bruto;
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return bruto;

  const objeto = bruto as Record<string, unknown>;
  for (const [campo, sub] of Object.entries(d.shape)) {
    if (campo in objeto) {
      objeto[campo] = completar(objeto[campo], sub);
      continue;
    }
    // Ausente: anulável vira null, lista vira lista vazia. Qualquer outra
    // ausência é resposta quebrada e segue para o Zod recusar.
    const { def: subDef, anulavel } = miolo(sub);
    if (anulavel) objeto[campo] = null;
    else if (subDef?.type === "array") objeto[campo] = [];
  }
  return objeto;
}

/**
 * Única chamada de IA do produto inteiro. Depois daqui é banco, regra e
 * notificação — por isso o custo por usuário não cresce com o uso diário.
 */
export async function analyzeCapture(input: CaptureInput): Promise<CaptureAnalysis> {
  const resposta = await client().models.generateContent({
    model: MODELO,
    contents: [{ role: "user", parts: partes(input) }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: SCHEMA_JSON,
      // Leitura de documento não é criação: temperatura alta aqui só inventa
      // data que não está no papel.
      temperature: 0,
    },
  });

  const parou = resposta.candidates?.[0]?.finishReason;
  if (parou === "SAFETY" || parou === "PROHIBITED_CONTENT" || resposta.promptFeedback?.blockReason) {
    throw new Error("O modelo recusou analisar este material.");
  }

  const texto = resposta.text?.trim();
  if (!texto) throw new Error("Não consegui interpretar a resposta do modelo.");

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error("Não consegui interpretar a resposta do modelo.");
  }

  const conferido = CaptureAnalysisSchema.safeParse(completar(bruto));
  if (!conferido.success) {
    // O que o modelo devolveu fora do contrato vai para o log do servidor, não
    // para a tela: a pessoa não tem o que fazer com um erro de schema.
    console.error("[extract] resposta fora do schema:", conferido.error.issues.slice(0, 5));
    throw new Error("Não consegui interpretar a resposta do modelo.");
  }
  return conferido.data;
}
