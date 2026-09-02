import Link from "next/link";
import { redirect } from "next/navigation";

import { authConfigured, currentUser, supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function enviarLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/entrar?erro=vazio");

  const supabase = await supabaseServer();
  if (!supabase) redirect("/entrar?erro=indisponivel");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirmar` },
  });
  redirect(error ? "/entrar?erro=envio" : "/entrar?enviado=1");
}

async function entrarComSenha(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || senha.length < 8) redirect("/entrar?erro=senha");

  const supabase = await supabaseServer();
  if (!supabase) redirect("/entrar?erro=indisponivel");

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (!error) redirect("/inbox");

  // Sem conta ainda? A mesma tela cria uma, para não pedir dois passos.
  const { error: cadastro } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/confirmar` },
  });
  redirect(cadastro ? "/entrar?erro=senha" : "/entrar?enviado=1");
}

const ERROS: Record<string, string> = {
  vazio: "Escreve teu e-mail.",
  indisponivel: "Login ainda não está configurado neste ambiente.",
  envio: "Não consegui mandar o link agora. Tenta de novo?",
  senha: "E-mail ou senha não conferem. A senha precisa ter pelo menos 8 caracteres.",
  google: "O login com Google não está configurado neste ambiente.",
  sessao: "Esse link expirou ou já foi usado. Pede outro.",
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; enviado?: string }>;
}) {
  const { erro, enviado } = await searchParams;
  if (await currentUser()) redirect("/inbox");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <Link href="/" className="text-sm font-semibold tracking-tight text-accent">
        NEXO
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-2 text-muted">
        Sem senha. Você recebe um link por e-mail e pronto. O que você já jogou aqui neste aparelho vai junto para a
        sua conta.
      </p>

      {enviado ? (
        <p className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Link enviado. Abra o e-mail neste mesmo aparelho.
        </p>
      ) : (
        <form action={enviarLink} className="mt-6 space-y-3">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-background"
          >
            Me manda o link
          </button>
        </form>
      )}

      {!enviado && (
        <>
          <div className="mt-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-[var(--border)]" />
            ou
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <a
            href="/auth/google"
            className="mt-4 block rounded-full border border-line py-3 text-center text-sm font-semibold"
          >
            Continuar com Google
          </a>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted">Prefiro e-mail e senha</summary>
            <form action={entrarComSenha} className="mt-3 space-y-2">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="voce@email.com"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
              />
              <input
                type="password"
                name="senha"
                required
                minLength={8}
                autoComplete="current-password"
                placeholder="senha (mínimo 8 caracteres)"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
              />
              <button type="submit" className="w-full rounded-full border border-line py-3 text-sm font-semibold">
                Entrar ou criar conta
              </button>
            </form>
          </details>
        </>
      )}

      {erro && <p className="mt-4 text-sm text-[#e0483a]">{ERROS[erro] ?? "Algo deu errado."}</p>}

      {!authConfigured() && (
        <p className="mt-6 text-sm text-muted">
          Este ambiente está sem as variáveis do Supabase — dá para usar o NEXO sem conta, os lembretes ficam neste
          aparelho.{" "}
          <Link href="/inbox" className="underline underline-offset-4">
            Ir para a caixa
          </Link>
        </p>
      )}
    </main>
  );
}
