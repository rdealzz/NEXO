import type { Category } from "@/lib/nexo/schema";

export const CATEGORY_LABEL: Record<Category, string> = {
  financeiro: "Financeiro",
  veiculo: "Veículo",
  casa: "Casa",
  saude: "Saúde",
  documento: "Documento",
  viagem: "Viagem",
  garantia: "Garantia",
  assinatura: "Assinatura",
  trabalho: "Trabalho",
  pessoal: "Pessoal",
  outro: "Outro",
};

export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Dias entre hoje e a data, em horário de São Paulo. Negativo = atrasado. */
export function daysUntil(dueDate: string, today = todayLocal()): number {
  return Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function humanDate(dueDate: string): string {
  const diff = daysUntil(dueDate);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  if (diff < 0) return `há ${Math.abs(diff)} dias`;

  const date = new Date(`${dueDate}T12:00:00Z`);
  if (diff < 7) return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: diff > 300 ? "numeric" : undefined,
  }).format(date);
}

/** Semáforo da lista: vermelho é agora, azul é longe. */
export function urgencyColor(dueDate: string | null): string {
  if (!dueDate) return "#8a877d";
  const diff = daysUntil(dueDate);
  if (diff <= 0) return "#e0483a";
  if (diff <= 7) return "#e5a11c";
  if (diff <= 30) return "#3f9e63";
  return "#4a7fd4";
}

/** Antecedências em minutos, escritas como a pessoa fala. */
export function humanLead(leads: number[]): string {
  if (leads.length === 0) return "sem aviso";
  return [...leads]
    .sort((a, b) => b - a)
    .map((lead) => {
      if (lead === 0) return "na hora";
      if (lead < 60) return `${lead} min antes`;
      if (lead < 1440) {
        const horas = Math.round(lead / 60);
        return `${horas} ${horas === 1 ? "hora" : "horas"} antes`;
      }
      const dias = Math.round(lead / 1440);
      if (dias === 1) return "1 dia antes";
      if (dias === 7) return "1 semana antes";
      return `${dias} dias antes`;
    })
    .join(" e ");
}

export function humanRepeat(rule: string | null): string | null {
  if (!rule) return null;
  const [kind, raw] = rule.split(":");
  const value = Number(raw);
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  switch (kind) {
    case "mensal":
      return `todo dia ${value}`;
    case "semanal":
      return `toda ${DIAS[value] ?? "semana"}`;
    case "dias":
      return value === 1 ? "todo dia" : `a cada ${value} dias`;
    case "semanas":
      return value === 1 ? "toda semana" : `a cada ${value} semanas`;
    case "meses":
      return value === 1 ? "todo mês" : `a cada ${value} meses`;
    case "anos":
      return value === 1 ? "todo ano" : `a cada ${value} anos`;
    default:
      return null;
  }
}
