import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { plannedNotifications } from "./schedule";
import type { DueNotification, Notification, Profile, PurchaseRecord, Reminder, Store } from "./types";

/**
 * Acesso pelo service role: as rotas do NEXO já resolvem o dono da requisição,
 * então o filtro por owner_id é feito aqui. As policies de RLS na migration
 * protegem o acesso direto do navegador ao Postgres.
 */
export const CAPTURE_BUCKET = "capturas";

let cached: SupabaseClient | null = null;

export function supabaseAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function client(): SupabaseClient {
  if (!cached) {
    cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return cached;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`);
  return result.data as T;
}

/** Refaz as linhas de aviso ainda não enviadas de um lembrete. */
async function rebuildNotifications(reminder: Reminder) {
  await client().from("notifications").delete().eq("reminder_id", reminder.id).is("sent_at", null);
  if (reminder.status !== "pendente") return;

  const sent = unwrap<Pick<Notification, "lead_minutes">[]>(
    await client().from("notifications").select("lead_minutes").eq("reminder_id", reminder.id),
  );
  const already = new Set(sent.map((n) => n.lead_minutes));
  const rows = plannedNotifications(reminder)
    .filter((planned) => !already.has(planned.lead_minutes))
    .map((planned) => ({ reminder_id: reminder.id, owner_id: reminder.owner_id, ...planned }));

  if (rows.length > 0) {
    const { error } = await client().from("notifications").insert(rows);
    if (error) throw new Error(`Supabase: ${error.message}`);
  }
}

export const supabaseStore: Store = {
  name: "supabase",

  async createCapture(ownerId, draft) {
    return unwrap(
      await client()
        .from("captures")
        .insert({ owner_id: ownerId, ...draft })
        .select()
        .single(),
    );
  },

  async saveFile(ownerId, fileName, data, mediaType) {
    const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(-80);
    const path = `${ownerId}/${Date.now()}-${safe}`;
    const { error } = await client()
      .storage.from(CAPTURE_BUCKET)
      .upload(path, data, { contentType: mediaType, upsert: false });
    if (error) {
      // Perder o original não pode derrubar a captura: o lembrete importa mais.
      console.error("[storage]", error.message);
      return null;
    }
    return path;
  },

  async getCapture(ownerId, id) {
    const { data, error } = await client()
      .from("captures")
      .select("*")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return data ?? null;
  },

  async listReminders(ownerId) {
    return unwrap(
      await client()
        .from("reminders")
        .select("*")
        .eq("owner_id", ownerId)
        // Sem data vai para o fim: é caixa de entrada, não compromisso.
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("due_time", { ascending: true, nullsFirst: true }),
    );
  },

  async createReminders(ownerId, drafts) {
    if (drafts.length === 0) return [];
    const created = unwrap<Reminder[]>(
      await client()
        .from("reminders")
        .insert(drafts.map((d) => ({ owner_id: ownerId, ...d })))
        .select(),
    );
    await Promise.all(created.map(rebuildNotifications));
    return created;
  },

  async updateReminder(ownerId, id, patch) {
    const { id: _id, owner_id: _owner, ...safe } = patch;
    const { data, error } = await client()
      .from("reminders")
      .update(safe)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data) return null;

    const updated = data as Reminder;
    await rebuildNotifications(updated);
    return updated;
  },

  async deleteReminder(ownerId, id) {
    // notifications tem on delete cascade — some junto.
    const { error, count } = await client()
      .from("reminders")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (count ?? 0) > 0;
  },

  async dueNotifications(now: Date, limit = 200): Promise<DueNotification[]> {
    // Índice parcial em (notify_at) where sent_at is null: lê só o que vence.
    const rows = unwrap<(Notification & { reminder: Reminder })[]>(
      await client()
        .from("notifications")
        .select("*, reminder:reminders!inner(*)")
        .is("sent_at", null)
        .lte("notify_at", now.toISOString())
        .eq("reminders.status", "pendente")
        .order("notify_at", { ascending: true })
        .limit(limit),
    );
    return rows.map(({ reminder, ...notification }) => ({ notification, reminder }));
  },

  async markSent(notificationId, at) {
    const { error } = await client()
      .from("notifications")
      .update({ sent_at: at.toISOString() })
      .eq("id", notificationId);
    if (error) throw new Error(`Supabase: ${error.message}`);
  },

  async createPurchase(ownerId, captureId, purchase) {
    return unwrap<PurchaseRecord>(
      await client()
        .from("purchases")
        .insert({ owner_id: ownerId, capture_id: captureId, ...purchase })
        .select()
        .single(),
    );
  },

  async listPurchases(ownerId) {
    return unwrap<PurchaseRecord[]>(
      await client()
        .from("purchases")
        .select("*")
        .eq("owner_id", ownerId)
        .order("purchased_on", { ascending: false, nullsFirst: false }),
    );
  },

  async transferOwnership(from, to) {
    let moved = 0;
    for (const table of ["captures", "reminders", "notifications", "purchases"] as const) {
      const { error, count } = await client()
        .from(table)
        .update({ owner_id: to }, { count: "exact" })
        .eq("owner_id", from);
      if (error) throw new Error(`Supabase: ${error.message}`);
      moved += count ?? 0;
    }
    return moved;
  },

  async getProfile(userId) {
    const { data, error } = await client()
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data as Profile | null) ?? null;
  },

  async upsertProfile(profile) {
    return unwrap(await client().from("profiles").upsert(profile).select().single());
  },

  async findProfileBy(field, value) {
    const { data, error } = await client().from("profiles").select("*").eq(field, value).maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (data as Profile | null) ?? null;
  },
};
