import type { Reminder } from "./db";

/**
 * Entrega do aviso. É de propósito a peça mais burra do sistema: um webhook
 * genérico cobre WhatsApp (via gateway), Telegram, e-mail transacional e n8n
 * sem que o NEXO precise saber de nenhum deles.
 */
export type Delivery = { reminder_id: string; lead: number; channel: string; ok: boolean; error?: string };

/** O texto que a pessoa lê na notificação. `lead` está em minutos. */
export function messageFor(reminder: Reminder, lead: number): string {
  if (lead === 0) return reminder.due_time ? `Agora (${reminder.due_time}): ${reminder.title}` : reminder.title;
  if (lead < 60) return `Em ${lead} min: ${reminder.title}`;
  if (lead < 1440) {
    const horas = Math.round(lead / 60);
    return `Em ${horas} ${horas === 1 ? "hora" : "horas"}: ${reminder.title}`;
  }
  const dias = Math.round(lead / 1440);
  if (dias === 1) return `Amanhã: ${reminder.title}`;
  return `Em ${dias} dias: ${reminder.title}`;
}

/**
 * A cara do aviso no celular: o sino do NEXO. Push da web, Android e a maioria
 * dos gateways aceitam esses três campos; quem não aceitar, ignora.
 */
export function notificationAssets() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return {
    icon: `${site}/icone-notificacao.png`,
    badge: `${site}/badge-notificacao.png`,
    color: "#146b4f",
  };
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
        lead_minutes: lead,
        ...notificationAssets(),
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
