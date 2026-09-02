import { addDays, parseISO } from "date-fns";

import type { DueNotification, Reminder } from "./types";

/** Hora padrão do aviso quando o lembrete não tem hora marcada. */
export const DEFAULT_NOTIFY_HOUR = 9;
export const TIMEZONE = "America/Sao_Paulo";

/**
 * Instante em que um aviso deve sair, para um lembrete e uma antecedência.
 * Trabalha em horário de São Paulo e converte para UTC no fim.
 */
export function notifyAt(reminder: Reminder, lead: number): Date {
  const day = addDays(parseISO(reminder.due_date), -lead);
  const [hour, minute] =
    lead === 0 && reminder.due_time
      ? reminder.due_time.split(":").map(Number)
      : [DEFAULT_NOTIFY_HOUR, 0];
  return zonedToUtc(day, hour, minute ?? 0);
}

/** Constrói o UTC correspondente a uma data/hora local de São Paulo. */
function zonedToUtc(day: Date, hour: number, minute: number): Date {
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  // Primeiro chute em UTC; depois corrige pelo offset real daquele instante.
  const guess = Date.UTC(y, m, d, hour, minute);
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
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** Filtra, entre lembretes pendentes, os avisos que já venceram e não saíram. */
export function pendingNotifications(reminders: Reminder[], now: Date): DueNotification[] {
  const out: DueNotification[] = [];
  for (const reminder of reminders) {
    if (reminder.status !== "pendente") continue;
    for (const lead of reminder.lead_days) {
      if (reminder.notified_leads.includes(lead)) continue;
      if (notifyAt(reminder, lead) <= now) out.push({ reminder, lead });
    }
  }
  return out;
}

/**
 * Antecedência que já passou não vira aviso — mas o lembrete não pode ficar
 * mudo, então garantimos pelo menos o aviso do próprio dia.
 */
export function usableLeads(dueDate: string, leads: number[], today: string): number[] {
  const daysAhead = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  const kept = [...new Set(leads)].filter((lead) => lead <= daysAhead).sort((a, b) => b - a);
  return kept.length > 0 ? kept : [0];
}
