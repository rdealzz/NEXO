import { store } from "@/lib/db";
import type { StatusAssinatura, Subscription } from "@/lib/db";
import { acharPlano, TESTE_DIAS } from "@/lib/pricing";

/**
 * Quem tem acesso ao NEXO.
 *
 * A regra é uma data, não um status: enquanto `valid_until` não passou, o acesso
 * vale — mesmo com a assinatura cancelada. Quem cancela hoje pagou até o fim do
 * período e continua usando até lá; cortar antes seria cobrar por um serviço que
 * não foi entregue.
 *
 * Antes da primeira assinatura vale a mesma regra, com outra data: quem chega
 * ganha dois dias para testar. Um app de lembretes não se prova em cinco
 * minutos — precisa de pelo menos um aviso chegando no dia seguinte.
 */
export type Acesso = {
  liberado: boolean;
  status: StatusAssinatura | "sem_assinatura" | "teste" | "vitalicio";
  validoAte: string | null;
  /** Verdadeiro enquanto o que sustenta o acesso é o teste, não um pagamento. */
  emTeste: boolean;
  /** Dias inteiros que ainda faltam para a data acabar. Zero no último dia. */
  diasRestantes: number;
};

/** Fim do teste de quem começou a usar em `inicio`. */
export function fimDoTeste(inicio: string | Date): string {
  const data = new Date(inicio);
  data.setDate(data.getDate() + TESTE_DIAS);
  return data.toISOString();
}

function diasAte(quando: string | null, agora: Date): number {
  if (!quando) return 0;
  const resto = Date.parse(quando) - agora.getTime();
  return resto > 0 ? Math.ceil(resto / 86_400_000) : 0;
}

/**
 * Contas com acesso vitalício: quem toca o produto precisa entrar nele todo dia,
 * inclusive depois de qualquer vencimento. A conta do dono está aqui para o app
 * nunca travar na mão de quem o mantém, nem em ambiente novo; qualquer outra
 * entra por NEXO_ACESSO_VITALICIO (e-mails separados por vírgula), que soma à
 * lista em vez de substituí-la — assim uma variável mal escrita não tranca o
 * dono para fora. A comparação é por e-mail, minúsculo e sem espaços.
 */
const DONO = "ersutibiti@gmail.com";

export function temAcessoVitalicio(email: string | null | undefined): boolean {
  if (!email) return false;
  const lista = [
    DONO,
    ...(process.env.NEXO_ACESSO_VITALICIO ?? "").split(","),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.trim().toLowerCase());
}

const VITALICIO: Acesso = {
  liberado: true,
  status: "vitalicio",
  validoAte: null,
  emTeste: false,
  diasRestantes: Number.POSITIVE_INFINITY,
};

export function avaliar(
  assinatura: Subscription | null,
  opcoes: { inicioDaConta?: string | Date | null; email?: string | null } = {},
  agora = new Date(),
): Acesso {
  if (temAcessoVitalicio(opcoes.email)) return VITALICIO;

  const pagoAte = assinatura?.valid_until ?? null;
  const pagoVale = Boolean(pagoAte && Date.parse(pagoAte) > agora.getTime());

  if (pagoVale) {
    return {
      liberado: true,
      status: assinatura!.status,
      validoAte: pagoAte,
      emTeste: false,
      diasRestantes: diasAte(pagoAte, agora),
    };
  }

  // Sem período pago em pé, o teste é a última chance de acesso — e só para quem
  // nunca chegou a assinar: quem já pagou uma vez não volta para a cortesia.
  if (!assinatura && opcoes.inicioDaConta) {
    const ate = fimDoTeste(opcoes.inicioDaConta);
    if (Date.parse(ate) > agora.getTime()) {
      return { liberado: true, status: "teste", validoAte: ate, emTeste: true, diasRestantes: diasAte(ate, agora) };
    }
    return { liberado: false, status: "teste", validoAte: ate, emTeste: true, diasRestantes: 0 };
  }

  return {
    liberado: false,
    status: assinatura?.status ?? "sem_assinatura",
    validoAte: pagoAte,
    emTeste: false,
    diasRestantes: 0,
  };
}

export async function acessoDe(
  ownerId: string,
  inicioDaConta?: string | Date | null,
  email?: string | null,
): Promise<Acesso> {
  return avaliar(await store().getSubscription(ownerId), { inicioDaConta, email });
}

/**
 * Até quando o pagamento compra acesso. O plano manda: um trimestre empurra
 * três meses, o anual empurra doze.
 */
export function proximoVencimento(pagoEm = new Date(), planoId?: string | null): string {
  const plano = acharPlano(planoId);
  const data = new Date(pagoEm);
  data.setMonth(data.getMonth() + (plano?.meses ?? 1));
  return data.toISOString();
}
