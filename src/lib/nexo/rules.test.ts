import assert from "node:assert/strict";
import { test } from "node:test";

import { suggestFollowUps } from "./rules.ts";
import type { CaptureAnalysis } from "./schema.ts";

function analysis(over: Partial<CaptureAnalysis> = {}): CaptureAnalysis {
  return {
    understood: true,
    summary: "Nota fiscal de uma geladeira",
    category: "garantia",
    entity: { kind: "eletrodomestico", name: "Geladeira Brastemp Inverse", identifier: null },
    amount_brl: 4299.9,
    reminders: [],
    clarification: null,
    tags: [],
    ...over,
  };
}

const FUTURO = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

test("eletrodoméstico gera garantia legal, garantia do fabricante e filtro", () => {
  const found = suggestFollowUps(analysis(), FUTURO).map((f) => f.rule_id);
  assert.deepEqual(found, ["eletro.garantia_legal", "eletro.garantia_fabricante", "eletro.filtro"]);
});

test("regra condicional não dispara para o produto errado", () => {
  const tv = analysis({
    entity: { kind: "eletrodomestico", name: "Smart TV 55", identifier: null },
  });
  const found = suggestFollowUps(tv, FUTURO).map((f) => f.rule_id);
  assert.ok(!found.includes("eletro.filtro"), "TV não tem filtro de água");
});

test("a âncora define as datas: garantia legal cai 90 dias depois", () => {
  const [legal] = suggestFollowUps(analysis(), "2026-10-01");
  assert.equal(legal.rule_id, "eletro.garantia_legal");
  assert.equal(legal.due_date, "2026-12-30");
});

test("veículo conhece revisão, seguro, licenciamento e pneus", () => {
  const carro = analysis({
    category: "veiculo",
    entity: { kind: "veiculo", name: "Honda Civic 2019", identifier: "ABC1D23" },
  });
  const found = suggestFollowUps(carro, FUTURO);
  assert.deepEqual(found.map((f) => f.rule_id).sort(), [
    "veiculo.licenciamento",
    "veiculo.pneus",
    "veiculo.revisao",
    "veiculo.seguro",
  ]);
  assert.equal(found.find((f) => f.rule_id === "veiculo.revisao")?.repeat_months, 6);
});

test("kind com acento e espaço ainda encontra a regra", () => {
  const plano = analysis({
    entity: { kind: "Plano Saúde", name: "Unimed", identifier: null },
  });
  assert.deepEqual(suggestFollowUps(plano, FUTURO).map((f) => f.rule_id), ["saude.reajuste"]);
});

test("sem entidade conhecida não inventa sugestão", () => {
  assert.deepEqual(suggestFollowUps(analysis({ entity: null }), FUTURO), []);
  assert.deepEqual(
    suggestFollowUps(analysis({ entity: { kind: "coisa_qualquer", name: "x", identifier: null } }), FUTURO),
    [],
  );
});

test("sugestão que cairia no passado é descartada", () => {
  assert.deepEqual(suggestFollowUps(analysis(), "2020-01-01"), []);
});
