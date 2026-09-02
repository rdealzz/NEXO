import assert from "node:assert/strict";
import { test } from "node:test";

import { memoryStore } from "./memory";

/**
 * A promessa da tela de exclusão é forte: "apagamos tudo". Este teste existe
 * para que ela continue verdadeira — se alguém acrescentar uma tabela e
 * esquecer do deleteOwner, é aqui que aparece.
 */
async function semearConta(dono: string) {
  const captura = await memoryStore.createCapture(dono, {
    kind: "imagem",
    summary: "Boleto de energia",
    raw_text: null,
    file_name: "boleto.jpg",
    file_path: null,
    analysis: {
      understood: true,
      summary: "Boleto de energia",
      category: "financeiro",
      entity: { name: "Enel", kind: "empresa", identifier: null },
      purchase: null,
      amount_brl: 187.42,
      reminders: [],
      proactive_followups: [],
      needs_confirmation: false,
      clarification: null,
      tags: [],
    },
  });

  await memoryStore.createReminders(dono, [
    {
      capture_id: captura.id,
      title: "Pagar energia",
      due_date: "2027-01-10",
      due_time: "09:00",
      lead_minutes: [4320, 0],
      category: "financeiro",
      why: null,
      confidence: 0.9,
      entity_name: "Enel",
      repeat_rule: null,
    },
  ]);

  await memoryStore.createPurchase(dono, captura.id, {
    product: "TV",
    brand: "Samsung",
    model: null,
    store: null,
    purchased_on: "2026-09-02",
    amount_brl: 2899,
    invoice_number: null,
    warranty_until: "2027-09-02",
    warranty_months: 12,
  });

  await memoryStore.upsertProfile({
    user_id: dono,
    email: "pessoa@exemplo.com",
    phone: "5511999999999",
    phone_pending: null,
    phone_code: null,
    phone_code_expires_at: null,
    inbox_slug: `slug-${dono}`,
  });
}

test("excluir conta apaga tudo que é do dono", async () => {
  const dono = `dono-${Math.random().toString(36).slice(2)}`;
  await semearConta(dono);

  assert.equal((await memoryStore.listReminders(dono)).length, 1);
  assert.equal((await memoryStore.listPurchases(dono)).length, 1);
  assert.ok(await memoryStore.getProfile(dono));

  const { apagadas } = await memoryStore.deleteOwner(dono);

  assert.equal(apagadas.reminders, 1, "o lembrete tem que sair");
  assert.equal(apagadas.captures, 1, "a captura tem que sair");
  assert.equal(apagadas.purchases, 1, "a compra tem que sair");
  assert.equal(apagadas.profiles, 1, "o perfil tem que sair");
  assert.ok(apagadas.notifications >= 1, "os avisos agendados têm que sair");

  assert.deepEqual(await memoryStore.listReminders(dono), []);
  assert.deepEqual(await memoryStore.listPurchases(dono), []);
  assert.equal(await memoryStore.getProfile(dono), null);
  assert.equal(await memoryStore.findProfileBy("inbox_slug", `slug-${dono}`), null);
});

test("excluir uma conta não encosta na conta de outra pessoa", async () => {
  const alvo = `alvo-${Math.random().toString(36).slice(2)}`;
  const vizinho = `vizinho-${Math.random().toString(36).slice(2)}`;
  await semearConta(alvo);
  await semearConta(vizinho);

  await memoryStore.deleteOwner(alvo);

  assert.equal((await memoryStore.listReminders(vizinho)).length, 1, "o vizinho continua com o lembrete dele");
  assert.equal((await memoryStore.listPurchases(vizinho)).length, 1);
  assert.ok(await memoryStore.getProfile(vizinho));
});
