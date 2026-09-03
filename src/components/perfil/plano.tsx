import type { Acesso } from "@/lib/assinatura/acesso";
import { acharPlano, brl, economia, PLANO_PADRAO, precoPorMes, TESTE_DIAS } from "@/lib/pricing";

const SITUACAO: Record<Acesso["status"], { rotulo: string; tom: string }> = {
  sem_assinatura: { rotulo: "Sem assinatura", tom: "text-muted" },
  teste: { rotulo: "Teste grátis", tom: "text-accent" },
  vitalicio: { rotulo: "Vitalício", tom: "text-accent" },
  pendente: { rotulo: "Pagamento pendente", tom: "text-warning" },
  ativa: { rotulo: "Ativa", tom: "text-accent" },
  atrasada: { rotulo: "Em atraso", tom: "text-danger" },
  cancelada: { rotulo: "Cancelada", tom: "text-muted" },
};

const INCLUI = [
  "Captura ilimitada: foto, áudio, print, PDF, e-mail e texto",
  "Avisos por push, e-mail e WhatsApp",
  "Calendário e caixa de entrada do que ainda não tem data",
  "Cancele quando quiser, sem multa nem ligação",
];

/**
 * O plano atual, na cara.
 *
 * Quem paga por algo todo mês tem direito de ver, sem procurar: qual é o plano,
 * quanto custa, em que situação está e até quando vale. Só depois disso vêm os
 * botões de assinar ou cancelar.
 */
export function PlanoAtual({ acesso, planoId }: { acesso: Acesso; planoId?: string | null }) {
  const situacao = SITUACAO[acesso.status];
  const plano = acharPlano(planoId) ?? (acesso.emTeste ? null : PLANO_PADRAO);
  const ganho = plano ? economia(plano) : null;
  const ate = acesso.validoAte
    ? new Date(acesso.validoAte).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <div className="mt-3 rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-lg font-semibold">{plano ? `NEXO ${plano.nome.toLowerCase()}` : `Teste de ${TESTE_DIAS} dias`}</p>
          <p className="text-sm text-muted">
            {plano
              ? `${brl(plano.preco)} a cada ${plano.meses === 1 ? "mês" : `${plano.meses} meses`} · ${brl(precoPorMes(plano))} por mês`
              : "Grátis, sem cartão. Depois é escolher um plano."}
          </p>
        </div>
        <span className={`text-sm font-medium ${situacao.tom}`}>{situacao.rotulo}</span>
      </div>

      {ganho && ganho.reais > 0 && (
        <p className="mt-2 text-sm text-accent">
          Você economiza {brl(ganho.reais)} por período neste plano ({ganho.porcento}% abaixo do mensal).
        </p>
      )}

      {ate && (
        <p className="mt-3 text-sm">
          {acesso.status === "cancelada"
            ? `Acesso liberado até ${ate} — o período que você já pagou.`
            : acesso.emTeste
              ? `${acesso.liberado ? "Vale" : "Valeu"} até ${ate}.`
              : `${acesso.liberado ? "Renova" : "Venceu"} em ${ate}.`}
        </p>
      )}

      <ul className="mt-4 space-y-1.5">
        {INCLUI.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-muted">
            <span aria-hidden className="text-accent">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
