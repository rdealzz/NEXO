import Link from "next/link";

const EXEMPLOS = [
  {
    entrada: "Foto de um boleto",
    saida: "Vence 15/09. Te aviso dia 12 e no dia.",
  },
  {
    entrada: "E-mail: “sua garantia termina em 30 dias”",
    saida: "Aviso 7 dias antes de acabar a garantia.",
  },
  {
    entrada: "Áudio do mecânico: “troca o óleo daqui 6 meses”",
    saida: "Lembrete criado para 02/03/2027.",
  },
  {
    entrada: "Print do WhatsApp da sua mãe",
    saida: "Marcar médico — quinta, 9h.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 sm:py-20">
      <p className="text-sm font-semibold tracking-tight text-accent">NEXO</p>

      <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Você não precisa lembrar.
        <br />
        Só precisa mandar pra cá.
      </h1>

      <p className="mt-5 max-w-xl text-lg text-muted">
        Uma foto, um áudio, um print, um PDF, um e-mail encaminhado. O NEXO lê, entende o que precisa acontecer e
        avisa você na hora certa. Sem você cadastrar tarefa nenhuma.
      </p>

      <Link
        href="/inbox"
        className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background"
      >
        Jogar a primeira coisa aqui
      </Link>

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
          Você manda a nota da geladeira. Ele guarda o fim da garantia — e depois pergunta se quer lembrete do filtro
          a cada 6 meses. Mandou o documento do carro? Ele já conhece IPVA, licenciamento, seguro, revisão e pneus.
        </p>
        <p className="mt-3 text-sm text-muted">
          Você não precisa pensar “o que eu preciso lembrar?”. Essa parte é com ele.
        </p>
      </section>

      <footer className="mt-16 text-sm text-muted">
        <Link href="/inbox" className="underline underline-offset-4 hover:text-foreground">
          Abrir minha caixa
        </Link>
      </footer>
    </main>
  );
}
