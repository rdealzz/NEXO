/**
 * As credenciais do Supabase, lidas em tempo de execução.
 *
 * Por que este arquivo existe: o Next grava toda variável `NEXT_PUBLIC_*`
 * dentro do pacote JavaScript durante o `next build` e congela o valor ali.
 * Preencher a variável no painel do provedor depois de publicar não muda nada
 * até acontecer um novo build — e o efeito disso é silencioso e pior do que
 * parece: `supabaseAvailable()` fica falso, `store()` cai no armazenamento em
 * memória, e o app segue funcionando na tela enquanto tudo que a pessoa salva
 * morre no próximo reinício.
 *
 * No NEXO nada disso precisava do prefixo: o Supabase só é usado no servidor —
 * não existe `createBrowserClient` em lugar nenhum. Sem o prefixo, o valor é
 * lido a cada requisição e a chave para de viajar para o navegador à toa.
 *
 * Os nomes com prefixo continuam aceitos como segunda opção, para não quebrar
 * ambiente já configurado. Só leitura de ambiente aqui, sem dependência: o
 * middleware roda na edge e não carrega módulo de Node.
 */

export function urlDoSupabase(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function chaveAnonima(): string | undefined {
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** A chave que ignora as políticas de linha. Nunca teve prefixo, e nem pode ter. */
export function chaveDeServico(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}
