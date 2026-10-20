-- DoLado — Electricidade: interrupções e compensações (20261020100000_energia_continuidade_servico.sql)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que as 4 regras da continuidade de serviço (20261020100000) ficaram
-- revistas e ativas por 20261020110000, no setor Energia e na categoria
-- "Qualidade de serviço", com diploma, artigo e fonte oficial (ERSE), e que
-- as 2 de danos do Código Civil (20261020120000) ficaram revistas e ativas
-- por 20261020130000. A seleção com as regras reais está em
-- src/lib/rascunhoIA/continuidadeEnergia.test.mjs. Tudo numa transação
-- revertida.

begin;
select * from no_plan();

create temporary table continuidade as
  select * from public.regras_juridicas
  where codigo in ('ENE_CONTINUIDADE_PADROES_24', 'ENE_CONTINUIDADE_PAGAMENTO_106', 'ENE_CONTINUIDADE_RESP_CIVIL_10', 'ENE_ASSISTENCIA_AVARIA_83');

select is((select count(*) from continuidade), 4::bigint, '4 regras novas');
select is((select count(*) from continuidade where ativa and revista_em = '2026-10-20' and revista_por = 'Thiago Pereira'), 4::bigint,
  'as 4 ficaram revistas e ativas a 20/10/2026');
select is((select count(*) from continuidade where setor = 'Energia' and categoria = 'Qualidade de serviço'), 4::bigint,
  'todas em Energia / Qualidade de serviço');
select is((select count(*) from continuidade where diploma like 'Regulamento n.º 826/2023%' and artigo is not null
           and fonte_url like 'https://www.erse.pt/%'), 4::bigint, 'RQS, com artigo e fonte oficial da ERSE');
select is((select count(*) from continuidade where efeito_juridico is null or provas_necessarias is null
           or resultado_pretendido is null or cardinality(palavras_chave) = 0), 0::bigint, 'campos de apoio preenchidos');

-- Alterar o conteúdo sem nova data de revisão retira a revisão (trigger).
savepoint conteudo;
update public.regras_juridicas set resumo = resumo || ' ' where codigo = 'ENE_CONTINUIDADE_PADROES_24';
select is((select ativa from public.regras_juridicas where codigo = 'ENE_CONTINUIDADE_PADROES_24'), false,
  'mudar o conteúdo sem nova revisão desativa a regra');
rollback to savepoint conteudo;

-- Danos (Código Civil): revistas e ativas a 20/10/2026.
create temporary table danos as
  select * from public.regras_juridicas where codigo in ('ENE_DANOS_INSTALACAO_CC_509', 'ENE_DANOS_CULPA_CC_798');
select is((select count(*) from danos), 2::bigint, '2 regras de danos');
select is((select count(*) from danos where ativa and revista_em = '2026-10-20' and revista_por = 'Thiago Pereira'), 2::bigint,
  'as de danos ficaram revistas e ativas a 20/10/2026');
select is((select count(*) from danos where setor = 'Energia' and categoria = 'Qualidade de serviço'
           and diploma like 'Código Civil — Decreto-Lei n.º 47344/66%' and fonte_url like 'https://%'), 2::bigint,
  'Energia / Qualidade de serviço, Código Civil, com fonte');
select throws_ok($$update public.regras_juridicas set ativa = true, revista_em = null where codigo = 'ENE_DANOS_INSTALACAO_CC_509'$$,
  '23514', null, 'uma regra ativa não pode ficar sem data de revisão');

select * from finish();
rollback;
