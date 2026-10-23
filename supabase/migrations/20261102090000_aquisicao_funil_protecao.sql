-- Painel "Aquisição e Conversão": passos da Protecção depois do resultado
-- (23/10/2026). Revisão do resultado do diagnóstico gratuito para demonstrar
-- valor antes da Protecção: para distinguir "poucos clicam" (o resultado não
-- mostrou valor) de "muitos clicam, poucos pagam" (registo, checkout,
-- confiança ou preço), o funil passa a ter
--   resultado visto → clique na Protecção (protection_cta_clicked, já gravado
--   em diagnosticos_gratuitos.protecao_clicada_em) → conta → checkout aberto
--   (consentimentos_compra, gravado antes de cada Stripe Checkout) → pago,
-- no total ("contas.checkout") e por página de entrada ("funil_protecao").
-- Só leitura, só admin, só contagens; nada muda nas tabelas.

create or replace function public.aquisicao_metricas(p_desde timestamptz, p_ate timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'aquisicao_metricas: só admin';
  end if;
  if p_desde is null or p_ate is null or p_ate <= p_desde or p_ate - p_desde > interval '400 days' then
    raise exception 'aquisicao_metricas: período inválido';
  end if;

  with d as (
    select g.*,
           (g.carregado_em is not null) as carregado,
           (g.analisado_em is not null) as concluido,
           (g.estado = 'falhou') as falhado
      from public.diagnosticos_gratuitos g
     where g.created_at >= p_desde and g.created_at < p_ate
  ),
  -- Primeiro diagnóstico de cada conta no período (início do percurso).
  contas as (
    select conta_id, min(created_at) as desde, min(canal) as canal,
           coalesce(min(pagina_entrada), '—') as pagina
      from d where conta_id is not null
     group by conta_id
  ),
  contas_estado as (
    select c.conta_id, c.desde, c.canal, c.pagina,
           -- Checkout aberto: a prova dos consentimentos é gravada pelo
           -- servidor (confirmarCompra) imediatamente antes de cada Stripe
           -- Checkout, por isso marca a chegada ao checkout.
           exists (
             select 1 from public.consentimentos_compra cc
              where cc.user_id = c.conta_id and cc.created_at >= c.desde
           ) as checkout,
           exists (
             select 1 from public.protecao_gratuita pg
              where pg.user_id = c.conta_id and pg.inicio_em >= c.desde
           ) as experimental,
           exists (
             select 1 from public.stripe_payments p
              where p.user_id = c.conta_id and p.estado = 'concluido'
                and coalesce(p.valor_total_centimos, 0) > 0 and p.created_at >= c.desde
           ) or exists (
             select 1 from public.user_access ua
               join public.stripe_subscriptions s on s.stripe_subscription_id = ua.stripe_subscription_id
              where ua.user_id = c.conta_id and s.ultimo_pagamento_estado = 'pago'
                and s.ultimo_pagamento_em >= c.desde
           ) as pago,
           exists (
             select 1 from public.user_access ua
               join public.stripe_subscriptions s on s.stripe_subscription_id = ua.stripe_subscription_id
              where ua.user_id = c.conta_id and s.ultimo_pagamento_estado = 'pago'
                and s.ultimo_pagamento_em >= c.desde
           ) as subscricao_paga
      from contas c
  ),
  sessoes as (
    select sessao_id,
           min(canal) as canal,
           coalesce(min(pagina_entrada), '—') as pagina,
           bool_or(carregado) as carregou,
           bool_or(concluido) as concluiu,
           bool_or(visualizado_em is not null) as viu,
           bool_or(protecao_clicada_em is not null) as clicou_protecao,
           bool_or(guardar_clicado_em is not null) as clicou_guardar,
           bool_or(conta_id is not null) as com_conta
      from d group by sessao_id
  ),
  custo_d as (
    select u.diagnostico_id, sum(u.custo_estimado_usd) as custo_usd
      from public.uso_api_claude u
     where u.diagnostico_id in (select id from d)
     group by u.diagnostico_id
  ),
  uso as (
    select u.*, g.estado as estado_diagnostico
      from public.uso_api_claude u
      left join public.diagnosticos_gratuitos g on g.id = u.diagnostico_id
     where u.created_at >= p_desde and u.created_at < p_ate
  )
  select jsonb_build_object(
    'periodo', jsonb_build_object('desde', p_desde, 'ate', p_ate),
    'sessoes', jsonb_build_object(
      'iniciaram', (select count(*) from sessoes),
      'carregaram', (select count(*) from sessoes where carregou),
      'concluiram', (select count(*) from sessoes where concluiu),
      'viram', (select count(*) from sessoes where viu),
      'clicaram_protecao', (select count(*) from sessoes where clicou_protecao),
      'clicaram_guardar', (select count(*) from sessoes where clicou_guardar),
      'com_conta', (select count(*) from sessoes where com_conta),
      'sem_conta_depois_de_ver', (select count(*) from sessoes where viu and not com_conta)
    ),
    'documentos', jsonb_build_object(
      'reservados', (select count(*) from d),
      'carregados', (select count(*) from d where carregado),
      'analises_iniciadas', (select count(*) from d where carregado),
      'concluidos', (select count(*) from d where concluido),
      'falhados', (select count(*) from d where falhado),
      'falhas_por_motivo', coalesce((select jsonb_object_agg(motivo_falha, n) from (
          select coalesce(motivo_falha, 'indisponivel') as motivo_falha, count(*) as n from d where falhado group by 1) x), '{}'::jsonb),
      'vistos', (select count(*) from d where visualizado_em is not null),
      'passados_ao_monitor', (select count(*) from d where documento_monitor_id is not null)
    ),
    'contas', jsonb_build_object(
      'criadas_ou_ligadas', (select count(*) from contas_estado),
      'experimental', (select count(*) from contas_estado where experimental),
      'checkout', (select count(*) from contas_estado where checkout),
      'pagas', (select count(*) from contas_estado where pago),
      'subscricoes_pagas', (select count(*) from contas_estado where subscricao_paga)
    ),
    -- Funil da Protecção por página de entrada (ex.: /analisar-fatura vs /):
    -- resultado visto → clique no botão da Protecção (protection_cta_clicked,
    -- protecao_clicada_em) → conta → checkout → pagamento.
    'funil_protecao', coalesce((select jsonb_agg(x order by x.viram desc) from (
        select s.pagina,
               count(*) filter (where s.viu) as viram,
               count(*) filter (where s.clicou_protecao) as clicaram_protecao,
               (select count(*) from contas_estado ce where ce.pagina = s.pagina) as contas,
               (select count(*) from contas_estado ce where ce.pagina = s.pagina and ce.checkout) as checkout,
               (select count(*) from contas_estado ce where ce.pagina = s.pagina and ce.pago) as pagas
          from sessoes s group by s.pagina) x), '[]'::jsonb),
    'por_canal', coalesce((select jsonb_agg(x order by x.sessoes desc) from (
        select s.canal,
               count(*) as sessoes,
               count(*) filter (where s.carregou) as carregaram,
               count(*) filter (where s.concluiu) as concluiram,
               (select count(*) from contas_estado ce where ce.canal = s.canal) as contas,
               (select count(*) from contas_estado ce where ce.canal = s.canal and ce.experimental) as experimental,
               (select count(*) from contas_estado ce where ce.canal = s.canal and ce.pago) as pagas
          from sessoes s group by s.canal) x), '[]'::jsonb),
    'por_campanha', coalesce((select jsonb_agg(x order by x.documentos desc) from (
        select coalesce(utm_source, '—') as origem, coalesce(utm_medium, '—') as meio, coalesce(utm_campaign, '—') as campanha,
               count(*) as documentos,
               count(*) filter (where concluido) as concluidos,
               count(distinct conta_id) as contas
          from d where utm_source is not null or utm_campaign is not null
         group by 1, 2, 3 order by 4 desc limit 30) x), '[]'::jsonb),
    'por_pagina_entrada', coalesce((select jsonb_object_agg(pagina, n) from (
        select coalesce(pagina_entrada, '—') as pagina, count(*) as n from d group by 1) x), '{}'::jsonb),
    'por_dispositivo', coalesce((select jsonb_object_agg(disp, n) from (
        select coalesce(dispositivo, 'desconhecido') as disp, count(*) as n from d group by 1) x), '{}'::jsonb),
    'por_setor', coalesce((select jsonb_agg(x order by x.documentos desc) from (
        select coalesce(d.setor, case when d.concluido then 'nao_indicado' else 'nao_classificado' end) as setor,
               count(*) as documentos,
               count(*) filter (where d.concluido) as concluidos,
               count(distinct d.conta_id) as contas,
               coalesce(sum(cd.custo_usd), 0) as custo_usd
          from d left join custo_d cd on cd.diagnostico_id = d.id group by 1) x), '[]'::jsonb),
    'serie_diaria', coalesce((select jsonb_agg(x order by x.dia) from (
        select (created_at at time zone 'Europe/Lisbon')::date as dia,
               count(*) filter (where carregado) as carregados,
               count(*) filter (where concluido) as concluidos,
               count(distinct conta_id) as contas
          from d group by 1) x), '[]'::jsonb),
    'ia', jsonb_build_object(
      'por_modelo', coalesce((select jsonb_agg(x order by x.custo_usd desc) from (
          select modelo, count(*) as chamadas, sum(tokens_entrada) as tokens_entrada, sum(tokens_saida) as tokens_saida,
                 sum(custo_estimado_usd) as custo_usd, count(*) filter (where estado = 'erro') as erros
            from uso group by modelo) x), '[]'::jsonb),
      'por_funcionalidade', coalesce((select jsonb_agg(x order by x.custo_usd desc) from (
          select funcionalidade, count(*) as chamadas, sum(custo_estimado_usd) as custo_usd
            from uso group by funcionalidade) x), '[]'::jsonb),
      'gratuito_usd', coalesce((select sum(custo_estimado_usd) from uso where funcionalidade = 'diagnostico_gratuito'), 0),
      'gratuito_falhado_usd', coalesce((select sum(custo_estimado_usd) from uso
                                          where funcionalidade = 'diagnostico_gratuito' and (estado = 'erro' or estado_diagnostico = 'falhou')), 0),
      'total_usd', coalesce((select sum(custo_estimado_usd) from uso), 0),
      -- Custo das leituras dos diagnósticos desta coorte (mesmo que feitas no limite do período).
      'coorte_usd', coalesce((select sum(custo_usd) from custo_d), 0),
      'serie_diaria', coalesce((select jsonb_agg(x order by x.dia) from (
          select (created_at at time zone 'Europe/Lisbon')::date as dia,
                 sum(custo_estimado_usd) filter (where funcionalidade = 'diagnostico_gratuito') as gratuito_usd,
                 sum(custo_estimado_usd) filter (where funcionalidade <> 'diagnostico_gratuito') as restante_usd
            from uso group by 1) x), '[]'::jsonb)
    )
  ) into v;
  return v;
end $$;

revoke execute on function public.aquisicao_metricas(timestamptz, timestamptz) from public, anon;
grant execute on function public.aquisicao_metricas(timestamptz, timestamptz) to authenticated, service_role;

comment on function public.aquisicao_metricas(timestamptz, timestamptz) is
  'Painel Aquisição e Conversão: contagens do diagnóstico gratuito (coorte do período), conversões confirmadas e custos estimados da IA. Só admin.';
