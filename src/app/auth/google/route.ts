import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Início do login com Google. O retorno cai em /auth/confirmar como o link mágico. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await supabaseServer();
  if (!supabase) return NextResponse.redirect(new URL("/entrar?erro=indisponivel", url));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? url.origin}/auth/confirmar` },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/entrar?erro=google", url));
  return NextResponse.redirect(data.url);
}
