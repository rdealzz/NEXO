-- NEXO — vínculo verificado de telefone.
--
-- O telefone resolve o dono de tudo que chega pelo WhatsApp, então declarar um
-- número não pode bastar: senão alguém digitaria o número de outra pessoa e
-- passaria a receber o material dela. O número só vale depois que um código
-- enviado para ele volta pelo app.

alter table public.profiles add column if not exists phone_pending text;
alter table public.profiles add column if not exists phone_code text;
alter table public.profiles add column if not exists phone_code_expires_at timestamptz;
