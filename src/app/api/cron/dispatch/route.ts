import { NextResponse } from "next/server";

import { store } from "@/lib/db";
import { deliver, type Delivery } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Varredura periódica: nenhuma IA envolvida. Roda de hora em hora e só envia
 * o que já venceu e ainda não saiu. É esta rota que faz o custo por usuário
 * ativo ficar perto de zero.
 */
async function dispatch(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "não autorizado" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await store().dueNotifications(now);
  const deliveries: Delivery[] = [];

  for (const { reminder, lead } of due) {
    const result = await deliver(reminder, lead);
    deliveries.push(result);
    // Só marca quando saiu de fato: falha de entrega volta na próxima varredura.
    if (result.ok) await store().markNotified(reminder.id, lead);
  }

  return NextResponse.json({
    checked_at: now.toISOString(),
    sent: deliveries.filter((d) => d.ok).length,
    failed: deliveries.filter((d) => !d.ok).length,
    deliveries,
  });
}

export const GET = dispatch;
export const POST = dispatch;
