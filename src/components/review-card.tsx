"use client";

import { useState } from "react";

import { CATEGORY_LABEL, humanDate, humanLead } from "@/lib/format";
import type { FollowUp } from "@/lib/nexo/rules";
import type { CaptureAnalysis } from "@/lib/nexo/schema";

export type ConfirmedDraft = {
  title: string;
  due_date: string;
  due_time: string | null;
  lead_days: number[];
  category: string;
  why: string | null;
  confidence: number | null;
  entity_name: string | null;
  repeat_months: number | null;
  capture_id: string | null;
};

type Row = ConfirmedDraft & { key: string; selected: boolean; pitch: string | null; uncertain: boolean };

type Props = {
  captureId: string;
  analysis: CaptureAnalysis;
  followUps: FollowUp[];
  saving: boolean;
  onConfirm: (drafts: ConfirmedDraft[]) => void;
  onDiscard: () => void;
  onAnswer: (answer: string) => void;
};

function buildRows(captureId: string, analysis: CaptureAnalysis, followUps: FollowUp[]): Row[] {
  const entity = analysis.entity?.name?.trim() || null;

  const extracted: Row[] = analysis.reminders.map((reminder, index) => ({
    key: `r${index}`,
    // O que estava no material vem marcado: é isso que a pessoa mandou.
    selected: true,
    pitch: null,
    uncertain: reminder.confidence < 0.6,
    title: reminder.title,
    due_date: reminder.due_date,
    due_time: reminder.due_time,
    lead_days: reminder.lead_days,
    category: reminder.category,
    why: reminder.why,
    confidence: reminder.confidence,
    entity_name: entity,
    repeat_months: null,
    capture_id: captureId,
  }));

  // O que o NEXO deduziu sozinho começa desmarcado — é oferta, não decisão.
  const derived: Row[] = followUps.map((followUp) => ({
    key: followUp.rule_id,
    selected: false,
    pitch: followUp.pitch,
    uncertain: false,
    title: followUp.title,
    due_date: followUp.due_date,
    due_time: null,
    lead_days: followUp.lead_days,
    category: followUp.category,
    why: followUp.pitch,
    confidence: null,
    entity_name: entity,
    repeat_months: followUp.repeat_months,
    capture_id: captureId,
  }));

  return [...extracted, ...derived];
}

export function ReviewCard({ captureId, analysis, followUps, saving, onConfirm, onDiscard, onAnswer }: Props) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(captureId, analysis, followUps));
  const [answer, setAnswer] = useState("");

  const patch = (key: string, change: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const chosen = rows.filter((row) => row.selected);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="text-base font-medium">{analysis.summary}</p>
          <p className="mt-0.5 text-sm text-muted">
            {CATEGORY_LABEL[analysis.category]}
            {analysis.entity?.name ? ` · ${analysis.entity.name}` : ""}
            {analysis.amount_brl !== null
              ? ` · ${analysis.amount_brl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          className="ml-auto shrink-0 text-sm text-muted hover:text-foreground"
        >
          descartar
        </button>
      </header>

      {analysis.clarification && (
        <div className="mt-4 rounded-xl bg-accent-soft p-3">
          <p className="text-sm">{analysis.clarification}</p>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (answer.trim()) onAnswer(answer.trim());
            }}
          >
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="ex.: dia 20, de manhã"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={!answer.trim() || saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              Responder
            </button>
          </form>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className={`rounded-xl border p-3 transition-colors ${
                row.selected ? "border-accent/50 bg-accent-soft/40" : "border-line"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(event) => patch(row.key, { selected: event.target.checked })}
                  className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                  aria-label={`Criar lembrete: ${row.title}`}
                />
                <div className="min-w-0 flex-1">
                  <input
                    value={row.title}
                    onChange={(event) => patch(row.key, { title: event.target.value })}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                  />

                  {row.pitch && <p className="mt-1 text-sm text-muted">{row.pitch}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <input
                      type="date"
                      value={row.due_date}
                      onChange={(event) => patch(row.key, { due_date: event.target.value })}
                      className="rounded border border-line bg-surface px-2 py-1"
                    />
                    <input
                      type="time"
                      value={row.due_time ?? ""}
                      onChange={(event) => patch(row.key, { due_time: event.target.value || null })}
                      className="rounded border border-line bg-surface px-2 py-1"
                    />
                    <span>· {humanDate(row.due_date)}</span>
                    <span>· aviso {humanLead(row.lead_days)}</span>
                    {row.repeat_months && <span>· repete a cada {row.repeat_months} meses</span>}
                  </div>

                  {row.uncertain && (
                    <p className="mt-2 text-xs text-[#e5a11c]">
                      Não tenho certeza dessa data — confere antes de confirmar.
                    </p>
                  )}
                  {!row.pitch && row.why && <p className="mt-1 text-xs text-muted">{row.why}</p>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <button
          type="button"
          onClick={() => onConfirm(chosen.map(({ key: _k, selected: _s, pitch: _p, uncertain: _u, ...draft }) => draft))}
          disabled={chosen.length === 0 || saving}
          className="mt-4 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {saving
            ? "Salvando…"
            : chosen.length === 1
              ? "Criar 1 lembrete"
              : `Criar ${chosen.length} lembretes`}
        </button>
      )}
    </section>
  );
}
