import assert from "node:assert/strict";
import { test } from "node:test";

import { avaliar, proximoVencimento } from "./acesso";
import type { Subscription } from "@/lib/db";

/**
 * Regras que envolvem dinheiro: errar aqui é cobrar de quem cancelou ou cortar
 * quem pagou. Por isso elas são função pura, e por isso têm teste.
 */
function assinatura(patch: Partial<Subscription>): Subscription {
  return {
    owner_id: "dono",
    customer_id: "cus_1",
    subscription_id: "sub_1",
    status: "ativa",
    valid_until: null,
    last_event_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const agora = new Date("2026-09-02T12:00:00.000Z");
const amanha = "2026-09-03T12:00:00.000Z";
const ontem = "2026-09-01T12:00:00.000Z";

test("sem assinatura não há acesso", () => {
  const acesso = avaliar(null, agora);
  assert.equal(acesso.liberado, false);
  assert.equal(acesso.status, "sem_assinatura");
});

test("assinatura ativa dentro do prazo libera", () => {
  assert.equal(avaliar(assinatura({ status: "ativa", valid_until: amanha }), agora).liberado, true);
});

test("quem cancelou continua até o fim do período que pagou", () => {
  const acesso = avaliar(assinatura({ status: "cancelada", valid_until: amanha }), agora);
  assert.equal(acesso.liberado, true, "cancelar não pode cortar o que já foi pago");
  assert.equal(acesso.status, "cancelada");
});

test("prazo vencido corta, mesmo com status ativa", () => {
  // Se o webhook parar de chegar, o acesso não pode ficar aberto para sempre.
  assert.equal(avaliar(assinatura({ status: "ativa", valid_until: ontem }), agora).liberado, false);
});

test("pagamento pendente ainda não libera", () => {
  assert.equal(avaliar(assinatura({ status: "pendente", valid_until: null }), agora).liberado, false);
});

test("atrasada só perde o acesso quando o período pago termina", () => {
  assert.equal(avaliar(assinatura({ status: "atrasada", valid_until: amanha }), agora).liberado, true);
  assert.equal(avaliar(assinatura({ status: "atrasada", valid_until: ontem }), agora).liberado, false);
});

test("o próximo vencimento é um mês depois do pagamento", () => {
  assert.equal(proximoVencimento(new Date("2026-09-02T12:00:00.000Z")), "2026-10-02T12:00:00.000Z");
  // Meses curtos não podem virar data inválida.
  assert.equal(proximoVencimento(new Date("2026-01-31T12:00:00.000Z")).slice(0, 7), "2026-03");
});
