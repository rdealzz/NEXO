-- NEXO — o despachante rodando a cada minuto.
--
-- "Aviso 10 minutos antes" só é verdade se alguém olhar os avisos vencidos com
-- frequência maior que a menor antecedência que o produto oferece. Nenhum dos
-- agendadores de graça chega lá: o cron da Vercel no plano Hobby aceita uma vez
-- por dia, e o GitHub Actions não desce de 5 minutos (e ainda atrasa).
--
-- O pg_cron do Postgres desce. Ele roda dentro do banco, a cada minuto, e faz
-- um POST na rota de despacho — que continua sendo pura leitura de índice, sem
-- nenhuma chamada de IA.
--
-- COMO APLICAR (uma vez, no SQL Editor do Supabase):
--   1. troque __NEXO_URL__ pela URL pública do app (sem barra no fim)
--   2. troque __CRON_SECRET__ pelo mesmo valor da variável CRON_SECRET
--   3. rode este arquivo
--
-- Para conferir:    select * from cron.job;
-- Para desativar:   select cron.unschedule('nexo-avisos');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reagendar é idempotente: sem isto, aplicar de novo criaria um segundo job e
-- a pessoa receberia cada aviso duas vezes.
select cron.unschedule('nexo-avisos')
where exists (select 1 from cron.job where jobname = 'nexo-avisos');

select cron.schedule(
  'nexo-avisos',
  '* * * * *',
  $$
  select net.http_post(
    url     := '__NEXO_URL__/api/cron/dispatch',
    headers := jsonb_build_object(
      'content-type',  'application/json',
      'authorization', 'Bearer __CRON_SECRET__'
    ),
    timeout_milliseconds := 30000
  );
  $$
);
