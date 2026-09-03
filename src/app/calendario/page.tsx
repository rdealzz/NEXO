import type { Metadata } from "next";
import Link from "next/link";

import { Trava } from "@/components/assinatura/trava";
import { CalendarioClient } from "@/components/calendario/calendario-client";
import { ChipPerfil } from "@/components/perfil/chip";
import { AlternadorTema } from "@/components/ui/tema";
import { acessoDoDono, deveTravar } from "@/lib/assinatura/porta";
import { store } from "@/lib/db";
import { currentOwner } from "@/lib/owner";
import { ensureProfile, primeiroNome } from "@/lib/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendário — NEXO",
  description: "Seus compromissos e vencimentos no mês, num lugar só.",
};

export default async function CalendarioPage() {
  const owner = await currentOwner();
  const reminders = owner.isNew ? [] : await store().listReminders(owner.id);
  const perfil = owner.authenticated ? await ensureProfile(owner.id, owner.email) : null;
  const acesso = await acessoDoDono(owner);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <ChipPerfil
          nome={perfil ? primeiroNome(perfil) : ""}
          avatarId={perfil?.avatar_id ?? null}
          semente={owner.id}
          autenticado={owner.authenticated}
        />
        <div className="flex shrink-0 items-center gap-3">
          <AlternadorTema />
          <Link href="/inbox" className="text-sm text-muted hover:text-foreground">
            voltar
          </Link>
        </div>
      </header>

      {deveTravar(acesso) ? (
        <Trava acesso={acesso} autenticado={owner.authenticated} />
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-semibold tracking-tight">Seu mês</h1>
          <CalendarioClient reminders={reminders} />
        </>
      )}
    </main>
  );
}
