"use client";

import type { Reminder } from "@/lib/db";
import { CATEGORY_LABEL, daysUntil, humanDate, humanLead, urgencyColor } from "@/lib/format";

type Props = {
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  onDelete: (id: string) => void;
};

const GROUPS = [
  { label: "Atrasado", test: (d: number) => d < 0 },
  { label: "Hoje", test: (d: number) => d === 0 },
  { label: "Esta semana", test: (d: number) => d > 0 && d <= 7 },
  { label: "Este mês", test: (d: number) => d > 7 && d <= 31 },
  { label: "Mais para frente", test: (d: number) => d > 31 },
] as const;

export function ReminderList({ reminders, onComplete, onSnooze, onDelete }: Props) {
  const pending = reminders.filter((r) => r.status === "pendente");

  if (pending.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
        Nada na sua frente. Quando chegar algo que você não quer esquecer, joga aqui em cima.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const items = pending.filter((r) => group.test(daysUntil(r.due_date)));
        if (items.length === 0) return null;
        return (
          <section key={group.label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
            <ul className="space-y-2">
              {items.map((reminder) => (
                <li
                  key={reminder.id}
                  className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-3"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ background: urgencyColor(reminder.due_date) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{reminder.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {humanDate(reminder.due_date)}
                      {reminder.due_time ? ` às ${reminder.due_time}` : ""} · {CATEGORY_LABEL[reminder.category]} ·
                      aviso {humanLead(reminder.lead_days)}
                      {reminder.repeat_months ? ` · repete a cada ${reminder.repeat_months} meses` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
                      <button type="button" onClick={() => onComplete(reminder.id)} className="hover:text-accent">
                        concluir
                      </button>
                      <button type="button" onClick={() => onSnooze(reminder.id, 1)} className="hover:text-foreground">
                        adiar 1 dia
                      </button>
                      <button type="button" onClick={() => onSnooze(reminder.id, 7)} className="hover:text-foreground">
                        adiar 1 semana
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(reminder.id)}
                        className="hover:text-[#e0483a]"
                      >
                        remover
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
