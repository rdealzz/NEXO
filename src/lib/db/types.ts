import type { Category, CaptureAnalysis, CaptureKind } from "@/lib/nexo/schema";

export type ReminderStatus = "pendente" | "concluido" | "arquivado";

export type Reminder = {
  id: string;
  owner_id: string;
  capture_id: string | null;
  title: string;
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  lead_days: number[];
  category: Category;
  why: string | null;
  confidence: number | null;
  entity_name: string | null;
  /** Quando preenchido, ao concluir o lembrete o NEXO recria o próximo. */
  repeat_months: number | null;
  /** Antecedências já notificadas, para não avisar duas vezes. */
  notified_leads: number[];
  status: ReminderStatus;
  created_at: string;
};

export type ReminderDraft = Omit<Reminder, "id" | "owner_id" | "notified_leads" | "status" | "created_at"> &
  Partial<Pick<Reminder, "status">>;

export type Capture = {
  id: string;
  owner_id: string;
  kind: CaptureKind;
  summary: string;
  raw_text: string | null;
  file_name: string | null;
  analysis: CaptureAnalysis;
  created_at: string;
};

export type CaptureDraft = Omit<Capture, "id" | "owner_id" | "created_at">;

export type DueNotification = { reminder: Reminder; lead: number };

export interface Store {
  readonly name: "memoria" | "supabase";
  createCapture(ownerId: string, draft: CaptureDraft): Promise<Capture>;
  listReminders(ownerId: string): Promise<Reminder[]>;
  createReminders(ownerId: string, drafts: ReminderDraft[]): Promise<Reminder[]>;
  updateReminder(ownerId: string, id: string, patch: Partial<Reminder>): Promise<Reminder | null>;
  deleteReminder(ownerId: string, id: string): Promise<boolean>;
  /** Todos os avisos cuja hora chegou, de todos os usuários. */
  dueNotifications(now: Date): Promise<DueNotification[]>;
  markNotified(id: string, lead: number): Promise<void>;
}
