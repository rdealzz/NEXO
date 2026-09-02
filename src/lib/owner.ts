import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { currentUser } from "@/lib/supabase/server";

/**
 * Quem é o dono da requisição. Com sessão, é o usuário do Supabase Auth. Sem
 * sessão, um id anônimo por dispositivo — para que dê para usar o NEXO antes
 * de criar conta. Ao entrar, `/auth/confirmar` transfere o que foi criado
 * anonimamente para a conta.
 */
export const OWNER_COOKIE = "nexo_owner";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type Owner = { id: string; isNew: boolean; authenticated: boolean; email: string | null };

export async function currentOwner(): Promise<Owner> {
  const user = await currentUser();
  if (user) return { id: user.id, isNew: false, authenticated: true, email: user.email };

  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  return existing
    ? { id: existing, isNew: false, authenticated: false, email: null }
    : { id: randomUUID(), isNew: true, authenticated: false, email: null };
}

/** Id anônimo já gravado neste dispositivo, se houver. Usado só na migração. */
export async function deviceOwnerId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(OWNER_COOKIE)?.value ?? null;
}

export function attachOwner<T>(response: NextResponse<T>, owner: Owner): NextResponse<T> {
  if (owner.isNew) {
    response.cookies.set(OWNER_COOKIE, owner.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR,
      path: "/",
    });
  }
  return response;
}
