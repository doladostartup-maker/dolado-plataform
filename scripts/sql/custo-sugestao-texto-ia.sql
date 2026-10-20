-- Custo real da sugestão do texto da reclamação pela IA (regra 5 do "Uso de IA").
--
-- Só leitura. Correr no SQL Editor da Supabase (produção) — cada bloco à parte.
-- Duas fontes:
--   * uso_api_claude (funcionalidade = 'rascunho_reclamacao'): uma linha por chamada
--     à API, incluindo as que falharam. É o que conta para o orçamento.
--   * casos_rascunhos_ia: uma linha por geração, com caso_id e finalidade
--     (reclamacao / nova_comunicacao). É a que permite a média por caso.
-- Os casos de contas admin (testes de Thiago) ficam de fora dos blocos 2 a 4.

-- ---------------------------------------------------------------------------
-- 1. Total gasto (orçamento), por modelo e resultado da chamada
-- ---------------------------------------------------------------------------
select
  modelo,
  estado,
  count(*)                                 as chamadas,
  sum(tokens_entrada)                      as tokens_entrada,
  sum(tokens_saida)                        as tokens_saida,
  round(sum(custo_estimado_usd), 4)        as custo_usd,
  round(avg(custo_estimado_usd), 4)        as custo_medio_usd,
  round(avg(latencia_ms) / 1000.0, 1)      as latencia_media_s,
  min(created_at)::date                    as primeira,
  max(created_at)::date                    as ultima
from public.uso_api_claude
where funcionalidade = 'rascunho_reclamacao'
group by rollup (modelo, estado)
order by modelo nulls last, estado nulls last;

-- ---------------------------------------------------------------------------
-- 2. Custo por caso — os primeiros 15 casos com sugestão (ordem cronológica)
-- ---------------------------------------------------------------------------
with geracoes as (
  select r.*
  from public.casos_rascunhos_ia r
  join public.casos c on c.id = r.caso_id
  left join public.utilizadores u on u.id = c.utilizador_id
  where coalesce(u.role, 'cliente') <> 'admin'
)
select
  caso_id,
  min(created_at)::date                                          as primeira_geracao,
  count(*)                                                       as geracoes,
  count(*) filter (where estado = 'gerado')                      as geradas,
  count(*) filter (where estado = 'falhou')                      as falhadas,
  count(*) filter (where origem = 'manual')                      as regeneracoes_manuais,
  count(*) filter (where finalidade = 'nova_comunicacao')        as novas_comunicacoes,
  round(sum(coalesce(custo_estimado_usd, 0)), 4)                 as custo_usd,
  round(sum(coalesce(custo_estimado_usd, 0))
        filter (where finalidade = 'reclamacao'), 4)             as custo_reclamacao_usd
from geracoes
group by caso_id
order by primeira_geracao, caso_id
limit 15;

-- ---------------------------------------------------------------------------
-- 3. Resumo para custos-fixos-e-break-even.md
--    Ajustar taxa_usd_eur ao câmbio do dia. Preços de src/lib/planos.ts (IVA 23% incluído).
-- ---------------------------------------------------------------------------
with parametros as (
  select
    0.86::numeric  as taxa_usd_eur,       -- 1 USD em EUR (actualizar)
    8::numeric     as orcamento_usd,      -- ANTHROPIC_ORCAMENTO_USD
    11.99::numeric as preco_avulso,
    7.99::numeric  as preco_caso_protecao,
    1.23::numeric  as iva
),
por_caso as (
  select
    r.caso_id,
    sum(coalesce(r.custo_estimado_usd, 0))                                   as custo_usd,
    sum(coalesce(r.custo_estimado_usd, 0)) filter (where r.finalidade = 'reclamacao') as custo_reclamacao_usd
  from public.casos_rascunhos_ia r
  join public.casos c on c.id = r.caso_id
  left join public.utilizadores u on u.id = c.utilizador_id
  where coalesce(u.role, 'cliente') <> 'admin'
  group by r.caso_id
),
gasto_total as (
  select coalesce(sum(custo_estimado_usd), 0) as usd
  from public.uso_api_claude
)
select
  count(*)                                                              as casos,
  round(avg(custo_usd), 4)                                              as media_por_caso_usd,
  round(percentile_cont(0.5) within group (order by custo_usd)::numeric, 4) as mediana_por_caso_usd,
  round(max(custo_usd), 4)                                              as maximo_por_caso_usd,
  round(avg(custo_reclamacao_usd), 4)                                   as media_so_reclamacao_usd,
  round(avg(custo_usd) * p.taxa_usd_eur, 4)                             as media_por_caso_eur,
  round(100 * avg(custo_usd) * p.taxa_usd_eur / (p.preco_avulso / p.iva), 2)        as pct_avulso_sem_iva,
  round(100 * avg(custo_usd) * p.taxa_usd_eur / (p.preco_caso_protecao / p.iva), 2) as pct_caso_protecao_sem_iva,
  round((select usd from gasto_total), 4)                               as gasto_total_api_usd,
  round(p.orcamento_usd - (select usd from gasto_total), 4)             as orcamento_restante_usd,
  floor((p.orcamento_usd - (select usd from gasto_total)) / nullif(avg(custo_usd), 0)) as casos_que_o_orcamento_cobre
from por_caso, parametros p
group by p.taxa_usd_eur, p.orcamento_usd, p.preco_avulso, p.preco_caso_protecao, p.iva;

-- ---------------------------------------------------------------------------
-- 4. Conferência: as duas tabelas devem dar valores próximos.
--    Diferença grande = chamadas sem geração registada (ou casos admin, excluídos só à direita).
-- ---------------------------------------------------------------------------
select
  (select round(sum(custo_estimado_usd), 4) from public.uso_api_claude
    where funcionalidade = 'rascunho_reclamacao')                        as uso_api_claude_usd,
  (select round(sum(coalesce(custo_estimado_usd, 0)), 4) from public.casos_rascunhos_ia) as casos_rascunhos_ia_usd;
