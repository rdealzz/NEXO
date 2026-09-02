import assert from "node:assert/strict";
import { test } from "node:test";

import { memoryStore } from "@/lib/db/memory";

/**
 * O despachante é o que roda a cada minuto, para sempre, para todo mundo. Se um
 * dia ele passar a chamar o modelo, o custo do produto deixa de ser plano — e
 * a economia inteira do NEXO cai. Estes testes protegem essa fronteira.
 */
function lembrete(dono: string, dataISO: string) {
  return {
    capture_id: null,
    title: "Pagar energia",
    due_date: dataISO,
    due_time: "09:00",
    lead_minutes: [1440, 0],
    category: "financeiro" as const,
    why: null,
    confidence: 0.9,
    entity_name: "Enel",
    repeat_rule: null,
  };
}

test("o despachante lê só o que venceu, não a base inteira", async () => {
  const dono = `d-${Math.random().toString(36).slice(2)}`;
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const daquiUmAno = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  await memoryStore.createReminders(dono, [lembrete(dono, ontem), lembrete(dono, daquiUmAno)]);

  const vencidos = await memoryStore.dueNotifications(new Date());
  const doDono = vencidos.filter((v) => v.reminder.owner_id === dono);

  assert.ok(doDono.length > 0, "o aviso de ontem tem que aparecer");
  assert.ok(
    doDono.every((v) => Date.parse(v.notification.notify_at) <= Date.now()),
    "nenhum aviso do futuro pode entrar na varredura",
  );
  assert.ok(
    doDono.every((v) => v.notification.sent_at === null),
    "aviso já enviado não pode voltar",
  );
});

test("aviso entregue não sai duas vezes", async () => {
  const dono = `d-${Math.random().toString(36).slice(2)}`;
  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await memoryStore.createReminders(dono, [lembrete(dono, ontem)]);

  const primeira = (await memoryStore.dueNotifications(new Date())).filter(
    (v) => v.reminder.owner_id === dono,
  );
  assert.ok(primeira.length > 0);

  for (const { notification } of primeira) await memoryStore.markSent(notification.id, new Date());

  const segunda = (await memoryStore.dueNotifications(new Date())).filter(
    (v) => v.reminder.owner_id === dono,
  );
  assert.equal(segunda.length, 0, "a segunda varredura não pode reenviar o mesmo aviso");
});

test("reinscrever o mesmo aparelho não duplica o aviso", async () => {
  const dono = `d-${Math.random().toString(36).slice(2)}`;
  const endpoint = `https://push.exemplo/${dono}`;

  await memoryStore.savePushSubscription(dono, { endpoint, p256dh: "a", auth: "b", user_agent: null });
  await memoryStore.savePushSubscription(dono, { endpoint, p256dh: "c", auth: "d", user_agent: null });

  const assinaturas = await memoryStore.listPushSubscriptions(dono);
  assert.equal(assinaturas.length, 1, "o endpoint é a identidade da assinatura");
  assert.equal(assinaturas[0].p256dh, "c", "a reinscrição atualiza as chaves");
});

test("assinatura de aparelho que sumiu pode ser apagada pelo endpoint", async () => {
  const dono = `d-${Math.random().toString(36).slice(2)}`;
  const endpoint = `https://push.exemplo/morto-${dono}`;
  await memoryStore.savePushSubscription(dono, { endpoint, p256dh: "a", auth: "b", user_agent: null });

  await memoryStore.deletePushSubscription(endpoint);

  assert.deepEqual(await memoryStore.listPushSubscriptions(dono), []);
});

test("excluir a conta leva junto as assinaturas de push", async () => {
  const dono = `d-${Math.random().toString(36).slice(2)}`;
  await memoryStore.savePushSubscription(dono, {
    endpoint: `https://push.exemplo/conta-${dono}`,
    p256dh: "a",
    auth: "b",
    user_agent: null,
  });

  const { apagadas } = await memoryStore.deleteOwner(dono);

  assert.equal(apagadas.push_subscriptions, 1);
  assert.deepEqual(await memoryStore.listPushSubscriptions(dono), []);
});
