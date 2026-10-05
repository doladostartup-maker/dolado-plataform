-- DoLado — Monitor: alterar o tipo de um documento na revisão
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que só o servidor altera o tipo, sempre com um revisor admin; que o
-- cliente não lê a auditoria nem altera o tipo; que o tipo indicado pelo
-- cliente é imutável; que a alteração invalida as leituras e retira a fatura
-- registada e os valores propostos, sem tocar no ficheiro; que a auditoria é
-- só de inserção; e que dados já decididos por uma pessoa bloqueiam a
-- alteração. Tudo numa transação revertida.

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
  ('00000000-0000-4000-f100-00000000000a', 'tipo-a@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-f100-0000000000ad', 'tipo-admin@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-f100-0000000000ad';

insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('70000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f100-00000000000a', 'telecomunicacoes');

-- d1: fatura registada no serviço (com leitura, fatura, valor proposto e valor aceite pelo sistema).
-- d2: fatura sem leitura nenhuma (processamento falhou).
-- d3: contrato com um valor confirmado pelo cliente.
insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path, sha256, estado, etapa) values
  ('71000000-0000-4000-f100-0000000000d1', '00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1',
   'fatura', 'a/d1.pdf', repeat('1', 64), 'a_rever', 'concluido'),
  ('71000000-0000-4000-f100-0000000000d2', '00000000-0000-4000-f100-00000000000a', null,
   'fatura', 'a/d2.pdf', repeat('2', 64), 'pendente', 'falhou'),
  ('71000000-0000-4000-f100-0000000000d3', '00000000-0000-4000-f100-00000000000a', '70000000-0000-4000-f100-0000000000a1',
   'contrato', 'a/d3.pdf', repeat('3', 64), 'processado', 'concluido');

insert into public.extracoes_documento (id, documento_id, modelo, schema_versao, prompt_versao, estado, resultado) values
  ('73000000-0000-4000-f100-0000000000e1', '71000000-0000-4000-f100-0000000000d1', 'm', 'fatura_v3', 'p', 'sucesso', '{"tipo_documento":"contrato"}');

insert into public.faturas_monitor (id, contrato_id, utilizador_id, documento_id, total_cents) values
  ('74000000-0000-4000-f100-0000000000f1', '70000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f100-00000000000a',
   '71000000-0000-4000-f100-0000000000d1', 7146);

select public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'data_fim_fidelizacao', '"2027-01-01"', 'fatura',
  '71000000-0000-4000-f100-0000000000d1');
select public.monitor_campo_aceitar(
  public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'fornecedor', '"Vodafone"', 'fatura', '71000000-0000-4000-f100-0000000000d1'),
  null);
select public.monitor_campo_aceitar(
  public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a1', 'mensalidade_cents', '7146', 'contrato', '71000000-0000-4000-f100-0000000000d3'),
  'cliente');

-- ===========================================================================
-- 1. Privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.monitor_documento_alterar_tipo(uuid, text, uuid)', 'EXECUTE'), 'alterar tipo: não executável pelo cliente');
select ok(not has_function_privilege('anon', 'public.monitor_documento_alterar_tipo(uuid, text, uuid)', 'EXECUTE'), 'alterar tipo: não executável por anon');
select ok(has_function_privilege('service_role', 'public.monitor_documento_alterar_tipo(uuid, text, uuid)', 'EXECUTE'), 'alterar tipo: servidor (service_role)');
select ok(not has_table_privilege('authenticated', 'public.documentos_tipo_alteracoes', 'INSERT'), 'auditoria: cliente sem INSERT');
select ok(not has_table_privilege('authenticated', 'public.documentos_monitor', 'UPDATE'), 'documentos: cliente sem UPDATE (não muda o tipo)');

-- ===========================================================================
-- 2. Revisor tem de ser admin; validações
-- ===========================================================================
select throws_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d1', 'contrato', '00000000-0000-4000-f100-00000000000a') $$,
  '42501', null, 'cliente como revisor: recusado');
select throws_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d1', 'contrato', null) $$,
  '42501', null, 'sem revisor: recusado');
select throws_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d1', 'fatura', '00000000-0000-4000-f100-0000000000ad') $$,
  '22023', null, 'mesmo tipo: recusado');
select throws_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d1', 'desconhecido', '00000000-0000-4000-f100-0000000000ad') $$,
  '22023', null, 'tipo sem pipeline: recusado');
select throws_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d3', 'fatura', '00000000-0000-4000-f100-0000000000ad') $$,
  '42501', null, 'valor confirmado pelo cliente: nada se desfaz automaticamente');
select is((select count(*)::int from public.documentos_tipo_alteracoes), 0, 'recusas: sem auditoria');

-- ===========================================================================
-- 3. Fatura → Contrato
-- ===========================================================================
select is(
  public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d1', 'contrato', '00000000-0000-4000-f100-0000000000ad') ->> 'fatura_removida',
  'true', 'alteração feita (fatura registada retirada)');
select is((select tipo from public.documentos_monitor where id = '71000000-0000-4000-f100-0000000000d1'), 'contrato', 'tipo usado pelo sistema: contrato');
select is((select tipo_indicado from public.documentos_monitor where id = '71000000-0000-4000-f100-0000000000d1'), 'fatura', 'tipo indicado pelo cliente mantém-se');
select is((select estado from public.documentos_monitor where id = '71000000-0000-4000-f100-0000000000d1'), 'pendente', 'volta a pendente (nova leitura)');
select is((select storage_path from public.documentos_monitor where id = '71000000-0000-4000-f100-0000000000d1'), 'a/d1.pdf', 'mesmo ficheiro');
select is((select estado from public.extracoes_documento where id = '73000000-0000-4000-f100-0000000000e1'), 'invalidada', 'leitura antiga invalidada');
select is((select count(*)::int from public.faturas_monitor where documento_id = '71000000-0000-4000-f100-0000000000d1'), 0, 'fatura retirada');
select is((select count(*)::int from public.contratos_campos where documento_id = '71000000-0000-4000-f100-0000000000d1' and estado in ('proposto', 'em_conflito', 'atual')), 0,
  'valores da leitura antiga postos de parte');
select is((select fornecedor from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), null, 'valor aceite pelo sistema retirado do serviço');
select is((select mensalidade_cents from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), 7146, 'valor confirmado de outro documento intacto');
select is((select count(*)::int from public.documentos_monitor where utilizador_id = '00000000-0000-4000-f100-00000000000a'), 3, 'nenhum documento duplicado');
select results_eq(
  $$ select tipo_anterior, tipo_novo, alterado_por, utilizador_id, leituras_invalidadas, fatura_removida, valores_retirados
       from public.documentos_tipo_alteracoes where documento_id = '71000000-0000-4000-f100-0000000000d1' $$,
  $$ values ('fatura'::text, 'contrato'::text, '00000000-0000-4000-f100-0000000000ad'::uuid, '00000000-0000-4000-f100-00000000000a'::uuid, 1, true, 2) $$,
  'auditoria: tipo anterior, novo, revisor e o que foi posto de parte');
select ok((select created_at > now() - interval '1 minute' from public.documentos_tipo_alteracoes where documento_id = '71000000-0000-4000-f100-0000000000d1'),
  'auditoria: data/hora');

-- Uma nova leitura com o mesmo modelo/schema/prompt pode ser gravada (a invalidada não conta).
select lives_ok($$ insert into public.extracoes_documento (documento_id, modelo, schema_versao, prompt_versao, estado, resultado)
  values ('71000000-0000-4000-f100-0000000000d1', 'm', 'fatura_v3', 'p', 'sucesso', '{}') $$, 'leitura invalidada não bloqueia uma nova');

-- ===========================================================================
-- 4. Processamento falhado (sem leitura) → Contrato → Fatura
-- ===========================================================================
select is(
  (public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d2', 'contrato', '00000000-0000-4000-f100-0000000000ad') ->> 'leituras_invalidadas')::int,
  0, 'sem leitura: o tipo muda na mesma');
select lives_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d2', 'fatura', '00000000-0000-4000-f100-0000000000ad') $$,
  'e pode voltar a fatura');
select is((select count(*)::int from public.documentos_tipo_alteracoes where documento_id = '71000000-0000-4000-f100-0000000000d2'), 2, 'cada alteração auditada');

-- Documento a ser lido neste momento: espera.
update public.documentos_monitor set etapa = 'a_ler', etapa_atualizada_em = now() where id = '71000000-0000-4000-f100-0000000000d2';
select throws_ok($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d2', 'contrato', '00000000-0000-4000-f100-0000000000ad') $$,
  'P0001', null, 'leitura em curso: recusado');

-- ===========================================================================
-- 5. Imutabilidade e acesso do cliente
-- ===========================================================================
select is(testes.tenta($$ update public.documentos_tipo_alteracoes set tipo_novo = 'fatura' $$), 'erro:42501', 'auditoria só de inserção');
select is(testes.tenta($$ update public.documentos_monitor set tipo_indicado = 'contrato' where id = '71000000-0000-4000-f100-0000000000d1' $$),
  'erro:42501', 'tipo indicado imutável');

select testes.como('00000000-0000-4000-f100-00000000000a');
select is((select count(*)::int from public.documentos_tipo_alteracoes), 0, 'cliente não lê a auditoria');
select is(testes.tenta($$ update public.documentos_monitor set tipo = 'fatura' where id = '71000000-0000-4000-f100-0000000000d1' $$),
  'erro:42501', 'cliente não altera o tipo');
select is(testes.tenta($$ select public.monitor_documento_alterar_tipo('71000000-0000-4000-f100-0000000000d1', 'fatura', '00000000-0000-4000-f100-0000000000ad') $$),
  'erro:42501', 'cliente não chama a função (mesmo indicando um admin)');
reset role;

select testes.como('00000000-0000-4000-f100-0000000000ad');
select is((select count(*)::int from public.documentos_tipo_alteracoes), 3, 'admin lê a auditoria');
reset role;

select * from finish();
rollback;
