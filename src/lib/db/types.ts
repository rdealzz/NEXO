import type { Category, CaptureAnalysis, CaptureKind, Purchase } from "@/lib/nexo/schema";

export type ReminderStatus = "pendente" | "concluido" | "arquivado";

/**
 * A captura é a raiz da informação: o material bruto que a pessoa mandou.
 * Dela nascem um ou mais lembretes, e de cada lembrete nascem os avisos.
 *
 *   captura  →  lembrete(s)  →  aviso(s)
 */
export type Capture = {
  id: string;
  owner_id: string;
  kind: CaptureKind;
  summary: string;
  /** O texto original, exatamente como chegou. */
  raw_text: string | null;
  file_name: string | null;
  /** Caminho no Storage quando veio arquivo — é o boleto que você fotografou. */
  file_path: string | null;
  analysis: CaptureAnalysis;
  created_at: string;
};

export type CaptureDraft = Omit<Capture, "id" | "owner_id" | "created_at">;

/** Um compromisso. Não é o aviso — é o fato que vai acontecer. */
export type Reminder = {
  id: string;
  owner_id: string;
  capture_id: string | null;
  title: string;
  /** null = está na caixa de entrada: a pessoa jogou aqui e ainda não tem data. */
  due_date: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:MM
  /** Antecedências do aviso, em minutos antes do compromisso. */
  lead_minutes: number[];
  category: Category;
  why: string | null;
  confidence: number | null;
  entity_name: string | null;
  /** "mensal:5", "semanal:1", "meses:6"... Ao concluir, o NEXO recria o próximo. */
  repeat_rule: string | null;
  status: ReminderStatus;
  created_at: string;
};

export type ReminderDraft = Omit<Reminder, "id" | "owner_id" | "status" | "created_at"> &
  Partial<Pick<Reminder, "status">>;

/**
 * Um aviso agendado. Materializar isto em linha própria é o que deixa o
 * despachante barato: ele lê só `sent_at is null and notify_at <= now()`,
 * em índice, em vez de varrer todos os lembretes de todo mundo.
 */
export type Notification = {
  id: string;
  reminder_id: string;
  owner_id: string;
  lead_minutes: number;
  notify_at: string; // ISO UTC
  sent_at: string | null;
};

export type DueNotification = { notification: Notification; reminder: Reminder };

/**
 * Perfil de uma conta. `inbox_slug` é o que transforma o NEXO em endereço: a
 * pessoa encaminha e-mail para <slug>@<INBOUND_EMAIL_DOMAIN> e o material
 * chega sem ela abrir o app.
 */
export type Profile = {
  user_id: string;
  email: string | null;
  /** Como a pessoa quer ser chamada. Vazio = usamos o começo do e-mail. */
  display_name: string | null;
  /** Id do avatar escolhido (ver src/lib/avatares.ts). */
  avatar_id: string | null;
  /** Endereço de cobrança: o gateway exige para boleto e Pix. */
  billing_cep: string | null;
  billing_logradouro: string | null;
  billing_numero: string | null;
  billing_complemento: string | null;
  billing_bairro: string | null;
  billing_cidade: string | null;
  billing_uf: string | null;
  /** Só é preenchido depois que o código enviado para o número volta pelo app. */
  phone: string | null;
  phone_pending: string | null;
  phone_code: string | null;
  phone_code_expires_at: string | null;
  inbox_slug: string;
  created_at: string;
};

/**
 * Uma compra identificada numa nota fiscal. Guardada em linha própria para
 * que depois dê para perguntar "quais produtos ainda estão na garantia?".
 */
export type PurchaseRecord = Purchase & {
  id: string;
  owner_id: string;
  capture_id: string | null;
  created_at: string;
};

/**
 * Um aparelho autorizado a receber avisos. O `endpoint` é a identidade da
 * assinatura: reinscrever o mesmo aparelho atualiza a linha, nunca duplica o
 * aviso. Uma pessoa costuma ter mais de um (celular e PC).
 */
export type PushSubscriptionRecord = {
  id: string;
  owner_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

export type PushSubscriptionDraft = Omit<PushSubscriptionRecord, "id" | "owner_id" | "created_at">;

export type StatusAssinatura = "pendente" | "ativa" | "atrasada" | "cancelada";

/**
 * A assinatura de uma pessoa, como o NEXO a enxerga.
 *
 * `valid_until` é o campo que decide o acesso, não `status`: quem cancela hoje
 * continua usando até o fim do período que já pagou — é o que o contrato diz,
 * e é o que evita cobrar por um serviço que foi cortado antes da hora.
 */
export type Subscription = {
  owner_id: string;
  customer_id: string | null;
  subscription_id: string | null;
  status: StatusAssinatura;
  valid_until: string | null;
  /** O que dá para mostrar de um cartão sem guardar cartão nenhum. */
  card_brand: string | null;
  card_last4: string | null;
  last_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export interface Store {
  readonly name: "memoria" | "supabase";

  createCapture(ownerId: string, draft: CaptureDraft): Promise<Capture>;
  /**
   * Guarda o material original (o boleto que a pessoa fotografou) e devolve o
   * caminho. Devolve null quando o backend não tem onde guardar.
   */
  saveFile(ownerId: string, fileName: string, data: Uint8Array, mediaType: string): Promise<string | null>;
  getCapture(ownerId: string, id: string): Promise<Capture | null>;

  listReminders(ownerId: string): Promise<Reminder[]>;
  createReminders(ownerId: string, drafts: ReminderDraft[]): Promise<Reminder[]>;
  updateReminder(ownerId: string, id: string, patch: Partial<Reminder>): Promise<Reminder | null>;
  deleteReminder(ownerId: string, id: string): Promise<boolean>;

  /** Avisos cuja hora chegou e que ainda não saíram, de todos os usuários. */
  dueNotifications(now: Date, limit?: number): Promise<DueNotification[]>;
  markSent(notificationId: string, at: Date): Promise<void>;

  /** Passa o que foi criado anonimamente para a conta recém-autenticada. */
  transferOwnership(from: string, to: string): Promise<number>;

  /**
   * Apaga tudo que é de um dono: capturas, lembretes, avisos, compras, perfil e
   * os arquivos originais. É definitivo — não é arquivar, não é marcar como
   * inativo. Devolve quantas linhas saíram, para o app poder dizer o que fez.
   */
  deleteOwner(ownerId: string): Promise<{ apagadas: Record<string, number>; arquivos: number }>;

  createPurchase(ownerId: string, captureId: string, purchase: Purchase): Promise<PurchaseRecord>;
  listPurchases(ownerId: string): Promise<PurchaseRecord[]>;

  getSubscription(ownerId: string): Promise<Subscription | null>;
  /** Cria ou atualiza; o webhook do gateway chama isto. */
  upsertSubscription(
    ownerId: string,
    patch: Partial<Omit<Subscription, "owner_id" | "created_at">>,
  ): Promise<Subscription>;
  /** Resolve o dono a partir do id do gateway, que é o que o webhook manda. */
  findSubscriptionBy(field: "customer_id" | "subscription_id", value: string): Promise<Subscription | null>;

  savePushSubscription(ownerId: string, draft: PushSubscriptionDraft): Promise<PushSubscriptionRecord>;
  listPushSubscriptions(ownerId: string): Promise<PushSubscriptionRecord[]>;
  /** Chamado quando o serviço de push responde 404/410: o aparelho sumiu. */
  deletePushSubscription(endpoint: string): Promise<void>;

  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(profile: Omit<Profile, "created_at">): Promise<Profile>;
  /** Resolve o dono de uma mensagem que chegou de fora do app. */
  findProfileBy(field: "inbox_slug" | "phone" | "email", value: string): Promise<Profile | null>;
}
