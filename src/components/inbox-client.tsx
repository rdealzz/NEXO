"use client";

import { useCallback, useMemo, useState } from "react";

import { DropArea, type CapturePayload } from "@/components/drop-area";
import { ReminderList, type Aba } from "@/components/reminder-list";
import { ReviewCard, type ConfirmedDraft } from "@/components/review-card";
import { Botao } from "@/components/ui/button";
import type { Reminder } from "@/lib/db";
import { daysUntil } from "@/lib/format";
import type { FollowUp } from "@/lib/nexo/rules";
import type { CaptureAnalysis } from "@/lib/nexo/schema";

type Draft = { captureId: string; analysis: CaptureAnalysis; followUps: FollowUp[] };

const ABAS: { id: Aba; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "proximos", label: "Próximos" },
  { id: "caixa", label: "Caixa de entrada" },
];

export function InboxClient({ initialReminders }: { initialReminders: Reminder[] }) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [aba, setAba] = useState<Aba>("hoje");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lastPayload, setLastPayload] = useState<CapturePayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contagem = useMemo(() => {
    const pendentes = reminders.filter((r) => r.status === "pendente");
    return {
      hoje: pendentes.filter((r) => r.due_date && daysUntil(r.due_date) <= 0).length,
      proximos: pendentes.filter((r) => r.due_date && daysUntil(r.due_date) > 0).length,
      caixa: pendentes.filter((r) => r.due_date === null).length,
    } satisfies Record<Aba, number>;
  }, [reminders]);

  const runCapture = useCallback(async (payload: CapturePayload, followUp?: string) => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", payload.kind);
      if (payload.text) form.set("text", payload.text);
      if (payload.file) form.set("file", payload.file);
      if (followUp) form.set("followUp", followUp);

      const response = await fetch("/api/capture", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Falhou aqui do meu lado.");

      setLastPayload(payload);
      setDraft({ captureId: body.capture_id, analysis: body.analysis, followUps: body.follow_ups ?? [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falhou aqui do meu lado.");
    } finally {
      setBusy(false);
    }
  }, []);

  async function confirm(drafts: ConfirmedDraft[]) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reminders: drafts }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não consegui salvar.");

      const criados = body.reminders as Reminder[];
      setReminders((current) => [...current, ...criados]);
      setDraft(null);
      // Leva a pessoa para onde a coisa caiu, senão parece que sumiu.
      if (criados.some((r) => r.due_date === null)) setAba("caixa");
      else if (criados.some((r) => r.due_date && daysUntil(r.due_date) > 0)) setAba("proximos");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não consegui salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, change: Record<string, unknown>) {
    const previous = reminders;
    // Otimista: a lista responde na hora, o servidor confirma depois.
    setReminders((current) => current.map((r) => (r.id === id ? { ...r, ...(change as Partial<Reminder>) } : r)));

    const response = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(change),
    });
    if (!response.ok) {
      setReminders(previous);
      setError("Não consegui atualizar esse lembrete.");
      return;
    }
    const body = await response.json();
    setReminders((current) => {
      const updated = current.map((r) => (r.id === id ? body.reminder : r));
      return body.next ? [...updated, body.next] : updated;
    });
  }

  async function remove(id: string) {
    const previous = reminders;
    setReminders((current) => current.filter((r) => r.id !== id));
    const response = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setReminders(previous);
      setError("Não consegui remover esse lembrete.");
    }
  }

  return (
    <div className="space-y-5">
      <DropArea busy={busy} onCapture={(payload) => runCapture(payload)} />

      {error && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {draft && (
        <ReviewCard
          key={draft.captureId}
          captureId={draft.captureId}
          analysis={draft.analysis}
          followUps={draft.followUps}
          saving={saving || busy}
          onConfirm={confirm}
          onDiscard={() => setDraft(null)}
          onAnswer={(answer) => lastPayload && runCapture(lastPayload, answer)}
        />
      )}

      <nav className="flex flex-wrap gap-2">
        {ABAS.map((item) => (
          <Botao
            key={item.id}
            size="sm"
            variant={aba === item.id ? "primary" : "surface"}
            aria-pressed={aba === item.id}
            onClick={() => setAba(item.id)}
          >
            {item.label}
            {contagem[item.id] > 0 && (
              <span className="text-xs font-normal opacity-70">{contagem[item.id]}</span>
            )}
          </Botao>
        ))}
      </nav>

      <ReminderList
        aba={aba}
        reminders={reminders}
        onComplete={(id) => patch(id, { status: "concluido" })}
        onSnooze={(id, minutes) => patch(id, { snooze_minutes: minutes })}
        onSchedule={(id, dueDate) => patch(id, { due_date: dueDate })}
        onDelete={remove}
      />
    </div>
  );
}
