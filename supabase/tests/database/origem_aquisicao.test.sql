-- DoLado — Origem de aquisição (20261008090000_origem_aquisicao.sql).
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: a origem só é gravada pela função (service_role), uma vez
-- (first-touch, imutável mesmo para a service_role), só em contas de cliente
-- criadas depois da visita e nos últimos 30 dias, só no formato fechado; o
-- cliente não a escreve; e gravá-la não dá acesso, plano nem casos.
-- Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    perform set_config('role', 'service_role', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
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

-- A, B, C, E: clientes novos. D: admin. F: conta antiga (60 dias).
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-e000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-e000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"B"}'),
  ('00000000-0000-4000-e000-00000000000c', 'c@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"C"}'),
  ('00000000-0000-4000-e000-00000000000d', 'd@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"D"}'),
  ('00000000-0000-4000-e000-00000000000e', 'e@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"E"}'),
  ('00000000-0000-4000-e000-00000000000f', 'f@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"F"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e000-00000000000d';
update public.utilizadores set created_at = now() - interval '60 days' where id = '00000000-0000-4000-e000-00000000000f';

-- Contas existentes / sem ?ref=: null, sem erro.
select is(
  (select count(*) from public.utilizadores where id::text like '00000000-0000-4000-e000-%' and acquisition_source is not null),
  0::bigint, 'contas novas começam sem origem (null)');

-- ---------------------------------------------------------------------------
-- O cliente não grava nem chama a função
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-e000-00000000000a');
select is(
  testes.tenta($$select public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000a', 'contabilista_marta', now() - interval '1 day')$$),
  'erro:42501', 'cliente não pode chamar origem_aquisicao_registar');
select is(
  testes.tenta($$update public.utilizadores set acquisition_source = 'contabilista_marta' where id = '00000000-0000-4000-e000-00000000000a'$$),
  'ok:0', 'cliente não altera a própria origem (sem policy de update)');
select is(
  (select acquisition_source from public.utilizadores where id = '00000000-0000-4000-e000-00000000000a'),
  null, 'continua sem origem depois da tentativa do cliente');
reset role;

set local role anon;
select is(
  testes.tenta($$select public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000a', 'contabilista_marta', now())$$),
  'erro:42501', 'anon não pode chamar origem_aquisicao_registar');
reset role;

-- ---------------------------------------------------------------------------
-- Servidor (service_role)
-- ---------------------------------------------------------------------------
select testes.como(null);

-- Cenário A/B: visitou pela Marta (há 2 dias), criou conta depois.
select ok(
  public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000a', 'contabilista_marta', now() - interval '2 days'),
  'conta criada depois da visita fica com a origem');

-- Cenário C: uma segunda origem nunca substitui a primeira.
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000a', 'instagram', now() - interval '1 day'),
  'segunda origem é recusada (first-touch)');

-- Imutável mesmo para a service_role (escrita direta).
select is(
  testes.tenta($$update public.utilizadores set acquisition_source = 'instagram' where id = '00000000-0000-4000-e000-00000000000a'$$),
  'erro:23514', 'origem gravada não pode ser alterada (trigger)');
select is(
  testes.tenta($$update public.utilizadores set acquisition_source = null where id = '00000000-0000-4000-e000-00000000000a'$$),
  'erro:23514', 'origem gravada não pode ser apagada');

-- Valores inválidos: recusados pela função e pelo CHECK.
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000b', 'marta@exemplo.pt', now()),
  'origem com @ é recusada');
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000b', '912345678', now()),
  'origem só com dígitos é recusada');
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000b', 'Contabilista_Marta', now()),
  'origem com maiúsculas é recusada (o servidor normaliza antes)');
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000b', repeat('a', 65), now()),
  'origem com mais de 64 caracteres é recusada');
select is(
  testes.tenta($$update public.utilizadores set acquisition_source = 'x y' where id = '00000000-0000-4000-e000-00000000000b'$$),
  'erro:23514', 'CHECK recusa formato inválido em escrita direta');

-- Visita expirada (> 30 dias) ou no futuro.
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000b', 'contabilista_marta', now() - interval '31 days'),
  'visita com mais de 30 dias é recusada');
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000b', 'contabilista_marta', now() + interval '1 hour'),
  'visita no futuro é recusada');

-- Conta criada antes da visita: nunca atribuída.
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000f', 'contabilista_marta', now() - interval '1 day'),
  'conta antiga que visita um link não fica atribuída');

-- Admin nunca recebe origem.
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000d', 'contabilista_marta', now() - interval '1 day'),
  'conta admin não recebe origem');

-- Parâmetros em falta: false, sem erro.
select ok(
  not public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000c', null, now()),
  'sem origem: false, sem erro');

-- Outra conta, outra origem: independentes.
select ok(
  public.origem_aquisicao_registar('00000000-0000-4000-e000-00000000000e', 'remax_duplo_prestigio', now() - interval '10 minutes'),
  'outra conta recebe a sua própria origem');
reset role;

select is(
  (select acquisition_source from public.utilizadores where id = '00000000-0000-4000-e000-00000000000a'),
  'contabilista_marta', 'A mantém a primeira origem');
select is(
  (select acquisition_source from public.utilizadores where id = '00000000-0000-4000-e000-00000000000b'),
  null, 'B continua sem origem depois das tentativas inválidas');
select is(
  (select acquisition_source from public.utilizadores where id = '00000000-0000-4000-e000-00000000000f'),
  null, 'F (conta antiga) continua sem origem');

-- ---------------------------------------------------------------------------
-- A origem nunca dá acesso, plano, casos nem papel
-- ---------------------------------------------------------------------------
select is(
  (select count(*) from public.user_access where user_id in ('00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-e000-00000000000e')),
  0::bigint, 'gravar a origem não cria acesso (user_access)');
select is(
  (select count(*) from public.case_credit_grants where user_id in ('00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-e000-00000000000e')),
  0::bigint, 'gravar a origem não dá casos disponíveis');
select is(
  (select role from public.utilizadores where id = '00000000-0000-4000-e000-00000000000a'),
  'cliente', 'gravar a origem não muda o papel');

-- O cliente lê a própria origem (não é segredo), nunca a de outros.
select testes.como('00000000-0000-4000-e000-00000000000a');
select is(
  (select count(*) from public.utilizadores where acquisition_source is not null),
  1::bigint, 'cliente só vê a própria linha');
reset role;

select * from finish();
rollback;
