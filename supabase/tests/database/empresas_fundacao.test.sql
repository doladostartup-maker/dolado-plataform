-- DoLado Empresas — Fase 2: fundação do modelo de dados
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: todas as contas nascem particulares e o tipo só muda por
-- empresa_marcar_conta() (conta nova, sem histórico, nunca admin); cada
-- organização só é lida pelos seus membros com a sessão aal2 (nunca com aal1,
-- nunca por outra organização, por particulares nem por anónimos); o cliente
-- não escreve em nenhuma tabela nova; a instalação de um serviço tem de ser da
-- organização do dono; as policies restritivas do Monitor não mudam nada para
-- contas particulares; registos só de inserção; histórico de estados; acesso
-- por estado. Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated', 'aal', aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function testes.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
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

create function testes.conta(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || q || ') x' into n;
  return n;
end $$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- a/b: contas de empresa (organizações A e B) · p: particular · v: antiga ·
-- h: nova com histórico · d: admin
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e200-00000000000a', 'empa@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e200-00000000000b', 'empb@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e200-00000000000c', 'part@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e200-00000000000d', 'adm@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e200-00000000000e', 'antiga@teste.invalid', 'authenticated', 'authenticated', now(), now() - interval '1 hour'),
  ('00000000-0000-4000-e200-00000000000f', 'hist@teste.invalid', 'authenticated', 'authenticated', now(), now());

update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e200-00000000000d';

-- ===========================================================================
-- Tipo de conta
-- ===========================================================================
select is((select count(*) from public.utilizadores
            where id::text like '00000000-0000-4000-e200-%' and tipo_conta = 'particular'), 6::bigint,
  'Todas as contas nascem particulares');

select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000a'), 'marcada', 'Conta nova sem histórico passa a empresa');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000a'), 'ja_empresa', 'Marcar de novo não faz nada');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000b'), 'marcada', 'Segunda conta de empresa');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000e'), 'conta_antiga', 'Conta criada há mais de 15 minutos nunca é convertida');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000d'), 'conta_admin', 'Conta admin nunca é convertida');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-0000000000ff'), 'sem_conta', 'Conta inexistente');

insert into public.contratos_monitorizados (utilizador_id, setor) values ('00000000-0000-4000-e200-00000000000f', 'telecomunicacoes');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000f'), 'com_historico', 'Conta com dados particulares nunca é convertida');
insert into public.user_access (user_id) values ('00000000-0000-4000-e200-00000000000c');
select is(public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000c'), 'com_historico', 'Conta com user_access nunca é convertida');

select throws_ok($$ update public.utilizadores set tipo_conta = 'particular' where id = '00000000-0000-4000-e200-00000000000a' $$,
  '42501', null, 'Empresa nunca volta a particular');
select throws_ok($$ update public.utilizadores set tipo_conta = 'empresa' where id = '00000000-0000-4000-e200-00000000000e' $$,
  '42501', null, 'Ninguém altera o tipo directamente (nem a service_role/postgres)');

-- O cliente e o admin não podem chamar a função nem alterar o tipo.
select testes.como('00000000-0000-4000-e200-00000000000e');
select is(testes.tenta($$ select public.empresa_marcar_conta('00000000-0000-4000-e200-00000000000e') $$), 'erro:42501',
  'Cliente não chama empresa_marcar_conta');
select is(testes.tenta($$ update public.utilizadores set tipo_conta = 'empresa' where id = '00000000-0000-4000-e200-00000000000e' $$),
  'ok:0', 'Cliente não altera o próprio tipo (sem policy de update)');
reset role;
select testes.como('00000000-0000-4000-e200-00000000000d', 'aal2');
select is(testes.tenta($$ update public.utilizadores set tipo_conta = 'empresa' where id = '00000000-0000-4000-e200-00000000000e' $$),
  'erro:42501', 'Admin não altera o tipo pela API');
reset role;

-- ===========================================================================
-- Organizações, membros e instalações
-- ===========================================================================
insert into public.organizacoes (id, nome, tipo_entidade, nif, estado) values
  ('00000000-0000-4000-e300-00000000000a', 'Empresa A, Lda.', 'sociedade', '509999990', 'ativa'),
  ('00000000-0000-4000-e300-00000000000b', 'Empresa B', 'empresario_nome_individual', '199999990', 'a_aguardar_aprovacao');
insert into public.organizacoes_membros (organizacao_id, utilizador_id) values
  ('00000000-0000-4000-e300-00000000000a', '00000000-0000-4000-e200-00000000000a'),
  ('00000000-0000-4000-e300-00000000000b', '00000000-0000-4000-e200-00000000000b');
insert into public.instalacoes (id, organizacao_id, nome) values
  ('00000000-0000-4000-e400-0000000000a1', '00000000-0000-4000-e300-00000000000a', 'Sede'),
  ('00000000-0000-4000-e400-0000000000a2', '00000000-0000-4000-e300-00000000000a', 'Loja 1'),
  ('00000000-0000-4000-e400-0000000000b1', '00000000-0000-4000-e300-00000000000b', 'Escritório');
insert into public.empresa_periodos (organizacao_id, inicio, fim, valor_cents) values
  ('00000000-0000-4000-e300-00000000000a', '2026-10-23', '2026-11-23', 4900),
  ('00000000-0000-4000-e300-00000000000b', '2026-10-23', '2026-11-23', 4900);

select throws_ok($$ insert into public.organizacoes_membros (organizacao_id, utilizador_id)
  values ('00000000-0000-4000-e300-00000000000b', '00000000-0000-4000-e200-00000000000e') $$,
  '42501', null, 'Conta particular nunca é membro de uma organização');
select throws_ok($$ insert into public.organizacoes (nome, tipo_entidade, nif) values ('Outra', 'sociedade', '509999990') $$,
  '23505', null, 'Um NIPC/NIF por organização em curso');
select throws_ok($$ insert into public.instalacoes (organizacao_id, nome) values ('00000000-0000-4000-e300-00000000000a', ' sede ') $$,
  '23505', null, 'Nome de instalação único na organização');

-- A instalação de um serviço tem de ser da organização do dono.
select lives_ok($$ insert into public.contratos_monitorizados (id, utilizador_id, setor, instalacao_id) values
  ('00000000-0000-4000-e500-0000000000a1', '00000000-0000-4000-e200-00000000000a', 'eletricidade', '00000000-0000-4000-e400-0000000000a1') $$,
  'Serviço da empresa A na instalação da empresa A');
select throws_ok($$ insert into public.contratos_monitorizados (utilizador_id, setor, instalacao_id) values
  ('00000000-0000-4000-e200-00000000000a', 'agua', '00000000-0000-4000-e400-0000000000b1') $$,
  '23514', null, 'Serviço da empresa A numa instalação da empresa B é recusado');
select throws_ok($$ insert into public.contratos_monitorizados (utilizador_id, setor, instalacao_id) values
  ('00000000-0000-4000-e200-00000000000e', 'agua', '00000000-0000-4000-e400-0000000000a1') $$,
  '23514', null, 'Serviço particular numa instalação é recusado');
select throws_ok($$ update public.contratos_monitorizados set instalacao_id = '00000000-0000-4000-e400-0000000000b1'
  where id = '00000000-0000-4000-e500-0000000000a1' $$,
  '23514', null, 'Mudar o serviço para uma instalação de outra organização é recusado');
insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('00000000-0000-4000-e500-0000000000b1', '00000000-0000-4000-e200-00000000000b', 'telecomunicacoes'),
  ('00000000-0000-4000-e500-0000000000c1', '00000000-0000-4000-e200-00000000000e', 'telecomunicacoes');

-- ===========================================================================
-- Isolamento: só membros, só com aal2
-- ===========================================================================
select testes.como('00000000-0000-4000-e200-00000000000a', 'aal2');
select is(testes.conta('select id from public.organizacoes'), 1::bigint, 'Empresa A (aal2) lê uma organização');
select is((select nome from public.organizacoes), 'Empresa A, Lda.', '… a sua');
select is(testes.conta('select id from public.instalacoes'), 2::bigint, 'Empresa A lê só as suas 2 instalações');
select is(testes.conta('select id from public.empresa_periodos'), 1::bigint, 'Empresa A lê só os seus períodos');
select is(testes.conta('select id from public.organizacoes_membros'), 1::bigint, 'Empresa A lê só a sua pertença');
select is(testes.conta('select id from public.contratos_monitorizados'), 1::bigint, 'Empresa A (aal2) lê o seu serviço no Monitor');
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000a'), 'total', 'Organização activa: acesso total');
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000b'), 'nenhum', 'Outra organização: nenhum (sem revelar o estado)');
select is(testes.tenta($$ select identificador_hmac from public.organizacoes $$), 'erro:42501', 'O cliente não lê o pseudónimo');
select is(testes.tenta($$ insert into public.instalacoes (organizacao_id, nome) values ('00000000-0000-4000-e300-00000000000a', 'Loja 2') $$),
  'erro:42501', 'O cliente não cria instalações');
select is(testes.tenta($$ update public.organizacoes set estado = 'ativa' $$), 'erro:42501', 'O cliente não altera a organização');
select is(testes.tenta($$ insert into public.empresa_ocorrencias (tipo, contexto) values ('erro_tecnico', 'x') $$),
  'erro:42501', 'O cliente não escreve ocorrências');
select is(testes.conta('select id from public.empresa_revisoes'), 0::bigint, 'O cliente não lê revisões');
reset role;

select testes.como('00000000-0000-4000-e200-00000000000a', 'aal1');
select is(testes.conta('select id from public.organizacoes'), 0::bigint, 'Empresa A com aal1 não lê a organização');
select is(testes.conta('select id from public.instalacoes'), 0::bigint, 'Empresa A com aal1 não lê instalações');
select is(testes.conta('select id from public.contratos_monitorizados'), 0::bigint, 'Empresa A com aal1 não lê o Monitor');
reset role;

select testes.como('00000000-0000-4000-e200-00000000000b', 'aal2');
select is(testes.conta('select id from public.instalacoes'), 1::bigint, 'Empresa B lê só a sua instalação');
select is(testes.conta('select id from public.contratos_monitorizados'), 1::bigint, 'Empresa B lê só o seu serviço');
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000b'), 'nenhum', 'Organização por aprovar: sem acesso');
reset role;

-- Particular: nada das empresas, Monitor igual ao de sempre (mesmo com aal1).
select testes.como('00000000-0000-4000-e200-00000000000e', 'aal1');
select is(testes.conta('select id from public.organizacoes'), 0::bigint, 'Particular não lê organizações');
select is(testes.conta('select id from public.instalacoes'), 0::bigint, 'Particular não lê instalações');
select is(testes.conta('select id from public.contratos_monitorizados'), 1::bigint, 'Particular com aal1 lê o seu serviço como antes');
reset role;

select testes.anonimo();
select is(testes.tenta($$ select id from public.organizacoes $$), 'erro:42501', 'Anónimo não lê organizações');
select is(testes.tenta($$ select id from public.instalacoes $$), 'erro:42501', 'Anónimo não lê instalações');
reset role;

select testes.como('00000000-0000-4000-e200-00000000000d', 'aal1');
select is(testes.conta('select id from public.organizacoes where id::text like ''00000000-0000-4000-e300-%'''), 2::bigint,
  'Admin lê todas as organizações');
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000b'), 'nenhum', 'Admin lê o acesso de qualquer organização');
reset role;

-- ===========================================================================
-- Acesso por estado
-- ===========================================================================
update public.organizacoes set estado = 'suspensa' where id = '00000000-0000-4000-e300-00000000000a';
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000a'), 'consulta', 'Suspensa: só consulta');
update public.organizacoes set estado = 'cancelada', acesso_consulta_ate = now() + interval '30 days'
  where id = '00000000-0000-4000-e300-00000000000a';
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000a'), 'consulta', 'Cancelada dentro dos 30 dias: consulta');
update public.organizacoes set acesso_consulta_ate = now() - interval '1 day' where id = '00000000-0000-4000-e300-00000000000a';
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000a'), 'nenhum', 'Cancelada depois dos 30 dias: nenhum');
update public.organizacoes set estado = 'pagamento_em_atraso' where id = '00000000-0000-4000-e300-00000000000a';
select is(public.empresa_tem_acesso('00000000-0000-4000-e300-00000000000a'), 'total', 'Pagamento em atraso: ainda total');

-- ===========================================================================
-- Histórico e registos só de inserção
-- ===========================================================================
select is((select count(*) from public.organizacoes_historico where organizacao_id = '00000000-0000-4000-e300-00000000000a'),
  4::bigint, 'Criação + 3 mudanças de estado registadas (mudar só a data não regista)');
select is((select estado_antes || '>' || estado_depois from public.organizacoes_historico
            where organizacao_id = '00000000-0000-4000-e300-00000000000a' order by created_at desc, id limit 1)
          in ('suspensa>cancelada', 'cancelada>pagamento_em_atraso', 'ativa>suspensa'), true, 'Transições gravadas');

insert into public.empresa_revisoes (organizacao_id, alvo_tipo, alvo_id, minutos, resultado)
  values ('00000000-0000-4000-e300-00000000000a', 'fatura', gen_random_uuid(), 4, 'confirmado');
select throws_ok($$ update public.empresa_revisoes set minutos = 1 $$, '42501', null, 'Revisões só de inserção');
select throws_ok($$ delete from public.organizacoes_historico $$, '42501', null, 'Histórico só de inserção');

-- Apagar a organização apaga em cascata (incluindo registos só de inserção).
select lives_ok($$ delete from public.contratos_monitorizados where instalacao_id is not null;
                   delete from public.organizacoes where id = '00000000-0000-4000-e300-00000000000a' $$,
  'Eliminação da organização em cascata');
select is((select count(*) from public.organizacoes_historico where organizacao_id = '00000000-0000-4000-e300-00000000000a'),
  0::bigint, 'Histórico da organização eliminada também sai');

select * from finish();
rollback;
