import Link from "next/link";

import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema } from "@/components/ui/tema";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" aria-label="NEXO" className="inline-flex">
          <MarcaNexo />
        </Link>
        <AlternadorTema />
      </header>

      {/* Texto legal é para ser lido, não para ser bonito: medida curta, linha alta. */}
      <article className="prose-nexo">{children}</article>

      <nav className="mt-12 flex flex-wrap gap-4 border-t border-line pt-6 text-sm text-muted">
        <Link href="/legal/termos" className="hover:text-foreground">
          Termos de Uso
        </Link>
        <Link href="/legal/privacidade" className="hover:text-foreground">
          Política de Privacidade
        </Link>
        <Link href="/configuracoes" className="hover:text-foreground">
          Excluir minha conta
        </Link>
      </nav>
    </main>
  );
}
