import { addMonths, format, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import { store, type Reminder, type ReminderDraft } from "@/lib/db";
import { attachOwner, currentOwner } from "@/lib/owner";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["pendente", "concluido", "arquivado"]).optional(),
  title: z.string().min(1).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  /** Empurra o lembrete N dias para frente e rearma os avisos. */
  snooze_days: z.number().int().min(1).max(365).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const owner = await currentOwner();
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Alteração inválida." }, { status: 400 });
  }

  const current = (await store().listReminders(owner.id)).find((r) => r.id === id);
  if (!current) return NextResponse.json({ error: "Lembrete não encontrado." }, { status: 404 });

  const { snooze_days, ...patch } = parsed.data;
  const changes: Record<string, unknown> = { ...patch };

  if (snooze_days !== undefined) {
    changes.due_date = format(
      new Date(parseISO(current.due_date).getTime() + snooze_days * 86_400_000),
      "yyyy-MM-dd",
    );
    changes.notified_leads = [];
    changes.status = "pendente";
  }
  if (patch.due_date && patch.due_date !== current.due_date) changes.notified_leads = [];

  const updated = await store().updateReminder(owner.id, id, changes);

  // Concluir algo recorrente já deixa a próxima volta armada.
  let next: Reminder | null = null;
  if (patch.status === "concluido" && current.repeat_months) {
    const draft: ReminderDraft = {
      capture_id: current.capture_id,
      title: current.title,
      due_date: format(addMonths(parseISO(current.due_date), current.repeat_months), "yyyy-MM-dd"),
      due_time: current.due_time,
      lead_days: current.lead_days,
      category: current.category,
      why: current.why,
      confidence: current.confidence,
      entity_name: current.entity_name,
      repeat_months: current.repeat_months,
    };
    [next] = await store().createReminders(owner.id, [draft]);
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
