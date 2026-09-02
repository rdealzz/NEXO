import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

/**
 * v0 sem login: cada dispositivo ganha um id anônimo. Quando o Supabase Auth
 * entrar, `currentOwner` passa a devolver o auth.uid() e o cookie vira apenas
 * o caminho de migração dos lembretes criados antes do cadastro.
 */
export const OWNER_COOKIE = "nexo_owner";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type Owner = { id: string; isNew: boolean };

export async function currentOwner(): Promise<Owner> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: randomUUID(), isNew: true };
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
