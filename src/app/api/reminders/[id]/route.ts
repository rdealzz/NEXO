import { NextResponse } from "next/server";
import { z } from "zod";

import { store, type Reminder, type ReminderDraft } from "@/lib/db";
import { nextOccurrence, usableLeads } from "@/lib/db/schedule";
import { REPEAT_RULE } from "@/lib/nexo/schema";
import { attachOwner, currentOwner } from "@/lib/owner";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["pendente", "concluido", "arquivado"]).optional(),
  title: z.string().min(1).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  lead_minutes: z.array(z.number().int().min(0).max(525_600)).optional(),
  repeat_rule: z.string().regex(REPEAT_RULE).nullable().optional(),
  /** Empurra o compromisso N minutos para frente e rearma os avisos. */
  snooze_minutes: z.number().int().min(1).max(525_600).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Adiar mexe na data E na hora: "1 hora" precisa continuar sendo 1 hora. */
function shifted(current: Reminder, minutes: number, now: Date) {
  const base =
    current.due_date && current.due_time
      ? new Date(`${current.due_date}T${current.due_time}:00-03:00`)
      : now;
  const target = new Date(base.getTime() + minutes * 60_000);
  const local = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(target);
  const [date, time] = local.split(" ");
  return { due_date: date, due_time: time };
}

export async function PATCH(request: Request, { params }: Ctx) {
  const owner = await currentOwner();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Alteração inválida." }, { status: 400 });
  }

  const current = (await store().listReminders(owner.id)).find((r) => r.id === id);
  if (!current) return NextResponse.json({ error: "Lembrete não encontrado." }, { status: 404 });

  const now = new Date();
  const { snooze_minutes, ...patch } = parsed.data;
  const changes: Partial<Reminder> = { ...patch };

  if (snooze_minutes !== undefined) {
    Object.assign(changes, shifted(current, snooze_minutes, now), { status: "pendente" as const });
  }

  // Ganhou data (ou mudou de data): as antecedências precisam ser repodadas,
  // senão um item que saiu da caixa de entrada nasce sem aviso.
  if (changes.due_date !== undefined || changes.due_time !== undefined) {
    const alvo = {
      due_date: changes.due_date ?? current.due_date,
      due_time: changes.due_time !== undefined ? changes.due_time : current.due_time,
    };
    changes.lead_minutes = usableLeads(alvo, changes.lead_minutes ?? current.lead_minutes, now);
  }

  const updated = await store().updateReminder(owner.id, id, changes);

  // Concluir algo recorrente já deixa a próxima volta armada.
  let next: Reminder | null = null;
  if (patch.status === "concluido" && current.repeat_rule && current.due_date) {
    const dueDate = nextOccurrence(current.due_date, current.repeat_rule);
    if (dueDate) {
      const draft: ReminderDraft = {
        capture_id: current.capture_id,
        title: current.title,
        due_date: dueDate,
        due_time: current.due_time,
        lead_minutes: usableLeads({ due_date: dueDate, due_time: current.due_time }, current.lead_minutes, now),
        category: current.category,
        why: current.why,
        confidence: current.confidence,
        entity_name: current.entity_name,
        repeat_rule: current.repeat_rule,
      };
      [next] = await store().createReminders(owner.id, [draft]);
    }
  }

  return attachOwner(NextResponse.json({ reminder: updated, next }), owner);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const owner = await currentOwner();
  const { id } = await params;
  const ok = await store().deleteReminder(owner.id, id);
  if (!ok) return NextResponse.json({ error: "Lembrete não encontrado." }, { status: 404 });
  return attachOwner(NextResponse.json({ ok: true }), owner);
}
