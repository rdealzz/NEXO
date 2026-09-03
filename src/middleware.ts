import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { INICIO_COOKIE } from "@/lib/cookies-nomes";

/**
 * Renova a sessão do Supabase a cada navegação. Server Components não podem
 * escrever cookies, então é aqui que o token atualizado é gravado — sem isto,
 * a pessoa é deslogada quando o access token expira.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // O relógio do teste grátis começa na primeira visita, e é aqui que ele é
  // carimbado: Server Component não escreve cookie, e sem uma data gravada o
  // teste recomeçaria a cada navegação — teste eterno para todo mundo.
  if (!request.cookies.get(INICIO_COOKIE)) {
    response.cookies.set(INICIO_COOKIE, new Date().toISOString(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icone.svg|manifest.webmanifest).*)"],
};
