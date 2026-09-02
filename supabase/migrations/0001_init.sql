-- NEXO — esquema inicial.
--
-- owner_id é texto porque a v0 usa um identificador anônimo por dispositivo
-- (cookie `nexo_owner`). Quando entrar o Supabase Auth, a coluna vira
-- `uuid references auth.users` e as policies passam a comparar com auth.uid().

create extension if not exists "pgcrypto";

create table if not exists public.captures (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null,
  kind        text not null check (kind in ('texto','imagem','documento','audio','email')),
  summary     text not null,
  raw_text    text,
  file_name   text,
  analysis    jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.reminders (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null,
  capture_id     uuid references public.captures(id) on delete set null,
  title          text not null,
  due_date       date not null,
  due_time       text,
  lead_days      integer[] not null default '{0}',
  category       text not null,
  why            text,
  confidence     real,
  entity_name    text,
  repeat_months  integer,
  notified_leads integer[] not null default '{}',
  status         text not null default 'pendente' check (status in ('pendente','concluido','arquivado')),
  created_at     timestamptz not null default now()
);

create index if not exists reminders_owner_due_idx on public.reminders (owner_id, due_date);
-- O despachante varre só o que ainda está de pé.
create index if not exists reminders_pending_idx on public.reminders (due_date) where status = 'pendente';
create index if not exists captures_owner_idx on public.captures (owner_id, created_at desc);

-- Marca uma antecedência como avisada sem sobrescrever avisos concorrentes.
create or replace function public.nexo_mark_notified(p_reminder uuid, p_lead integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reminders
     set notified_leads = array(select distinct unnest(notified_leads || array[p_lead]))
   where id = p_reminder;
$$;

alter table public.captures  enable row level security;
alter table public.reminders enable row level security;

-- Nenhuma policy permissiva: o acesso é exclusivamente pelo service role, que
-- ignora RLS. Isso fecha a porta para o anon key ler dados de outra pessoa
-- enquanto o owner_id ainda é um id de dispositivo.
