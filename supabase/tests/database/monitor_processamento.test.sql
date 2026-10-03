-- DoLado — Monitor de Proteção: etapas do processamento, decisões em lote e
-- fornecedores (20261003150000).
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que as decisões do cliente sobre os valores lidos se gravam numa só
-- função atómica, só sobre campos do próprio contrato, de forma idempotente;
-- que a correção cria um valor do cliente com o histórico preservado; que a
-- função não é chamável pela API; que o cliente lê a etapa dos próprios
-- documentos mas não a escreve; e que a tabela de fornecedores não é
-- legível nem alterável pelo cliente. Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function testes.tenta(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'erro:' || sqlstate;
end $$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-f100-00000000000a', 'pa@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-f100-00000000000b', 'pb@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"B"}');

insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('70000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f100-00000000000a', 'telecomunicacoes'),
  ('70000000-0000-4000-f100-0000000000b1', '00000000-0000-4000-f100-00000000000b', 'telecomunicacoes');

insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path, etapa, etapa_atualizada_em) values
  ('71000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1',
   'contrato', 'a/c1.pdf', 'a_ler', now());

-- Três valores propostos para o contrato de A e um para o de B.
create temporary table ids (nome text primary key, id uuid);
grant select on ids to authenticated, service_role;
insert into ids values
  ('fornecedor', public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'fornecedor', '"Vodafone"', 'contrato')),
  ('mensalidade', public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'mensalidade_cents', '7146', 'contrato')),
  ('inicio', public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'data_inicio', '"2025-04-08"', 'contrato')),
  ('b', public.monitor_campo_propor('70000000-0000-4000-f100-0000000000b1', 'mensalidade_cents', '3000', 'contrato'));

-- ===========================================================================
-- 1. Privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.monitor_campos_decidir(uuid, uuid, jsonb)', 'EXECUTE'), 'decidir em lote: não executável pelo cliente');
select ok(not has_function_privilege('anon', 'public.monitor_campos_decidir(uuid, uuid, jsonb)', 'EXECUTE'), 'decidir em lote: não executável por anon');
select ok(has_function_privilege('service_role', 'public.monitor_campos_decidir(uuid, uuid, jsonb)', 'EXECUTE'), 'decidir em lote: servidor (service_role)');
select ok(not has_table_privilege('authenticated', 'public.fornecedores', 'INSERT'), 'fornecedores: cliente sem INSERT');
select ok(not has_table_privilege('authenticated', 'public.fornecedores', 'UPDATE'), 'fornecedores: cliente sem UPDATE');
select ok(not has_column_privilege('authenticated', 'public.documentos_monitor', 'etapa', 'UPDATE'), 'etapa: cliente sem UPDATE');

-- ===========================================================================
-- 2. Leitura pelo cliente
-- ===========================================================================
select testes.como('00000000-0000-4000-f100-00000000000a');
select is((select etapa from public.documentos_monitor where id = '71000000-0000-4000-f100-0000000000a1'), 'a_ler', 'cliente lê a etapa do próprio documento');
select is((select count(*)::int from public.fornecedores), 0, 'cliente não lê a tabela de fornecedores (só admin e servidor)');
select testes.como('00000000-0000-4000-f100-00000000000b');
select is((select count(*)::int from public.documentos_monitor where id = '71000000-0000-4000-f100-0000000000a1'), 0, 'B não vê o documento de A');
reset role;

select ok((select count(*) from public.fornecedores where nome_comercial in ('MEO', 'NOS', 'Vodafone', 'EDP', 'Galp', 'EPAL')) = 6, 'fornecedores principais semeados');

-- ===========================================================================
-- 3. Decisões em lote
-- ===========================================================================
select is(
  public.monitor_campos_decidir(
    '00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1',
    jsonb_build_array(
      jsonb_build_object('campo_id', (select id from ids where nome = 'fornecedor'), 'acao', 'aceitar'),
      jsonb_build_object('campo_id', (select id from ids where nome = 'mensalidade'), 'acao', 'corrigir', 'valor', 2900),
      jsonb_build_object('campo_id', (select id from ids where nome = 'inicio'), 'acao', 'rejeitar'))),
  3, 'três decisões aplicadas numa só chamada');

select is((select fornecedor from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), 'Vodafone', 'aceite: passa a valor atual do contrato');
select ok((select confirmado_cliente_em is not null from public.contratos_campos where id = (select id from ids where nome = 'fornecedor')), 'aceite: confirmado pelo cliente');
select is((select mensalidade_cents from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), 2900, 'corrigido: o valor do cliente é o atual');
select is((select estado from public.contratos_campos where id = (select id from ids where nome = 'mensalidade')), 'rejeitado', 'corrigido: a proposta fica no histórico como rejeitada');
select is((select origem from public.contratos_campos where contrato_id = '70000000-0000-4000-f100-0000000000a1' and campo = 'mensalidade_cents' and estado = 'atual'), 'cliente', 'corrigido: origem cliente');
select is((select estado from public.contratos_campos where id = (select id from ids where nome = 'inicio')), 'rejeitado', 'rejeitado');
select ok((select data_inicio is null from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), 'rejeitado: não chega ao contrato');

select is(
  public.monitor_campos_decidir(
    '00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1',
    jsonb_build_array(jsonb_build_object('campo_id', (select id from ids where nome = 'fornecedor'), 'acao', 'aceitar'))),
  0, 'segundo envio das mesmas decisões: ignorado (idempotente)');

-- Posse: campo de outro contrato / contrato de outro utilizador.
select is(testes.tenta(format($$select public.monitor_campos_decidir('00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1', '[{"campo_id": "%s", "acao": "aceitar"}]')$$, (select id from ids where nome = 'b'))),
  'erro:P0002', 'campo de outro contrato: recusado');
select is(testes.tenta($$select public.monitor_campos_decidir('00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000b1', '[]')$$),
  'erro:P0002', 'contrato de outro utilizador: recusado');
select is((select estado from public.contratos_campos where id = (select id from ids where nome = 'b')), 'proposto', 'o valor de B fica intacto');

-- Atomicidade: uma decisão inválida anula o lote todo.
insert into ids values
  ('fim', public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'data_fim_fidelizacao', '"2027-04-08"', 'contrato')),
  ('promo', public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'descricao_promocao', '"29 €/mês durante 24 meses"', 'contrato'));
select is(testes.tenta(format($$select public.monitor_campos_decidir('00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1', '[{"campo_id": "%s", "acao": "aceitar"}, {"campo_id": "%s", "acao": "apagar"}]')$$,
  (select id from ids where nome = 'fim'), (select id from ids where nome = 'promo'))),
  'erro:22023', 'ação inválida: recusada');
select ok((select data_fim_fidelizacao is null from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), 'lote com uma decisão inválida: nada aplicado');
select is((select estado from public.contratos_campos where id = (select id from ids where nome = 'fim')), 'proposto', 'lote recusado: a proposta continua por decidir');
select is(testes.tenta(format($$select public.monitor_campos_decidir('00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1', '[{"campo_id": "%s", "acao": "corrigir"}]')$$,
  (select id from ids where nome = 'promo'))),
  'erro:22023', 'corrigir sem valor: recusado');

select * from finish();
rollback;
