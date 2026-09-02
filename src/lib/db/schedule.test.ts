import assert from "node:assert/strict";
import { test } from "node:test";

import { notifyAt, pendingNotifications, usableLeads } from "./schedule.ts";
import type { Reminder } from "./types.ts";

function reminder(over: Partial<Reminder> = {}): Reminder {
  return {
    id: "r1",
    owner_id: "o1",
    capture_id: null,
    title: "Pagar boleto",
    due_date: "2026-09-15",
    due_time: null,
    lead_days: [3, 0],
    category: "financeiro",
    why: null,
    confidence: null,
    entity_name: null,
    repeat_months: null,
    notified_leads: [],
    status: "pendente",
    created_at: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

test("sem hora marcada, o aviso sai às 9h de São Paulo (12h UTC)", () => {
  assert.equal(notifyAt(reminder(), 0).toISOString(), "2026-09-15T12:00:00.000Z");
  assert.equal(notifyAt(reminder(), 3).toISOString(), "2026-09-12T12:00:00.000Z");
});

test("com hora marcada, o aviso do dia respeita a hora", () => {
  const consulta = reminder({ due_time: "14:30", lead_days: [1, 0] });
  assert.equal(notifyAt(consulta, 0).toISOString(), "2026-09-15T17:30:00.000Z");
  // A antecedência continua de manhã: avisar 1 dia antes às 14h30 não ajuda.
  assert.equal(notifyAt(consulta, 1).toISOString(), "2026-09-14T12:00:00.000Z");
});

test("só sai o aviso cuja hora já chegou", () => {
  const antes = new Date("2026-09-12T11:59:00.000Z");
  assert.deepEqual(pendingNotifications([reminder()], antes), []);

  const depois = new Date("2026-09-12T12:00:00.000Z");
  assert.deepEqual(
    pendingNotifications([reminder()], depois).map((n) => n.lead),
    [3],
  );
});

test("aviso já enviado não sai de novo", () => {
  const now = new Date("2026-09-15T13:00:00.000Z");
  const enviado = reminder({ notified_leads: [3] });
  assert.deepEqual(
    pendingNotifications([enviado], now).map((n) => n.lead),
    [0],
  );
});

test("lembrete concluído não notifica", () => {
  const now = new Date("2026-09-15T13:00:00.000Z");
  assert.deepEqual(pendingNotifications([reminder({ status: "concluido" })], now), []);
});

test("antecedência que já passou é podada na criação", () => {
  assert.deepEqual(usableLeads("2026-09-15", [30, 7, 0], "2026-09-01"), [7, 0]);
  assert.deepEqual(usableLeads("2026-09-15", [3, 0], "2026-09-01"), [3, 0]);
});

test("quando toda antecedência já passou, sobra o aviso do dia", () => {
  assert.deepEqual(usableLeads("2026-09-02", [30, 7], "2026-09-01"), [0]);
});
