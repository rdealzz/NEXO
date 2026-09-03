"use client";

import { useEffect, useRef } from "react";

import { Botao } from "@/components/ui/button";
import { TEXTOS, type Permissao } from "@/lib/permissoes";

type Props = {
  permissao: Permissao;
  /** "explicar" pede a permissão; "bloqueada" ensina o caminho de volta. */
  modo: "explicar" | "bloqueada";
  onAceitar: () => void;
  onFechar: () => void;
};

/**
 * A tela que aparece **antes** da pergunta do sistema.
 *
 * Usa o <dialog> nativo de propósito: foco preso, Esc e a camada de fundo vêm
 * prontos e corretos do navegador, em vez de uma reimplementação pela metade.
 */
export function ModalPermissao({ permissao, modo, onAceitar, onFechar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const texto = TEXTOS[permissao];

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento?.isConnected || elemento.open) return;
    elemento.showModal();
  }, []);

  return (
    <dialog
      ref={dialogo}
      onClose={onFechar}
      onClick={(evento) => {
        // Clique fora do cartão fecha — o <dialog> em si ocupa a tela inteira.
        if (evento.target === dialogo.current) dialogo.current?.close();
      }}
      aria-labelledby="permissao-titulo"
      className="vidro m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl border p-6 text-foreground"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        {permissao === "camera" ? <IconeCamera /> : <IconeGaleria />}
      </div>

      <h2 id="permissao-titulo" className="mt-4 text-xl font-semibold tracking-tight">
        {modo === "explicar" ? texto.titulo : "Acesso bloqueado no aparelho"}
      </h2>

      <p className="mt-2 leading-relaxed text-muted">
        {modo === "explicar"
          ? texto.justificativa
          : "Você negou esse acesso antes, e o sistema não pergunta de novo sozinho. Dá para liberar assim:"}
      </p>

      <ul className="mt-4 space-y-2">
        {(modo === "explicar" ? texto.detalhes : texto.comoLiberar).map((item, indice) => (
          <li key={item} className="flex gap-2.5 text-sm leading-snug">
            <span aria-hidden className="mt-px shrink-0 font-semibold text-accent">
              {modo === "explicar" ? "✓" : `${indice + 1}.`}
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        {modo === "explicar" ? (
          <>
            <Botao variant="primary" size="lg" block autoFocus onClick={onAceitar}>
              {texto.aceitar}
            </Botao>
            <Botao variant="ghost" block onClick={() => dialogo.current?.close()}>
              Agora não
            </Botao>
          </>
        ) : (
          <Botao variant="surface" size="lg" block autoFocus onClick={() => dialogo.current?.close()}>
            Entendi
          </Botao>
        )}
      </div>

      {modo === "explicar" && (
        <p className="mt-4 text-center text-xs text-muted">
          Só depois de você tocar acima é que o aparelho pergunta.
        </p>
      )}
    </dialog>
  );
}

const TRACO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function IconeCamera() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden {...TRACO}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.3 4.7h5.4a1 1 0 0 1 .83.45l.94 1.4a1 1 0 0 0 .83.45h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.8" r="3.4" />
    </svg>
  );
}

function IconeGaleria() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden {...TRACO}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M4 17l4.6-4.4a1.6 1.6 0 0 1 2.2 0L15 16.6M14 14.4l1.6-1.5a1.6 1.6 0 0 1 2.2 0L20 15" />
    </svg>
  );
}
