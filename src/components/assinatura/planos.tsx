"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Botao } from "@/components/ui/button";
import {
  brl,
  economia,
  PLANO_DESTAQUE,
  PLANOS,
  precoPorMes,
  type Plano,
} from "@/lib/pricing";

/**
 * Os três planos, lado a lado.
 *
 * O mesmo serviço em três prazos, e a única diferença real é quanto sai o mês.
 * Por isso o preço por mês aparece em todos — inclusive no mensal, onde ele é a
 * régua — e a economia vem escrita em reais, não só em porcentagem: "economize
 * R$ 88,90" mexe com quem "37% off" não mexe.
 *
 * Escolher não paga: o pagamento continua acontecendo na página do gateway.
 */
export function Planos({
  autenticado,
  inicial = PLANO_DESTAQUE,
}: {
  autenticado: boolean;
  inicial?: Plano["id"];
}) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState<Plano["id"]>(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    if (!autenticado) {
      // Assinar sem conta criaria uma cobrança órfã, sem dono a quem liberar.
      router.push(`/entrar?plano=${escolhido}`);
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/assinatura/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plano: escolhido }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? "Não consegui abrir o pagamento.");
      // O checkout é do gateway: sai do app de propósito, para o cartão ser
      // digitado no domínio de quem processa o pagamento, não no nosso.
      window.location.href = corpo.url;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui abrir o pagamento.");
      setEnviando(false);
    }
  }

  const plano = PLANOS.find((p) => p.id === escolhido)!;
  const ganho = economia(plano);

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {PLANOS.map((p) => {
          const ganhoDele = economia(p);
          const marcado = escolhido === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setEscolhido(p.id)}
                aria-pressed={marcado}
                className={`peca relative flex h-full w-full flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left ${
                  marcado ? "border-accent bg-accent-soft" : "border-line hover:border-accent/40"
                }`}
              >
                {p.id === PLANO_DESTAQUE && (
                  <span className="absolute -top-2.5 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--btn-primary-ink)]">
                    Melhor preço
                  </span>
                )}

                <span className="text-sm font-semibold">{p.nome}</span>

                <span className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tracking-tight">{brl(precoPorMes(p))}</span>
                  <span className="text-xs text-muted">/mês</span>
                </span>

                <span className="text-xs text-muted">
                  {p.meses === 1 ? "cobrado todo mês" : `${brl(p.preco)} cobrados de uma vez`}
                </span>

                {ganhoDele.reais > 0 ? (
                  <span className="mt-2 inline-flex flex-col gap-0.5">
                    <span className="inline-flex w-fit rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-[color:var(--btn-primary-ink)]">
                      −{ganhoDele.porcento}%
                    </span>
                    <span className="text-[11px] leading-tight text-accent">
                      economize {brl(ganhoDele.reais)}
                    </span>
                    <span className="text-[11px] leading-tight text-muted line-through">{brl(ganhoDele.cheio)}</span>
                  </span>
                ) : (
                  <span className="mt-2 text-[11px] leading-tight text-muted">preço de referência</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm">
        {ganho.reais > 0 ? (
          <>
            No <span className="font-medium">{plano.nome.toLowerCase()}</span> você paga{" "}
            <span className="font-medium">{brl(plano.preco)}</span> em vez de {brl(ganho.cheio)} —{" "}
            <span className="font-semibold text-accent">
              {ganho.porcento}% de desconto, {brl(ganho.reais)} no bolso
            </span>
            .
          </>
        ) : (
          <>
            No mensal você paga <span className="font-medium">{brl(plano.preco)}</span> por mês, sem fidelidade. Os
            outros prazos cobram o mesmo serviço mais barato.
          </>
        )}
      </p>

      <div className="mt-4">
        <Botao variant="primary" size="lg" block disabled={enviando} onClick={assinar}>
          {enviando ? "Abrindo o pagamento…" : `Assinar ${plano.nome.toLowerCase()} — ${brl(plano.preco)}`}
        </Botao>
      </div>

      {erro && <p className="mt-2 text-center text-sm text-danger">{erro}</p>}

      <p className="mt-3 text-center text-xs text-muted">
        Pix, boleto ou cartão. O cancelamento é um clique dentro do app, e o acesso continua até o fim do período
        pago.
      </p>
    </div>
  );
}
