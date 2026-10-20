-- DoLado — Electricidade: indemnização da fidelização e denúncia (20261020140000_energia_fidelizacao_denuncia.sql)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que as 2 regras novas existem no sector Energia, com diploma, artigo
-- e fonte oficial (ERSE), e ficam activas e revistas por Thiago depois de
-- 20261020140100_ativar_regras_energia_fidelizacao_denuncia.sql (e que não
-- podem ficar activas sem data de revisão); e que detalhes_caso aceita só a forma de
-- contratação (casos de contratação de Energia/Gás). A selecção com as regras
-- reais está em src/lib/rascunhoIA/energiaFacturacao.test.mjs. Tudo numa
-- transacção revertida.

begin;
select * from no_plan();

create temporary table novas as
  select * from public.regras_juridicas
  where codigo in ('ENE_FIDELIZACAO_INDEMNIZACAO_19', 'ENE_DENUNCIA_SEM_ENCARGOS_81');

select is((select count(*) from novas), 2::bigint, '2 regras novas');
select is((select count(*) from novas where ativa and revista_em = date '2026-10-20' and revista_por = 'Thiago Pereira'), 2::bigint,
  'ambas activas e revistas por Thiago a 20/10/2026');
select is((select count(*) from novas where setor = 'Energia'), 2::bigint, 'ambas no sector Energia');
select is((select categoria from novas where codigo = 'ENE_FIDELIZACAO_INDEMNIZACAO_19'), 'Fidelização', 'indemnização em Fidelização');
select is((select categoria from novas where codigo = 'ENE_DENUNCIA_SEM_ENCARGOS_81'), 'Cancelamento', 'denúncia em Cancelamento');
select is((select count(*) from novas where diploma like 'Regulamento n.º 827/2023%' and artigo is not null
           and fonte_url like 'https://www.erse.pt/%'), 2::bigint, 'RRC, com artigo e fonte oficial da ERSE');
select is((select count(*) from novas where efeito_juridico is null or provas_necessarias is null
           or resultado_pretendido is null or cardinality(palavras_chave) = 0), 0::bigint, 'campos de apoio preenchidos');

select throws_ok($$update public.regras_juridicas set revista_em = null, revista_por = null where codigo = 'ENE_DENUNCIA_SEM_ENCARGOS_81'$$,
  null, null, 'não pode ficar activa sem data de revisão');

-- A regra de Gás que serviu de base continua no Gás (não foi reescrita).
select is((select setor from public.regras_juridicas where codigo = 'GAS_DENUNCIA_SEM_ENCARGOS_81'), 'Gás',
  'GAS_DENUNCIA_SEM_ENCARGOS_81 continua no Gás');

-- detalhes_caso: só a forma de contratação é válida (contratação de Energia/Gás).
select ok(public.detalhes_caso_valido('{"forma_contratacao":"distancia"}'), 'só a forma de contratação');
select ok(not public.detalhes_caso_valido('{"forma_contratacao":"telefone"}'), 'forma fora da lista');

select * from finish();
rollback;
