import { NextResponse } from "next/server";

import { store } from "@/lib/db";
import { attachOwner, currentOwner } from "@/lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registra este aparelho para receber avisos.
 *
 * A assinatura vem do navegador (endpoint + chaves) e é guardada contra o dono
 * da requisição — que pode ser uma conta ou o id anônimo do aparelho, para que
 * dê para receber aviso antes de criar conta.
 */
export async function POST(request: Request) {
  const owner = await currentOwner();
  const corpo = await request.json().catch(() => null);

  const endpoint = corpo?.endpoint;
  const p256dh = corpo?.keys?.p256dh;
  const auth = corpo?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "assinatura incompleta" }, { status: 400 });
  }

  const assinatura = await store().savePushSubscription(owner.id, {
    endpoint,
    p256dh,
    auth,
    user_agent: request.headers.get("user-agent"),
  });

  return attachOwner(NextResponse.json({ ok: true, id: assinatura.id }), owner);
}

/** Cancelar avisos neste aparelho. */
export async function DELETE(request: Request) {
  const corpo = await request.json().catch(() => null);
  if (typeof corpo?.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint ausente" }, { status: 400 });
  }
  await store().deletePushSubscription(corpo.endpoint);
  return NextResponse.json({ ok: true });
}
