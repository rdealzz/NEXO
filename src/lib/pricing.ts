/**
 * Os planos do NEXO, num lugar só — o checkout, a paywall e o perfil leem daqui.
 *
 * O mensal é a régua: os outros dois cobram o mesmo serviço por mais tempo e
 * mais barato. O desconto não é calculado à mão em lugar nenhum — sai sempre da
 * conta abaixo, para nunca existir um preço na tela e outro na cobrança.
 */
export type CicloAsaas = "MONTHLY" | "QUARTERLY" | "YEARLY";

export type Plano = {
  id: "mensal" | "trimestral" | "anual";
  nome: string;
  /** O que é cobrado de uma vez, em reais. */
  preco: number;
  /** Quanto tempo o pagamento compra. É o que define o vencimento. */
  meses: number;
  ciclo: CicloAsaas;
  /** Uma linha curta explicando a troca que a pessoa está fazendo. */
  chamada: string;
};

export const PLANOS: Plano[] = [
  {
    id: "mensal",
    nome: "Mensal",
    preco: 19.9,
    meses: 1,
    ciclo: "MONTHLY",
    chamada: "Para experimentar sem compromisso.",
  },
  {
    id: "trimestral",
    nome: "3 meses",
    preco: 39.9,
    meses: 3,
    ciclo: "QUARTERLY",
    chamada: "Um trimestre inteiro por menos de dois meses avulsos.",
  },
  {
    id: "anual",
    nome: "1 ano",
    preco: 129.9,
    meses: 12,
    ciclo: "YEARLY",
    chamada: "O ano fechado — e o preço por mês que não sobe mais.",
  },
];

/** O plano mais barato por mês. É ele que ganha o selo na tela. */
export const PLANO_DESTAQUE: Plano["id"] = "anual";

export const PLANO_PADRAO: Plano = PLANOS[0];

/** Compatibilidade: o mensal continua sendo "o plano" onde só existe um preço. */
export const PLANO = {
  id: "nexo-mensal",
  nome: "NEXO",
  precoMensal: PLANO_PADRAO.preco,
  moeda: "BRL",
  ciclo: "mensal" as const,
  descricao: "Captura ilimitada, avisos por push, e-mail e WhatsApp. Cancele quando quiser.",
};

export const PRECO_ANUAL = PLANO_PADRAO.preco * 12;

/** Dias de graça para quem acabou de chegar. Sem cartão, sem pedir nada. */
export const TESTE_DIAS = 2;

export function acharPlano(id: string | null | undefined): Plano | null {
  return PLANOS.find((p) => p.id === id) ?? null;
}

/** Quanto sai o mês dentro de cada plano — a única comparação honesta entre eles. */
export function precoPorMes(plano: Plano): number {
  return plano.preco / plano.meses;
}

/**
 * A economia contra pagar mês a mês pelo mesmo período. No mensal dá zero, e é
 * assim que a tela sabe que ali não cabe selo de desconto.
 */
export function economia(plano: Plano): { reais: number; porcento: number; cheio: number } {
  const cheio = PLANO_PADRAO.preco * plano.meses;
  const reais = cheio - plano.preco;
  return { reais, porcento: Math.round((reais / cheio) * 100), cheio };
}

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
