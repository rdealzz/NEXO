import type { Metadata } from "next";
import Link from "next/link";

import { CalendarioClient } from "@/components/calendario/calendario-client";
import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema } from "@/components/ui/tema";
import { store } from "@/lib/db";
import { currentOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calendário — NEXO",
  description: "Seus compromissos e vencimentos no mês, num lugar só.",
};

export default async function CalendarioPage() {
  const owner = await currentOwner();
  const reminders = owner.isNew ? [] : await store().listReminders(owner.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-3">
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

      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Seu mês</h1>

      <CalendarioClient reminders={reminders} />
    </main>
  );
}
