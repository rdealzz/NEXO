import type { Reminder } from "./db";

/**
 * Entrega do aviso. É de propósito a peça mais burra do sistema: um webhook
 * genérico cobre WhatsApp (via gateway), Telegram, e-mail transacional e n8n
 * sem que o NEXO precise saber de nenhum deles.
 */
export type Delivery = { reminder_id: string; lead: number; channel: string; ok: boolean; error?: string };

function messageFor(reminder: Reminder, lead: number): string {
  if (lead === 0) {
    return reminder.due_time ? `Hoje às ${reminder.due_time}: ${reminder.title}` : `Hoje: ${reminder.title}`;
  }
  if (lead === 1) return `Amanhã: ${reminder.title}`;
  return `Em ${lead} dias: ${reminder.title}`;
}

export async function deliver(reminder: Reminder, lead: number): Promise<Delivery> {
  const url = process.env.NEXO_NOTIFY_WEBHOOK;
  const text = messageFor(reminder, lead);

  if (!url) {
    console.log(`[nexo:aviso] ${reminder.owner_id} → ${text}`);
    return { reminder_id: reminder.id, lead, channel: "log", ok: true };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        owner_id: reminder.owner_id,
        reminder_id: reminder.id,
        text,
        title: reminder.title,
        due_date: reminder.due_date,
        due_time: reminder.due_time,
        category: reminder.category,
        lead_days: lead,
      }),
    });
    return {
      reminder_id: reminder.id,
      lead,
      channel: "webhook",
      ok: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      reminder_id: reminder.id,
      lead,
      channel: "webhook",
      ok: false,
      error: error instanceof Error ? error.message : "falha desconhecida",
    };
  }
}
