import Link from "next/link";

import { InboxClient } from "@/components/inbox-client";
import { store } from "@/lib/db";
import { currentOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const owner = await currentOwner();
  const reminders = owner.isNew ? [] : await store().listReminders(owner.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          NEXO
        </Link>
        <p className="text-sm text-muted">Você não precisa lembrar.</p>
      </header>

      <InboxClient initialReminders={reminders} />
    </main>
  );
}
