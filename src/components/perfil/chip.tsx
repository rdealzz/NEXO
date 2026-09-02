import Link from "next/link";

import { AvatarNexo } from "@/components/perfil/avatar";

/**
 * A porta do perfil, no canto superior esquerdo.
 *
 * Mostra retrato e primeiro nome — o suficiente para a pessoa reconhecer a
 * própria conta de relance, e curto o bastante para caber no celular.
 */
export function ChipPerfil({
  nome,
  avatarId,
  semente,
  autenticado,
}: {
  nome: string;
  avatarId: string | null;
  semente: string;
  autenticado: boolean;
}) {
  if (!autenticado) {
    return (
      <Link href="/entrar" className="btn btn--surface btn--sm">
        Entrar
      </Link>
    );
  }

  return (
    <Link
      href="/perfil"
      className="flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-accent-soft"
    >
      <AvatarNexo id={avatarId} semente={semente} className="size-8" />
      <span className="truncate text-sm font-medium">{nome}</span>
    </Link>
  );
}
