-- NEXO — identidade e cobrança no perfil.
--
-- Nome e avatar são de quem usa: o app passa a cumprimentar a pessoa em vez de
-- mostrar o e-mail dela no cabeçalho. O endereço de cobrança fica aqui porque
-- o gateway exige para boleto e Pix, e ninguém quer digitar CEP duas vezes.
--
-- Dado de cartão NÃO entra nesta tabela, nem em nenhuma outra nossa: o número
-- é digitado na página do gateway e volta só como bandeira e quatro dígitos.

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_id text;

alter table public.profiles add column if not exists billing_cep text;
alter table public.profiles add column if not exists billing_logradouro text;
alter table public.profiles add column if not exists billing_numero text;
alter table public.profiles add column if not exists billing_complemento text;
alter table public.profiles add column if not exists billing_bairro text;
alter table public.profiles add column if not exists billing_cidade text;
alter table public.profiles add column if not exists billing_uf text;

-- O que dá para mostrar de um cartão sem guardar cartão nenhum.
alter table public.subscriptions add column if not exists card_brand text;
alter table public.subscriptions add column if not exists card_last4 text;
