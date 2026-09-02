import { z } from "zod";

/**
 * O NEXO não pede que o usuário classifique nada. Ele joga qualquer coisa na
 * caixa e o modelo devolve estes objetos. Tudo é `.nullable()` em vez de
 * `.optional()` porque o structured output da API exige schema estrito.
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

/** Antecedências em minutos — a spec pede "10 min antes" tanto quanto "30 dias antes". */
export const LEAD = {
  naHora: 0,
  dezMinutos: 10,
  umaHora: 60,
  umDia: 1440,
  tresDias: 4320,
  umaSemana: 10080,
  trintaDias: 43200,
} as const;

/**
 * Recorrência em texto curto, fácil de ler e de testar:
 *   "dias:15" · "semanas:2" · "meses:6" · "anos:1"
 *   "mensal:5"    — todo dia 5
 *   "semanal:1"   — toda segunda (0=domingo)
 */
export const REPEAT_RULE = /^(dias|semanas|meses|anos|mensal|semanal):\d{1,3}$/;

/** Um compromisso que o modelo achou que precisa existir. */
export const SuggestedReminderSchema = z.object({
  title: z.string().describe("Frase curta e acionável, em português. Ex.: 'Pagar conta de luz (R$ 187,42)'"),
  due_date: z
    .string()
    .nullable()
    .describe("Data do fato em YYYY-MM-DD. null quando não há data nenhuma — aí vai para a caixa de entrada."),
  due_time: z.string().nullable().describe("Hora HH:MM em 24h quando houver hora definida, senão null."),
  lead_minutes: z
    .array(z.number().int())
    .describe(
      "Antecedências do aviso, em MINUTOS antes do compromisso. 0 = na hora. 1440 = 1 dia. 43200 = 30 dias.",
    ),
  repeat_rule: z
    .string()
    .nullable()
    .describe(
      "Recorrência quando o usuário disser que se repete: 'mensal:5' (todo dia 5), 'semanal:1' (toda segunda), 'meses:6', 'anos:1'. null quando é evento único.",
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
  name: z.string().describe("Nome legível. Ex.: 'Geladeira Brastemp Inverse', 'TV Samsung 55\"'."),
  identifier: z.string().nullable().describe("Placa, número da nota, contrato, apólice — se aparecer."),
});
export type Entity = z.infer<typeof EntitySchema>;

/**
 * Uma compra identificada numa nota fiscal. Guardada como registro próprio para
 * que depois dê para perguntar "quais produtos meus ainda estão na garantia?".
 */
export const PurchaseSchema = z.object({
  product: z.string().describe('Ex.: \'TV Samsung 55"\''),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  store: z.string().nullable(),
  purchased_on: z.string().nullable().describe("YYYY-MM-DD"),
  amount_brl: z.number().nullable(),
  invoice_number: z.string().nullable(),
  warranty_months: z.number().int().nullable().describe("Prazo em meses quando estiver escrito na nota."),
  warranty_until: z.string().nullable().describe("YYYY-MM-DD — calculado a partir da compra e do prazo."),
});
export type Purchase = z.infer<typeof PurchaseSchema>;

/**
 * O que o modelo prevê que virá depois, para casos que a tabela de regras
 * determinística não cobre. A tabela cuida do que se repete sempre igual;
 * isto cobre o resto sem custo extra — vem na mesma resposta.
 */
export const ProactiveFollowUpSchema = z.object({
  title: z.string().describe("Ex.: 'Trocar a resistência do chuveiro'"),
  suggested_date: z.string().describe("Data sugerida, YYYY-MM-DD."),
  why: z.string().describe("Uma frase dizendo por que isso costuma vir depois."),
});
export type ProactiveFollowUp = z.infer<typeof ProactiveFollowUpSchema>;

export const CaptureAnalysisSchema = z.object({
  understood: z.boolean().describe("false quando o material não permite extrair nada de útil."),
  summary: z.string().describe("Uma frase dizendo o que é isso, em português."),
  category: CategorySchema,
  entity: EntitySchema.nullable(),
  purchase: PurchaseSchema.nullable().describe("Preenchido só quando o material for nota fiscal ou comprovante."),
  amount_brl: z.number().nullable().describe("Valor em reais quando o material for uma cobrança."),
  reminders: z.array(SuggestedReminderSchema),
  proactive_followups: z
    .array(ProactiveFollowUpSchema)
    .describe("Manutenções e renovações que costumam vir depois deste material. Vazio quando não houver."),
  needs_confirmation: z
    .boolean()
    .describe("true quando alguma data foi deduzida e não lida — o app pede confirmação em vez de errar calado."),
  clarification: z
    .string()
    .nullable()
    .describe("Se faltou informação essencial, a pergunta única que o app deve fazer."),
  tags: z.array(z.string()),
});
export type CaptureAnalysis = z.infer<typeof CaptureAnalysisSchema>;
