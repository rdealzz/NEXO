import { store } from "@/lib/db";
import type { StatusAssinatura, Subscription } from "@/lib/db";

/**
 * Quem tem acesso ao NEXO.
 *
 * A regra é uma só, e é `valid_until`: enquanto a data não passou, o acesso
 * vale — mesmo com a assinatura cancelada. Quem cancela hoje pagou até o fim do
 * mês e continua usando até lá; cortar antes seria cobrar por um serviço que
 * não foi entregue.
 */
export type Acesso = {
  liberado: boolean;
  status: StatusAssinatura | "sem_assinatura";
  validoAte: string | null;
};

export function avaliar(assinatura: Subscription | null, agora = new Date()): Acesso {
  if (!assinatura) return { liberado: false, status: "sem_assinatura", validoAte: null };

  const validoAte = assinatura.valid_until;
  const dentroDoPrazo = Boolean(validoAte && Date.parse(validoAte) > agora.getTime());

  return {
    liberado: dentroDoPrazo,
    status: assinatura.status,
    validoAte,
  };
}

export async function acessoDe(ownerId: string): Promise<Acesso> {
  return avaliar(await store().getSubscription(ownerId));
}

/** Um mês a partir do pagamento — até quando o acesso vale. */
export function proximoVencimento(pagoEm = new Date()): string {
  const data = new Date(pagoEm);
  data.setMonth(data.getMonth() + 1);
  return data.toISOString();
}
