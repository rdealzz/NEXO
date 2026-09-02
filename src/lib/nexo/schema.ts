import { z } from "zod";

/**
 * O NEXO não pede que o usuário classifique nada. Ele joga qualquer coisa
 * na caixa e o modelo devolve estes objetos. Tudo aqui é `.nullable()` em vez
 * de `.optional()` porque o structured output da API exige schema estrito.
 */

export const CATEGORIES = [
  "financeiro",
  "veiculo",
  "casa",
  "saude",
  "documento",
  "viagem",
  "garantia",
  "assinatura",
  "trabalho",
  "pessoal",
  "outro",
] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const CAPTURE_KINDS = ["texto", "imagem", "documento", "audio", "email"] as const;
export const CaptureKindSchema = z.enum(CAPTURE_KINDS);
export type CaptureKind = z.infer<typeof CaptureKindSchema>;

/** Um compromisso que o modelo achou que precisa existir. */
export const SuggestedReminderSchema = z.object({
  title: z.string().describe("Frase curta e acionável, em português. Ex.: 'Pagar boleto de energia (R$ 187,90)'"),
  due_date: z.string().describe("Data do evento em si, formato YYYY-MM-DD."),
  due_time: z.string().nullable().describe("Hora HH:MM em 24h quando houver hora definida, senão null."),
  lead_days: z
    .array(z.number().int())
    .describe(
      "Com quantos dias de antecedência avisar. Ex.: [3, 0] avisa 3 dias antes e no dia. Use [0] para coisas do próprio dia.",
    ),
  category: CategorySchema,
  why: z.string().describe("Uma frase explicando de onde saiu essa data, para o usuário conferir."),
  confidence: z.number().describe("0 a 1. Abaixo de 0.6 o app pede confirmação da data."),
  source_quote: z.string().nullable().describe("Trecho literal do material onde a data aparece, se houver."),
});
export type SuggestedReminder = z.infer<typeof SuggestedReminderSchema>;

/** A entidade por trás da captura — é ela que destrava os lembretes preditivos. */
export const EntitySchema = z.object({
  kind: z
    .string()
    .describe(
      "Tipo do objeto/serviço central: veiculo, eletrodomestico, eletronico, imovel, seguro, plano_saude, documento, viagem, assinatura, conta, pet, ou vazio.",
    ),
  name: z.string().describe("Nome legível. Ex.: 'Geladeira Brastemp Inverse', 'Honda Civic 2019'."),
  identifier: z.string().nullable().describe("Placa, número da nota, contrato, apólice — se aparecer."),
});
export type Entity = z.infer<typeof EntitySchema>;

export const CaptureAnalysisSchema = z.object({
  understood: z.boolean().describe("false quando o material não permite extrair nada de útil."),
  summary: z.string().describe("Uma frase dizendo o que é isso, em português."),
  category: CategorySchema,
  entity: EntitySchema.nullable(),
  amount_brl: z.number().nullable().describe("Valor em reais quando o material for uma cobrança."),
  reminders: z.array(SuggestedReminderSchema),
  clarification: z
    .string()
    .nullable()
    .describe("Se faltou informação essencial (ex.: nenhuma data), a pergunta única que o app deve fazer."),
  tags: z.array(z.string()),
});
export type CaptureAnalysis = z.infer<typeof CaptureAnalysisSchema>;
