import assert from "node:assert/strict";
import { test } from "node:test";

import { store } from "@/lib/db";
import { dueInstant, notifyAt, plannedNotifications, usableLeads } from "@/lib/db/schedule";
import type { SuggestedReminder } from "@/lib/nexo/schema";

/**
 * O caminho inteiro, do jeito que a pessoa faz.
 *
 * Ela fotografa um boleto, confere na tela de revisão, toca em confirmar — e
 * espera três coisas: o compromisso aparecendo no dia certo do calendário, o
 * aviso saindo com a antecedência combinada, e nada saindo depois que ela
 * concluiu. É esse contrato que este arquivo protege.
 *
 * A leitura da imagem (a chamada do modelo) fica de fora de propósito: ela é a
 * única parte que depende de rede e de chave, e o que quebra silenciosamente
 * não é ela — é a agenda que vem depois.
 */

/** O que o modelo devolve ao ler a foto de um boleto que vence em 4 dias. */
function boletoLidoDaFoto(vencimento: string): SuggestedReminder {
  return {
    title: "Pagar conta de luz — Enel",
    due_date: vencimento,
    due_time: null,
    // 4 dias antes, 1 dia antes e no dia: é assim que um vencimento avisa.
    lead_minutes: [5760, 1440, 0],
    repeat_rule: null,
    category: "conta",
    why: "Vencimento lido no boleto fotografado",
    confidence: 0.94,
    entity_name: "Enel",
  } as SuggestedReminder;
}

/** O mesmo caminho do POST /api/reminders quando a pessoa confirma. */
async function confirmar(dono: string, sugestoes: SuggestedReminder[], agora: Date) {
  return store().createReminders(
    dono,
    sugestoes.map((s) => ({
      title: s.title,
      due_date: s.due_date,
      due_time: s.due_time,
      lead_minutes: usableLeads(s, s.lead_minutes, agora),
      repeat_rule: s.repeat_rule,
      category: s.category,
      why: s.why,
      confidence: s.confidence,
      entity_name: s.entity_name,
      capture_id: null,
    })),
  );
}

test("foto de boleto confirmada entra na agenda do dia certo", async () => {
  const dono = `dono-${Math.random()}`;
  const agora = new Date();
  const daquiA4Dias = new Date(agora.getTime() + 4 * 86_400_000).toISOString().slice(0, 10);

  const [lembrete] = await confirmar(dono, [boletoLidoDaFoto(daquiA4Dias)], agora);

  assert.equal(lembrete.due_date, daquiA4Dias, "o vencimento lido é o dia que vai para o calendário");
  assert.equal(lembrete.status, "pendente");

  // É exatamente assim que o calendário monta o mês: agrupando por due_date o
  // que está pendente. Se o lembrete não estiver aqui, o dia fica vazio na tela.
  const noCalendario = (await store().listReminders(dono)).filter(
    (r) => r.due_date === daquiA4Dias && r.status === "pendente",
  );
  assert.equal(noCalendario.length, 1, "o dia do vencimento precisa mostrar o lembrete");
});

test("o aviso é agendado para a antecedência combinada", async () => {
  const dono = `dono-${Math.random()}`;
  const agora = new Date();
  // Seis dias, não quatro: com o vencimento colado na antecedência, o aviso de
  // "4 dias antes" cairia hoje de manhã — passado — e seria descartado com
  // razão. É o mesmo motivo pelo qual o último teste deste arquivo existe.
  const vencimento = new Date(agora.getTime() + 6 * 86_400_000).toISOString().slice(0, 10);

  const [lembrete] = await confirmar(dono, [boletoLidoDaFoto(vencimento)], agora);

  const planejados = plannedNotifications(lembrete);
  assert.ok(planejados.length >= 1, "vencimento sem aviso agendado é um lembrete que não lembra");

  // O aviso de 4 dias antes cai perto de agora — é o "vence daqui a 4 dias".
  const quatroDias = planejados.find((p) => p.lead_minutes === 5760);
  assert.ok(quatroDias, "a antecedência de 4 dias precisa sobreviver à confirmação");
  assert.equal(quatroDias.notify_at, notifyAt(lembrete, 5760)!.toISOString());

  // E o aviso do dia sai na hora do compromisso, não antes.
  const noDia = planejados.find((p) => p.lead_minutes === 0);
  assert.equal(noDia?.notify_at, dueInstant(lembrete)!.toISOString());
});

test("o despachante encontra o aviso quando a hora chega", async () => {
  const dono = `dono-${Math.random()}`;
  const agora = new Date();
  const consulta = new Date(agora.getTime() + 3 * 86_400_000).toISOString().slice(0, 10);

  const [lembrete] = await confirmar(
    dono,
    [
      {
        title: "Consulta com o médico",
        due_date: consulta,
        due_time: "09:00",
        lead_minutes: [1440, 0],
        repeat_rule: null,
        category: "saude",
        why: "Print do WhatsApp",
        confidence: 0.9,
        entity_name: null,
      } as SuggestedReminder,
    ],
    agora,
  );

  // Um minuto depois da hora do aviso de véspera, ele tem que estar na fila.
  const horaDoAviso = notifyAt(lembrete, 1440)!;
  const fila = await store().dueNotifications(new Date(horaDoAviso.getTime() + 60_000));
  const meu = fila.filter((d) => d.reminder.id === lembrete.id);

  assert.equal(meu.length, 1, "o aviso da véspera precisa sair — é ele que salva a consulta");
  assert.equal(meu[0].notification.lead_minutes, 1440);
  assert.equal(meu[0].reminder.title, "Consulta com o médico");

  // E não sai duas vezes: marcado como enviado, some da fila.
  await store().markSent(meu[0].notification.id, new Date());
  const depois = await store().dueNotifications(new Date(horaDoAviso.getTime() + 120_000));
  assert.equal(
    depois.filter((d) => d.notification.id === meu[0].notification.id).length,
    0,
    "aviso enviado não pode voltar para a fila",
  );
});

test("antecedência que já passou não vira aviso atrasado", async () => {
  const dono = `dono-${Math.random()}`;
  const agora = new Date();
  const amanha = new Date(agora.getTime() + 86_400_000).toISOString().slice(0, 10);

  // 30 dias antes de amanhã é o mês passado: aquele aviso não existe mais.
  const [lembrete] = await confirmar(
    dono,
    [{ ...boletoLidoDaFoto(amanha), lead_minutes: [43200, 1440, 0] } as SuggestedReminder],
    agora,
  );

  const passado = plannedNotifications(lembrete).filter((p) => Date.parse(p.notify_at) < agora.getTime() - 60_000);
  assert.equal(passado.length, 0, "avisar sobre o que já passou é spam, não lembrete");
});
