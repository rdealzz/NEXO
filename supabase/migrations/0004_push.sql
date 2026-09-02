-- NEXO — assinaturas de push.
--
-- O aviso só vale se chegar no celular sem o app aberto. Cada navegador/aparelho
-- que autoriza avisos vira uma linha aqui; o despachante manda para todas as do
-- dono. Uma pessoa costuma ter mais de uma (celular e PC), e uma assinatura
-- morre sozinha quando a pessoa desinstala o app ou limpa o navegador — por
-- isso o despachante apaga a linha quando o serviço de push responde 404/410.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  -- O endpoint é a identidade da assinatura: reinscrever o mesmo aparelho tem
  -- que atualizar a linha, nunca duplicar o aviso.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_owner_idx
  on public.push_subscriptions (owner_id);

alter table public.push_subscriptions enable row level security;

-- Mesma regra do resto do banco: leitura só do próprio dono autenticado; toda
-- escrita passa pelo backend com o service role, que valida o dono antes.
drop policy if exists "dono lê as próprias assinaturas" on public.push_subscriptions;
create policy "dono lê as próprias assinaturas"
  on public.push_subscriptions for select
  using (auth.uid() = owner_id);
