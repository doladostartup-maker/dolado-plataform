-- DoLado — Retenção dos dossiês PDF (08/10/2026).
--
-- Política de Privacidade 2026-10-08: os PDF do dossiê gerados pela DoLado
-- (casos_dossies + bucket privado dossies-casos), incluindo versões
-- anteriores, são apagados 6 meses depois do encerramento do caso.
--
-- Só cobre casos_dossies. NÃO apaga links antigos em casos.dossie_url, nem os
-- anexos originais do caso, nem o registo factual do caso (eventos,
-- encerramento, textos enviados) — esses seguem o procedimento de revisão no
-- encerramento (docs/legal/decisoes-juridicas-e-ropa-2026-10-08.md).
--
-- Quem apaga é a Edge Function limpar-dossies-expirados (objeto do Storage
-- pelo caminho exato primeiro; depois o registo, por apagar_dossie_expirado).
-- Repetível depois de falhas parciais: um objeto já apagado conta como
-- apagado e o registo é removido na execução seguinte.
--
-- ORDEM DE PUBLICAÇÃO: publicar primeiro a Edge Function
-- (supabase functions deploy limpar-dossies-expirados) e só depois aplicar
-- esta migration — o agendamento chama a função a partir das 03:15 UTC.
-- Segredo: o mesmo dos outros trabalhos agendados (Vault
-- 'alertas_fidelizacao_cron_secret' = secret CRON_SECRET das Edge Functions).

-- Momento de referência: o encerramento MAIS RECENTE do caso, e só se o caso
-- continuar num estado final. Um caso reaberto por "Corrigir estado" (estado
-- não final) mantém os dossiês; um caso encerrado de novo conta 6 meses a
-- partir do novo encerramento.
create or replace function public.dossies_expirados(p_limite int default 100)
returns table (id uuid, storage_path text)
language sql
stable
set search_path = ''
as $$
  with ultimo as (
    select e.caso_id, max(e.encerrado_em) as encerrado_em
      from public.casos_encerramentos e
     group by e.caso_id
  )
  select d.id, d.storage_path
    from public.casos_dossies d
    join ultimo u on u.caso_id = d.caso_id
    join public.casos c on c.id = d.caso_id
   where u.encerrado_em <= now() - interval '6 months'
     and c.status in ('Encerrado com encaminhamento externo', 'Encerrado sem resolução', 'Resolvido', 'Bloqueado')
   order by u.encerrado_em, d.versao
   limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

comment on function public.dossies_expirados(int) is
  'Dossiês PDF (casos_dossies) cujo caso foi encerrado há 6 meses ou mais (último encerramento) e continua num estado final. Lote limitado (por omissão 100, máx. 500).';

-- Apaga o registo só depois de o objeto do Storage ter sido apagado (a Edge
-- Function confirma isso antes de chamar) e só se o dossiê continuar expirado
-- e o caminho for o mesmo que foi apagado. Devolve false se nada foi apagado.
create or replace function public.apagar_dossie_expirado(p_id uuid, p_storage_path text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_linhas integer := 0;
begin
  delete from public.casos_dossies d
   where d.id = p_id
     and d.storage_path = p_storage_path
     and exists (
       select 1 from public.casos c
        where c.id = d.caso_id
          and c.status in ('Encerrado com encaminhamento externo', 'Encerrado sem resolução', 'Resolvido', 'Bloqueado')
          and (select max(e.encerrado_em) from public.casos_encerramentos e where e.caso_id = d.caso_id)
              <= now() - interval '6 months');
  get diagnostics v_linhas = row_count;
  return v_linhas > 0;
end $$;

revoke execute on function public.dossies_expirados(int) from public, anon, authenticated;
revoke execute on function public.apagar_dossie_expirado(uuid, text) from public, anon, authenticated;
grant execute on function public.dossies_expirados(int) to service_role;
grant execute on function public.apagar_dossie_expirado(uuid, text) to service_role;

select cron.unschedule(jobname)
  from cron.job
 where jobname = 'limpar-dossies-expirados-diario';

select cron.schedule(
  'limpar-dossies-expirados-diario',
  '15 3 * * *',
  $$
    select net.http_post(
      url := 'https://eqsmzczjyrcrsbfqioxt.supabase.co/functions/v1/limpar-dossies-expirados',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'alertas_fidelizacao_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
