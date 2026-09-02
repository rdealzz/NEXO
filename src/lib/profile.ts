import { store, type Profile } from "@/lib/db";

/** Slug curto e legível: vira <slug>@<INBOUND_EMAIL_DOMAIN>. */
function slugFrom(email: string | null): string {
  const base = (email?.split("@")[0] ?? "nexo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 14) || "nexo";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

/** Garante que a conta tem perfil e endereço de entrada próprio. */
export async function ensureProfile(userId: string, email: string | null): Promise<Profile> {
  const existing = await store().getProfile(userId);
  if (existing) {
    if (email && existing.email !== email) {
      return store().upsertProfile({ ...existing, email });
    }
    return existing;
  }
  return store().upsertProfile({
    user_id: userId,
    email,
    phone: null,
    phone_pending: null,
    phone_code: null,
    phone_code_expires_at: null,
    inbox_slug: slugFrom(email),
  });
}

export function inboundAddress(profile: Profile): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  return domain ? `${profile.inbox_slug}@${domain}` : null;
}

const CODIGO_VALIDO_MINUTOS = 10;

/** Começa o vínculo: guarda o número como pendente e devolve o código a enviar. */
export async function startPhoneLink(userId: string, phone: string): Promise<{ code: string; phone: string }> {
  const profile = await ensureProfile(userId, null);
  const digits = phone.replace(/\D+/g, "");
  const code = String(Math.floor(100_000 + Math.random() * 900_000));

  await store().upsertProfile({
    ...profile,
    phone_pending: digits,
    phone_code: code,
    phone_code_expires_at: new Date(Date.now() + CODIGO_VALIDO_MINUTOS * 60_000).toISOString(),
  });
  return { code, phone: digits };
}

/** Confirma o vínculo. Só aqui o número passa a resolver o dono de uma mensagem. */
export async function confirmPhoneLink(userId: string, code: string): Promise<Profile | null> {
  const profile = await store().getProfile(userId);
  if (!profile?.phone_pending || !profile.phone_code) return null;
  if (profile.phone_code !== code.trim()) return null;
  if (profile.phone_code_expires_at && Date.parse(profile.phone_code_expires_at) < Date.now()) return null;

  return store().upsertProfile({
    ...profile,
    phone: profile.phone_pending,
    phone_pending: null,
    phone_code: null,
    phone_code_expires_at: null,
  });
}
