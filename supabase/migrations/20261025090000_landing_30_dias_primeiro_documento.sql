-- Landing /30-dias-gratis — funil (21/10/2026): acrescenta ao funil de
-- protecao_gratuita_metricas() a última etapa, "primeiro documento
-- adicionado" (activações com origem 'landing_30d' com um documento do
-- Monitor carregado durante o período gratuito). Só contagens, só admin;
-- o resto da função fica igual à de 20261020090000.

create or replace function public.protecao_gratuita_metricas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
  v_landing jsonb;
begin
  if not public.is_admin() then
    raise exception 'protecao_gratuita_metricas: só admin';
  end if;

  select jsonb_build_object(
    'ativadas', count(*),
    'ativas_agora', count(*) filter (where g.estado = 'ativa' and g.termina_em > now()),
    'contas_novas', count(*) filter (where au.created_at > g.inicio_em - interval '24 hours'),
    'com_documentos', count(*) filter (where exists (
        select 1 from public.documentos_monitor d
         where d.utilizador_id = g.user_id and d.created_at between g.inicio_em and g.termina_em)),
    'com_analise', count(*) filter (where exists (
        select 1 from public.documentos_monitor d
         where d.utilizador_id = g.user_id and d.etapa = 'concluido'
           and d.created_at between g.inicio_em and g.termina_em)),
    'chegaram_ao_fim', count(*) filter (where g.termina_em <= now()),
    'convertidas', count(*) filter (where g.estado = 'convertida'),
    'convertidas_durante', count(*) filter (where g.estado = 'convertida' and g.convertida_em < g.termina_em),
    'convertidas_caso_protecao', count(*) filter (where g.convertida_plano = 'caso_protecao'),
    'cancelamentos_posteriores', count(*) filter (where g.estado = 'convertida' and exists (
        select 1 from public.subscricao_cancelamentos c
         where c.user_id = g.user_id and c.pedido_em >= g.convertida_em and c.revertido_em is null)),
    'por_origem', coalesce((
        select jsonb_object_agg(o.origem, o.n)
          from (select origem, count(*) as n from public.protecao_gratuita group by origem) o
      ), '{}'::jsonb)
  )
    into v
    from public.protecao_gratuita g
    left join auth.users au on au.id = g.user_id;

  -- Funil da landing /30-dias-gratis: uma linha por conta (sem duplicados).
  select jsonb_build_object(
    'contas_criadas', count(*),
    'emails_confirmados', count(*) filter (where au.email_confirmed_at is not null),
    'ativadas_destas_contas', count(*) filter (where exists (
        select 1 from public.protecao_gratuita g where g.user_id = au.id)),
    'ativadas', (select count(*) from public.protecao_gratuita g where g.origem = 'landing_30d'),
    -- Activações da landing com pelo menos um documento (factura ou
    -- contrato) adicionado durante o período gratuito: o primeiro passo
    -- de valor depois de activar. Só contagem.
    'com_documento', (select count(*) from public.protecao_gratuita g
                       where g.origem = 'landing_30d'
                         and exists (select 1 from public.documentos_monitor d
                                      where d.utilizador_id = g.user_id
                                        and d.created_at between g.inicio_em and g.termina_em))
  )
    into v_landing
    from auth.users au
   where au.raw_user_meta_data ->> 'origem_registo' = 'landing_30d';

  return v || jsonb_build_object('landing_30d', v_landing);
end $$;

revoke execute on function public.protecao_gratuita_metricas() from public, anon;
grant execute on function public.protecao_gratuita_metricas() to authenticated;
