import Link from "next/link";
import { redirect } from "next/navigation";

import { Botao, BotaoAncora } from "@/components/ui/button";
import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema } from "@/components/ui/tema";

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

  // Sem as variáveis do Supabase não existe login neste ambiente. Isso é dito
  // antes dos campos, e os botões ficam desligados: um formulário que aceita o
  // toque e não faz nada é pior que um formulário ausente — a pessoa acha que
  // errou o e-mail e tenta de novo.
  const configurado = authConfigured();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="NEXO" className="inline-flex">
          <MarcaNexo simbolo="size-8" wordmark="h-4" />
        </Link>
        <AlternadorTema />
      </header>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-2 text-muted">
        Sem senha. Você recebe um link por e-mail e pronto. O que você já jogou aqui neste aparelho vai junto para a
        sua conta.
      </p>

      {!configurado && (
        <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium">O login ainda não está ligado neste ambiente.</p>
          <p className="mt-1 text-muted">
            Faltam as variáveis <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Enquanto isso o NEXO funciona
            sem conta, e os lembretes ficam guardados neste aparelho.
          </p>
          <Link href="/inbox" className="mt-2 inline-block text-accent underline underline-offset-4">
            Usar sem conta
          </Link>
        </div>
      )}

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
            disabled={!configurado}
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent disabled:opacity-50"
          />
          <Botao type="submit" variant="primary" size="lg" block disabled={!configurado}>
            Me manda o link
          </Botao>
        </form>
      )}

      {!enviado && (
        <>
          <div className="mt-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-[var(--border)]" />
            ou
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <BotaoAncora
            href={configurado ? "/auth/google" : "#"}
            aria-disabled={!configurado}
            variant="surface"
            size="lg"
            block
            className="mt-4"
          >
            Continuar com Google
          </BotaoAncora>

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
                disabled={!configurado}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent disabled:opacity-50"
              />
              <Botao type="submit" variant="surface" size="lg" block disabled={!configurado}>
                Entrar ou criar conta
              </Botao>
            </form>
          </details>
        </>
      )}

      {erro && <p className="mt-4 text-sm text-danger">{ERROS[erro] ?? "Algo deu errado."}</p>}
    </main>
  );
}
