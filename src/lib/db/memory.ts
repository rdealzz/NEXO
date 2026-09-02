import { randomUUID } from "node:crypto";

import { pendingNotifications } from "./schedule";
import type { Capture, CaptureDraft, DueNotification, Reminder, ReminderDraft, Store } from "./types";

/**
 * Store de desenvolvimento. Vive no processo, some no restart. Existe para que
 * `npm run dev` funcione sem nenhuma infraestrutura — em produção o
 * SUPABASE_SERVICE_ROLE_KEY troca isso pelo Postgres.
 */
type Tables = { reminders: Reminder[]; captures: Capture[] };

const globalRef = globalThis as unknown as { __nexoMemory?: Tables };
const db: Tables = (globalRef.__nexoMemory ??= { reminders: [], captures: [] });

export const memoryStore: Store = {
  name: "memoria",

  async createCapture(ownerId, draft: CaptureDraft) {
    const capture: Capture = { id: randomUUID(), owner_id: ownerId, created_at: new Date().toISOString(), ...draft };
    db.captures.unshift(capture);
    return capture;
  },

  async listReminders(ownerId) {
    return db.reminders
      .filter((r) => r.owner_id === ownerId)
      .sort((a, b) => `${a.due_date}${a.due_time ?? ""}`.localeCompare(`${b.due_date}${b.due_time ?? ""}`));
  },

  async createReminders(ownerId, drafts: ReminderDraft[]) {
    const created = drafts.map<Reminder>((draft) => ({
      id: randomUUID(),
      owner_id: ownerId,
      notified_leads: [],
      status: "pendente",
      created_at: new Date().toISOString(),
      ...draft,
    }));
    db.reminders.push(...created);
    return created;
  },

  async updateReminder(ownerId, id, patch) {
    const found = db.reminders.find((r) => r.id === id && r.owner_id === ownerId);
    if (!found) return null;
    Object.assign(found, patch, { id: found.id, owner_id: found.owner_id });
    return found;
  },

  async deleteReminder(ownerId, id) {
    const index = db.reminders.findIndex((r) => r.id === id && r.owner_id === ownerId);
    if (index < 0) return false;
    db.reminders.splice(index, 1);
    return true;
  },

  async dueNotifications(now: Date): Promise<DueNotification[]> {
    return pendingNotifications(db.reminders, now);
  },

  async markNotified(id, lead) {
    const found = db.reminders.find((r) => r.id === id);
    if (found && !found.notified_leads.includes(lead)) found.notified_leads.push(lead);
  },
};
