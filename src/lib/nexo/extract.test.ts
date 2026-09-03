import assert from "node:assert/strict";
import { test } from "node:test";

import { completar, SCHEMA_JSON } from "./extract";
import { CaptureAnalysisSchema } from "./schema";

/**
 * O contrato com o provedor de IA.
 *
 * A chamada em si não tem teste — depende de chave e de rede. O que tem teste é
 * a fronteira: o schema que sai daqui e a tolerância à resposta que chega. É aí
 * que uma captura morre calada, não na chamada.
 */

/** Uma resposta completa, do jeito que o modelo deveria devolver. */
function respostaCompleta() {
  return {
    understood: true,
    summary: "Conta de luz da Enel",
    category: "financeiro",
    entity: { kind: "conta", name: "Enel" },
    purchase: null,
    amount_brl: 187.42,
    reminders: [
      {
        title: "Pagar conta de luz",
        due_date: "2026-09-10",
        due_time: null,
        lead_minutes: [4320, 0],
        repeat_rule: null,
        category: "financeiro",
        why: "Vencimento lido no boleto",
        confidence: 0.94,
        source_quote: "Vencimento: 10/09",
      },
    ],
    proactive_followups: [],
    needs_confirmation: false,
    clarification: null,
    tags: ["luz"],
  };
}

test("o schema enviado ao provedor descreve um objeto com os campos do contrato", () => {
  const js = SCHEMA_JSON as { type?: string; properties?: Record<string, unknown> };
  assert.equal(js.type, "object");
  // Se um destes sumir do schema, o modelo deixa de ser instruído a devolvê-lo.
  for (const campo of ["understood", "summary", "category", "reminders", "needs_confirmation"]) {
    assert.ok(js.properties?.[campo], `o schema precisa descrever "${campo}"`);
  }
});

test("resposta completa passa pela validação sem ajuste", () => {
  const conferido = CaptureAnalysisSchema.safeParse(completar(respostaCompleta()));
  assert.equal(conferido.success, true, "a forma esperada não pode ser recusada");
});

test("campo anulável omitido pelo modelo é lido como 'não achei nada'", () => {
  // `anyOf` no JSON Schema é a parte que provedor nenhum garante honrar: o mais
  // comum é omitir a chave. Omissão não pode derrubar a captura inteira.
  const semNulos = respostaCompleta() as Record<string, unknown>;
  for (const campo of ["entity", "purchase", "amount_brl", "clarification"]) delete semNulos[campo];

  const conferido = CaptureAnalysisSchema.safeParse(completar(semNulos));
  assert.equal(conferido.success, true, "omitir um anulável não pode virar erro de schema");
  assert.equal(conferido.data?.entity, null);
  assert.equal(conferido.data?.amount_brl, null);
});

test("lista omitida vira lista vazia, não erro", () => {
  const semListas = respostaCompleta() as Record<string, unknown>;
  delete semListas.proactive_followups;
  delete semListas.tags;

  const conferido = CaptureAnalysisSchema.safeParse(completar(semListas));
  assert.equal(conferido.success, true);
  assert.deepEqual(conferido.data?.proactive_followups, []);
  assert.deepEqual(conferido.data?.tags, []);
});

test("resposta sem o essencial continua sendo recusada", () => {
  // A tolerância acima é só para o que é legitimamente ausente. Um resumo
  // faltando é resposta quebrada, e passar isso adiante criaria lembrete vazio.
  const semResumo = respostaCompleta() as Record<string, unknown>;
  delete semResumo.summary;

  const conferido = CaptureAnalysisSchema.safeParse(completar(semResumo));
  assert.equal(conferido.success, false, "campo essencial ausente tem que falhar");
});

test("anulável aninhado omitido também é preenchido", () => {
  // O caso que uma lista escrita à mão não pegava: `identifier` mora dentro de
  // `entity`, e o modelo omite sempre que não há placa nem número de contrato.
  const aninhado = respostaCompleta() as Record<string, unknown>;
  aninhado.entity = { kind: "conta", name: "Enel" }; // sem identifier
  (aninhado.reminders as Record<string, unknown>[])[0].source_quote = undefined;
  delete (aninhado.reminders as Record<string, unknown>[])[0].source_quote;

  const conferido = CaptureAnalysisSchema.safeParse(completar(aninhado));
  assert.equal(conferido.success, true, "omissão aninhada não pode derrubar a captura");
  assert.equal(conferido.data?.entity?.identifier, null);
  assert.equal(conferido.data?.reminders[0].source_quote, null);
});

test("purchase omitindo os anuláveis internos ainda valida", () => {
  const comNota = respostaCompleta() as Record<string, unknown>;
  // Nota fiscal em que só o produto foi legível.
  comNota.purchase = { product: 'TV Samsung 55"' };

  const conferido = CaptureAnalysisSchema.safeParse(completar(comNota));
  assert.equal(conferido.success, true);
  assert.equal(conferido.data?.purchase?.warranty_until, null);
  assert.equal(conferido.data?.purchase?.brand, null);
});

test("completar não quebra com resposta que não é objeto", () => {
  assert.equal(completar(null), null);
  assert.equal(completar("texto"), "texto");
  assert.deepEqual(completar([1, 2]), [1, 2]);
});
