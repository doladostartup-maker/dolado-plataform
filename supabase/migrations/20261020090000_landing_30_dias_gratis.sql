-- Landing page das campanhas Meta Ads (/30-dias-gratis, 20/10/2026).
--
-- 1. Nova origem fixa 'landing_30d' na Proteção gratuita (só métricas: a
--    origem nunca decide elegibilidade nem acesso).
-- 2. Funil da landing em protecao_gratuita_metricas() (só admin, só
--    contagens): contas criadas a partir da landing (user_metadata
--    origem_registo, gravado no /registo quando o destino é a activação com
--    origem=landing_30d), contas com o e-mail confirmado e activações. O
--    portal não tem Cookiebot nem medição no browser — estas etapas só se
--    contam aqui, sem dados pessoais e sem terceiros.

alter table public.protecao_gratuita drop constraint if exists protecao_gratuita_origem_check;
alter table public.protecao_gratuita
  add constraint protecao_gratuita_origem_check
  check (origem in ('homepage', 'precario', 'protecao', 'portal', 'landing_30d', 'outro'));

create or replace function public.protecao_gratuita_ativar(
  p_user uuid,
  p_email_hash text,
  p_origem text,
  p_termos_versao text,
  p_texto_aceite text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
  v_g public.protecao_gratuita%rowtype;
begin
  if p_email_hash is null or p_email_hash !~ '^hmac:[0-9a-f]{64}$' then
    raise exception 'protecao_gratuita_ativar: pseudónimo do e-mail inválido';
  end if;
  if coalesce(btrim(p_termos_versao), '') = '' or coalesce(btrim(p_texto_aceite), '') = '' then
    raise exception 'protecao_gratuita_ativar: aceitação dos Termos em falta';
  end if;

  -- Dois pedidos ao mesmo tempo (mesma conta ou mesmo e-mail): um de cada vez.
  perform pg_advisory_xact_lock(hashtextextended('protecao_gratuita:' || p_user::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('protecao_gratuita:' || p_email_hash, 0));

  v_motivo := public.protecao_gratuita_elegibilidade(p_user, p_email_hash);
  if v_motivo = 'ativa' then
    select * into v_g from public.protecao_gratuita where user_id = p_user;
    return jsonb_build_object('resultado', 'ativa', 'id', v_g.id,
                              'inicio_em', v_g.inicio_em, 'termina_em', v_g.termina_em);
  end if;
  if v_motivo <> 'elegivel' then
    return jsonb_build_object('resultado', v_motivo);
  end if;

  insert into public.protecao_gratuita_utilizacoes (email_hash) values (p_email_hash);

  insert into public.protecao_gratuita (user_id, inicio_em, termina_em, origem, termos_versao, texto_aceite)
  values (
    p_user, now(), now() + public.protecao_gratuita_duracao(),
    case when p_origem in ('homepage', 'precario', 'protecao', 'portal', 'landing_30d') then p_origem else 'outro' end,
    p_termos_versao, p_texto_aceite
  )
  returning * into v_g;

  -- Dados retidos de uma Proteção anterior (não deveria haver: só quem nunca
  -- teve Proteção ativa) — por robustez, como no regresso de uma subscrição.
  perform public.protecao_reativar_dados(p_user);

  return jsonb_build_object('resultado', 'ativada', 'id', v_g.id,
                            'inicio_em', v_g.inicio_em, 'termina_em', v_g.termina_em);
end $$;

revoke execute on function public.protecao_gratuita_ativar(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.protecao_gratuita_ativar(uuid, text, text, text, text) to service_role;

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
    'ativadas', (select count(*) from public.protecao_gratuita g where g.origem = 'landing_30d')
  )
    into v_landing
    from auth.users au
   where au.raw_user_meta_data ->> 'origem_registo' = 'landing_30d';

  return v || jsonb_build_object('landing_30d', v_landing);
end $$;

revoke execute on function public.protecao_gratuita_metricas() from public, anon;
grant execute on function public.protecao_gratuita_metricas() to authenticated;
