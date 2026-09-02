"use client";

import { useState } from "react";

import { Botao } from "@/components/ui/button";
import { brl, PLANO } from "@/lib/pricing";

/**
 * O botão que leva ao pagamento.
 *
 * Sem conta ele manda para o login carregando o plano — assinar sem conta
 * criaria uma cobrança órfã, sem dono a quem liberar depois.
 */
export function BotaoAssinar({
  autenticado,
  rotulo,
  className = "",
}: {
  autenticado: boolean;
  rotulo?: string;
  className?: string;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    if (!autenticado) {
      window.location.href = `/entrar?plano=${PLANO.id}`;
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/assinatura/checkout", { method: "POST" });
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

  return (
    <>
      <Botao variant="primary" size="lg" block className={className} disabled={enviando} onClick={assinar}>
        {enviando ? "Abrindo o pagamento…" : (rotulo ?? `Assinar por ${brl(PLANO.precoMensal)}/mês`)}
      </Botao>
      {erro && <p className="mt-2 text-center text-sm text-danger">{erro}</p>}
    </>
  );
}
