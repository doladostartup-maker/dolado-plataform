-- DoLado — Monitor de Proteção: alertas de datas (PR B)
--
-- Os alertas de fidelização e de promoção passaram para o Monitor
-- (20261003090000_monitor_protecao_base.sql). A Edge Function única
-- verificar-monitor-datas substitui verificar-alertas-fidelizacao e
-- verificar-alertas-promocao: os agendamentos antigos são removidos para
-- que nenhum alerta saia em duplicado (o mesmo alerta existe nas tabelas
-- antigas e no Monitor até à remoção das antigas).
--
-- ORDEM DE DEPLOY: publicar primeiro a Edge Function
-- (supabase functions deploy verificar-monitor-datas) e só depois aplicar
-- esta migration.
--
-- O segredo do cron é o mesmo das funções anteriores (CRON_SECRET na Edge
-- Function = 'alertas_fidelizacao_cron_secret' no Vault).

select cron.unschedule(jobname)
  from cron.job
 where jobname in ('verificar-alertas-fidelizacao-diario', 'verificar-alertas-promocao-diario');

select
  cron.schedule(
    'verificar-monitor-datas-diario',
    '0 8 * * *',
    $$
    select
      net.http_post(
        url := 'https://eqsmzczjyrcrsbfqioxt.supabase.co/functions/v1/verificar-monitor-datas',
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
