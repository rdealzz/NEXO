"use client";

import { useSyncExternalStore } from "react";

import { Botao } from "@/components/ui/button";
import { aplicarTema, lerPreferencia, resolverTema, TEMAS, type Tema } from "@/lib/tema";

/*
 * O tema mora fora do React: no localStorage e no ajuste do aparelho. Em vez de
 * copiar esse estado para dentro de um useState, os componentes se inscrevem
 * nele — assim dois alternadores na mesma página nunca discordam, e o servidor
 * renderiza sempre "claro", que é como o app abre.
 */
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const doAparelho = window.matchMedia("(prefers-color-scheme: dark)");
  // Outra aba mudou o tema, ou o aparelho virou a chave enquanto está em "sistema".
  window.addEventListener("storage", ouvinte);
  doAparelho.addEventListener("change", ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", ouvinte);
    doAparelho.removeEventListener("change", ouvinte);
  };
}

/** Uma string simples: dá para comparar por valor a cada render. */
function estadoAtual(): string {
  const preferencia = lerPreferencia();
  return `${preferencia}:${resolverTema(preferencia)}`;
}

function estadoNoServidor(): string {
  return "claro:claro";
}

function useTema(): { preferencia: Tema; resolvido: "claro" | "escuro"; trocar: (tema: Tema) => void } {
  const estado = useSyncExternalStore(inscrever, estadoAtual, estadoNoServidor);
  const [preferencia, resolvido] = estado.split(":") as [Tema, "claro" | "escuro"];
  return {
    preferencia,
    resolvido,
    trocar: (tema: Tema) => {
      aplicarTema(tema);
      avisar();
    },
  };
}

/**
 * O interruptor do cabeçalho: mostra o ícone do tema que você vai *receber* ao
 * clicar — lua enquanto está claro, sol enquanto está escuro.
 */
export function AlternadorTema({ className = "" }: { className?: string }) {
  const { resolvido, trocar } = useTema();
  const proximo = resolvido === "escuro" ? "claro" : "escuro";

  return (
    <Botao
      size="icon"
      variant="surface"
      className={className}
      aria-label={proximo === "escuro" ? "Ativar modo escuro" : "Ativar modo claro"}
      title={proximo === "escuro" ? "Modo escuro" : "Modo claro"}
      onClick={() => trocar(proximo)}
    >
      {resolvido === "escuro" ? <IconeSol /> : <IconeLua />}
    </Botao>
  );
}

/** A versão do Perfil: as três opções à vista, incluindo seguir o aparelho. */
export function EscolhaTema() {
  const { preferencia, trocar } = useTema();

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {TEMAS.map((tema) => {
        const escolhido = preferencia === tema.id;
        return (
          <Botao
            key={tema.id}
            size="sm"
            variant={escolhido ? "primary" : "surface"}
            aria-pressed={escolhido}
            title={tema.descricao}
            onClick={() => trocar(tema.id)}
          >
            {tema.id === "claro" && <IconeSol />}
            {tema.id === "escuro" && <IconeLua />}
            {tema.id === "sistema" && <IconeAparelho />}
            {tema.nome}
          </Botao>
        );
      })}
    </div>
  );
}

const TRACO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconeSol() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15em]" aria-hidden focusable="false" {...TRACO}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15em]" aria-hidden focusable="false" {...TRACO}>
      <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z" />
    </svg>
  );
}

function IconeAparelho() {
  return (
    <svg viewBox="0 0 24 24" className="size-[1.15em]" aria-hidden focusable="false" {...TRACO}>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M9 20h6" />
    </svg>
  );
}
