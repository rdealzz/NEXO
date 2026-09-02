import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { store } from "@/lib/db";
import { deviceOwnerId, OWNER_COOKIE } from "@/lib/owner";
import { ensureProfile } from "@/lib/profile";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fim do link mágico. Além de abrir a sessão, é aqui que o que a pessoa criou
 * antes de ter conta passa a ser dela de verdade.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.redirect(new URL("/entrar?erro=sessao", url));

  // Dois caminhos chegam aqui: o link mágico (token_hash) e o OAuth (code).
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const resultado = tokenHash && type
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : null;

  if (!resultado || resultado.error || !resultado.data.user) {
    return NextResponse.redirect(new URL("/entrar?erro=sessao", url));
  }

  const user = resultado.data.user;
  await ensureProfile(user.id, user.email ?? null);

  const device = await deviceOwnerId();
  let claimed = 0;
  if (device && device !== user.id) {
    claimed = await store().transferOwnership(device, user.id);
  }

  const destination = new URL(claimed > 0 ? "/inbox?migrados=1" : "/inbox", url);
  const response = NextResponse.redirect(destination);
  // O id anônimo cumpriu o papel: some para não criar uma segunda identidade.
  if (device) response.cookies.delete(OWNER_COOKIE);
  return response;
}
