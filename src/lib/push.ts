import webpush from "web-push";

import type { PushSubscriptionRecord, Reminder } from "@/lib/db";

/**
 * Push de verdade — o aviso que chega com o app fechado.
 *
 * Web Push é o único caminho que funciona igual no Android, no desktop e no
 * iOS (a partir do 16.4, com o app instalado na tela de início), sem depender
 * de um serviço proprietário. As chaves VAPID identificam o servidor para o
 * serviço de push do navegador; sem elas, o NEXO cai no webhook.
 */
export type PayloadPush = {
  titulo: string;
  corpo: string;
  reminder_id: string;
  url: string;
};

let configurado = false;

export function pushConfigurado(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function preparar(): void {
  if (configurado || !pushConfigurado()) return;
  webpush.setVapidDetails(
    // O "assunto" é como o serviço de push fala com a gente se algo der errado.
    process.env.VAPID_SUBJECT || `mailto:${process.env.NEXT_PUBLIC_EMAIL_CONTATO || "avisos@nexo.app"}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configurado = true;
}

export type ResultadoPush = { ok: boolean; expirada: boolean; erro?: string };

/**
 * Manda um aviso para um aparelho.
 *
 * 404 e 410 não são falha: são a assinatura dizendo que aquele aparelho não
 * existe mais (app desinstalado, navegador limpo). Quem chama apaga a linha —
 * senão o despachante fica batendo em endereço morto para sempre.
 */
export async function enviarPush(
  assinatura: PushSubscriptionRecord,
  payload: PayloadPush,
): Promise<ResultadoPush> {
  preparar();
  try {
    await webpush.sendNotification(
      {
        endpoint: assinatura.endpoint,
        keys: { p256dh: assinatura.p256dh, auth: assinatura.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { ok: true, expirada: false };
  } catch (falha) {
    const status = (falha as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      return { ok: false, expirada: true, erro: `assinatura expirada (${status})` };
    }
    return { ok: false, expirada: false, erro: falha instanceof Error ? falha.message : "falha no push" };
  }
}

/** O texto que aparece na tela de bloqueio. */
export function payloadDoLembrete(reminder: Reminder, texto: string): PayloadPush {
  return {
    titulo: "NEXO",
    corpo: texto,
    reminder_id: reminder.id,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/inbox`,
  };
}

/** Par de chaves VAPID novo — use uma vez e guarde nas variáveis de ambiente. */
export function gerarChaves(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
