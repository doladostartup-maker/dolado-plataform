-- DoLado — Agendamento diário da verificação de alertas de promoção
-- (Fase 4). Chama a Edge Function `verificar-alertas-promocao` todos os
-- dias às 08:05 UTC via pg_cron + pg_net (5 minutos depois do job de
-- fidelização, para não disparar os dois exactamente ao mesmo segundo).
--
-- Pré-requisito manual (uma vez só, feito por fora desta migração — nunca
-- comitar segredos em ficheiros): criar o segredo no Vault com o MESMO
-- valor da secret `CRON_SECRET_PROMOCAO` da Edge Function:
--
--   select vault.create_secret('<valor aleatório>', 'alertas_promocao_cron_secret');
--   supabase secrets set CRON_SECRET_PROMOCAO=<o mesmo valor aleatório>
--
-- pg_cron e pg_net já foram activados pela migração
-- 20260924110000_cron_alertas_fidelizacao.sql — "if not exists" aqui é só
-- para esta migração poder correr de forma independente.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'verificar-alertas-promocao-diario',
    '5 8 * * *',
    $$
    select
      net.http_post(
        url := 'https://eqsmzczjyrcrsbfqioxt.supabase.co/functions/v1/verificar-alertas-promocao',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'alertas_promocao_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $$
  );
