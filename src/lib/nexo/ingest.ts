import { store, type Capture, type Reminder, type ReminderDraft } from "@/lib/db";
import { usableLeads } from "@/lib/db/schedule";

import { analyzeCapture, type CaptureInput } from "./extract";
import { todayInSaoPaulo } from "./prompt";
import { mergeFollowUps, suggestFollowUps, type FollowUp } from "./rules";
import type { CaptureAnalysis } from "./schema";

/**
 * O caminho que todo material percorre, venha do app, do WhatsApp ou de um
 * e-mail encaminhado:
 *
 *   material → 1 chamada de modelo → captura salva → lembretes → avisos
 *
 * A diferença entre os canais é só `autoCreate`: dentro do app existe tela de
 * revisão, então nada é criado sem confirmação. De fora não existe tela — aí o
 * NEXO cria o que entendeu com clareza e conta o que fez na resposta.
 */
export type IngestResult = {
  capture: Capture;
  analysis: CaptureAnalysis;
  followUps: FollowUp[];
  created: Reminder[];
};

/** Abaixo disto a data foi deduzida, não lida — não vira lembrete sozinha. */
export const AUTO_CREATE_MIN_CONFIDENCE = 0.6;

export type IngestOptions = {
  ownerId: string;
  input: CaptureInput;
  /** Bytes do anexo, para guardar o original. */
  fileData?: Uint8Array;
  autoCreate: boolean;
};

export async function ingest({ ownerId, input, fileData, autoCreate }: IngestOptions): Promise<IngestResult> {
  const analysis = await analyzeCapture(input);
  const today = todayInSaoPaulo();

  const filePath =
    input.file && fileData
      ? await store().saveFile(ownerId, input.file.name, fileData, input.file.mediaType)
      : null;

  const capture = await store().createCapture(ownerId, {
    kind: input.kind,
    summary: analysis.summary,
    raw_text: input.text?.trim() ?? null,
    file_name: input.file?.name ?? null,
    file_path: filePath,
    analysis,
  });

  // Numa nota fiscal a âncora certa é a data da compra, não a do lembrete.
  const anchor = analysis.purchase?.purchased_on ?? undefined;
  const followUps = mergeFollowUps(suggestFollowUps(analysis, anchor), analysis.proactive_followups, today);


  // Uma nota fiscal vira também um registro de compra, para depois responder
  // "quais produtos meus ainda estão na garantia?".
  if (analysis.purchase) {
    await store().createPurchase(ownerId, capture.id, analysis.purchase);
  }

  let created: Reminder[] = [];
  if (autoCreate) {
    const now = new Date();
    const confident = analysis.reminders.filter(
      (r) => r.due_date !== null && r.confidence >= AUTO_CREATE_MIN_CONFIDENCE,
    );
    const drafts = confident.map<ReminderDraft>((reminder) => ({
      capture_id: capture.id,
      title: reminder.title,
      due_date: reminder.due_date,
      due_time: reminder.due_time,
      lead_minutes: usableLeads(reminder, reminder.lead_minutes, now),
      category: reminder.category,
      why: reminder.why,
      confidence: reminder.confidence,
      entity_name: analysis.entity?.name?.trim() || null,
      repeat_rule: reminder.repeat_rule,
    }));
    created = await store().createReminders(ownerId, drafts);
  }

  return { capture, analysis, followUps, created };
}
