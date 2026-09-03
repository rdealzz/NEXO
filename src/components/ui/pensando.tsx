/**
 * A IA pensando, à vista.
 *
 * Um spinner diz "espere". Isto diz "estou lendo": aparece o esqueleto exato do
 * cartão de revisão que vai chegar — mesmo tamanho, mesmas linhas, mesmas
 * posições — com uma luz percorrendo cada bloco. Quando a resposta chega, ela
 * ocupa o lugar que já estava desenhado, e a tela não pula.
 *
 * Os três títulos mudam com o tempo porque a leitura tem etapas de verdade: ler
 * o material, achar as datas, montar os lembretes. Dizer em que etapa está é
 * mais honesto — e mais curto de esperar — do que "carregando".
 */
export function Pensando() {
  return (
    <section
      className="cartao p-4 sm:p-5"
      role="status"
      aria-live="polite"
      aria-label="Lendo o que você mandou"
    >
      <div className="flex items-center gap-2">
        <span className="respira size-2 rounded-full bg-accent" />
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          <span className="etapas">
            <span>Lendo o que você mandou</span>
            <span>Procurando datas e valores</span>
            <span>Montando os lembretes</span>
          </span>
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <Bloco className="h-5 w-3/4" />
        <Bloco className="h-3.5 w-2/5" />
      </div>

      <ul className="mt-4 space-y-2">
        {[0, 1].map((i) => (
          <li key={i} className="rounded-xl border border-line p-3">
            <div className="flex items-start gap-3">
              <Bloco className="mt-0.5 size-5 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Bloco className="h-4 w-4/5" />
                <div className="flex gap-2">
                  <Bloco className="h-6 w-24 rounded-md" />
                  <Bloco className="h-6 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Bloco className="mt-4 h-11 w-full rounded-xl" />
    </section>
  );
}

/** Um retângulo de espera com a luz atravessando. */
function Bloco({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`bloco-esperando block rounded ${className}`} />;
}
