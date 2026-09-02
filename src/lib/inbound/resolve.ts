import { store } from "@/lib/db";

/**
 * Quem é o dono de uma mensagem que chegou de fora do app.
 *
 * Material pessoal não pode cair na conta errada, então só há duas formas de
 * identificação, ambas explícitas: o endereço próprio da pessoa
 * (<slug>@dominio) ou um telefone já vinculado ao perfil. Remetente não
 * verificado nunca vira dono.
 */
export function slugFromAddress(address: string): string | null {
  const local = address.trim().toLowerCase().split("@")[0];
  return /^[a-z0-9][a-z0-9.-]{1,40}$/.test(local) ? local : null;
}

/** Normaliza para o formato que o WhatsApp usa: só dígitos, com DDI. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D+/g, "");
}

export async function ownerForInboundEmail(recipients: string[], sender: string): Promise<string | null> {
  for (const address of recipients) {
    const slug = slugFromAddress(address);
    if (!slug) continue;
    const profile = await store().findProfileBy("inbox_slug", slug);
    // O endereço identifica a conta; o remetente precisa bater com o e-mail
    // dela, senão qualquer um poderia escrever na caixa de outra pessoa.
    if (profile && profile.email && profile.email.toLowerCase() === sender.trim().toLowerCase()) {
      return profile.user_id;
    }
  }
  return null;
}

export async function ownerForPhone(phone: string): Promise<string | null> {
  const profile = await store().findProfileBy("phone", normalizePhone(phone));
  return profile?.user_id ?? null;
}
