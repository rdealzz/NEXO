import { NextResponse } from "next/server";

import { cancelarAssinatura } from "@/lib/assinatura/asaas";
import { store } from "@/lib/db";
import { currentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancelar em um clique, como os Termos prometem.
 *
 * O acesso não some junto: `valid_until` continua valendo até o fim do período
 * já pago. Cancelar interrompe a próxima cobrança, não o que a pessoa comprou.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const assinatura = await store().getSubscription(user.id);
  if (!assinatura?.subscription_id) {
    return NextResponse.json({ error: "Você não tem assinatura ativa." }, { status: 404 });
  }

  try {
    await cancelarAssinatura(assinatura.subscription_id);
  } catch (falha) {
    console.error("[assinatura:cancelar]", falha);
    return NextResponse.json({ error: "Não consegui cancelar agora. Tente de novo." }, { status: 502 });
  }

  const atualizada = await store().upsertSubscription(user.id, { status: "cancelada" });
  return NextResponse.json({ ok: true, valido_ate: atualizada.valid_until });
}
