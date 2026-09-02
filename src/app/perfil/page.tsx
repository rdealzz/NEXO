import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PainelAssinatura } from "@/components/assinatura/painel-assinatura";
import { ExcluirConta } from "@/components/legal/excluir-conta";
import { Cartao } from "@/components/perfil/cartao";
import { Cobranca } from "@/components/perfil/cobranca";
import { Identidade } from "@/components/perfil/identidade";
import { AtivarAvisos } from "@/components/permissoes/avisos";
import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema, EscolhaTema } from "@/components/ui/tema";
import { acessoDe } from "@/lib/assinatura/acesso";
import { asaasConfigurado } from "@/lib/assinatura/asaas";
import { store } from "@/lib/db";
import { ensureProfile, inboundAddress, nomeDe } from "@/lib/profile";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Perfil — NEXO" };

/**
 * O perfil.
 *
 * Um lugar só para tudo que é da pessoa: quem ela é, o que ela paga, como o
 * NEXO fala com ela e como ela vai embora. Espalhar isso em várias telas é o
 * que faz alguém desistir de procurar.
 */
export default async function PerfilPage() {
  const user = await currentUser();
  if (!user) redirect("/entrar");

  const perfil = await ensureProfile(user.id, user.email);
  const acesso = await acessoDe(user.id);
  const assinatura = await store().getSubscription(user.id);
  const endereco = inboundAddress(perfil);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <Link href="/inbox" aria-label="NEXO" className="inline-flex">
          <MarcaNexo />
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <AlternadorTema />
          <Link href="/inbox" className="text-sm text-muted hover:text-foreground">
            voltar
          </Link>
        </div>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
      <p className="mt-1 text-sm text-muted">Olá, {nomeDe(perfil)}.</p>

      <Secao titulo="Você">
        <Identidade
          nomeInicial={perfil.display_name ?? ""}
          avatarInicial={perfil.avatar_id}
          email={perfil.email}
        />
      </Secao>

      <Secao titulo="Assinatura">
        <PainelAssinatura acesso={acesso} disponivel={asaasConfigurado()} />
      </Secao>

      <Secao titulo="Forma de pagamento">
        <Cartao assinatura={assinatura} />
      </Secao>

      <Secao
        titulo="Endereço de cobrança"
        descricao="Boleto e Pix pedem o endereço do pagador. O CEP preenche o resto sozinho."
      >
        <Cobranca perfil={perfil} />
      </Secao>

      <Secao
        titulo="Avisos"
        descricao="É por aqui que o NEXO cumpre a promessa: o aviso chega mesmo com o app fechado."
      >
        <AtivarAvisos chavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      </Secao>

      <Secao titulo="Aparência" descricao="O NEXO abre no claro. O escuro fica valendo neste aparelho.">
        <EscolhaTema />
      </Secao>

      <Secao titulo="Entrada por fora do app" descricao="Encaminhe um e-mail e ele vira lembrete.">
        {endereco ? (
          <p className="mt-3 select-all rounded-xl bg-accent-soft px-3 py-2 font-mono text-sm">{endereco}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Ainda não configurado neste ambiente (falta <code className="font-mono">INBOUND_EMAIL_DOMAIN</code>).
          </p>
        )}
        <Link href="/configuracoes" className="mt-3 inline-block text-sm text-accent underline underline-offset-4">
          WhatsApp e outros canais
        </Link>
      </Secao>

      <Secao titulo="Sobre e legal">
        <div className="mt-2 divide-y divide-line">
          <Link href="/legal/termos" className="flex items-center justify-between py-2.5 text-sm hover:text-accent">
            Termos de Uso <span aria-hidden className="text-muted">›</span>
          </Link>
          <Link
            href="/legal/privacidade"
            className="flex items-center justify-between py-2.5 text-sm hover:text-accent"
          >
            Política de Privacidade <span aria-hidden className="text-muted">›</span>
          </Link>
        </div>
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs leading-snug text-accent">
          Seus dados pessoais não treinam nenhuma inteligência artificial.
        </p>
      </Secao>

      <section className="mt-4 rounded-2xl border border-danger/30 bg-surface p-4">
        <h2 className="text-sm font-semibold">Excluir minha conta</h2>
        <p className="mt-1 text-sm text-muted">
          Apaga permanentemente lembretes, capturas, arquivos, compras e o login. É definitivo.
        </p>
        <div className="mt-3">
          <ExcluirConta email={user.email} />
        </div>
      </section>
    </main>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-muted">{descricao}</p>}
      {children}
    </section>
  );
}
