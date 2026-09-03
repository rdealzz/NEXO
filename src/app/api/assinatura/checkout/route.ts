import { NextResponse } from "next/server";

import { asaasConfigurado, criarAssinatura, garantirCliente } from "@/lib/assinatura/asaas";
import { store } from "@/lib/db";
import { acharPlano, PLANO_PADRAO } from "@/lib/pricing";
import { currentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Começa a assinatura e devolve o link de pagamento.
 *
 * Exige conta: a assinatura pertence a uma pessoa, não a um aparelho. E não
 * libera nada aqui — quem libera é o webhook, quando o dinheiro entra. Assinar
 * é um pedido; pagar é o fato.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Entre na sua conta para assinar." }, { status: 401 });
  }
  if (!asaasConfigurado()) {
    return NextResponse.json({ error: "Pagamento ainda não configurado neste ambiente." }, { status: 503 });
  }

  // Já assinante em dia não deveria criar uma segunda cobrança.
  const atual = await store().getSubscription(user.id);
  if (atual?.status === "ativa") {
    return NextResponse.json({ error: "Sua assinatura já está ativa." }, { status: 409 });
  }

  // O plano vem do corpo; um id que não existe cai no mensal em vez de derrubar
  // o pedido — melhor cobrar o menor valor do que perder a assinatura.
  const corpo = await request.json().catch(() => null);
  const plano = acharPlano(corpo?.plano) ?? PLANO_PADRAO;

  try {
    const cliente = await garantirCliente(user.email);
    const assinatura = await criarAssinatura(cliente.id, plano);

    await store().upsertSubscription(user.id, {
      customer_id: cliente.id,
      subscription_id: assinatura.id,
      plan_id: plano.id,
      status: "pendente",
    });

    if (!assinatura.invoiceUrl) {
      return NextResponse.json({ error: "A cobrança foi criada, mas sem link de pagamento." }, { status: 502 });
    }
    return NextResponse.json({ url: assinatura.invoiceUrl });
  } catch (falha) {
    console.error("[assinatura:checkout]", falha);
    return NextResponse.json({ error: "Não consegui abrir o pagamento agora." }, { status: 502 });
  }
}
