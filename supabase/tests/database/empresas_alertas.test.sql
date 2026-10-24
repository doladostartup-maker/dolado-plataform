-- DoLado Empresas — Fase 8: alertas de prazo, factura em falta e resumo
-- mensal. Os particulares continuam com exactamente os mesmos alertas.
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-eb00-00000000000a', 'al-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-eb00-0000000000e1', 'al-e1@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-eb00-0000000000e2', 'al-e2@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-eb00-0000000000f1', 'al-p1@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-eb00-00000000000a';

-- Particular com Protecção (o conjunto de sempre).
insert into public.user_access (user_id, subscription_plan, subscription_status) values
  ('00000000-0000-4000-eb00-0000000000f1', 'protecao', 'active');

-- Duas empresas activas.
select is(public.empresa_registar('00000000-0000-4000-eb00-0000000000e1', 'Um', 'sociedade', '500000000', null), 'registada', 'e1');
select is(public.empresa_registar('00000000-0000-4000-eb00-0000000000e2', 'Dois', 'sociedade', '509999999', null), 'registada', 'e2');
update public.organizacoes set estado = 'aprovada';
select is(public.empresa_activar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-eb00-00000000000a', 'FT 1'), 'ativa', 'e1 activa');
select is(public.empresa_activar((select id from public.organizacoes where nif = '509999999'), '00000000-0000-4000-eb00-00000000000a', 'FT 2'), 'ativa', 'e2 activa');
select is(public.empresa_criar_instalacao('00000000-0000-4000-eb00-0000000000e1', 'Loja', null) ->> 'resultado', 'criada', 'instalação');

-- Serviços: particular (fidelização a 45 dias), e1 (45 dias; 100 dias com
-- pré-aviso de 90), e2 (45 dias).
insert into public.contratos_monitorizados (id, utilizador_id, setor, fornecedor, data_fim_fidelizacao, created_at) values
  ('00000000-0000-4000-eb00-0000000000c0', '00000000-0000-4000-eb00-0000000000f1', 'telecomunicacoes', 'Part', current_date + 45, now() - interval '1 day');
insert into public.contratos_monitorizados (id, utilizador_id, setor, fornecedor, instalacao_id, data_fim_fidelizacao, created_at) values
  ('00000000-0000-4000-eb00-0000000000c1', '00000000-0000-4000-eb00-0000000000e1', 'telecomunicacoes', 'Tel', (select id from public.instalacoes where nome = 'Loja'), current_date + 45, now() - interval '1 day'),
  ('00000000-0000-4000-eb00-0000000000c2', '00000000-0000-4000-eb00-0000000000e1', 'eletricidade', 'Ene', (select id from public.instalacoes where nome = 'Loja'), current_date + 100, now() - interval '1 day'),
  ('00000000-0000-4000-eb00-0000000000c3', '00000000-0000-4000-eb00-0000000000e2', 'telecomunicacoes', 'Tel2', null, current_date + 45, now() - interval '1 day');

-- --------------------------------------------------------------------------
-- 1. Particulares: o conjunto é o mesmo e nunca inclui empresas.
-- --------------------------------------------------------------------------
select is(
  (select array_agg(contrato_id::text || ':' || regra order by contrato_id) from public.monitor_alertas_pendentes(current_date)),
  array['00000000-0000-4000-eb00-0000000000c0:fidelizacao_60d'],
  'monitor_alertas_pendentes: só o particular, como antes');
select is(
  (select count(*) from public.empresa_alertas_pendentes(current_date) where contrato_id = '00000000-0000-4000-eb00-0000000000c0'),
  0::bigint, 'empresa_alertas_pendentes nunca devolve serviços de particulares');

-- --------------------------------------------------------------------------
-- 2. Empresas: 60/30 dias, pré-aviso, reserva partilhada.
-- --------------------------------------------------------------------------
select is(
  (select array_agg(contrato_id::text || ':' || regra order by contrato_id) from public.empresa_alertas_pendentes(current_date)),
  array['00000000-0000-4000-eb00-0000000000c1:fidelizacao_60d', '00000000-0000-4000-eb00-0000000000c3:fidelizacao_60d'],
  'Empresas activas: primeiro aviso a 45 dias; 100 dias sem pré-aviso ainda não');
select is((select instalacao from public.empresa_alertas_pendentes(current_date) where contrato_id = '00000000-0000-4000-eb00-0000000000c1'), 'Loja', 'Com a instalação');

select is(public.empresa_definir_preaviso('00000000-0000-4000-eb00-0000000000e2', '00000000-0000-4000-eb00-0000000000c2', 90), 'nao_encontrado', 'Pré-aviso: só serviços da própria conta');
select is(public.empresa_definir_preaviso('00000000-0000-4000-eb00-0000000000f1', '00000000-0000-4000-eb00-0000000000c0', 90), 'sem_acesso', 'Pré-aviso: nunca em contas particulares');
select is(public.empresa_definir_preaviso('00000000-0000-4000-eb00-0000000000e1', '00000000-0000-4000-eb00-0000000000c2', 0), 'invalido', 'Pré-aviso: 1 a 365');
select is(public.empresa_definir_preaviso('00000000-0000-4000-eb00-0000000000e1', '00000000-0000-4000-eb00-0000000000c2', 90), 'guardado', 'Pré-aviso guardado');
select ok(exists (select 1 from public.empresa_alertas_pendentes(current_date) where contrato_id = '00000000-0000-4000-eb00-0000000000c2' and regra = 'fidelizacao_60d'),
  'Pré-aviso de 90 dias: primeiro aviso a 100 dias (até 120)');

select ok(public.monitor_reservar_alerta('00000000-0000-4000-eb00-0000000000c1', 'fidelizacao_60d', current_date + 45), 'Reserva');
select ok(not public.monitor_reservar_alerta('00000000-0000-4000-eb00-0000000000c1', 'fidelizacao_60d', current_date + 45), 'Nunca duas vezes');
select is((select count(*) from public.empresa_alertas_pendentes(current_date) where contrato_id = '00000000-0000-4000-eb00-0000000000c1'), 0::bigint, 'Reservado: sai da lista');

-- Suspensa: sem alertas de análise.
update public.organizacoes set estado = 'suspensa' where nif = '509999999';
select is((select count(*) from public.empresa_alertas_pendentes(current_date) where contrato_id = '00000000-0000-4000-eb00-0000000000c3'), 0::bigint, 'Suspensa: sem alertas');

-- --------------------------------------------------------------------------
-- 3. Factura em falta.
-- --------------------------------------------------------------------------
insert into public.documentos_monitor (id, utilizador_id, storage_path, tipo_indicado, tipo, sha256, etapa, estado) values
  ('00000000-0000-4000-eb00-0000000000d1', '00000000-0000-4000-eb00-0000000000e1', 'x/1', 'fatura', 'fatura', repeat('a', 64), 'concluido', 'processado'),
  ('00000000-0000-4000-eb00-0000000000d2', '00000000-0000-4000-eb00-0000000000e1', 'x/2', 'fatura', 'fatura', repeat('b', 64), 'concluido', 'processado'),
  ('00000000-0000-4000-eb00-0000000000d3', '00000000-0000-4000-eb00-0000000000e1', 'x/3', 'fatura', 'fatura', repeat('c', 64), 'concluido', 'processado');
insert into public.faturas_monitor (contrato_id, utilizador_id, documento_id, data_emissao, total_cents) values
  ('00000000-0000-4000-eb00-0000000000c2', '00000000-0000-4000-eb00-0000000000e1', '00000000-0000-4000-eb00-0000000000d3', current_date - 50, 1000);
select is((select count(*) from public.empresa_facturas_em_falta(current_date)), 0::bigint, 'Com uma só factura: sem histórico, sem lembrete');

insert into public.faturas_monitor (contrato_id, utilizador_id, documento_id, data_emissao, total_cents) values
  ('00000000-0000-4000-eb00-0000000000c1', '00000000-0000-4000-eb00-0000000000e1', '00000000-0000-4000-eb00-0000000000d1', current_date - 80, 1000),
  ('00000000-0000-4000-eb00-0000000000c1', '00000000-0000-4000-eb00-0000000000e1', '00000000-0000-4000-eb00-0000000000d2', current_date - 50, 1000);
select is(
  (select contrato_id::text || '|' || esperada_ate::text from public.empresa_facturas_em_falta(current_date)),
  '00000000-0000-4000-eb00-0000000000c1|' || (current_date - 5)::text,
  'Intervalo de 30 dias, última há 50: esperada até há 5 dias');
select is((select count(*) from public.empresa_facturas_em_falta(current_date - 10)), 0::bigint, 'Antes de 1,5 × o intervalo: sem lembrete');

create temporary table r as
select public.empresa_alerta_reservar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-eb00-0000000000c1', 'factura_em_falta', to_char(current_date, 'YYYY-MM')) as id;
grant select on r to public;
select ok((select id from r) is not null, 'Lembrete reservado');
select is(public.empresa_alerta_reservar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-eb00-0000000000c1', 'factura_em_falta', to_char(current_date, 'YYYY-MM')),
  null, 'Um lembrete por serviço e por mês');
select is(public.empresa_alerta_reservar((select id from public.organizacoes where nif = '509999999'), '00000000-0000-4000-eb00-0000000000c1', 'factura_em_falta', '2026-01'),
  null, 'Nunca para um serviço de outra organização');
select is((select count(*) from public.empresa_facturas_em_falta(current_date)), 0::bigint, 'Reservado: sai da lista');
select public.empresa_alerta_concluir((select id from r), false);
select is((select count(*) from public.empresa_facturas_em_falta(current_date)), 1::bigint, 'Falha libertada: volta à lista');
select ok(public.empresa_alerta_reservar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-eb00-0000000000c1', 'factura_em_falta', to_char(current_date, 'YYYY-MM')) is not null, 'Nova reserva');
select public.empresa_alerta_concluir((select id from public.empresa_alertas_envios where contrato_id = '00000000-0000-4000-eb00-0000000000c1'), true);
select is((select estado from public.empresa_alertas_envios where contrato_id = '00000000-0000-4000-eb00-0000000000c1'), 'enviado', 'Enviado');

-- --------------------------------------------------------------------------
-- 4. Resumo mensal.
-- --------------------------------------------------------------------------
select is(
  (select array_agg(nome_organizacao) from public.empresa_resumo_destinatarios(date_trunc('month', current_date)::date)),
  array['Um'], 'Destinatários: activa com período pago no mês; a suspensa não');
select is((select count(*) from public.empresa_resumo_destinatarios((date_trunc('month', current_date) - interval '1 month')::date)),
  0::bigint, 'Mês sem período pago: sem resumo');

create temporary table rs as
select public.empresa_resumo_reservar((select id from public.organizacoes where nif = '500000000'), date_trunc('month', current_date)::date) as id;
grant select on rs to public;
select ok((select id from rs) is not null, 'Resumo reservado');
select is(public.empresa_resumo_reservar((select id from public.organizacoes where nif = '500000000'), date_trunc('month', current_date)::date), null, 'Nunca dois por mês');
select is(public.empresa_resumo_reservar((select id from public.organizacoes where nif = '509999999'), date_trunc('month', current_date)::date), null, 'Suspensa: nunca');
select ok(public.empresa_resumo_concluir((select id from rs), true, '{"mes":"x","facturas":0}'::jsonb, 'resumo_empresa_v1'), 'Concluído');
select throws_ok($$ update public.empresa_resumos_mensais set conteudo = '{}'::jsonb $$, '42501', null, 'Enviado: imutável');
select is((select count(*) from public.empresa_resumo_destinatarios(date_trunc('month', current_date)::date)), 0::bigint, 'Enviado: sai dos destinatários');

-- RLS: o membro com aal2 lê o próprio; sem aal2 ou de outra organização, nada.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-eb00-0000000000e1', 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is((select count(*) from public.empresa_resumos_mensais), 1::bigint, 'Membro (aal2) lê o resumo');
select is((select count(*) from public.empresa_alertas_envios), 1::bigint, 'Membro (aal2) lê os lembretes');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-eb00-0000000000e1', 'role', 'authenticated', 'aal', 'aal1')::text, true);
select is((select count(*) from public.empresa_resumos_mensais), 0::bigint, 'Sem aal2: nada');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-eb00-0000000000e2', 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is((select count(*) from public.empresa_resumos_mensais), 0::bigint, 'Outra organização: nada');
select is((select count(*) from public.empresa_alertas_envios), 0::bigint, 'Outra organização: sem lembretes');
select throws_ok($$ insert into public.empresa_alertas_envios (organizacao_id, contrato_id, tipo, referencia) values (gen_random_uuid(), gen_random_uuid(), 'factura_em_falta', '2026-01') $$,
  '42501', null, 'Cliente não escreve');
reset role;

-- Só a service role.
select ok(not has_function_privilege('authenticated', 'public.empresa_alertas_pendentes(date)', 'EXECUTE'), 'alertas: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_facturas_em_falta(date)', 'EXECUTE'), 'faltas: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_definir_preaviso(uuid, uuid, integer)', 'EXECUTE'), 'pré-aviso: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_resumo_reservar(uuid, date)', 'EXECUTE'), 'resumo: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_destinos_alertas()', 'EXECUTE'), 'destinos: só service_role');

select * from finish();
rollback;
