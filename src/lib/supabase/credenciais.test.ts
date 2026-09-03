import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { chaveAnonima, chaveDeServico, urlDoSupabase } from "./credenciais";

/**
 * A leitura das credenciais tem teste por um motivo específico: quando ela
 * falha, nada quebra na tela. `supabaseAvailable()` fica falso, o app cai no
 * armazenamento em memória e segue funcionando — até o próximo reinício levar
 * tudo que a pessoa salvou. Falha silenciosa que só aparece como perda de dado
 * é exatamente o tipo que precisa de teste.
 */

const original = { ...process.env };

afterEach(() => {
  for (const chave of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    delete process.env[chave];
    if (original[chave] !== undefined) process.env[chave] = original[chave];
  }
});

test("o nome sem prefixo é o preferido", () => {
  process.env.SUPABASE_URL = "https://sem-prefixo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://com-prefixo.supabase.co";
  assert.equal(urlDoSupabase(), "https://sem-prefixo.supabase.co");
});

test("o nome com prefixo ainda funciona sozinho", () => {
  // Quem já configurou com o nome antigo não pode ficar sem login por causa da
  // troca de preferência.
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://antigo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-antiga";

  assert.equal(urlDoSupabase(), "https://antigo.supabase.co");
  assert.equal(chaveAnonima(), "chave-antiga");
});

test("sem nenhuma das duas, devolve indefinido em vez de string vazia", () => {
  // String vazia passaria no Boolean() de quem chama e viraria um cliente
  // apontando para lugar nenhum.
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(urlDoSupabase(), undefined);
});

test("a chave de serviço não aceita variante com prefixo", () => {
  // Ela ignora as políticas de linha: se fosse para o pacote do navegador,
  // qualquer pessoa leria o banco inteiro.
  process.env.SUPABASE_SERVICE_ROLE_KEY = "servico";
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "vazado";
  assert.equal(chaveDeServico(), "servico");

  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(chaveDeServico(), undefined, "não pode haver caminho com prefixo para a chave de serviço");
  delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
});
