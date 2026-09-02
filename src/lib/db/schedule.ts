import { addDays, addMonths, addWeeks, addYears, format, parseISO, setDate, setDay } from "date-fns";

import type { Reminder } from "./types";

/** Hora padrão do compromisso quando a pessoa não marcou hora. */
export const DEFAULT_HOUR = 9;
export const TIMEZONE = "America/Sao_Paulo";

type Agendavel = Pick<Reminder, "due_date" | "due_time">;

/**
 * O instante do compromisso em si, em UTC. null quando o item está na caixa
 * de entrada (sem data) — aí não há nada para agendar.
 */
export function dueInstant(reminder: Agendavel): Date | null {
  if (!reminder.due_date) return null;
  const day = parseISO(reminder.due_date);
  if (Number.isNaN(day.getTime())) return null;
  const [hour, minute] = reminder.due_time ? reminder.due_time.split(":").map(Number) : [DEFAULT_HOUR, 0];
  return zonedToUtc(day, hour, minute ?? 0);
}

/** Instante em que o aviso deve sair: o compromisso menos a antecedência. */
export function notifyAt(reminder: Agendavel, leadMinutes: number): Date | null {
  const due = dueInstant(reminder);
  return due ? new Date(due.getTime() - leadMinutes * 60_000) : null;
}

/** Constrói o UTC correspondente a uma data/hora local de São Paulo. */
function zonedToUtc(day: Date, hour: number, minute: number): Date {
  const guess = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
  // Primeiro chute em UTC; depois corrige pelo offset real daquele instante.
  const offset = offsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000);
}

function offsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-03:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(raw);
  if (!match) return -180;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

export type PlannedNotification = { lead_minutes: number; notify_at: string };

/**
 * Os avisos que um lembrete deve gerar. É chamado toda vez que o lembrete
 * nasce ou muda de data — as linhas de aviso são derivadas, nunca editadas
 * à mão. Item sem data não gera aviso nenhum.
 */
export function plannedNotifications(
  reminder: Pick<Reminder, "due_date" | "due_time" | "lead_minutes">,
): PlannedNotification[] {
  if (!reminder.due_date) return [];
  return [...new Set(reminder.lead_minutes)]
    .sort((a, b) => b - a)
    .flatMap((lead) => {
      const at = notifyAt(reminder, lead);
      return at ? [{ lead_minutes: lead, notify_at: at.toISOString() }] : [];
    });
}

/**
 * Antecedência que já passou não vira aviso — mas o lembrete não pode ficar
 * mudo, então garantimos o aviso do próprio compromisso.
 */
export function usableLeads(reminder: Agendavel, leads: number[], now: Date): number[] {
  const due = dueInstant(reminder);
  // Sem data não há o que podar — a intenção fica guardada para quando a data
  // chegar, senão o item sairia da caixa de entrada já mudo.
  if (!due) return [...new Set(leads)].sort((a, b) => b - a);
  const kept = [...new Set(leads)]
    .filter((lead) => due.getTime() - lead * 60_000 > now.getTime())
    .sort((a, b) => b - a);
  return kept.length > 0 ? kept : [0];
}

/**
 * Próxima ocorrência de um lembrete recorrente. As regras são as que o modelo
 * sabe escrever: "mensal:5" (todo dia 5), "semanal:1" (toda segunda),
 * "dias|semanas|meses|anos:N" (a cada N).
 */
export function nextOccurrence(dueDate: string, rule: string): string | null {
  const [kind, rawValue] = rule.split(":");
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) return null;

  const current = parseISO(dueDate);
  if (Number.isNaN(current.getTime())) return null;

  let next: Date;
  switch (kind) {
    case "dias":
      next = addDays(current, value);
      break;
    case "semanas":
      next = addWeeks(current, value);
      break;
    case "meses":
      next = addMonths(current, value);
      break;
    case "anos":
      next = addYears(current, value);
      break;
    case "mensal":
      // Todo dia N: anda um mês e fixa o dia.
      next = setDate(addMonths(current, 1), Math.min(Math.max(value, 1), 28));
      break;
    case "semanal": {
      // Toda <dia da semana>: o próximo depois do atual.
      next = setDay(addDays(current, 1), Math.min(value, 6), { weekStartsOn: 0 });
      if (next <= current) next = addWeeks(next, 1);
      break;
    }
    default:
      return null;
  }
  return format(next, "yyyy-MM-dd");
}
