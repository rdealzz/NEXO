"use client";

import { useRef, useState } from "react";

import { Botao } from "@/components/ui/button";
import type { Reminder } from "@/lib/db";
import { CATEGORY_LABEL, daysUntil, humanDate, humanLead, humanRepeat, urgencyColor } from "@/lib/format";
import { vibrar } from "@/lib/tato";

export type Aba = "hoje" | "proximos" | "caixa";

type Props = {
  aba: Aba;
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
  onSchedule: (id: string, dueDate: string) => void;
  onDelete: (id: string) => void;
};

const ADIAR = [
  { label: "10 min", minutes: 10 },
  { label: "1 hora", minutes: 60 },
  { label: "amanhã", minutes: 1440 },
  { label: "1 semana", minutes: 10080 },
];

/** Os atalhos que a spec pede para item sem data. */
export const QUANDO = [
  { label: "Hoje", days: 0 },
  { label: "Amanhã", days: 1 },
  { label: "Em 3 dias", days: 3 },
  { label: "Próxima semana", days: 7 },
];

function plusDays(days: number): string {
  const base = new Date(`${new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

const VAZIO: Record<Aba, string> = {
  hoje: "Nada para hoje. Aproveita.",
  proximos: "Nada marcado para frente ainda.",
  caixa: "A caixa está limpa. O que você jogar aqui sem data aparece nesta aba.",
};

export function ReminderList({ aba, reminders, onComplete, onSnooze, onSchedule, onDelete }: Props) {
  const pendentes = reminders.filter((r) => r.status === "pendente");
  const visiveis = pendentes.filter((r) => {
    if (aba === "caixa") return r.due_date === null;
    if (r.due_date === null) return false;
    return aba === "hoje" ? daysUntil(r.due_date) <= 0 : daysUntil(r.due_date) > 0;
  });

  if (visiveis.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
        {VAZIO[aba]}
      </p>
    );
  }

  return (
    <ul className="entra-em-cascata space-y-2">
      {visiveis.map((reminder) => (
        <Item
          key={reminder.id}
          reminder={reminder}
          onComplete={onComplete}
          onSnooze={onSnooze}
          onSchedule={onSchedule}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function Item({
  reminder,
  onComplete,
  onSnooze,
  onSchedule,
  onDelete,
}: Omit<Props, "aba" | "reminders"> & { reminder: Reminder }) {
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [arrasto, setArrasto] = useState(0);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const repete = humanRepeat(reminder.repeat_rule);

  /*
   * Concluir tem recompensa: o marcador vira um check desenhado, o cartão
   * encolhe e dissolve, e só então ele sai da lista. Sumir na hora é mais
   * rápido — e é justamente por isso que não parece que algo foi feito.
   */
  function concluir() {
    if (saindo) return;
    vibrar("sucesso");
    setSaindo(true);
    setTimeout(() => onComplete(reminder.id), 320);
  }

  /*
   * O gesto do celular: arrastar para a direita conclui, para a esquerda
   * adia um dia. O cartão acompanha o dedo, então a pessoa vê o que vai
   * acontecer antes de soltar — e desistir é só devolver o dedo ao lugar.
   *
   * O eixo é decidido no primeiro movimento: se a pessoa está rolando a
   * página, o cartão não rouba o gesto.
   */
  const LIMITE = 96;

  function tocarInicio(evento: React.PointerEvent) {
    if (evento.pointerType === "mouse") return;
    inicio.current = { x: evento.clientX, y: evento.clientY };
  }

  function tocarMove(evento: React.PointerEvent) {
    if (!inicio.current) return;
    const dx = evento.clientX - inicio.current.x;
    const dy = evento.clientY - inicio.current.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      inicio.current = null; // É rolagem, não gesto.
      setArrasto(0);
      return;
    }
    setArrasto(dx);
  }

  function tocarFim() {
    if (!inicio.current) return;
    inicio.current = null;
    const percorrido = arrasto;
    setArrasto(0);
    if (percorrido > LIMITE) concluir();
    else if (percorrido < -LIMITE) {
      vibrar("toque");
      onSnooze(reminder.id, 1440);
    }
  }

  const passouDoLimite = Math.abs(arrasto) > LIMITE;

  return (
    <li
      className={`peca relative overflow-hidden rounded-xl border border-line bg-surface p-3 ${
        saindo ? "dissolvendo" : ""
      }`}
      onPointerDown={tocarInicio}
      onPointerMove={tocarMove}
      onPointerUp={tocarFim}
      onPointerCancel={tocarFim}
      style={{
        transform: arrasto ? `translate3d(${arrasto}px, 0, 0)` : undefined,
        transition: arrasto ? "none" : undefined,
      }}
    >
      {/* O que o gesto vai fazer, escrito atrás do cartão enquanto ele desliza. */}
      {arrasto !== 0 && (
        <span
          aria-hidden
          className={`absolute inset-y-0 flex items-center px-4 text-xs font-semibold ${
            arrasto > 0 ? "left-0 text-accent" : "right-0 text-muted"
          } ${passouDoLimite ? "opacity-100" : "opacity-50"}`}
          style={{ transform: `translate3d(${-arrasto}px, 0, 0)` }}
        >
          {arrasto > 0 ? "concluir" : "adiar 1 dia"}
        </span>
      )}

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={concluir}
          aria-label={`Concluir ${reminder.title}`}
          // `alvo-toque` estica a área clicável para além do desenho no celular:
          // o ponto continua com 20px, mas o dedo acerta uma área de 44px.
          className="dot3d alvo-toque mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center border-2 transition-colors hover:border-accent"
          style={{ borderColor: saindo ? "var(--accent)" : urgencyColor(reminder.due_date) }}
        >
          {saindo && <Check />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{reminder.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {reminder.due_date ? (
              <>
                {humanDate(reminder.due_date)}
                {reminder.due_time ? ` às ${reminder.due_time}` : ""} · aviso {humanLead(reminder.lead_minutes)}
              </>
            ) : (
              "sem data"
            )}
            {repete ? ` · ${repete}` : ""} · {CATEGORY_LABEL[reminder.category]}
          </p>

          {reminder.due_date === null ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="py-1 text-xs text-muted">Quando?</span>
              {QUANDO.map((opcao) => (
                <Chip key={opcao.label} onClick={() => onSchedule(reminder.id, plusDays(opcao.days))}>
                  {opcao.label}
                </Chip>
              ))}
              <label className="btn btn--surface btn--chip cursor-pointer">
                escolher
                <input
                  type="date"
                  className="ml-1 bg-transparent text-xs outline-none"
                  onChange={(event) => event.target.value && onSchedule(reminder.id, event.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <Botao size="chip" variant="ghost" onClick={() => setAberto((v) => !v)} aria-pressed={aberto}>
                {aberto ? "fechar" : "adiar"}
              </Botao>
              {aberto && (
                <>
                  {ADIAR.map((opcao) => (
                    <Chip key={opcao.label} onClick={() => onSnooze(reminder.id, opcao.minutes)}>
                      {opcao.label}
                    </Chip>
                  ))}
                  <Botao size="chip" variant="danger" onClick={() => onDelete(reminder.id)}>
                    excluir
                  </Botao>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** O check é desenhado, não aparece: o traço corre em ~200ms. */
function Check() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="risca"
      />
    </svg>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Botao size="chip" variant="surface" onClick={onClick}>
      {children}
    </Botao>
  );
}
