-- DoLado — regras_juridicas: reconciliação do schema com a produção e carga 4
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que 20261006130000_regras_juridicas_colunas_producao.sql reproduz as
-- quatro colunas de produção (tipo, nullable, sem default, checks) e que
-- 20261006140000_regras_juridicas_carga4.sql deixou as 45 regras novas
-- inativas, sem revisão e com diploma, artigo e fonte oficial. Tudo numa
-- transação revertida. A seleção com as regras reais está em
-- src/lib/rascunhoIA/regrasCarga4.test.mjs.

begin;
select * from no_plan();

-- 1. Schema igual ao de produção (dump de 06/10/2026)
select is(
  (select string_agg(column_name || ':' || data_type || ':' || is_nullable || ':' || coalesce(column_default, '-'), ',' order by column_name)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'regras_juridicas'
     and column_name in ('efeito_juridico', 'provas_necessarias', 'resultado_pretendido', 'palavras_chave')),
  'efeito_juridico:text:YES:-,palavras_chave:ARRAY:YES:-,provas_necessarias:text:YES:-,resultado_pretendido:text:YES:-',
  'quatro colunas de produção: tipos, nullable e sem default');
select is(
  (select udt_name from information_schema.columns where table_schema = 'public' and table_name = 'regras_juridicas' and column_name = 'palavras_chave'),
  '_text', 'palavras_chave é text[]');
select is(
  (select string_agg(conname, ',' order by conname) from pg_constraint
   where conrelid = 'public.regras_juridicas'::regclass and contype = 'c'
     and conname in ('regras_juridicas_efeito_juridico_check', 'regras_juridicas_provas_necessarias_check', 'regras_juridicas_resultado_pretendido_check')),
  'regras_juridicas_efeito_juridico_check,regras_juridicas_provas_necessarias_check,regras_juridicas_resultado_pretendido_check',
  'checks de comprimento com os nomes de produção');
select is((select count(*) from pg_indexes where tablename = 'regras_juridicas'
           and (indexdef like '%efeito_juridico%' or indexdef like '%palavras_chave%' or indexdef like '%provas_necessarias%' or indexdef like '%resultado_pretendido%')),
  0::bigint, 'sem índices nas quatro colunas (como em produção)');

savepoint limites;
select throws_ok($$update public.regras_juridicas set efeito_juridico = repeat('x', 1501) where codigo = 'GAS_FATURA_PAPEL_45'$$, '23514', null, 'efeito_juridico ≤ 1500');
select throws_ok($$update public.regras_juridicas set provas_necessarias = repeat('x', 2001) where codigo = 'GAS_FATURA_PAPEL_45'$$, '23514', null, 'provas_necessarias ≤ 2000');
select throws_ok($$update public.regras_juridicas set resultado_pretendido = repeat('x', 1001) where codigo = 'GAS_FATURA_PAPEL_45'$$, '23514', null, 'resultado_pretendido ≤ 1000');
rollback to savepoint limites;

-- 2. Carga 4: 45 regras, todas inativas e por rever
create temporary table carga4 as
  select * from public.regras_juridicas
  where codigo like 'GAS\_%' or codigo like 'COMPRA\_%' or codigo like 'GIN\_%'
     or codigo in ('DIST_EXCECOES_17', 'CONS_RETRATACAO_INFO_8');

select is((select count(*) from carga4), 45::bigint, '45 regras da carga 4');
select is((select count(*) from carga4 where setor = 'Gás'), 21::bigint, '21 de Gás');
select is((select count(*) from carga4 where setor = 'Compras & Reembolsos'), 15::bigint, '15 de Compras & Reembolsos');
select is((select count(*) from carga4 where setor = 'Ginásios'), 7::bigint, '7 de Ginásios');
select is((select count(*) from carga4 where setor is null), 2::bigint, '2 gerais');

select is((select count(*) from carga4 where ativa or revista_em is not null or revista_por is not null), 0::bigint,
  'nenhuma regra nova entra ativa ou revista');
select is((select count(*) from carga4
           where diploma is null or artigo is null or fonte_url is null
              or fonte_url !~ '^https://(diariodarepublica\.pt|www\.erse\.pt)/'
              or efeito_juridico is null or provas_necessarias is null or resultado_pretendido is null
              or coalesce(array_length(palavras_chave, 1), 0) = 0),
  0::bigint, 'diploma, artigo, fonte oficial e campos de apoio preenchidos');

select is((select count(*) from carga4 where setor = 'Gás' and condicoes_aplicabilidade not like '%garrafa%'), 0::bigint,
  'todas as regras de Gás excluem o gás de garrafa');
select is((select count(*) from carga4 where diploma like 'Decreto-Lei n.º 84/2021%'
           and (condicoes_aplicabilidade not like '%Não aplicar a vendas entre particulares%' or em_vigor_desde <> date '2022-01-01')),
  0::bigint, 'DL 84/2021: só vendedor profissional e contratos a partir de 01/01/2022');
select is((select count(*) from carga4 where codigo like 'GIN\_CCG\_%'
           and resumo like '%possível cláusula abusiva, que necessita de análise concreta%'
           and efeito_juridico like 'Possível cláusula abusiva — necessita de análise concreta%'), 3::bigint,
  'cláusulas de ginásio: possível cláusula abusiva, sem conclusão automática');

-- 3. Inativas: um admin vê-as, mas só ativas com revisão — a constraint mantém-se
select throws_ok($$update public.regras_juridicas set ativa = true where codigo = 'GAS_FATURA_PAPEL_45'$$, '23514', null,
  'não se ativa uma regra da carga sem data de revisão');

select * from finish();
rollback;
