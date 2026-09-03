import { RodapeLegal } from "@/components/legal/rodape";
import { BotaoLink } from "@/components/ui/button";
import HelixChronoMatrix from "@/components/ui/helix-chrono-matrix";
import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema } from "@/components/ui/tema";
import { brl, economia, PLANOS, precoPorMes, TESTE_DIAS } from "@/lib/pricing";

/* Três, e não cinco: a lista existe para provar o mecanismo, não para esgotar
   os casos. Quem entendeu no primeiro exemplo já rolou a tela. */
const EXEMPLOS = [
  { entrada: "Foto de um boleto", saida: "Vence 10/09 — aviso dia 7 e no dia." },
  { entrada: "Foto da nota fiscal da TV", saida: "Garantia até 02/09/2027 — aviso 30 dias antes." },
  { entrada: "Áudio: “troca o óleo daqui 6 meses”", saida: "Lembrete em 02/03/2027." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* A malha fica atrás da marca e dos botões, desenhada direto sobre o fundo
          da página: o herói é a mesma cor do resto do app. O degradê no rodapé
          apaga os fios aos poucos, sem emenda. */}
      <section className="relative isolate min-h-[30rem] overflow-hidden bg-background sm:min-h-[34rem]">
        {/* z-0 fecha o empilhamento da malha aqui dentro — a camada interna dela
            é z-20 e passaria por cima dos botões. */}
        <div className="malha absolute inset-0 z-0">
          <HelixChronoMatrix headline="" className="[&_header]:hidden" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

        {/* O conteúdo não captura o mouse: assim a malha continua reagindo ao
            movimento em todo o herói, e só os controles recebem o clique. */}
        <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-2xl flex-col px-5 py-8 [&_a]:pointer-events-auto [&_button]:pointer-events-auto sm:py-14">
          <header className="flex items-center justify-between gap-4">
            <MarcaNexo simbolo="size-9" wordmark="h-4" className="text-foreground" />
            <AlternadorTema />
          </header>

          <h1 className="mt-12 text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:mt-14 sm:text-6xl">
            Joga aqui.
            <br />
            Eu lembro.
          </h1>

          <p className="mt-5 max-w-sm text-lg leading-snug text-muted">
            Mande a foto, o áudio ou o print. O NEXO entende o que precisa acontecer e avisa na hora certa. Você não
            cadastra tarefa nenhuma.
          </p>

          {/* `w-full sm:w-auto` em vez de `block`: a classe .btn--block fica fora
              das camadas do Tailwind e venceria o `sm:w-auto`, deixando os dois
              botões esticados também no desktop. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BotaoLink href="/onboarding" variant="primary" size="lg" className="w-full sm:w-auto">
              Testar {TESTE_DIAS} dias grátis
            </BotaoLink>
            <BotaoLink href="/entrar" variant="surface" size="lg" className="w-full sm:w-auto">
              Entrar
            </BotaoLink>
          </div>
          <p className="mt-3 text-sm text-muted">Sem cartão para testar.</p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-2xl px-5 pb-16">
        <section className="mt-12 sm:mt-16">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">O que ele faz</h2>
          <ul className="cartao entra-em-cascata mt-3 divide-y divide-line overflow-hidden">
            {EXEMPLOS.map((exemplo) => (
              <li key={exemplo.entrada} className="grid gap-1 p-4 sm:grid-cols-2 sm:gap-4">
                <p className="text-sm text-muted">{exemplo.entrada}</p>
                <p className="text-sm font-medium">{exemplo.saida}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-base leading-relaxed">
            Todo aplicativo de tarefa começa em <span className="text-muted">“crie uma tarefa”</span>. O NEXO começa
            em <span className="font-medium">“joga aqui”</span> — transformar aquilo em compromisso é problema dele.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Quanto custa</h2>
          <ul className="entra-em-cascata mt-3 grid gap-3 sm:grid-cols-3">
            {PLANOS.map((plano) => {
              const ganho = economia(plano);
              return (
                <li key={plano.id} className="peca cartao p-4">
                  <p className="text-sm font-semibold">{plano.nome}</p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-semibold tracking-tight">{brl(precoPorMes(plano))}</span>
                    <span className="text-xs text-muted">/mês</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {plano.meses === 1 ? "cobrado todo mês" : `${brl(plano.preco)} de uma vez`}
                  </p>
                  {ganho.reais > 0 && (
                    <p className="mt-2 text-xs font-semibold text-accent">
                      −{ganho.porcento}% · economize {brl(ganho.reais)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Um boleto pago com atraso já custa mais que um mês. Cancele quando quiser, sem fidelidade.
          </p>
          <BotaoLink href="/onboarding" variant="primary" size="lg" className="mt-5" block>
            Começar agora
          </BotaoLink>
        </section>

        <p className="mt-12 text-center text-base font-medium">Pensou → mandou → esqueceu → NEXO lembra.</p>

        <RodapeLegal />
      </div>
    </main>
  );
}
