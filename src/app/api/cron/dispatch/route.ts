import { NextResponse } from "next/server";

import { store } from "@/lib/db";
import { deliver, type Delivery } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Varredura periódica: nenhuma IA envolvida. Lê apenas os avisos já vencidos e
 * ainda não enviados — `sent_at is null and notify_at <= now()`, em índice
 * parcial — em vez de varrer os lembretes de toda a base. É esta rota que faz
 * o custo por usuário ativo ficar perto de zero.
 */
async function dispatch(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const due = await store().dueNotifications(now);
  const deliveries: Delivery[] = [];

  for (const { notification, reminder } of due) {
    const result = await deliver(reminder, notification.lead_minutes);
    deliveries.push(result);
    // Só marca quando saiu de fato: falha volta na próxima varredura.
    if (result.ok) await store().markSent(notification.id, new Date());
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
