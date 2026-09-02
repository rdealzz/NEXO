import { addDays, addMonths, format, parseISO } from "date-fns";

import type { Category, CaptureAnalysis } from "./schema";

/**
 * A segunda metade da promessa do NEXO: além de entender o que você mandou,
 * ele sabe o que costuma vir depois. Isso aqui NÃO chama IA — é tabela e
 * aritmética de data. Por isso o custo marginal de um usuário ativo é ~zero.
 */

export type FollowUp = {
  rule_id: string;
  title: string;
  due_date: string;
  lead_days: number[];
  category: Category;
  /** O texto que o app mostra no card de sugestão. */
  pitch: string;
  /** Meses entre repetições, quando é algo que volta sempre. */
  repeat_months: number | null;
};

type Rule = {
  id: string;
  /** Meses a somar na data âncora. */
  months?: number;
  days?: number;
  title: (subject: string) => string;
  pitch: (subject: string) => string;
  lead_days: number[];
  category: Category;
  repeat_months?: number;
  /** Só dispara quando o nome da entidade bate. */
  when?: RegExp;
};

const RULES: Record<string, Rule[]> = {
  veiculo: [
    {
      id: "veiculo.revisao",
      months: 6,
      title: (s) => `Revisão / troca de óleo — ${s}`,
      pitch: (s) => `Carro costuma pedir óleo a cada 6 meses. Quer que eu lembre da revisão do ${s}?`,
      lead_days: [7],
      category: "veiculo",
      repeat_months: 6,
    },
    {
      id: "veiculo.seguro",
      months: 12,
      title: (s) => `Renovar seguro — ${s}`,
      pitch: () => "Seguro vence em 12 meses. Aviso 30 dias antes para você cotar com calma?",
      lead_days: [30, 7],
      category: "veiculo",
      repeat_months: 12,
    },
    {
      id: "veiculo.licenciamento",
      months: 12,
      title: (s) => `Licenciamento anual — ${s}`,
      pitch: () => "Licenciamento é anual e a multa por atraso é cara. Quer o lembrete?",
      lead_days: [30],
      category: "veiculo",
      repeat_months: 12,
    },
    {
      id: "veiculo.pneus",
      months: 12,
      title: (s) => `Rodízio e calibragem dos pneus — ${s}`,
      pitch: () => "Rodízio de pneus a cada 12 mil km / 1 ano. Coloco na agenda?",
      lead_days: [7],
      category: "veiculo",
      repeat_months: 12,
    },
  ],
  eletrodomestico: [
    {
      id: "eletro.garantia_legal",
      days: 90,
      title: (s) => `Fim da garantia legal — ${s}`,
      pitch: () => "Os 90 dias de garantia legal terminam antes da garantia do fabricante. Testo com você antes?",
      lead_days: [7],
      category: "garantia",
    },
    {
      id: "eletro.garantia_fabricante",
      months: 12,
      title: (s) => `Fim da garantia do fabricante — ${s}`,
      pitch: (s) => `A garantia do ${s} acaba em 12 meses. Aviso 30 dias antes?`,
      lead_days: [30, 7],
      category: "garantia",
    },
    {
      id: "eletro.filtro",
      months: 6,
      title: (s) => `Trocar o filtro — ${s}`,
      pitch: () => "Filtro de água pede troca a cada 6 meses. Quer lembrete recorrente?",
      lead_days: [7],
      category: "casa",
      repeat_months: 6,
      when: /geladeira|refrigerador|purificador|bebedouro|filtro/i,
    },
    {
      id: "eletro.limpeza_ar",
      months: 6,
      title: (s) => `Limpeza do ar-condicionado — ${s}`,
      pitch: () => "Ar-condicionado precisa de higienização a cada 6 meses. Marco?",
      lead_days: [7],
      category: "casa",
      repeat_months: 6,
      when: /ar.?condicionado|split|climatizador/i,
    },
  ],
  eletronico: [
    {
      id: "eletronico.garantia",
      months: 12,
      title: (s) => `Fim da garantia — ${s}`,
      pitch: (s) => `Guardo o fim da garantia do ${s} para você não descobrir tarde demais?`,
      lead_days: [30, 7],
      category: "garantia",
    },
  ],
  imovel: [
    {
      id: "imovel.iptu",
      months: 12,
      title: () => "IPTU do ano que vem",
      pitch: () => "IPTU é anual e a cota única costuma ter desconto. Aviso quando abrir?",
      lead_days: [30],
      category: "casa",
      repeat_months: 12,
    },
    {
      id: "imovel.seguro_incendio",
      months: 12,
      title: () => "Renovar seguro incêndio",
      pitch: () => "Seguro incêndio vence junto com o contrato. Quer o lembrete?",
      lead_days: [30],
      category: "casa",
      repeat_months: 12,
    },
  ],
  seguro: [
    {
      id: "seguro.renovacao",
      months: 12,
      title: (s) => `Renovar ${s}`,
      pitch: () => "Apólice renova em 12 meses — e cotar antes costuma baixar o preço. Aviso 30 dias antes?",
      lead_days: [30, 7],
      category: "financeiro",
      repeat_months: 12,
    },
  ],
  plano_saude: [
    {
      id: "saude.reajuste",
      months: 12,
      title: (s) => `Reajuste anual — ${s}`,
      pitch: () => "O reajuste do plano cai no aniversário do contrato. Quer conferir antes?",
      lead_days: [30],
      category: "saude",
      repeat_months: 12,
    },
  ],
  viagem: [
    {
      id: "viagem.checkin",
      days: -1,
      title: (s) => `Check-in aberto — ${s}`,
      pitch: () => "Check-in abre 24h antes e é onde se escolhe assento. Aviso na hora?",
      lead_days: [0],
      category: "viagem",
    },
    {
      id: "viagem.documentos",
      days: -7,
      title: (s) => `Conferir documentos da viagem — ${s}`,
      pitch: () => "Uma semana antes ainda dá tempo de resolver documento. Quer esse aviso?",
      lead_days: [0],
      category: "viagem",
    },
  ],
  assinatura: [
    {
      id: "assinatura.renovacao",
      months: 12,
      title: (s) => `Renovação automática — ${s}`,
      pitch: (s) => `A ${s} renova sozinha. Aviso 7 dias antes para você decidir se continua?`,
      lead_days: [7],
      category: "assinatura",
      repeat_months: 12,
    },
  ],
  pet: [
    {
      id: "pet.vacina",
      months: 12,
      title: (s) => `Vacina anual — ${s}`,
      pitch: () => "Vacina de reforço é anual. Marco?",
      lead_days: [14],
      category: "saude",
      repeat_months: 12,
    },
    {
      id: "pet.vermifugo",
      months: 6,
      title: (s) => `Vermífugo — ${s}`,
      pitch: () => "Vermífugo a cada 6 meses. Quer lembrete recorrente?",
      lead_days: [3],
      category: "saude",
      repeat_months: 6,
    },
  ],
};

function normalizeKind(kind: string): string {
  return kind
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .trim();
}

/**
 * Recebe a análise da captura e devolve o que o NEXO oferece por conta própria.
 * A âncora é a data do lembrete principal (compra, contratação, embarque).
 */
export function suggestFollowUps(analysis: CaptureAnalysis, anchorDate?: string): FollowUp[] {
  const entity = analysis.entity;
  if (!entity || !entity.kind.trim()) return [];

  const rules = RULES[normalizeKind(entity.kind)];
  if (!rules) return [];

  const anchorISO = anchorDate ?? analysis.reminders[0]?.due_date;
  if (!anchorISO) return [];

  let anchor: Date;
  try {
    anchor = parseISO(anchorISO);
    if (Number.isNaN(anchor.getTime())) return [];
  } catch {
    return [];
  }

  const subject = entity.name.trim() || analysis.summary;
  const alreadyThere = new Set(analysis.reminders.map((r) => r.due_date));

  return rules
    .filter((rule) => !rule.when || rule.when.test(subject))
    .map((rule) => {
      const due = rule.days !== undefined ? addDays(anchor, rule.days) : addMonths(anchor, rule.months ?? 0);
      return {
        rule_id: rule.id,
        title: rule.title(subject),
        due_date: format(due, "yyyy-MM-dd"),
        lead_days: rule.lead_days,
        category: rule.category,
        pitch: rule.pitch(subject),
        repeat_months: rule.repeat_months ?? null,
      } satisfies FollowUp;
    })
    // Não sugerir algo que já saiu da própria captura, nem coisa no passado.
    .filter((f) => !alreadyThere.has(f.due_date) && f.due_date >= format(new Date(), "yyyy-MM-dd"));
}
