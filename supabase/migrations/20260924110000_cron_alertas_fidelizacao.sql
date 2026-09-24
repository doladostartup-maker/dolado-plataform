-- DoLado — Agendamento diário da verificação de alertas de fidelização
-- (Fase 4). Chama a Edge Function `verificar-alertas-fidelizacao` todos os
-- dias às 08:00 UTC via pg_cron + pg_net.
--
-- Pré-requisito manual (uma vez só, feito por fora desta migração — nunca
-- comitar segredos em ficheiros): criar o segredo no Vault com o MESMO
-- valor da secret `CRON_SECRET` da Edge Function:
--
--   select vault.create_secret('<valor aleatório>', 'alertas_fidelizacao_cron_secret');
--   supabase secrets set CRON_SECRET=<o mesmo valor aleatório>
--
-- Sem este segredo criado no Vault, o pg_net envia o cabeçalho vazio e a
-- função responde 401 — o cron falha em silêncio (fica registado em
-- cron.job_run_details), não bloqueia mais nada.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'verificar-alertas-fidelizacao-diario',
    '0 8 * * *',
    $$
    select
      net.http_post(
        url := 'https://eqsmzczjyrcrsbfqioxt.supabase.co/functions/v1/verificar-alertas-fidelizacao',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'alertas_fidelizacao_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $$
  );
