"use client";

import { Bell, CalendarClock, FileWarning, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Botao } from "@/components/ui/button";
import DisplayCards from "@/components/ui/display-cards";
import type { Reminder } from "@/lib/db";
import { CATEGORY_LABEL, daysUntil, humanDate } from "@/lib/format";

/**
 * O que está te esperando, em três cartas.
 *
 * O painel abre sozinho na primeira visita do dia e pelo sininho a qualquer
 * momento. O empilhamento não é enfeite: mostra que existe mais de uma coisa
 * sem transformar a abertura do app numa lista — quem quiser a lista inteira
 * toca em "Ver tudo".
 */
export function PainelNotificacoes({ reminders }: { reminders: Reminder[] }) {
  const [aberto, setAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  const urgentes = ordenarPorUrgencia(reminders);
  const pendentes = urgentes.length;

  // Abre uma vez por dia, na primeira visita. Abrir a cada navegação viraria
  // obstáculo em vez de aviso.
  useEffect(() => {
    let deveAbrir = false;
    try {
      deveAbrir = localStorage.getItem(CHAVE_VISTO) !== hoje();
    } catch {
      deveAbrir = false;
    }
    // Só o navegador sabe se o painel já foi visto hoje; o servidor não tem
    // como saber, então a decisão só pode acontecer depois de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontado(true);
    if (deveAbrir && urgentes.length > 0) setAberto(true);
    // Só na montagem: isto é a "abertura do app".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (aberto && !elemento.open) elemento.showModal();
    if (!aberto && elemento.open) elemento.close();
  }, [aberto]);

  function fechar() {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE_VISTO, hoje());
    } catch {
      // Sem armazenamento o painel reabre na próxima visita. Chato, não grave.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={pendentes > 0 ? `Ver ${pendentes} avisos` : "Ver avisos"}
        className="btn3d btn3d--surface btn3d--icon relative"
      >
        <Bell className="size-[1.15em]" aria-hidden />
        {montado && pendentes > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
            {pendentes > 9 ? "9+" : pendentes}
          </span>
        )}
      </button>

      <dialog
        ref={dialogo}
        onClose={fechar}
        onClick={(evento) => {
          if (evento.target === dialogo.current) fechar();
        }}
        aria-labelledby="avisos-titulo"
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-6 text-foreground backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <header className="flex items-start gap-4">
          <div className="min-w-0">
            <h2 id="avisos-titulo" className="text-xl font-semibold tracking-tight">
              {pendentes === 0
                ? "Nada te esperando"
                : pendentes === 1
                  ? "Uma coisa te esperando"
                  : `${pendentes} coisas te esperando`}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {pendentes === 0
                ? "Você está em dia. Joga aqui o que não pode esquecer."
                : "O mais urgente na frente. Passe o mouse para ver as de trás."}
            </p>
          </div>
          <Botao
            size="icon"
            variant="ghost"
            onClick={fechar}
            aria-label="Fechar e ir para o app"
            className="ml-auto shrink-0"
          >
            ✕
          </Botao>
        </header>

        {pendentes > 0 && (
          <div className="mb-14 mt-8 flex justify-center overflow-hidden">
            <DisplayCards cards={urgentes.slice(0, 3).map(carta)} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/inbox" onClick={fechar} className="btn3d btn3d--primary btn3d--block">
            {pendentes === 0 ? "Ir para o app" : "Ver tudo"}
          </Link>
          <Link href="/calendario" onClick={fechar} className="btn3d btn3d--ghost btn3d--block">
            Ver no calendário
          </Link>
        </div>
      </dialog>
    </>
  );
}

const CHAVE_VISTO = "nexo:avisos-vistos";

function hoje(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Atrasado primeiro, depois o mais próximo. Sem data não entra: não urge. */
function ordenarPorUrgencia(reminders: Reminder[]): Reminder[] {
  return reminders
    .filter((r) => r.status === "pendente" && r.due_date && daysUntil(r.due_date) <= 7)
    .sort((a, b) => daysUntil(a.due_date!) - daysUntil(b.due_date!));
}

const ESTILO = [
  "[grid-area:stack] hover:-translate-y-10 before:absolute before:left-0 before:top-0 before:h-[100%] before:w-[100%] before:rounded-xl before:bg-background/60 before:outline-1 before:outline-border before:transition-opacity before:duration-700 before:content-[''] hover:before:opacity-0",
  "[grid-area:stack] translate-x-10 translate-y-8 hover:-translate-y-1 before:absolute before:left-0 before:top-0 before:h-[100%] before:w-[100%] before:rounded-xl before:bg-background/60 before:outline-1 before:outline-border before:transition-opacity before:duration-700 before:content-[''] hover:before:opacity-0",
  "[grid-area:stack] translate-x-20 translate-y-16 hover:translate-y-10",
];

/** Um lembrete vira carta. As cores saem da paleta do NEXO, não do azul padrão. */
function carta(reminder: Reminder, indice: number) {
  const dias = daysUntil(reminder.due_date!);
  const atrasado = dias < 0;
  const ehHoje = dias === 0;

  return {
    className: `${ESTILO[indice]} w-[19rem] max-w-full border-line bg-surface hover:bg-surface`,
    icon: iconePara(reminder, atrasado),
    iconClassName: "text-accent",
    titleClassName: atrasado ? "text-danger" : ehHoje ? "text-warning" : "text-accent",
    title: atrasado ? "Atrasado" : ehHoje ? "Hoje" : CATEGORY_LABEL[reminder.category],
    description: reminder.title,
    date: `${humanDate(reminder.due_date!)}${reminder.due_time ? ` · ${reminder.due_time}` : ""}`,
  };
}

function iconePara(reminder: Reminder, atrasado: boolean) {
  const classe = "size-4 text-white";
  if (atrasado) return <FileWarning className={classe} aria-hidden />;
  if (reminder.category === "garantia") return <ShieldCheck className={classe} aria-hidden />;
  return <CalendarClock className={classe} aria-hidden />;
}
