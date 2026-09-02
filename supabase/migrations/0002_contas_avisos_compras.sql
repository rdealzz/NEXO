-- NEXO — contas, avisos materializados e compras.
--
-- Três mudanças estruturais:
--
-- 1. Lembrete pode não ter data. É a "caixa de entrada": a pessoa joga aqui e
--    resolve quando quiser.
-- 2. O aviso vira linha própria (`notifications`). O despachante passa a ler
--    só `sent_at is null and notify_at <= now()`, em índice parcial, em vez de
--    varrer os lembretes de toda a base.
-- 3. Antecedência em minutos, não dias — a spec pede "10 min antes" tanto
--    quanto "30 dias antes".

-- ---------------------------------------------------------------- captures
alter table public.captures add column if not exists file_path text;

-- --------------------------------------------------------------- reminders
alter table public.reminders alter column due_date drop not null;

alter table public.reminders add column if not exists lead_minutes integer[];
update public.reminders
   set lead_minutes = coalesce((select array_agg(d * 1440) from unnest(lead_days) as d), '{0}')
 where lead_minutes is null;
alter table public.reminders alter column lead_minutes set not null;
alter table public.reminders alter column lead_minutes set default '{0}';
alter table public.reminders drop column if exists lead_days;

alter table public.reminders add column if not exists repeat_rule text;
update public.reminders
   set repeat_rule = 'meses:' || repeat_months
 where repeat_rule is null and repeat_months is not null;
alter table public.reminders drop column if exists repeat_months;
alter table public.reminders
  add constraint reminders_repeat_rule_check
  check (repeat_rule is null or repeat_rule ~ '^(dias|semanas|meses|anos|mensal|semanal):[0-9]{1,3}$');

-- notified_leads era o controle de "já avisei"; agora isso mora em notifications.
alter table public.reminders drop column if exists notified_leads;

-- ----------------------------------------------------------- notifications
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  reminder_id  uuid not null references public.reminders(id) on delete cascade,
  owner_id     text not null,
  lead_minutes integer not null,
  notify_at    timestamptz not null,
  sent_at      timestamptz,
  unique (reminder_id, lead_minutes)
);

-- O índice que sustenta o despachante: só o que ainda não saiu.
create index if not exists notifications_due_idx
  on public.notifications (notify_at)
  where sent_at is null;

-- --------------------------------------------------------------- purchases
create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  owner_id        text not null,
  capture_id      uuid references public.captures(id) on delete set null,
  product         text not null,
  brand           text,
  model           text,
  store           text,
  purchased_on    date,
  amount_brl      numeric(12,2),
  invoice_number  text,
  warranty_months integer,
  warranty_until  date,
  created_at      timestamptz not null default now()
);

create index if not exists purchases_owner_idx on public.purchases (owner_id, purchased_on desc);
-- Para responder "quais produtos meus ainda estão na garantia?".
create index if not exists purchases_warranty_idx on public.purchases (owner_id, warranty_until)
  where warranty_until is not null;

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  phone      text unique,
  inbox_slug text not null unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- RLS
-- owner_id continua text: guarda tanto o auth.uid() de uma conta quanto o id
-- anônimo de quem ainda não entrou. As policies só liberam o primeiro caso —
-- dados anônimos seguem acessíveis apenas pelo service role, do servidor.
alter table public.notifications enable row level security;
alter table public.purchases     enable row level security;
alter table public.profiles      enable row level security;

drop policy if exists "dono lê suas capturas"   on public.captures;
drop policy if exists "dono lê seus lembretes"  on public.reminders;
drop policy if exists "dono lê seus avisos"     on public.notifications;
drop policy if exists "dono lê suas compras"    on public.purchases;
drop policy if exists "dono lê seu perfil"      on public.profiles;

create policy "dono lê suas capturas"  on public.captures      for select using (owner_id = auth.uid()::text);
create policy "dono lê seus lembretes" on public.reminders     for select using (owner_id = auth.uid()::text);
create policy "dono lê seus avisos"    on public.notifications for select using (owner_id = auth.uid()::text);
create policy "dono lê suas compras"   on public.purchases     for select using (owner_id = auth.uid()::text);
create policy "dono lê seu perfil"     on public.profiles      for select using (user_id = auth.uid());

-- Escrita passa sempre pelo backend (service role), que valida o dono antes.

-- --------------------------------------------------------------- storage
-- Notas fiscais e boletos são documentos pessoais: bucket privado, sem policy
-- de leitura pública. O app serve o arquivo por URL assinada quando precisar.
insert into storage.buckets (id, name, public)
values ('capturas', 'capturas', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ limpeza
drop function if exists public.nexo_mark_notified(uuid, integer);
