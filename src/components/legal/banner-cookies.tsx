"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { Botao } from "@/components/ui/button";
import { lerConsentimento, registrarConsentimento, type Consentimento } from "@/lib/cookies";

const ouvintes = new Set<() => void>();

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  window.addEventListener("storage", ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", ouvinte);
  };
}

/** "pendente" enquanto não há escolha. No servidor sempre, para não piscar. */
function estadoAtual(): string {
  return lerConsentimento() ?? "pendente";
}

function estadoNoServidor(): string {
  return "servidor";
}

/**
 * O aviso de cookies do primeiro uso.
 *
 * Ele diz a verdade sobre o que existe: só cookie de sessão. Ainda assim
 * oferece a recusa — um aviso com um único botão "Aceitar" não é escolha.
 */
export function BannerCookies() {
  const estado = useSyncExternalStore(inscrever, estadoAtual, estadoNoServidor);
  const caixa = useRef<HTMLDivElement | null>(null);

  /*
   * A barra é fixa no rodapé, então ela cobre o fim da página — no celular isso
   * chegava a tapar o botão de continuar do onboarding, que ficava visível e não
   * clicável. Enquanto o aviso está de pé, o body ganha exatamente a altura dele
   * de espaço embaixo, e devolve esse espaço quando a pessoa escolhe.
   */
  useEffect(() => {
    if (estado !== "pendente") return;
    const altura = caixa.current?.offsetHeight ?? 0;
    document.body.style.paddingBottom = `${altura}px`;
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [estado]);

  if (estado !== "pendente") return null;

  const escolher = (escolha: Consentimento) => {
    registrarConsentimento(escolha);
    for (const ouvinte of ouvintes) ouvinte();
  };

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      // Barra fixa no rodapé: no iPhone ela ficaria embaixo da barra de gestos,
      // então o padding de baixo soma a área segura ao espaçamento normal.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-snug">
          Usamos cookies para manter você conectado e lembrar deste aparelho. Não usamos cookies de publicidade
          nem rastreadores de terceiros.{" "}
          <Link href="/legal/privacidade" className="text-accent underline underline-offset-2">
            Como tratamos seus dados
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Botao size="sm" variant="surface" onClick={() => escolher("essenciais")}>
            Só os essenciais
          </Botao>
          <Botao size="sm" variant="primary" onClick={() => escolher("tudo")}>
            Aceitar
          </Botao>
        </div>
      </div>
    </div>
  );
}
