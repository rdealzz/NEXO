"use client";

import Link from "next/link";
import { useState } from "react";

import { Paywall } from "@/components/onboarding/paywall";
import { RoiCalculadora } from "@/components/onboarding/roi-calculadora";
import { Botao } from "@/components/ui/button";
import { MarcaNexo } from "@/components/ui/logo";
import { AlternadorTema } from "@/components/ui/tema";
import { totalPerdido, vezesPadrao } from "@/lib/onboarding/roi";

const EXEMPLOS = [
  { icone: "🧾", entrada: "Foto de um boleto", saida: "Energia, R$ 187,42, vence 10/09. Aviso dia 7 e no dia." },
  { icone: "📺", entrada: "Nota fiscal da TV", saida: "Garantia até 02/09/2027. Aviso 30 dias antes." },
  { icone: "🎙️", entrada: "“Troca o óleo daqui 6 meses”", saida: "Lembrete criado para 02/03/2027." },
  { icone: "💬", entrada: "Print do WhatsApp da sua mãe", saida: "Marcar médico — quinta, 9h." },
];

const PASSOS = [
  {
    numero: "1",
    titulo: "Você joga aqui",
    texto: "Foto, print, PDF, áudio ou uma frase solta. Nada de formulário, nada de campo obrigatório.",
  },
  {
    numero: "2",
    titulo: "Ele lê e entende",
    texto: "Valor, vencimento, garantia, horário. E o que costuma vir junto: revisão, filtro, licenciamento.",
  },
  {
    numero: "3",
    titulo: "Ele avisa antes",
    texto: "No app, no WhatsApp ou no e-mail — com a antecedência que dá tempo de resolver.",
  },
];

const ETAPAS = ["Boas-vindas", "Como funciona", "A conta", "Plano"];

export function OnboardingFlow({ autenticado = false }: { autenticado?: boolean }) {
  const [etapa, setEtapa] = useState(0);
  const [economia, setEconomia] = useState(() => totalPerdido(vezesPadrao()));

  const ultima = etapa === ETAPAS.length - 1;

  return (
    <div className="w-full">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="NEXO" className="inline-flex">
            <MarcaNexo />
          </Link>
          <span className="flex items-center gap-3">
            {!ultima && (
              <Botao size="chip" variant="ghost" onClick={() => setEtapa(ETAPAS.length - 1)}>
                Pular para o plano
              </Botao>
            )}
            <AlternadorTema />
          </span>
        </div>

        <ol className="mt-4 flex gap-1.5" aria-label="Progresso">
          {ETAPAS.map((nome, indice) => (
            <li
              key={nome}
              aria-current={indice === etapa ? "step" : undefined}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                indice <= etapa ? "bg-accent" : "bg-[var(--border)]"
              }`}
            >
              <span className="sr-only">{nome}</span>
            </li>
          ))}
        </ol>
      </header>

      <div>
        {etapa === 0 && <BoasVindas />}
        {etapa === 1 && <ComoFunciona />}
        {etapa === 2 && (
          <section>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Antes do preço, a conta que ninguém faz.
            </h1>
            <p className="mt-3 text-muted">
              Esquecer não é de graça — só não vem com recibo. Marque o que aconteceu com você nos últimos 12
              meses.
            </p>
            <div className="mt-6">
              <RoiCalculadora onTotal={setEconomia} />
            </div>
          </section>
        )}
        {etapa === 3 && <Paywall economia={economia} autenticado={autenticado} />}
      </div>

      <nav className="mt-8 flex items-center gap-3">
        {etapa > 0 && (
          <Botao variant="ghost" onClick={() => setEtapa((atual) => atual - 1)}>
            Voltar
          </Botao>
        )}
        {!ultima && (
          <Botao variant="primary" size="lg" className="ml-auto" onClick={() => setEtapa((atual) => atual + 1)}>
            {etapa === 2 ? "Ver o plano" : "Continuar"}
          </Botao>
        )}
      </nav>
    </div>
  );
}

function BoasVindas() {
  return (
    <section>
      <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Joga aqui.
        <br />
        Eu lembro.
      </h1>
      <p className="mt-4 text-lg text-muted">
        Você não vai cadastrar tarefa nenhuma. Manda o que não pode esquecer — do jeito que já está no seu
        celular — e o NEXO transforma em compromisso sozinho.
      </p>

      <ul className="mt-7 space-y-2">
        {EXEMPLOS.map((exemplo) => (
          <li
            key={exemplo.entrada}
            className="grid items-center gap-1 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[auto_1fr_1.2fr] sm:gap-4"
          >
            <span aria-hidden className="text-2xl leading-none">
              {exemplo.icone}
            </span>
            <p className="text-sm text-muted">{exemplo.entrada}</p>
            <p className="text-sm font-medium">{exemplo.saida}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComoFunciona() {
  return (
    <section>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">Três coisas acontecem. Nenhuma é sua.</h1>
      <ul className="mt-7 space-y-3">
        {PASSOS.map((passo) => (
          <li key={passo.numero} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {passo.numero}
            </span>
            <div>
              <p className="font-semibold">{passo.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{passo.texto}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-2xl bg-accent-soft p-5 leading-relaxed">
        E ele lembra o que você <strong>nem pensou em pedir</strong>. Mandou a nota da geladeira? Guarda o fim da
        garantia e depois oferece o filtro a cada 6 meses.
      </p>
    </section>
  );
}
