import Link from "next/link";

import { InboxClient } from "@/components/inbox-client";
import { store } from "@/lib/db";
import { currentOwner } from "@/lib/owner";
import { ensureProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ migrados?: string }>;
}) {
  const { migrados } = await searchParams;
  const owner = await currentOwner();
  const reminders = owner.isNew ? [] : await store().listReminders(owner.id);
  if (owner.authenticated) await ensureProfile(owner.id, owner.email);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-baseline justify-between gap-3">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            NEXO
          </Link>
          <p className="text-sm text-muted">Joga aqui. Eu lembro.</p>
        </div>
        {owner.authenticated ? (
          <Link href="/configuracoes" className="shrink-0 text-sm text-muted hover:text-foreground">
            Configurações
          </Link>
        ) : (
          <Link href="/entrar" className="shrink-0 text-sm text-accent hover:underline">
            Entrar
          </Link>
        )}
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

      <InboxClient initialReminders={reminders} />
    </main>
  );
}
