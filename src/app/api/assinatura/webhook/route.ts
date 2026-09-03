import { NextResponse } from "next/server";

import { proximoVencimento } from "@/lib/assinatura/acesso";
import { store } from "@/lib/db";
import type { StatusAssinatura } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O webhook do gateway. É ele, e só ele, que muda o estado da assinatura.
 *
 * Três cuidados que um webhook de cobrança precisa ter:
 *
 * 1. Autenticar. Sem o token combinado, qualquer um na internet liberaria a
 *    própria conta com um POST.
 * 2. Ser idempotente. Gateways reenviam o mesmo evento quando não recebem 200;
 *    aplicar duas vezes não pode empurrar o vencimento dois meses para frente.
 * 3. Responder 200 depressa. Erro nosso vira reenvio, e reenvio vira fila.
 */
const CONFIRMA_PAGAMENTO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const PERDE_PAGAMENTO = new Set(["PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);
const ENCERRA = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]);

export async function POST(request: Request) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (esperado && request.headers.get("asaas-access-token") !== esperado) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const evento = await request.json().catch(() => null);
  const tipo: string | undefined = evento?.event;
  if (!tipo) return NextResponse.json({ error: "evento sem tipo" }, { status: 400 });

  const subscriptionId: string | undefined =
    evento?.payment?.subscription ?? evento?.subscription?.id ?? undefined;
  const customerId: string | undefined = evento?.payment?.customer ?? evento?.subscription?.customer;

  const assinatura =
    (subscriptionId ? await store().findSubscriptionBy("subscription_id", subscriptionId) : null) ??
    (customerId ? await store().findSubscriptionBy("customer_id", customerId) : null);

  if (!assinatura) {
    // Não é erro nosso: pode ser cobrança avulsa ou de outro ambiente. Responder
    // 200 evita que o gateway fique reenviando para sempre.
    return NextResponse.json({ ok: true, ignorado: "assinatura desconhecida" });
  }

  const idDoEvento: string | undefined = evento?.id ?? evento?.payment?.id;
  if (idDoEvento && assinatura.last_event_id === idDoEvento) {
    return NextResponse.json({ ok: true, repetido: true });
  }

  let status: StatusAssinatura | null = null;
  let validoAte: string | null | undefined;

  if (CONFIRMA_PAGAMENTO.has(tipo)) {
    status = "ativa";
    // O plano contratado é que diz quanto tempo o pagamento comprou.
    validoAte = proximoVencimento(new Date(), assinatura.plan_id);
  } else if (PERDE_PAGAMENTO.has(tipo)) {
    // Atrasada não corta na hora: valid_until ainda manda, e o acesso cai
    // sozinho quando o período pago terminar.
    status = "atrasada";
  } else if (ENCERRA.has(tipo)) {
    status = "cancelada";
  }

  if (!status) return NextResponse.json({ ok: true, ignorado: tipo });

  await store().upsertSubscription(assinatura.owner_id, {
    status,
    ...(validoAte !== undefined ? { valid_until: validoAte } : {}),
    ...(idDoEvento ? { last_event_id: idDoEvento } : {}),
  });

  return NextResponse.json({ ok: true, status });
}
