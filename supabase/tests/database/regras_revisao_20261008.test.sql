-- DoLado — Regras jurídicas revistas pela advogada a 08/10/2026
-- (20261008120000_revisao_regras_juridicas_aprovada.sql).
--
-- Correr com `supabase test db` (stack local, nunca produção). Transação revertida.

begin;
select * from no_plan();

create temporary table r as
  select * from public.regras_juridicas
   where codigo in ('COMPRA_INDISPONIBILIDADE_DISTANCIA_19', 'GAS_CORTE_PREAVISO_79', 'GAS_CORTE_AGENDAMENTO_79_7',
                    'CCG_BOAFE_CONSUMIDOR', 'COMPRA_ENTREGA_PRAZO_11', 'COMPRA_ENTREGA_REEMBOLSO_11');

select is((select count(*) from r), 6::bigint, 'as seis regras existem');
select is((select count(*) from r where ativa and revista_em = date '2026-10-08' and revista_por = 'advogada'), 6::bigint,
  'todas revistas a 08/10/2026 e ativas (o trigger de revisão não as desativou)');

-- DL 24/2014, art. 19.º — distinto do atraso de entrega do DL 84/2021.
select is((select setor from r where codigo = 'COMPRA_INDISPONIBILIDADE_DISTANCIA_19'), 'Compras & Reembolsos', 'indisponibilidade: setor Compras & Reembolsos');
select ok((select diploma like 'Decreto-Lei n.º 24/2014%' and artigo like 'Artigo 19.º%' from r where codigo = 'COMPRA_INDISPONIBILIDADE_DISTANCIA_19'),
  'indisponibilidade: DL 24/2014, art. 19.º');
select ok((select resumo like '%30 dias%' and resumo like '%dobro%15 dias úteis%' and resumo like '%despesas de devolução ficam a cargo do fornecedor%'
                  and resumo like '%artigo 11.º do Decreto-Lei n.º 84/2021%' from r where codigo = 'COMPRA_INDISPONIBILIDADE_DISTANCIA_19'),
  'indisponibilidade: 30 dias, dobro em 15 dias úteis, despesas de devolução e distinção do art. 11.º do DL 84/2021');
select ok((select bool_and(resumo like '%artigo 19.º do Decreto-Lei n.º 24/2014%') from r where codigo in ('COMPRA_ENTREGA_PRAZO_11', 'COMPRA_ENTREGA_REEMBOLSO_11')),
  'regras do art. 11.º do DL 84/2021 remetem para a regra própria do art. 19.º');
select is((select count(*) from r where codigo = 'COMPRA_ENTREGA_REEMBOLSO_11'
           and (length(resumo) - length(replace(resumo, 'artigo 19.º do Decreto-Lei n.º 24/2014', ''))) / length('artigo 19.º do Decreto-Lei n.º 24/2014') = 1),
  1::bigint, 'a remissão foi acrescentada uma só vez');
select ok((select condicoes_aplicabilidade like '%Não aplicar a vendas entre particulares%' from r where codigo = 'COMPRA_ENTREGA_PRAZO_11'),
  'art. 11.º mantém a exclusão das vendas entre particulares');

-- RRC, art. 79.º, n.º 7 — agendamento ≠ pré-aviso; cinco dias úteis no gás.
select ok((select resumo like '%cinco dias úteis%' and resumo like '%não substitui%pré-aviso%' and resumo like '%20 dias%30 dias%'
           from r where codigo = 'GAS_CORTE_AGENDAMENTO_79_7'), 'agendamento: cinco dias úteis, distinto do pré-aviso de 20/30 dias');
select ok((select artigo = 'Artigo 79.º, n.º 7' and setor = 'Gás' and categoria = 'Suspensão' and condicoes_aplicabilidade like '%garrafa%'
           from r where codigo = 'GAS_CORTE_AGENDAMENTO_79_7'), 'agendamento: art. 79.º, n.º 7, Gás/Suspensão, exclui gás de garrafa');
select is((select count(*) from r where setor = 'Gás' and condicoes_aplicabilidade like '%Não aplicar esta regra de RRC do gás natural a GPL canalizado%'),
  2::bigint, 'regras de gás: GPL canalizado não abrangido (redação de produção mantida)');
select ok((select artigo like '%78.º, n.º 1%' and artigo like '%7, 11 e 12%' from r where codigo = 'GAS_CORTE_PREAVISO_79'),
  'pré-aviso: artigo indica o 78.º, n.º 1, e os n.os 7 e 11 do 79.º referidos no texto');

-- DL 446/85 — sem nulidade automática; consumidores: arts. 20.º a 22.º.
select ok((select setor is null and categoria = 'Contrato' from r where codigo = 'CCG_BOAFE_CONSUMIDOR'),
  'CCG: regra geral (sem setor), categoria Contrato — chega aos casos de contrato de todos os setores');
select ok((select artigo like '%18.º a 22.º%' and resumo like '%artigo 20.º%' and resumo like '%21.º%' and resumo like '%22.º%'
           from r where codigo = 'CCG_BOAFE_CONSUMIDOR'), 'CCG: relações com consumidores remetem para os arts. 20.º a 22.º');
select ok((select resumo like '%não decorre automaticamente%' and efeito_juridico like '%não concluir que a cláusula é nula%'
           from r where codigo = 'CCG_BOAFE_CONSUMIDOR'), 'CCG: sem nulidade automática, exige a proibição legal concreta');

-- Fontes oficiais.
select is((select count(*) from r where fonte_url !~ '^https://(diariodarepublica\.pt|www\.erse\.pt)/'), 0::bigint, 'fontes oficiais');

-- Nenhuma conclui responsabilidade jurídica de terceiro.
select is((select count(*) from r where resumo ~* 'violou a lei|é ilegal|a empresa está errada'), 0::bigint,
  'nenhuma regra conclui que a empresa violou a lei');

select * from finish();
rollback;
