import { randomUUID } from "node:crypto";

import { plannedNotifications } from "./schedule";
import type {
  Capture,
  CaptureDraft,
  DueNotification,
  Notification,
  Profile,
  PurchaseRecord,
  Reminder,
  ReminderDraft,
  Store,
} from "./types";

/**
 * Store de desenvolvimento. Vive no processo, some no restart. Existe para que
 * `npm run dev` funcione sem nenhuma infraestrutura — em produção o
 * SUPABASE_SERVICE_ROLE_KEY troca isso pelo Postgres. As duas implementações
 * seguem a mesma regra: aviso é linha derivada do lembrete.
 */
type Tables = {
  reminders: Reminder[];
  captures: Capture[];
  notifications: Notification[];
  purchases: PurchaseRecord[];
  profiles: Profile[];
};

const globalRef = globalThis as unknown as { __nexoMemory?: Tables };
const db: Tables = (globalRef.__nexoMemory ??= {
  reminders: [],
  captures: [],
  notifications: [],
  purchases: [],
  profiles: [],
});

/** Refaz os avisos ainda não enviados de um lembrete. */
function rebuildNotifications(reminder: Reminder) {
  db.notifications = db.notifications.filter((n) => n.reminder_id !== reminder.id || n.sent_at !== null);
  if (reminder.status !== "pendente") return;

  const alreadySent = new Set(
    db.notifications.filter((n) => n.reminder_id === reminder.id).map((n) => n.lead_minutes),
  );
  for (const planned of plannedNotifications(reminder)) {
    if (alreadySent.has(planned.lead_minutes)) continue;
    db.notifications.push({
      id: randomUUID(),
      reminder_id: reminder.id,
      owner_id: reminder.owner_id,
      lead_minutes: planned.lead_minutes,
      notify_at: planned.notify_at,
      sent_at: null,
    });
  }
}

export const memoryStore: Store = {
  name: "memoria",

  async createCapture(ownerId, draft: CaptureDraft) {
    const capture: Capture = { id: randomUUID(), owner_id: ownerId, created_at: new Date().toISOString(), ...draft };
    db.captures.unshift(capture);
    return capture;
  },

  async saveFile() {
    // Sem Storage no modo memória: a captura guarda só o nome do arquivo.
    return null;
  },

  async getCapture(ownerId, id) {
    return db.captures.find((c) => c.id === id && c.owner_id === ownerId) ?? null;
  },

  async listReminders(ownerId) {
    return db.reminders
      .filter((r) => r.owner_id === ownerId)
      // Sem data vai para o fim: é caixa de entrada, não compromisso.
      .sort((a, b) =>
        `${a.due_date ?? "9999-99-99"}${a.due_time ?? ""}`.localeCompare(
          `${b.due_date ?? "9999-99-99"}${b.due_time ?? ""}`,
        ),
      );
  },

  async createReminders(ownerId, drafts: ReminderDraft[]) {
    const created = drafts.map<Reminder>((draft) => ({
      id: randomUUID(),
      owner_id: ownerId,
      status: "pendente",
      created_at: new Date().toISOString(),
      ...draft,
    }));
    db.reminders.push(...created);
    created.forEach(rebuildNotifications);
    return created;
  },

  async updateReminder(ownerId, id, patch) {
    const found = db.reminders.find((r) => r.id === id && r.owner_id === ownerId);
    if (!found) return null;
    Object.assign(found, patch, { id: found.id, owner_id: found.owner_id });
    rebuildNotifications(found);
    return found;
  },

  async deleteReminder(ownerId, id) {
    const index = db.reminders.findIndex((r) => r.id === id && r.owner_id === ownerId);
    if (index < 0) return false;
    db.reminders.splice(index, 1);
    db.notifications = db.notifications.filter((n) => n.reminder_id !== id);
    return true;
  },

  async dueNotifications(now: Date, limit = 200): Promise<DueNotification[]> {
    const cutoff = now.toISOString();
    return db.notifications
      .filter((n) => n.sent_at === null && n.notify_at <= cutoff)
      .sort((a, b) => a.notify_at.localeCompare(b.notify_at))
      .slice(0, limit)
      .flatMap((notification) => {
        const reminder = db.reminders.find((r) => r.id === notification.reminder_id);
        return reminder && reminder.status === "pendente" ? [{ notification, reminder }] : [];
      });
  },

  async markSent(notificationId, at) {
    const found = db.notifications.find((n) => n.id === notificationId);
    if (found) found.sent_at = at.toISOString();
  },

  async createPurchase(ownerId, captureId, purchase) {
    const record: PurchaseRecord = {
      id: randomUUID(),
      owner_id: ownerId,
      capture_id: captureId,
      created_at: new Date().toISOString(),
      ...purchase,
    };
    db.purchases.unshift(record);
    return record;
  },

  async listPurchases(ownerId) {
    return db.purchases.filter((p) => p.owner_id === ownerId);
  },

  async transferOwnership(from, to) {
    let moved = 0;
    for (const row of [...db.reminders, ...db.captures, ...db.notifications, ...db.purchases]) {
      if (row.owner_id === from) {
        row.owner_id = to;
        moved += 1;
      }
    }
    return moved;
  },

  async deleteOwner(ownerId) {
    const apagadas: Record<string, number> = {};
    const remover = <T extends { owner_id?: string; user_id?: string }>(tabela: T[], nome: string) => {
      const antes = tabela.length;
      const restantes = tabela.filter((linha) => (linha.owner_id ?? linha.user_id) !== ownerId);
      tabela.length = 0;
      tabela.push(...restantes);
      apagadas[nome] = antes - tabela.length;
    };

    remover(db.notifications, "notifications");
    remover(db.reminders, "reminders");
    remover(db.purchases, "purchases");
    remover(db.captures, "captures");
    remover(db.profiles, "profiles");
    return { apagadas, arquivos: 0 };
  },

  async getProfile(userId) {
    return db.profiles.find((p) => p.user_id === userId) ?? null;
  },

  async upsertProfile(profile) {
    const existing = db.profiles.find((p) => p.user_id === profile.user_id);
    if (existing) {
      Object.assign(existing, profile);
      return existing;
    }
    const created: Profile = { ...profile, created_at: new Date().toISOString() };
    db.profiles.push(created);
    return created;
  },

  async findProfileBy(field, value) {
    return db.profiles.find((p) => p[field] === value) ?? null;
  },
};
