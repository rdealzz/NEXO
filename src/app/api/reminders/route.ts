import { NextResponse } from "next/server";
import { z } from "zod";

import { store, type ReminderDraft } from "@/lib/db";
import { usableLeads } from "@/lib/db/schedule";
import { CategorySchema } from "@/lib/nexo/schema";
import { attachOwner, currentOwner } from "@/lib/owner";
import { todayInSaoPaulo } from "@/lib/nexo/prompt";

export const runtime = "nodejs";

const DraftSchema = z.object({
  title: z.string().min(1),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data precisa estar em YYYY-MM-DD"),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .default(null),
  lead_days: z.array(z.number().int().min(0).max(400)).default([0]),
  category: CategorySchema.default("outro"),
  why: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
  entity_name: z.string().nullable().default(null),
  repeat_months: z.number().int().min(1).max(120).nullable().default(null),
  capture_id: z.string().nullable().default(null),
});

const BodySchema = z.object({ reminders: z.array(DraftSchema).min(1).max(20) });

export async function GET() {
  const owner = await currentOwner();
  const reminders = await store().listReminders(owner.id);
  return attachOwner(NextResponse.json({ reminders }), owner);
}

export async function POST(request: Request) {
  const owner = await currentOwner();
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Lembrete inválido.", details: parsed.error.issues }, { status: 400 });
  }

  const drafts: ReminderDraft[] = parsed.data.reminders.map((d) => ({
    ...d,
    lead_days: usableLeads(d.due_date, d.lead_days, todayInSaoPaulo()),
  }));

  const created = await store().createReminders(owner.id, drafts);
  return attachOwner(NextResponse.json({ reminders: created }, { status: 201 }), owner);
}
