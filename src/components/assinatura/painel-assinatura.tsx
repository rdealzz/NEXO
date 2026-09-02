"use client";

import { useState } from "react";

import { BotaoAssinar } from "@/components/assinatura/botao-assinar";
import { Botao } from "@/components/ui/button";
import type { Acesso } from "@/lib/assinatura/acesso";
import { brl, PLANO } from "@/lib/pricing";

const ROTULO: Record<Acesso["status"], string> = {
  sem_assinatura: "Você ainda não assinou",
  pendente: "Pagamento pendente",
  ativa: "Assinatura ativa",
  atrasada: "Pagamento em atraso",
  cancelada: "Assinatura cancelada",
};

/** O estado da assinatura, em português, e o que dá para fazer com ele. */
export function PainelAssinatura({ acesso, disponivel }: { acesso: Acesso; disponivel: boolean }) {
  const [estado, setEstado] = useState(acesso);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ate = estado.validoAte
    ? new Date(estado.validoAte).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  async function cancelar() {
    setCancelando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/assinatura/cancelar", { method: "POST" });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.error ?? "Não consegui cancelar.");
      setEstado({ ...estado, status: "cancelada" });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui cancelar.");
    } finally {
      setCancelando(false);
    }
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {ROTULO[estado.status]}
        {estado.liberado && ate ? ` · acesso até ${ate}` : ""}
      </p>

      {estado.status === "atrasada" && (
        <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">
          {ate
            ? `Seu acesso continua até ${ate}. Regularize o pagamento para não perder os avisos.`
            : "Regularize o pagamento para não perder os avisos."}
        </p>
      )}

      {estado.status === "cancelada" && estado.liberado && ate && (
        <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-sm">
          Cancelada — e tudo continua funcionando até {ate}, que é o período que você já pagou.
        </p>
      )}

      <div className="mt-3">
        {estado.status === "ativa" ? (
          <Botao variant="ghost" size="sm" disabled={cancelando} onClick={cancelar}>
            {cancelando ? "Cancelando…" : "Cancelar assinatura"}
          </Botao>
        ) : disponivel ? (
          <BotaoAssinar
            autenticado
            rotulo={
              estado.status === "pendente"
                ? "Continuar o pagamento"
                : `Assinar por ${brl(PLANO.precoMensal)}/mês`
            }
          />
        ) : (
          <p className="text-xs text-muted">
            Pagamento ainda não configurado neste ambiente (falta{" "}
            <code className="font-mono">ASAAS_API_KEY</code>).
          </p>
        )}
      </div>

      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </>
  );
}
