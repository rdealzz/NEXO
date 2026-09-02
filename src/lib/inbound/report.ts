import { humanLead } from "@/lib/format";
import type { IngestResult } from "@/lib/nexo/ingest";

/**
 * A resposta que a pessoa recebe no canal de onde mandou. Fora do app não há
 * tela de revisão, então o NEXO conta exatamente o que fez — e o que deixou de
 * fazer por não ter certeza.
 */
export function reportFor(result: IngestResult, appUrl: string | null): string {
  const linhas: string[] = [result.analysis.summary];

  if (result.created.length > 0) {
    linhas.push("");
    for (const reminder of result.created) {
      const quando = reminder.due_date
        ? new Date(`${reminder.due_date}T12:00:00Z`).toLocaleDateString("pt-BR")
        : "sem data";
      linhas.push(`✓ ${reminder.title} — ${quando} (aviso ${humanLead(reminder.lead_minutes)})`);
    }
  }

  const naoCriados = result.analysis.reminders.length - result.created.length;
  if (naoCriados > 0) {
    linhas.push("", `Tem mais ${naoCriados} coisa(s) aqui que eu não tenho certeza da data.`);
  }
  if (result.analysis.clarification) {
    linhas.push("", result.analysis.clarification);
  }
  if (result.followUps.length > 0) {
    linhas.push("", "Posso lembrar também:");
    for (const followUp of result.followUps.slice(0, 3)) linhas.push(`· ${followUp.title}`);
  }
  if ((naoCriados > 0 || result.followUps.length > 0) && appUrl) {
    linhas.push("", `Confirmar: ${appUrl}/inbox`);
  }

  return linhas.join("\n");
}
