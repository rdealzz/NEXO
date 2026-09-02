import assert from "node:assert/strict";
import { test } from "node:test";

import { dueInstant, nextOccurrence, notifyAt, plannedNotifications, usableLeads } from "./schedule";

type Alvo = Parameters<typeof plannedNotifications>[0];

function lembrete(over: Partial<Alvo> = {}): Alvo {
  return { due_date: "2026-09-15", due_time: null, lead_minutes: [4320, 0], ...over };
}

test("sem hora marcada, o compromisso é às 9h de São Paulo (12h UTC)", () => {
  assert.equal(dueInstant(lembrete())?.toISOString(), "2026-09-15T12:00:00.000Z");
});

test("a antecedência é subtraída do instante do compromisso", () => {
  const consulta = lembrete({ due_time: "14:30" });
  assert.equal(notifyAt(consulta, 0)?.toISOString(), "2026-09-15T17:30:00.000Z");
  assert.equal(notifyAt(consulta, 60)?.toISOString(), "2026-09-15T16:30:00.000Z");
  assert.equal(notifyAt(consulta, 1440)?.toISOString(), "2026-09-14T17:30:00.000Z");
});

test("item sem data não gera aviso nenhum: é caixa de entrada", () => {
  assert.equal(dueInstant(lembrete({ due_date: null })), null);
  assert.deepEqual(plannedNotifications(lembrete({ due_date: null })), []);
});

test("um lembrete vira uma linha de aviso por antecedência, da mais distante à mais próxima", () => {
  assert.deepEqual(plannedNotifications(lembrete({ lead_minutes: [0, 4320, 4320] })), [
    { lead_minutes: 4320, notify_at: "2026-09-12T12:00:00.000Z" },
    { lead_minutes: 0, notify_at: "2026-09-15T12:00:00.000Z" },
  ]);
});

test("antecedência que já passou é podada na criação", () => {
  const agora = new Date("2026-09-14T11:00:00.000Z");
  assert.deepEqual(usableLeads(lembrete(), [43200, 1440, 0], agora), [1440, 0]);
});

test("quando toda antecedência já passou, sobra o aviso na hora", () => {
  const agora = new Date("2026-09-15T11:00:00.000Z");
  assert.deepEqual(usableLeads(lembrete(), [43200, 4320], agora), [0]);
});

test("recorrência entende as regras que o modelo escreve", () => {
  assert.equal(nextOccurrence("2026-09-15", "meses:6"), "2027-03-15");
  assert.equal(nextOccurrence("2026-09-15", "anos:1"), "2027-09-15");
  assert.equal(nextOccurrence("2026-09-15", "dias:15"), "2026-09-30");
  // Todo dia 5: anda um mês e fixa o dia.
  assert.equal(nextOccurrence("2026-09-05", "mensal:5"), "2026-10-05");
  // Toda segunda-feira (1), a partir de uma terça.
  assert.equal(nextOccurrence("2026-09-15", "semanal:1"), "2026-09-21");
});

test("regra desconhecida não vira data inventada", () => {
  assert.equal(nextOccurrence("2026-09-15", "lunar:3"), null);
  assert.equal(nextOccurrence("2026-09-15", "meses:abc"), null);
});

test("item sem data guarda a antecedência para quando a data chegar", () => {
  const agora = new Date("2026-09-01T12:00:00.000Z");
  assert.deepEqual(usableLeads(lembrete({ due_date: null }), [4320, 0], agora), [4320, 0]);
});
