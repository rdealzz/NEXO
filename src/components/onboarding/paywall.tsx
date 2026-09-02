import { BotaoLink } from "@/components/ui/button";
import { brl, brlRedondo, PLANO, PRECO_ANUAL } from "@/lib/pricing";

const INCLUI = [
  "Captura ilimitada: foto, print, PDF, áudio, e-mail encaminhado ou texto",
  "Leitura automática de boletos, notas fiscais, garantias e documentos",
  "Avisos com a antecedência que você quiser — de 10 minutos a 30 dias antes",
  "Lembretes proativos: revisão, filtro, licenciamento, fim de garantia",
  "Entrada por WhatsApp e por e-mail, sem abrir o app",
  "Seus documentos em bucket privado. Seus dados não treinam nenhuma IA",
];

/**
 * O paywall só aparece depois da conta de ROI — a pessoa chega aqui já sabendo
 * quanto o esquecimento custa a ela.
 */
export function Paywall({ economia }: { economia: number }) {
  const paga = economia >= PRECO_ANUAL;

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      {paga && (
        <p className="mb-4 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          Pelo que você marcou, o NEXO se paga {(economia / PRECO_ANUAL).toFixed(1).replace(".", ",")}× no ano
        </p>
      )}

      <h2 className="text-2xl font-semibold tracking-tight">Um plano. Sem pegadinha.</h2>

      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-5xl font-semibold tracking-tight">{brl(PLANO.precoMensal)}</span>
        <span className="text-muted">/mês</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {brlRedondo(PRECO_ANUAL)} por ano — menos que {paga ? "um" : "uma"}{" "}
        {paga ? "único esquecimento da lista anterior" : "consulta perdida"}. Cancele quando quiser, sem fidelidade.
      </p>

      <ul className="mt-6 space-y-2.5">
        {INCLUI.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-snug">
            <span aria-hidden className="mt-0.5 shrink-0 font-semibold text-accent">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-7 space-y-3">
        <BotaoLink href={`/entrar?plano=${PLANO.id}`} variant="primary" size="lg" block>
          Assinar por {brl(PLANO.precoMensal)}/mês
        </BotaoLink>
        <BotaoLink href="/inbox" variant="ghost" block>
          Quero testar antes de assinar
        </BotaoLink>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Cobrança mensal no cartão. Cancelamento em um clique, dentro do app.
      </p>
    </section>
  );
}
