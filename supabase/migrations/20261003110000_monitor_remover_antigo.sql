-- DoLado — Monitor de Proteção: remover o que foi substituído (PR C)
--
-- Os alertas de fidelização, de promoção e o Comparador de Faturas passaram
-- para o Monitor de Proteção (20261003090000_monitor_protecao_base.sql, com
-- cópia dos alertas existentes; portal novo em produção a 02/10/2026; os
-- agendamentos antigos saíram em 20261003100000_monitor_cron.sql).
-- Verificado em produção antes desta migration: nenhum alerta novo nas
-- tabelas antigas depois da cópia (3 de fidelização, 1 de promoção e 0
-- comparações, todos já no Monitor) e os buckets antigos vazios.
--
-- Os buckets faturas-comparador e contratos-promocao (vazios) não podem ser
-- apagados por SQL (storage.protect_delete): apagar no Dashboard da Supabase
-- (Storage). Aqui saem só as policies.

-- 1. Fim da Proteção e limpeza: só setores do aviso sectorial e Monitor.
create or replace function public.alertas_seguir_protecao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes boolean := false;
  v_agora boolean := public.protecao_ativa(new.subscription_plan, new.subscription_status);
begin
  if tg_op = 'UPDATE' then
    v_antes := public.protecao_ativa(old.subscription_plan, old.subscription_status);
  end if;

  if v_antes and not v_agora then
    update public.preferencias_setor set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.contratos_monitorizados set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.documentos_monitor set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
  elsif v_agora and not v_antes then
    update public.preferencias_setor set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.contratos_monitorizados set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.documentos_monitor set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
  end if;

  return null;
end $$;

revoke execute on function public.alertas_seguir_protecao() from public, anon, authenticated;

create or replace function public.limpar_alertas_desativados()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_limite timestamptz := now() - public.retencao_alertas_desativados();
  v_total integer := 0;
  v_n integer;
begin
  delete from public.preferencias_setor where desativado_em <= v_limite;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  -- Contratos só quando já não têm documentos (os ficheiros são apagados
  -- primeiro pela Edge Function verificar-monitor-datas).
  delete from public.contratos_monitorizados c
   where c.desativado_em <= v_limite
     and not exists (select 1 from public.documentos_monitor d where d.contrato_id = c.id);
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return v_total;
end $$;

revoke execute on function public.limpar_alertas_desativados() from public, anon, authenticated, service_role;

-- 2. Funções e tabelas antigas.
drop function if exists public.alertas_fidelizacao_pendentes(text, date, date);
drop function if exists public.alertas_promocao_pendentes(text, date, date);
drop function if exists public.alertas_promocao_expirados();
drop function if exists public.apagar_alerta_promocao_expirado(uuid);

drop table if exists public.alertas_fidelizacao_portal;
drop table if exists public.alertas_promocao_portal;
drop table if exists public.comparacoes_fatura_portal;

-- Trigger que forçava o e-mail/nome da conta nos alertas antigos.
drop function if exists public.alertas_portal_contacto_da_conta();

-- 3. Storage: policies dos buckets antigos; os documentos do Monitor só
-- vivem em documentos-monitor (nenhum ficheiro migrado ficou no bucket antigo).
drop policy if exists "Admin gere contratos de promoção no storage" on storage.objects;
drop policy if exists "Admin gere faturas no storage" on storage.objects;

alter table public.documentos_monitor drop constraint if exists documentos_monitor_bucket_check;
alter table public.documentos_monitor
  add constraint documentos_monitor_bucket_check check (bucket = 'documentos-monitor');

-- 4. Ficheiros órfãos: carregados por URL assinada mas nunca registados
-- (o cliente fechou a página antes de submeter). Ao fim de 24 horas a Edge
-- Function verificar-monitor-datas apaga-os pela API do Storage.
create or replace function public.monitor_ficheiros_orfaos()
returns table (storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'documentos-monitor'
     and o.created_at < now() - interval '24 hours'
     and not exists (
       select 1 from public.documentos_monitor d
        where d.bucket = 'documentos-monitor' and d.storage_path = o.name
     )
   limit 500;
$$;

revoke execute on function public.monitor_ficheiros_orfaos() from public, anon, authenticated;
grant execute on function public.monitor_ficheiros_orfaos() to service_role;
