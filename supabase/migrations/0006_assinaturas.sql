-- NEXO — assinaturas.
--
-- O estado da assinatura mora aqui, não no gateway. O app precisa responder
-- "esta pessoa está em dia?" a cada requisição, e perguntar isso ao gateway
-- toda vez seria lento, caro e frágil. O gateway avisa por webhook; nós
-- guardamos o resultado.

create table if not exists public.subscriptions (
  owner_id uuid primary key,
  -- Id do cliente e da assinatura no gateway, para conciliar depois.
  customer_id text,
  subscription_id text unique,
  -- pendente · ativa · atrasada · cancelada
  status text not null default 'pendente',
  -- Até quando o acesso vale. É este campo que o app lê, não o status: uma
  -- assinatura cancelada hoje continua valendo até o fim do período pago.
  valid_until timestamptz,
  -- Último evento aplicado, para o webhook ser idempotente.
  last_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx on public.subscriptions (customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "dono lê a própria assinatura" on public.subscriptions;
create policy "dono lê a própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = owner_id);
