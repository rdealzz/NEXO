"use client";

import { useMemo, useState } from "react";

import { Botao } from "@/components/ui/button";
import { ITENS_ROI, totalPerdido, vezesPadrao } from "@/lib/onboarding/roi";
import { brl, brlRedondo, PLANO, PRECO_ANUAL } from "@/lib/pricing";

/**
 * A conta que converte: a pessoa marca o que já aconteceu com ela no último ano
 * e vê o próprio prejuízo ao lado dos R$ 19,90/mês. Ninguém precisa acreditar
 * na nossa estimativa — os números são dela.
 */
export function RoiCalculadora({ onTotal }: { onTotal?: (total: number) => void }) {
  const [vezes, setVezes] = useState<Record<string, number>>(vezesPadrao);

  const total = useMemo(() => totalPerdido(vezes), [vezes]);
  const multiplo = total / PRECO_ANUAL;

  function ajustar(id: string, delta: number) {
    setVezes((atual) => {
      const proximo = { ...atual, [id]: Math.max(0, Math.min(12, (atual[id] ?? 0) + delta)) };
      onTotal?.(totalPerdido(proximo));
      return proximo;
    });
  }

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ITENS_ROI.map((item) => {
          const marcado = (vezes[item.id] ?? 0) > 0;
          return (
            <li
              key={item.id}
              className={`flex flex-col rounded-2xl border p-4 transition-colors ${
                marcado ? "border-accent/60 bg-accent-soft/50" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden className="text-2xl leading-none">
                  {item.icone}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{item.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.cenario}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold text-danger">
                  −{brl(item.custo)}
                  <span className="block text-[11px] font-normal text-muted">por vez</span>
                </p>
              </div>

              <p className="mt-2 text-[11px] leading-snug text-muted">{item.base}</p>

              <div className="mt-3 flex items-center gap-2">
                <span className="mr-auto whitespace-nowrap text-xs text-muted">Aconteceu com você?</span>
                <Botao
                  size="chip"
                  variant="surface"
                  onClick={() => ajustar(item.id, -1)}
                  disabled={!marcado}
                  aria-label={`Menos uma vez: ${item.titulo}`}
                >
                  −
                </Botao>
                <span className="w-20 whitespace-nowrap text-center text-xs font-semibold tabular-nums">
                  {marcado ? `${vezes[item.id]}× no ano` : "nunca"}
                </span>
                <Botao
                  size="chip"
                  variant={marcado ? "soft" : "surface"}
                  onClick={() => ajustar(item.id, 1)}
                  aria-label={`Mais uma vez: ${item.titulo}`}
                >
                  +
                </Botao>
              </div>

              {marcado && (
                <p className="mt-3 border-t border-line pt-3 text-xs leading-snug text-accent">{item.comONexo}</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              O que esquecer te custou no último ano
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-danger">
              {brlRedondo(total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">O NEXO no mesmo ano</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-accent">
              {brlRedondo(PRECO_ANUAL)}
            </p>
            <p className="text-xs text-muted">{brl(PLANO.precoMensal)}/mês</p>
          </div>
        </div>

        <Barras total={total} />

        <p className="mt-4 text-sm leading-relaxed">
          {total <= 0 ? (
            <>
              Marque o que já aconteceu com você. Basta <strong>um</strong> boleto atrasado por mês para o NEXO
              se pagar — e ele existe justamente porque ninguém lembra de tudo.
            </>
          ) : total < PRECO_ANUAL ? (
            <>
              Ainda abaixo do preço do ano. Some uma consulta esquecida ou uma garantia perdida e a conta vira —
              e é sempre a que você não previu que chega.
            </>
          ) : (
            <>
              O NEXO se pagou <strong>{multiplo.toFixed(1).replace(".", ",")}×</strong>. Evitar{" "}
              <strong>um único</strong> desses no ano já cobre a assinatura inteira.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/** Duas barras na mesma escala: o prejuízo e o preço. A comparação é o argumento. */
function Barras({ total }: { total: number }) {
  const escala = Math.max(total, PRECO_ANUAL);
  const larguraPerda = escala > 0 ? Math.max((total / escala) * 100, total > 0 ? 4 : 0) : 0;
  const larguraPreco = escala > 0 ? Math.max((PRECO_ANUAL / escala) * 100, 4) : 0;

  return (
    <div className="mt-5 space-y-2" aria-hidden>
      <div className="h-3 overflow-hidden rounded-full bg-accent-soft">
        <div
          className="h-full rounded-full bg-danger transition-[width] duration-300"
          style={{ width: `${larguraPerda}%` }}
        />
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-accent-soft">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${larguraPreco}%` }}
        />
      </div>
    </div>
  );
}
