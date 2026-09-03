import { RodapeLegal } from "@/components/legal/rodape";
import { BotaoLink } from "@/components/ui/button";
import HelixChronoMatrix from "@/components/ui/helix-chrono-matrix";
import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema } from "@/components/ui/tema";
import { brl, PLANO } from "@/lib/pricing";

const EXEMPLOS = [
  { entrada: "Foto da nota fiscal da TV", saida: "Garantia até 02/09/2027. Aviso 30 dias antes?" },
  { entrada: "Foto de um boleto", saida: "Vence 10/09. Aviso dia 7 e no dia." },
  { entrada: "Áudio do mecânico: “troca o óleo daqui 6 meses”", saida: "Lembrete criado para 02/03/2027." },
  { entrada: "Print do WhatsApp da sua mãe", saida: "Marcar médico — quinta, 9h." },
  { entrada: "“Comprar tinta para casa”", saida: "Sem data: foi para a caixa de entrada." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* A malha fica atrás da marca e dos botões, desenhada direto sobre o fundo
          da página: o herói é a mesma cor do resto do app. O degradê no rodapé
          apaga os fios aos poucos, sem emenda. */}
      <section className="relative isolate min-h-[34rem] overflow-hidden bg-background">
        {/* z-0 fecha o empilhamento da malha aqui dentro — a camada interna dela
            é z-20 e passaria por cima dos botões. */}
        <div className="malha absolute inset-0 z-0">
          <HelixChronoMatrix headline="" className="[&_header]:hidden" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

        {/* O conteúdo não captura o mouse: assim a malha continua reagindo ao
            movimento em todo o herói, e só os controles recebem o clique. */}
        <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-2xl flex-col px-4 py-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto sm:py-14">
          <header className="flex items-center justify-between gap-4">
            <MarcaNexo simbolo="size-9" wordmark="h-4" className="text-foreground" />
            <AlternadorTema />
          </header>

          <h1 className="mt-10 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Joga aqui.
            <br />
            Eu lembro.
          </h1>

          <p className="mt-5 max-w-md text-lg text-muted">
            Uma foto, um áudio, um print, um PDF, um e-mail encaminhado, ou só uma frase. O NEXO lê, entende o
            que precisa acontecer e avisa você na hora certa. Você não cadastra tarefa nenhuma.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <BotaoLink href="/onboarding" variant="primary" size="lg">
              Começar
            </BotaoLink>
            <BotaoLink href="/entrar" variant="surface" size="lg">
              Entrar
            </BotaoLink>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-2xl px-4 pb-14">

      <section className="mt-16">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Como funciona na prática</h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {EXEMPLOS.map((exemplo) => (
            <li key={exemplo.entrada} className="grid gap-1 p-4 sm:grid-cols-2 sm:gap-4">
              <p className="text-sm text-muted">{exemplo.entrada}</p>
              <p className="text-sm font-medium">{exemplo.saida}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          A diferença em relação a tudo que você já tem
        </h2>
        <p className="mt-4 text-lg leading-relaxed">
          Google Agenda, Lembretes, Todoist, To&nbsp;Do — todos partem de{" "}
          <span className="text-muted">“crie uma tarefa”</span>. O NEXO parte de{" "}
          <span className="font-medium">“joga aqui”</span>. A transformação em compromisso é problema dele.
        </p>
      </section>

      <section className="mt-12 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          E ele lembra o que você normalmente esquece
        </h2>
        <p className="mt-3 leading-relaxed">
          Você fotografa a nota da geladeira. Ele guarda o fim da garantia — e depois pergunta se quer lembrete do
          filtro a cada 6 meses. Mandou o documento do carro? Ele já conhece revisão, seguro, licenciamento e pneus.
        </p>
        <p className="mt-3 text-sm text-muted">
          Você não precisa pensar “o que eu preciso lembrar?”. Essa parte é com ele.
        </p>
      </section>

      <section className="mt-12 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Ele se paga sozinho</h2>
        <p className="mt-3 leading-relaxed">
          Um boleto pago com atraso, uma consulta esquecida, uma garantia que venceu sem você usar. Esquecer não é
          de graça — só não vem com recibo. O NEXO custa {brl(PLANO.precoMensal)} por mês.
        </p>
        <BotaoLink href="/onboarding" variant="soft" className="mt-4">
          Fazer a conta do meu caso
        </BotaoLink>
      </section>

      <p className="mt-14 text-center text-lg font-medium">Pensou → mandou → esqueceu → NEXO lembra.</p>

        <RodapeLegal />
      </div>
    </main>
  );
}
