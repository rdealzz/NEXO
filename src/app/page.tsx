import { BotaoLink } from "@/components/ui/button";
import { MarcaNexo } from "@/components/ui/logo";
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
      <MarcaNexo simbolo="size-9" wordmark="h-4" className="text-foreground" />

      <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Joga aqui.
        <br />
        Eu lembro.
      </h1>

      <p className="mt-5 max-w-xl text-lg text-muted">
        Uma foto, um áudio, um print, um PDF, um e-mail encaminhado, ou só uma frase. O NEXO lê, entende o que
        precisa acontecer e avisa você na hora certa. Você não cadastra tarefa nenhuma.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <BotaoLink href="/onboarding" variant="primary" size="lg">
          Começar
        </BotaoLink>
        <BotaoLink href="/entrar" variant="surface" size="lg">
          Entrar
        </BotaoLink>
      </div>

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
    </main>
  );
}
