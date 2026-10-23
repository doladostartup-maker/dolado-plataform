-- DoLado Empresas — Fase 6A: instalações, carregamento com quota, limite de
-- serviços e resultado do processamento.
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e900-00000000000a', 'mon-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e900-0000000000e1', 'mon-e1@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e900-0000000000e2', 'mon-e2@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e900-00000000000c', 'mon-c@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e900-00000000000a';
select is(public.empresa_registar('00000000-0000-4000-e900-0000000000e1', 'Um', 'sociedade', '500000000', null), 'registada', 'e1');
select is(public.empresa_registar('00000000-0000-4000-e900-0000000000e2', 'Dois', 'sociedade', '500000018', null), 'registada', 'e2');

create temporary table ids as
select (select id from public.organizacoes where nif = '500000000') as o1,
       (select id from public.organizacoes where nif = '500000018') as o2;
grant select on ids to public;

-- Sem estar activa: nada.
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e1', 'Loja', null) ->> 'resultado', 'sem_acesso',
  'Organização ainda não activa: sem instalações');

update public.organizacoes set estado = 'aprovada';
select is(public.empresa_activar((select o1 from ids), '00000000-0000-4000-e900-00000000000a', 'FT 1'), 'ativa', 'o1 activa');
select is(public.empresa_activar((select o2 from ids), '00000000-0000-4000-e900-00000000000a', 'FT 2'), 'ativa', 'o2 activa');

-- ===========================================================================
-- Instalações (limite 2)
-- ===========================================================================
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e1', ' ', null) ->> 'resultado', 'nome_invalido', 'Nome obrigatório');
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e1', 'Loja Centro', 'Rua A') ->> 'resultado', 'criada', '1.ª');
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e1', 'loja centro', null) ->> 'resultado', 'nome_repetido', 'Nome repetido');
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e1', 'Loja Norte', null) ->> 'resultado', 'criada', '2.ª');
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e1', 'Loja Sul', null) ->> 'resultado', 'limite', '3.ª: limite do plano');
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-0000000000e2', 'Sede', null) ->> 'resultado', 'criada', 'o2: a sua');
select is(public.empresa_criar_instalacao('00000000-0000-4000-e900-00000000000c', 'Casa', null) ->> 'resultado', 'sem_acesso', 'Particular: nada');

create temporary table inst as
select (select id from public.instalacoes where nome = 'Loja Centro') as centro,
       (select id from public.instalacoes where nome = 'Loja Norte') as norte,
       (select id from public.instalacoes where nome = 'Sede') as sede;
grant select on inst to public;

-- ===========================================================================
-- Carregamento e quota (15 por mês)
-- ===========================================================================
create function pg_temp.carregar(p_user uuid, p_inst uuid, p_tipo text, p_config boolean, p_caminho text default null)
returns text language sql as $$
  select public.empresa_registar_documento(p_user, p_inst, p_tipo, p_config,
    coalesce(p_caminho, p_user::text || '/' || gen_random_uuid()::text || '.pdf'), 'f.pdf', 'application/pdf') ->> 'resultado'
$$;

select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select sede from inst), 'fatura', false), 'instalacao_invalida',
  'Instalação de outra organização: recusada');
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select centro from inst), 'fatura', false,
  '00000000-0000-4000-e900-0000000000e2/' || gen_random_uuid()::text || '.pdf'), 'caminho_invalido', 'Caminho de outra conta: recusado');
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select centro from inst), 'contrato', false), 'registado', 'Contrato');
select is((select estado_quota from public.empresa_documentos d join public.documentos_monitor m on m.id = d.documento_id
            where m.tipo = 'contrato' and d.organizacao_id = (select o1 from ids)), 'nao_conta', 'Contrato não conta para a quota');
select is((select tipo_indicado || '|' || etapa || '|' || (contrato_id is null)::text from public.documentos_monitor
            where utilizador_id = '00000000-0000-4000-e900-0000000000e1' limit 1), 'contrato|recebido|true', 'Documento no Monitor, sem serviço ainda');

select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select centro from inst), 'fatura', true), 'registado',
  'Configuração inicial dentro dos 30 dias');
select is((public.empresa_quota((select o1 from ids)) ->> 'usadas')::integer, 0, 'Configuração inicial não conta');

select is(count(*), 15::bigint, '15 facturas aceites')
  from generate_series(1, 15) n
 where pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select norte from inst), 'fatura', false) = 'registado';
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select norte from inst), 'fatura', false), 'quota_esgotada',
  '16.ª: quota esgotada');
select is(public.empresa_quota((select o1 from ids)) - 'periodo_id', '{"limite": 15, "usadas": 15, "disponiveis": 0}'::jsonb, 'Quota');

-- Erro técnico liberta; resultado útil consome; contrato não muda.
select is(public.empresa_documento_resultado((select documento_id from public.empresa_documentos
  where organizacao_id = (select o1 from ids) and estado_quota = 'reservada' limit 1), 'libertada'), 'libertada', 'Libertada');
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select norte from inst), 'fatura', false), 'registado',
  'Depois de libertar, cabe outra');
select is(public.empresa_documento_resultado((select documento_id from public.empresa_documentos
  where organizacao_id = (select o1 from ids) and estado_quota = 'reservada' limit 1), 'consumida'), 'consumida', 'Consumida');
select is(public.empresa_documento_resultado((select d.documento_id from public.empresa_documentos d join public.documentos_monitor m on m.id = d.documento_id
  where m.tipo = 'contrato' and d.organizacao_id = (select o1 from ids)), 'consumida'), 'nao_conta', 'Contrato fica fora da quota');

-- Excepção do admin.
select is(public.empresa_conceder_excecao((select o1 from ids), '00000000-0000-4000-e900-00000000000c', 2, 'x'), 'sem_permissao', 'Só o admin');
select is(public.empresa_conceder_excecao((select o1 from ids), '00000000-0000-4000-e900-00000000000a', 2, ' '), 'invalida', 'Motivo obrigatório');
select is(public.empresa_conceder_excecao((select o1 from ids), '00000000-0000-4000-e900-00000000000a', 2, 'Fecho de ano'), 'concedida', 'Excepção');
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select norte from inst), 'fatura', false), 'registado', 'Com a excepção, cabe');

-- Configuração inicial fora dos 30 dias.
update public.organizacoes set revisao_obrigatoria_ate = now() - interval '1 day' where id = (select o1 from ids);
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select centro from inst), 'fatura', true), 'configuracao_terminada',
  'Configuração inicial só nos primeiros 30 dias');

-- Suspensa: sem carregamentos.
update public.organizacoes set estado = 'suspensa' where id = (select o1 from ids);
select is(pg_temp.carregar('00000000-0000-4000-e900-0000000000e1', (select centro from inst), 'fatura', false), 'sem_acesso', 'Suspensa: não carrega');
update public.organizacoes set estado = 'ativa' where id = (select o1 from ids);

-- ===========================================================================
-- Limite de serviços (5)
-- ===========================================================================
select ok(public.empresa_pode_criar_servico('00000000-0000-4000-e900-0000000000e2'), 'Sem serviços: pode');
insert into public.contratos_monitorizados (utilizador_id, setor)
select '00000000-0000-4000-e900-0000000000e2', 'agua' from generate_series(1, 5);
select ok(not public.empresa_pode_criar_servico('00000000-0000-4000-e900-0000000000e2'), '5 serviços: limite');
select ok(not public.empresa_pode_criar_servico('00000000-0000-4000-e900-00000000000c'), 'Particular: nunca por aqui');

-- ===========================================================================
-- Privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.empresa_registar_documento(uuid, uuid, text, boolean, text, text, text)', 'EXECUTE'), 'registar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_criar_instalacao(uuid, text, text)', 'EXECUTE'), 'instalação: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_documento_resultado(uuid, text)', 'EXECUTE'), 'resultado: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_conceder_excecao(uuid, uuid, integer, text)', 'EXECUTE'), 'excepção: só service_role');

-- Quota pela sessão: só com aal2 e só a própria organização.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-e900-0000000000e1', 'role', 'authenticated', 'aal', 'aal1')::text, true);
select is(public.empresa_quota_sessao(), null, 'Sessão aal1: nada');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-e900-0000000000e1', 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is((public.empresa_quota_sessao() ->> 'limite')::integer, 17, 'Sessão aal2: limite com a excepção');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-e900-00000000000c', 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is(public.empresa_quota_sessao(), null, 'Particular: nada');
reset role;

select * from finish();
rollback;
