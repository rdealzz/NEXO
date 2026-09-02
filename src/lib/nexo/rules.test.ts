import assert from "node:assert/strict";
import { test } from "node:test";

import { mergeFollowUps, suggestFollowUps } from "./rules";

// Tipada a partir da própria função: evita duas identidades do mesmo tipo
// quando o runner importa com extensão e o app sem.
type Analysis = Parameters<typeof suggestFollowUps>[0];

function analysis(over: Partial<Analysis> = {}): Analysis {
  return {
    understood: true,
    summary: "Nota fiscal de uma geladeira",
    category: "garantia",
    entity: { kind: "eletrodomestico", name: "Geladeira Brastemp Inverse", identifier: null },
    amount_brl: 4299.9,
    purchase: null,
    reminders: [],
    proactive_followups: [],
    needs_confirmation: false,
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
  assert.equal(found.find((f) => f.rule_id === "veiculo.revisao")?.repeat_rule, "meses:6");
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

test("sugestão do modelo entra quando a tabela não cobre", () => {
  const chuveiro = analysis({
    entity: { kind: "eletronico", name: "Chuveiro Lorenzetti", identifier: null },
  });
  const merged = mergeFollowUps(
    suggestFollowUps(chuveiro, "2026-10-01"),
    [{ title: "Trocar a resistência", suggested_date: "2027-04-01", why: "resistência dura cerca de 6 meses" }],
    "2026-10-01",
  );
  assert.deepEqual(merged.map((f) => f.rule_id), ["eletronico.garantia", "modelo.0"]);
});

test("sugestão do modelo que repete a tabela é descartada", () => {
  const rules = suggestFollowUps(analysis(), "2026-10-01");
  const merged = mergeFollowUps(
    rules,
    [{ title: "Fim da garantia do fabricante", suggested_date: "2028-01-01", why: "duplicata" }],
    "2026-10-01",
  );
  assert.equal(merged.length, rules.length);
});

test("sugestão do modelo com data ruim ou no passado é descartada", () => {
  const merged = mergeFollowUps(
    [],
    [
      { title: "Coisa vaga", suggested_date: "em breve", why: "x" },
      { title: "Outra coisa", suggested_date: "2020-01-01", why: "x" },
    ],
    "2026-10-01",
  );
  assert.deepEqual(merged, []);
});
