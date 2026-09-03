import { NextResponse } from "next/server";

import { asaasConfigurado } from "@/lib/assinatura/asaas";
import { supabaseAvailable } from "@/lib/db/supabase";
import { isConfigured as iaConfigurada } from "@/lib/nexo/extract";
import { chaveAnonima, chaveDeServico, urlDoSupabase } from "@/lib/supabase/credenciais";
import { authConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O que o app publicado está realmente enxergando.
 *
 * Existe por um motivo específico: quando falta uma variável de ambiente, o
 * NEXO não quebra — ele degrada calado. Sem as credenciais do banco, `store()`
 * cai no armazenamento em memória e a tela continua funcionando enquanto tudo
 * que a pessoa salva morre no próximo reinício. Descobrir isso pela ausência
 * dos dados, dias depois, é o pior jeito possível.
 *
 * Aqui a resposta é sempre booleana. Nenhum valor de chave sai por este
 * endereço — só a informação de que ela está lá ou não, que é o suficiente
 * para saber o que configurar e não serve para ninguém que não deveria ler.
 *
 * `guardando` é a linha que importa: "supabase" significa que os lembretes
 * estão indo para o banco. "memoria" significa que estão sendo perdidos.
 */
export async function GET() {
  const banco = supabaseAvailable();

  return NextResponse.json({
    guardando: banco ? "supabase" : "memoria (os dados somem no reinício)",
    login: authConfigured() ? "ligado" : "desligado",
    leitura_de_capturas: iaConfigurada() ? "ligada" : "desligada",
    cobranca: asaasConfigurado() ? "ligada" : "desligada",

    // Quais variáveis chegaram até o servidor. Só presença, nunca conteúdo.
    variaveis: {
      SUPABASE_URL: Boolean(urlDoSupabase()),
      SUPABASE_ANON_KEY: Boolean(chaveAnonima()),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(chaveDeServico()),
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      CRON_SECRET: Boolean(process.env.CRON_SECRET),
    },

    // O que resolver primeiro, em ordem de gravidade.
    falta: [
      !banco && "SUPABASE_SERVICE_ROLE_KEY e SUPABASE_URL — sem elas nada é salvo de verdade",
      !authConfigured() && "SUPABASE_URL e SUPABASE_ANON_KEY — sem elas não há login",
      !iaConfigurada() && "GEMINI_API_KEY — sem ela a captura responde 503",
    ].filter(Boolean),
  });
}
