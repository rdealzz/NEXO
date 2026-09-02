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

/** Dias entre hoje e a data, em horário de São Paulo. Negativo = atrasado. */
export function daysUntil(dueDate: string, today = todayLocal()): number {
  return Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
export function urgencyColor(dueDate: string): string {
  const diff = daysUntil(dueDate);
  if (diff <= 0) return "#e0483a";
  if (diff <= 7) return "#e5a11c";
  if (diff <= 30) return "#3f9e63";
  return "#4a7fd4";
}

export function humanLead(leads: number[]): string {
  const parts = [...leads]
    .sort((a, b) => b - a)
    .map((lead) => (lead === 0 ? "no dia" : lead === 1 ? "1 dia antes" : `${lead} dias antes`));
  return parts.join(" e ");
}
