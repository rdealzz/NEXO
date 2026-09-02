"use client";

import { useState } from "react";

import { Botao } from "@/components/ui/button";
import { CATEGORY_LABEL, humanDate, humanLead, humanRepeat } from "@/lib/format";
import type { FollowUp } from "@/lib/nexo/rules";
import type { CaptureAnalysis } from "@/lib/nexo/schema";

export type ConfirmedDraft = {
  title: string;
  due_date: string | null;
  due_time: string | null;
  lead_minutes: number[];
  repeat_rule: string | null;
  category: string;
  why: string | null;
  confidence: number | null;
  entity_name: string | null;
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

  // O que estava no material vem marcado: é isso que a pessoa mandou.
  const extracted: Row[] = analysis.reminders.map((reminder, index) => ({
    key: `r${index}`,
    selected: true,
    pitch: null,
    uncertain: reminder.confidence < 0.6,
    title: reminder.title,
    due_date: reminder.due_date,
    due_time: reminder.due_time,
    lead_minutes: reminder.lead_minutes,
    repeat_rule: reminder.repeat_rule,
    category: reminder.category,
    why: reminder.why,
    confidence: reminder.confidence,
    entity_name: entity,
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
    lead_minutes: followUp.lead_minutes,
    repeat_rule: followUp.repeat_rule,
    category: followUp.category,
    why: followUp.pitch,
    confidence: null,
    entity_name: entity,
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
  const compra = analysis.purchase;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Encontrei algo importante</p>
          <p className="mt-1 text-base font-medium">{analysis.summary}</p>
          <p className="mt-0.5 text-sm text-muted">
            {CATEGORY_LABEL[analysis.category]}
            {analysis.entity?.name ? ` · ${analysis.entity.name}` : ""}
            {analysis.amount_brl !== null
              ? ` · ${analysis.amount_brl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
              : ""}
          </p>
        </div>
        <Botao size="chip" variant="ghost" onClick={onDiscard} className="ml-auto shrink-0">
          descartar
        </Botao>
      </header>

      {compra && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-accent-soft/60 p-3 text-sm">
          <Campo termo="Produto" valor={[compra.brand, compra.product, compra.model].filter(Boolean).join(" ")} />
          <Campo termo="Loja" valor={compra.store} />
          <Campo termo="Comprado em" valor={compra.purchased_on ? humanDate(compra.purchased_on) : null} />
          <Campo
            termo="Valor"
            valor={
              compra.amount_brl?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? null
            }
          />
          <Campo termo="Nota" valor={compra.invoice_number} />
          <Campo
            termo="Garantia até"
            valor={compra.warranty_until ? humanDate(compra.warranty_until) : null}
          />
        </dl>
      )}

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
            <Botao type="submit" variant="primary" size="sm" disabled={!answer.trim() || saving}>
              Responder
            </Botao>
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
                      value={row.due_date ?? ""}
                      onChange={(event) => patch(row.key, { due_date: event.target.value || null })}
                      className="rounded border border-line bg-surface px-2 py-1"
                    />
                    <input
                      type="time"
                      value={row.due_time ?? ""}
                      onChange={(event) => patch(row.key, { due_time: event.target.value || null })}
                      className="rounded border border-line bg-surface px-2 py-1"
                    />
                    <span>· {row.due_date ? humanDate(row.due_date) : "vai para a caixa de entrada"}</span>
                    {row.due_date && <span>· aviso {humanLead(row.lead_minutes)}</span>}
                    {humanRepeat(row.repeat_rule) && <span>· {humanRepeat(row.repeat_rule)}</span>}
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
        <Botao
          variant="primary"
          block
          className="mt-4"
          onClick={() => onConfirm(chosen.map(({ key: _k, selected: _s, pitch: _p, uncertain: _u, ...draft }) => draft))}
          disabled={chosen.length === 0 || saving}
        >
          {saving ? "Salvando…" : chosen.length === 1 ? "Confirmar" : `Confirmar ${chosen.length} itens`}
        </Botao>
      )}
    </section>
  );
}

function Campo({ termo, valor }: { termo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{termo}</dt>
      <dd className="truncate font-medium">{valor}</dd>
    </div>
  );
}
