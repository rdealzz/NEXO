import Link from "next/link";

/** O rodapé legal que as lojas procuram: os documentos a um toque, em toda tela. */
export function RodapeLegal({ className = "" }: { className?: string }) {
  return (
    <footer className={`mt-14 border-t border-line pt-6 text-sm text-muted ${className}`}>
      <nav className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/legal/termos" className="hover:text-foreground">
          Termos de Uso
        </Link>
        <Link href="/legal/privacidade" className="hover:text-foreground">
          Política de Privacidade
        </Link>
        <Link href="/configuracoes" className="hover:text-foreground">
          Sua conta e seus dados
        </Link>
      </nav>
      <p className="mt-3 text-xs">Seus dados pessoais não treinam nenhuma inteligência artificial.</p>
    </footer>
  );
}
