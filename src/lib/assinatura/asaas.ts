import { PLANO_PADRAO, type Plano } from "@/lib/pricing";

/**
 * Cliente do Asaas.
 *
 * Escolhido em vez do Stripe por um motivo prático: no Brasil, uma parte grande
 * do público paga em Pix e boleto, e recusar esses meios é recusar assinatura.
 * O Asaas cobra os três no mesmo link de cobrança recorrente.
 *
 * O que este arquivo faz é pouco de propósito — criar cliente, criar
 * assinatura, devolver o link. Estado quem guarda é o nosso banco.
 */
const BASE = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";

export function asaasConfigurado(): boolean {
  return Boolean(process.env.ASAAS_API_KEY);
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      access_token: process.env.ASAAS_API_KEY!,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    // O Asaas devolve os erros em `errors[]`; a primeira descrição é a útil.
    const descricao = corpo?.errors?.[0]?.description ?? `HTTP ${resposta.status}`;
    throw new Error(`Asaas: ${descricao}`);
  }
  return corpo as T;
}

export type ClienteAsaas = { id: string };

/**
 * Reaproveita o cliente pelo e-mail quando ele já existe: criar um segundo
 * cliente para a mesma pessoa espalha o histórico de pagamento em dois lugares.
 */
export async function garantirCliente(email: string, nome?: string | null): Promise<ClienteAsaas> {
  const busca = await chamar<{ data: ClienteAsaas[] }>(`/customers?email=${encodeURIComponent(email)}`);
  if (busca.data?.length) return busca.data[0];

  return chamar<ClienteAsaas>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: nome?.trim() || email.split("@")[0], email }),
  });
}

export type AssinaturaAsaas = {
  id: string;
  status: string;
  nextDueDate: string;
  /** Link do primeiro pagamento — é para cá que a pessoa vai. */
  invoiceUrl?: string;
};

export async function criarAssinatura(
  customerId: string,
  plano: Plano = PLANO_PADRAO,
): Promise<AssinaturaAsaas> {
  const assinatura = await chamar<AssinaturaAsaas>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      // UNDEFINED deixa a pessoa escolher entre Pix, boleto e cartão na tela
      // de pagamento — é o que evita perder quem não tem cartão.
      billingType: "UNDEFINED",
      value: plano.preco,
      nextDueDate: hoje(),
      // O ciclo do gateway é o mesmo do plano: quem paga um ano só é cobrado de
      // novo daqui a um ano.
      cycle: plano.ciclo,
      description: `NEXO — plano ${plano.nome.toLowerCase()}`,
    }),
  });

  // A assinatura nasce com a primeira cobrança; é o link dela que abre o checkout.
  const cobrancas = await chamar<{ data: { invoiceUrl?: string }[] }>(
    `/subscriptions/${assinatura.id}/payments`,
  );
  return { ...assinatura, invoiceUrl: cobrancas.data?.[0]?.invoiceUrl };
}

export async function cancelarAssinatura(subscriptionId: string): Promise<void> {
  await chamar(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
