"use client";

import { useEffect, useState } from "react";

import HelixChronoMatrix from "@/components/ui/helix-chrono-matrix";
import { MarcaNexo } from "@/components/ui/logo";

/**
 * A abertura.
 *
 * Três segundos com a marca sobre a malha, enquanto o app carrega — e some
 * sozinha. Um toque em qualquer lugar pula: ninguém deveria ficar preso numa
 * animação para chegar num lembrete.
 *
 * Os controles internos do componente (topologia, FREEZE) ficam escondidos aqui
 * pelo CSS do pai, sem tocar no arquivo dele: numa tela de abertura de três
 * segundos eles seriam ruído.
 */
const DURACAO = 2600;
const SAIDA = 600;

export function Abertura() {
  const [saindo, setSaindo] = useState(false);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const inicioDaSaida = setTimeout(() => setSaindo(true), DURACAO);
    const acabou = setTimeout(() => setFim(true), DURACAO + SAIDA);
    return () => {
      clearTimeout(inicioDaSaida);
      clearTimeout(acabou);
    };
  }, []);

  if (fim) return null;

  function pular() {
    setSaindo(true);
    setTimeout(() => setFim(true), SAIDA);
  }

  return (
    <div
      onClick={pular}
      role="presentation"
      aria-hidden
      className={`fixed inset-0 z-[60] transition-opacity duration-500 ${
        saindo ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Invertida junto com o herói: preta no tema claro, branca no escuro. */}
      <div className="malha-contraste absolute inset-0">
        <HelixChronoMatrix headline="" className="[&_header]:hidden" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
        <MarcaNexo
          simbolo="size-16 sm:size-20"
          wordmark="h-7 sm:h-9"
          className="gap-4 text-white dark:text-neutral-900"
        />
        <p className="font-medium text-neutral-300 dark:text-neutral-600">Joga aqui. Eu lembro.</p>
      </div>
    </div>
  );
}
