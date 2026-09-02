import Link from "next/link";
import { redirect } from "next/navigation";

import { Botao } from "@/components/ui/button";
import { MarcaNexo } from "@/components/ui/logo";
import { EscolhaTema } from "@/components/ui/tema";
import { sendText, whatsappConfigured } from "@/lib/inbound/whatsapp";
import { confirmPhoneLink, ensureProfile, inboundAddress, startPhoneLink } from "@/lib/profile";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function vincularTelefone(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user) redirect("/entrar");

  const phone = String(formData.get("phone") ?? "");
  if (phone.replace(/\D+/g, "").length < 10) redirect("/configuracoes?erro=telefone");

  const { code, phone: digits } = await startPhoneLink(user.id, phone);
  const enviado = await sendText(digits, `Seu código do NEXO é ${code}. Ele vale por 10 minutos.`);
  redirect(enviado ? "/configuracoes?codigo=1" : "/configuracoes?erro=envio");
}

async function confirmarTelefone(formData: FormData) {
  "use server";
  const user = await currentUser();
  if (!user) redirect("/entrar");

  const profile = await confirmPhoneLink(user.id, String(formData.get("code") ?? ""));
  redirect(profile ? "/configuracoes?vinculado=1" : "/configuracoes?erro=codigo");
}

async function sair() {
  "use server";
  const supabase = await supabaseServer();
  await supabase?.auth.signOut();
  redirect("/");
}

const MENSAGENS: Record<string, string> = {
  telefone: "Esse número não parece completo. Use DDD e, se puder, o 55 na frente.",
  envio: "Não consegui mandar o código pelo WhatsApp agora.",
  codigo: "Código errado ou vencido. Pede outro.",
};

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; codigo?: string; vinculado?: string }>;
}) {
  const { erro, codigo, vinculado } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/entrar");

  const profile = await ensureProfile(user.id, user.email);
  const endereco = inboundAddress(profile);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <Link href="/inbox" aria-label="NEXO">
          <MarcaNexo />
        </Link>
        <Link href="/inbox" className="text-sm text-muted hover:text-foreground">
          voltar
        </Link>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      {erro && <p className="mt-4 text-sm text-[#e0483a]">{MENSAGENS[erro] ?? "Algo deu errado."}</p>}
      {vinculado && <p className="mt-4 text-sm text-accent">Telefone vinculado. Pode me mandar coisas por lá.</p>}

      <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Aparência</h2>
        <p className="mt-1 text-sm text-muted">
          O NEXO abre no claro. O escuro fica valendo em todo acesso, neste aparelho.
        </p>
        <EscolhaTema />
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Seu endereço de entrada</h2>
        <p className="mt-1 text-sm text-muted">
          Encaminhe qualquer e-mail para cá e eu leio. Só aceito mensagens vindas do seu próprio e-mail.
        </p>
        {endereco ? (
          <p className="mt-3 select-all rounded-lg bg-accent-soft px-3 py-2 font-mono text-sm">{endereco}</p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Ainda não configurado neste ambiente (falta <code className="font-mono">INBOUND_EMAIL_DOMAIN</code>).
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">WhatsApp</h2>
        {!whatsappConfigured() ? (
          <p className="mt-1 text-sm text-muted">
            Ainda não configurado neste ambiente (falta <code className="font-mono">WHATSAPP_TOKEN</code>).
          </p>
        ) : profile.phone ? (
          <p className="mt-2 text-sm">
            Vinculado ao número <span className="font-mono">{profile.phone}</span>. Manda foto, PDF, áudio ou texto
            que eu entendo.
          </p>
        ) : codigo || profile.phone_pending ? (
          <form action={confirmarTelefone} className="mt-3 flex gap-2">
            <input
              name="code"
              inputMode="numeric"
              placeholder="código de 6 dígitos"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            />
            <Botao type="submit" variant="primary" size="sm">
              Confirmar
            </Botao>
          </form>
        ) : (
          <form action={vincularTelefone} className="mt-3 flex gap-2">
            <input
              name="phone"
              inputMode="tel"
              placeholder="55 11 90000-0000"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            />
            <Botao type="submit" variant="primary" size="sm">
              Vincular
            </Botao>
          </form>
        )}
        <p className="mt-2 text-xs text-muted">
          Mando um código para o número antes de ativar — assim ninguém aponta o seu WhatsApp para outra conta.
        </p>
      </section>

      <form action={sair} className="mt-8">
        <Botao type="submit" variant="ghost" size="sm">
          Sair da conta
        </Botao>
      </form>
    </main>
  );
}
