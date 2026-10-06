-- DoLado — regras jurídicas: alterar o conteúdo retira a revisão
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova 20261006150000_regras_juridicas_revisao_ao_alterar.sql: mudar um
-- campo de conteúdo jurídico de uma regra revista sem nova data de revisão
-- retira a revisão e desativa-a; ligar/desligar, metadados internos ou uma
-- nova data de revisão não. Tudo numa transação revertida.

begin;
select * from no_plan();

insert into public.regras_juridicas (codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, ativa, revista_em, revista_por, efeito_juridico, palavras_chave)
values ('TESTE_REVISAO_01', 'Gás', 'Faturação', 'Sub', 'Título de teste', 'Diploma de teste', 'Artigo 1.º',
  'Resumo jurídico de teste aprovado.', 'Condições.', 'https://diariodarepublica.pt/', true, date '2026-10-01',
  'Revisor', 'Efeito.', array['a']);

create function pg_temp.repor() returns void language sql as $$
  update public.regras_juridicas
     set resumo = 'Resumo jurídico de teste aprovado.', titulo = 'Título de teste', setor = 'Gás',
         categoria = 'Faturação', revogada_em = null, efeito_juridico = 'Efeito.',
         ativa = true, revista_em = date '2026-10-01', revista_por = 'Revisor'
   where codigo = 'TESTE_REVISAO_01';
$$;

create function pg_temp.estado() returns text language sql as $$
  select ativa::text || '|' || coalesce(revista_em::text, '-') || '|' || coalesce(revista_por, '-')
  from public.regras_juridicas where codigo = 'TESTE_REVISAO_01';
$$;

-- Conteúdo jurídico alterado sem nova data → perde a revisão e fica inativa
update public.regras_juridicas set resumo = 'Outro resumo jurídico.' where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|-|-', 'resumo alterado: sem revisão e inativa');

select pg_temp.repor();
update public.regras_juridicas set setor = 'Energia' where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|-|-', 'setor alterado (âmbito)');

select pg_temp.repor();
update public.regras_juridicas set categoria = 'Cobrança' where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|-|-', 'categoria alterada (âmbito)');

select pg_temp.repor();
update public.regras_juridicas set revogada_em = date '2027-01-01' where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|-|-', 'vigência alterada');

select pg_temp.repor();
update public.regras_juridicas set efeito_juridico = null where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|-|-', 'efeito jurídico apagado');

-- Formulário do backoffice: envia de novo a data antiga → conta como sem nova revisão
select pg_temp.repor();
update public.regras_juridicas set titulo = 'Título novo', revista_em = date '2026-10-01', ativa = true
 where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|-|-', 'mesma data de revisão não revalida o texto novo');

-- Não reativável sem nova revisão
select throws_ok($$update public.regras_juridicas set ativa = true where codigo = 'TESTE_REVISAO_01'$$, '23514', null,
  'não se reativa sem nova data de revisão');

-- Nova data de revisão na mesma alteração → revisão explícita, mantém-se
select pg_temp.repor();
update public.regras_juridicas set resumo = 'Resumo revisto.', revista_em = date '2026-10-06', revista_por = 'Advogada'
 where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'true|2026-10-06|Advogada', 'conteúdo + nova data de revisão: mantém-se ativa e revista');

-- O que não é conteúdo jurídico não retira a revisão
select pg_temp.repor();
update public.regras_juridicas set ativa = false where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'false|2026-10-01|Revisor', 'desativar não retira a revisão');
update public.regras_juridicas set ativa = true where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'true|2026-10-01|Revisor', 'reativar com a revisão existente');
update public.regras_juridicas set palavras_chave = array['b', 'c'], subcategoria = 'Outra' where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'true|2026-10-01|Revisor', 'palavras-chave e subcategoria não retiram a revisão');
update public.regras_juridicas set resumo = resumo where codigo = 'TESTE_REVISAO_01';
select is(pg_temp.estado(), 'true|2026-10-01|Revisor', 'gravar sem mudanças não retira a revisão');

-- Regras não revistas (ex.: carga 4): editar continua livre e sem efeito na revisão
update public.regras_juridicas set resumo = resumo || ' ' where codigo = 'GAS_FATURA_PAPEL_45';
select is((select ativa::text || '|' || coalesce(revista_em::text, '-') from public.regras_juridicas where codigo = 'GAS_FATURA_PAPEL_45'),
  'false|-', 'regra por rever: edição sem efeito na revisão');

-- Também se aplica à service_role (é um trigger)
select pg_temp.repor();
set local role service_role;
update public.regras_juridicas set diploma = 'Outro diploma' where codigo = 'TESTE_REVISAO_01';
reset role;
select is(pg_temp.estado(), 'false|-|-', 'service_role: também perde a revisão');

select * from finish();
rollback;
