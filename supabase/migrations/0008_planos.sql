-- NEXO — planos.
--
-- A assinatura passa a saber qual plano pagou: mensal, trimestral ou anual.
-- Sem isso o webhook não tem como empurrar o vencimento pelo tempo certo — ele
-- somaria um mês para quem pagou um ano.
--
-- Quem já assinou antes desta migração fica com plan_id nulo, que o app lê como
-- mensal: era o único plano que existia quando a linha foi criada.

alter table public.subscriptions
  add column if not exists plan_id text;
