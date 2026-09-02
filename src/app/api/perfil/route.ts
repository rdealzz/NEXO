import { NextResponse } from "next/server";

import { store } from "@/lib/db";
import { ensureProfile } from "@/lib/profile";
import { currentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Os campos que a pessoa pode mudar no próprio perfil. */
const CAMPOS = [
  "display_name",
  "avatar_id",
  "billing_cep",
  "billing_logradouro",
  "billing_numero",
  "billing_complemento",
  "billing_bairro",
  "billing_cidade",
  "billing_uf",
] as const;

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const corpo = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const perfil = await ensureProfile(user.id, user.email);
  const mudancas: Record<string, string | null> = {};

  for (const campo of CAMPOS) {
    if (!(campo in corpo)) continue;
    const valor = (corpo as Record<string, unknown>)[campo];
    if (valor !== null && typeof valor !== "string") {
      return NextResponse.json({ error: `${campo} inválido` }, { status: 400 });
    }
    // Campo em branco vira null: "" no banco só cria caso especial depois.
    mudancas[campo] = valor?.trim() ? valor.trim().slice(0, 120) : null;
  }

  const atualizado = await store().upsertProfile({ ...perfil, ...mudancas });
  return NextResponse.json({ ok: true, profile: atualizado });
}
