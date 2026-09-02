import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com a sessão do usuário, lida dos cookies. É só isto que sabe quem
 * está logado — o acesso aos dados continua passando pelo service role em
 * src/lib/db, que já filtra por owner_id.
 */
export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function supabaseServer(): Promise<SupabaseClient | null> {
  if (!authConfigured()) return null;
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) jar.set(name, value, options);
          } catch {
            // Server Component não pode escrever cookie; o middleware renova a sessão.
          }
        },
      },
    },
  );
}

export type SessionUser = { id: string; email: string | null };

export async function currentUser(): Promise<SessionUser | null> {
  const supabase = await supabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
