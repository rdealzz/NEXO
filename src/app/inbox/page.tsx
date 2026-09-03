import Link from "next/link";

import { Trava } from "@/components/assinatura/trava";
import { InboxClient } from "@/components/inbox-client";
import { PainelNotificacoes } from "@/components/notificacoes/painel";
import { AtivarAvisos } from "@/components/permissoes/avisos";
import { ChipPerfil } from "@/components/perfil/chip";
import { AlternadorTema } from "@/components/ui/tema";
import { acessoDoDono, deveTravar } from "@/lib/assinatura/porta";
import { store } from "@/lib/db";
import { currentOwner } from "@/lib/owner";
import { ensureProfile, primeiroNome } from "@/lib/profile";

export const dynamic = "force-dynamic";

/** O mês, em traço, no mesmo peso dos outros ícones do cabeçalho. */
function IconeCalendario() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[1.15em]"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.2" y="4.8" width="17.6" height="16" rx="3" />
      <path d="M8 3.2v3.2M16 3.2v3.2M3.2 10h17.6" />
    </svg>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ migrados?: string }>;
}) {
  const { migrados } = await searchParams;
  const owner = await currentOwner();
  const reminders = owner.isNew ? [] : await store().listReminders(owner.id);
  const perfil = owner.authenticated ? await ensureProfile(owner.id, owner.email) : null;
  const acesso = await acessoDoDono(owner);
  const travado = deveTravar(acesso);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <ChipPerfil
          nome={perfil ? primeiroNome(perfil) : ""}
          avatarId={perfil?.avatar_id ?? null}
          semente={owner.id}
          autenticado={owner.authenticated}
        />
        {/* Três ações do mesmo tipo, três peças do mesmo tipo: "Calendário" era
            texto solto no meio de dois botões redondos, e por isso o cabeçalho
            parecia montado às pressas. */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/calendario"
            aria-label="Calendário"
            title="Calendário"
            className="btn btn--surface btn--icon"
          >
            <IconeCalendario />
          </Link>
          <PainelNotificacoes reminders={reminders} />
          <AlternadorTema />
        </div>
      </header>

      {migrados && (
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">
          Pronto — o que você tinha jogado aqui neste aparelho agora está na sua conta.
        </p>
      )}

      {!owner.authenticated && reminders.length > 0 && (
        <p className="mb-4 rounded-xl border border-line px-4 py-3 text-sm text-muted">
          Isto está salvo só neste aparelho.{" "}
          <Link href="/entrar" className="text-accent underline underline-offset-4">
            Crie uma conta
          </Link>{" "}
          para ver no celular e no PC.
        </p>
      )}

      {travado ? (
        <Trava acesso={acesso} autenticado={owner.authenticated} />
      ) : (
        <>
          {acesso.emTeste && acesso.liberado && (
            <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
              <span className="font-medium">
                Teste grátis: {acesso.diasRestantes === 1 ? "último dia" : `${acesso.diasRestantes} dias restantes`}.
              </span>
              <Link href="/perfil#plano" className="underline underline-offset-4">
                Ver os planos
              </Link>
            </p>
          )}

          <AtivarAvisos chavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} compacto />

          <InboxClient initialReminders={reminders} />
        </>
      )}
    </main>
  );
}
