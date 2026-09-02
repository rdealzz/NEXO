import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { pendingNotifications } from "./schedule";
import type { Reminder, Store } from "./types";

/**
 * Acesso pelo service role: as rotas do NEXO já resolvem o dono da requisição,
 * então o filtro por owner_id é feito aqui. As policies de RLS na migration
 * protegem o acesso direto do navegador ao Postgres.
 */
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

  async listReminders(ownerId) {
    return unwrap(
      await client()
        .from("reminders")
        .select("*")
        .eq("owner_id", ownerId)
        .order("due_date", { ascending: true })
        .order("due_time", { ascending: true, nullsFirst: true }),
    );
  },

  async createReminders(ownerId, drafts) {
    if (drafts.length === 0) return [];
    return unwrap(
      await client()
        .from("reminders")
        .insert(drafts.map((d) => ({ owner_id: ownerId, ...d })))
        .select(),
    );
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
    return (data as Reminder | null) ?? null;
  },

  async deleteReminder(ownerId, id) {
    const { error, count } = await client()
      .from("reminders")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return (count ?? 0) > 0;
  },

  async dueNotifications(now: Date) {
    // Janela curta: só o que pode ter aviso vencido, não a base inteira.
    const horizon = new Date(now.getTime() + 400 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const rows = unwrap<Reminder[]>(
      await client().from("reminders").select("*").eq("status", "pendente").lte("due_date", horizon),
    );
    return pendingNotifications(rows, now);
  },

  async markNotified(id, lead) {
    const { error } = await client().rpc("nexo_mark_notified", { p_reminder: id, p_lead: lead });
    if (error) throw new Error(`Supabase: ${error.message}`);
  },
};
