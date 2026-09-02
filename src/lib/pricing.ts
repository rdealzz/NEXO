/** O plano do NEXO, num lugar só — o checkout da Etapa 6 lê daqui. */
export const PLANO = {
  id: "nexo-mensal",
  nome: "NEXO",
  precoMensal: 19.9,
  moeda: "BRL",
  ciclo: "mensal" as const,
  descricao: "Captura ilimitada, avisos por push, e-mail e WhatsApp. Cancele quando quiser.",
};

export const PRECO_ANUAL = PLANO.precoMensal * 12;

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  });
}

/** Sem centavos — para números grandes de comparação, onde o centavo só atrapalha. */
export function brlRedondo(valor: number): string {
  return Math.round(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
