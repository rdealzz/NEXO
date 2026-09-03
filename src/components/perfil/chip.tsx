"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { AvatarNexo } from "@/components/perfil/avatar";
import { AVATARES, CHAVE_AVATAR, type FamiliaAvatar } from "@/lib/avatares";

/*
 * O bicho de quem ainda não tem conta mora no aparelho, fora do React. Em vez de
 * copiar isso para dentro de um estado no primeiro render — que dispararia um
 * segundo render em toda montagem —, os componentes se inscrevem no valor. No
 * servidor a leitura devolve "", que é como a página é montada.
 */
const ouvintes = new Set<() => void>();
let lembrado: string | null = null;

function lerDoAparelho(): string {
  if (lembrado === null) {
    try {
      lembrado = localStorage.getItem(CHAVE_AVATAR) ?? "";
    } catch {
      lembrado = "";
    }
  }
  return lembrado;
}

function noServidor(): string {
  return "";
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function gravarNoAparelho(id: string) {
  lembrado = id;
  try {
    localStorage.setItem(CHAVE_AVATAR, id);
  } catch {
    // Sem armazenamento a escolha vale só nesta sessão. Tudo bem.
  }
  for (const ouvinte of ouvintes) ouvinte();
}

/**
 * A porta do perfil, no canto superior esquerdo.
 *
 * Mostra retrato e primeiro nome — o suficiente para reconhecer a própria conta
 * de relance. Um toque no retrato abre os bichos ali mesmo: trocar de cara é
 * brincadeira, não formulário, e não deveria custar uma viagem até o perfil.
 *
 * Quem já tem conta guarda a escolha na conta (vale no celular e no PC). Quem
 * ainda não tem guarda no aparelho, e a escolha sobe junto quando entrar.
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
  const [daConta, setDaConta] = useState(avatarId);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState(false);
  const caixa = useRef<HTMLDivElement | null>(null);
  const painelId = useId();

  const doAparelho = useSyncExternalStore(inscrever, lerDoAparelho, noServidor);
  const valeNoAparelho = AVATARES.some((a) => a.id === doAparelho) ? doAparelho : null;
  const avatar = autenticado ? daConta : (valeNoAparelho ?? avatarId);

  // Fecha ao clicar fora ou no Esc — como qualquer menu do sistema.
  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  async function escolher(id: string) {
    setErro(false);

    if (!autenticado) {
      gravarNoAparelho(id);
      return;
    }

    const anterior = daConta;
    setDaConta(id); // Troca na hora: a espera da rede não pode travar o desenho.
    try {
      const resposta = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatar_id: id }),
      });
      if (!resposta.ok) throw new Error();
    } catch {
      setDaConta(anterior); // Não deu para salvar: melhor voltar do que mentir.
      setErro(true);
    }
  }

  return (
    <div ref={caixa} className="relative flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setAberto((estava) => !estava)}
        aria-expanded={aberto}
        aria-controls={painelId}
        aria-label="Trocar meu bicho"
        title="Trocar meu bicho"
        className="rounded-full transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <AvatarNexo id={avatar} semente={semente} className="size-9" />
      </button>

      {autenticado ? (
        <Link href="/perfil" className="min-w-0 truncate text-sm font-medium hover:text-accent">
          {nome}
        </Link>
      ) : (
        <Link href="/entrar" className="btn btn--surface btn--sm">
          Entrar
        </Link>
      )}

      {aberto && (
        <div
          id={painelId}
          className="absolute left-0 top-full z-40 mt-2 w-[19rem] rounded-2xl border border-line bg-surface p-3 shadow-xl"
        >
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">Escolha seu bicho</p>

          {(["quentes", "frios"] as FamiliaAvatar[]).map((familia) => (
            <ul key={familia} className="mt-2 grid grid-cols-4 gap-1">
              {AVATARES.filter((a) => a.familia === familia).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => escolher(a.id)}
                    aria-pressed={avatar === a.id}
                    title={a.nome}
                    className={`flex w-full flex-col items-center gap-1 rounded-xl border p-1.5 transition-colors ${
                      avatar === a.id ? "border-accent bg-accent-soft" : "border-transparent hover:bg-accent-soft/50"
                    }`}
                  >
                    <AvatarNexo id={a.id} className="size-11" />
                    <span className="text-[10px] leading-tight text-muted">{a.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}

          {erro && <p className="mt-2 px-1 text-xs text-danger">Não consegui salvar. Tenta de novo?</p>}

          {!autenticado && (
            <p className="mt-3 px-1 text-xs text-muted">
              Sem conta, o bicho fica só neste aparelho.{" "}
              <Link href="/entrar" className="text-accent underline underline-offset-2">
                Entrar
              </Link>
            </p>
          )}

          {autenticado && (
            <Link
              href="/perfil"
              onClick={() => setAberto(false)}
              className="mt-3 flex items-center justify-between rounded-xl px-1 py-2 text-sm hover:text-accent"
            >
              Minha conta <span aria-hidden className="text-muted">›</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
