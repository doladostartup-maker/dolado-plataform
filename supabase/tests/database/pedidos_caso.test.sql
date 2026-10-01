-- DoLado — Pedido de caso antes do pagamento ("Tratar o meu caso")
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que um pedido não pago nunca é um caso: o cliente não cria, não
-- altera nem converte pedidos; só converter_pedido_em_caso() (service_role,
-- chamada pelo servidor depois do pagamento confirmado) cria o caso, e só a
-- gastar um caso disponível pago. Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
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

create function testes.negado(q text) returns boolean language sql as $$
  select r like 'erro:%' or r = 'ok:0' from testes.tenta(q) r;
$$;

create function testes.contar(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) s', q) into n;
  return n;
exception when others then
  return -1;
end $$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Dados: A (sem compras), B (com 1 caso disponível pago), admin.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', '{"nome":"B"}'),
  ('00000000-0000-4000-a000-0000000000ad', 'admin@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-a000-0000000000ad';

insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits) values
  ('00000000-0000-4000-a000-00000000000b', 'none', null, 1);

insert into public.pedidos_caso (id, user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em, anexo_caminho, anexo_nome) values
  ('20000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'hash_a', 'A', 'Energia', 'EDP', 'Cobrança indevida', 'Ainda não reclamei', true, now(), 'pendentes/x-a.pdf', 'a.pdf'),
  ('20000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'hash_b', 'B', 'Água', 'EPAL', 'Outro', 'Ainda não reclamei', true, now(), null, null),
  ('20000000-0000-4000-a000-0000000000f0', null, 'hash_sem_conta', 'Sem conta', 'Energia', 'Galp', 'Outro', 'Ainda não reclamei', true, now(), null, null);

-- A stack local pode já ter casos/pedidos de testes manuais: conta-se a partir daqui.
create temp table base on commit drop as
  select (select count(*) from public.casos) as casos, (select count(*) from public.pedidos_caso) as pedidos;
grant select on base to anon, authenticated, service_role;

-- ===========================================================================
-- 1. Estrutura e privilégios
-- ===========================================================================
select ok((select relrowsecurity from pg_class where oid = 'public.pedidos_caso'::regclass), 'pedidos_caso: RLS ativo');
select ok(not has_function_privilege('authenticated', 'public.converter_pedido_em_caso(uuid, uuid)', 'EXECUTE'), 'converter_pedido_em_caso: não executável por authenticated');
select ok(not has_function_privilege('anon', 'public.converter_pedido_em_caso(uuid, uuid)', 'EXECUTE'), 'converter_pedido_em_caso: não executável por anon');
select ok(has_function_privilege('service_role', 'public.converter_pedido_em_caso(uuid, uuid)', 'EXECUTE'), 'converter_pedido_em_caso: executável pelo servidor');
select ok((select not prosecdef and 'search_path=""' = any (proconfig) from pg_proc where proname = 'converter_pedido_em_caso'), 'converter_pedido_em_caso: SECURITY INVOKER e search_path fixo');
select is((select count(*) from pg_policies where tablename = 'casos' and policyname = 'Cliente cria os próprios casos'), 0::bigint, 'casos: o cliente deixa de ter policy de INSERT');
select throws_ok($$insert into public.pedidos_caso (nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em) values ('x', 'Energia', 'x', 'Outro', 'x', false, now())$$,
  '23514', null, 'pedidos_caso: sem a confirmação do pedido não grava');
select throws_ok($$insert into public.pedidos_caso (nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em, anexo_caminho) values ('x', 'Energia', 'x', 'Outro', 'x', true, now(), 'casoB/b.pdf')$$,
  '23514', null, 'pedidos_caso: anexo só da pasta pendentes/');

-- ===========================================================================
-- 2. anon
-- ===========================================================================
select testes.como(null);
select ok(testes.contar('select * from public.pedidos_caso') <= 0, 'anon: não lê pedidos');
select ok(testes.negado($$insert into public.pedidos_caso (nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em) values ('x', 'Energia', 'x', 'Outro', 'x', true, now())$$), 'anon: não cria pedidos pela API (só o servidor)');
select ok(testes.negado($$insert into public.casos (nome, email) values ('x', 'x@teste.invalid')$$), 'anon: não cria casos');
reset role;

-- ===========================================================================
-- 3. Cliente A (sem compras)
-- ===========================================================================
select testes.como('00000000-0000-4000-a000-00000000000a');
select is(testes.contar('select id, estado from public.pedidos_caso'), 1::bigint, 'A: lê só o próprio pedido');
select is(testes.contar($$select id from public.pedidos_caso where id = '20000000-0000-4000-a000-0000000000f0'$$), 0::bigint, 'A: não lê pedidos sem conta (de outros browsers)');
select ok(testes.contar('select token_hash from public.pedidos_caso') < 0, 'A: não lê o hash do token do browser');
select ok(testes.contar('select checkout_session_id from public.pedidos_caso') < 0, 'A: não lê a sessão de checkout');
select ok(testes.negado($$insert into public.pedidos_caso (user_id, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em) values ('00000000-0000-4000-a000-00000000000a', 'x', 'Energia', 'x', 'Outro', 'x', true, now())$$), 'A: não cria pedidos pela API');
select ok(testes.negado($$update public.pedidos_caso set estado = 'convertido', convertido_em = now() where id = '20000000-0000-4000-a000-00000000000a'$$), 'A: não marca o próprio pedido como pago/convertido');
select ok(testes.negado($$update public.pedidos_caso set user_id = '00000000-0000-4000-a000-00000000000a' where id = '20000000-0000-4000-a000-0000000000f0'$$), 'A: não se apropria de um pedido sem conta');
select ok(testes.negado($$delete from public.pedidos_caso where id = '20000000-0000-4000-a000-00000000000b'$$), 'A: não apaga pedidos de B');
select ok(testes.negado($$select public.converter_pedido_em_caso('20000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a')$$), 'A: não converte o próprio pedido em caso pela API');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, status) values ('00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'Novo')$$), 'A: não cria caso diretamente (sem pagamento)');
select ok(testes.negado($$update public.user_access set case_credits = 5 where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não se dá casos disponíveis');
reset role;
select is((select estado from public.pedidos_caso where id = '20000000-0000-4000-a000-00000000000a'), 'rascunho', 'integridade: pedido de A continua por pagar');
select is((select count(*) from public.casos), (select casos from base), 'integridade: nenhum caso criado pelo cliente');

-- ===========================================================================
-- 4. Conversão pelo servidor (service_role)
-- ===========================================================================
delete from net.http_request_queue;
set local role service_role;
select is(public.converter_pedido_em_caso('20000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a'), null::uuid,
  'converter: conta sem caso disponível (sem pagamento) → nada');
select is(public.converter_pedido_em_caso('20000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000a'), null::uuid,
  'converter: pedido de outra conta → nada');
select is(public.converter_pedido_em_caso('20000000-0000-4000-a000-0000000000f0', '00000000-0000-4000-a000-00000000000b'), null::uuid,
  'converter: pedido ainda sem conta → nada');
reset role;
select is((select count(*) from public.casos), (select casos from base), 'converter: recusas não criam casos');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 1, 'converter: recusas não gastam casos disponíveis');

set local role service_role;
create temp table caso_b on commit drop as
  select public.converter_pedido_em_caso('20000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b') as id;
reset role;
select ok((select id is not null from caso_b), 'converter: com caso disponível pago → cria o caso');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 0, 'converter: gasta 1 caso disponível');
select is((select estado from public.pedidos_caso where id = '20000000-0000-4000-a000-00000000000b'), 'convertido', 'converter: pedido marcado como convertido');
select is((select caso_id from public.pedidos_caso where id = '20000000-0000-4000-a000-00000000000b'), (select id from caso_b), 'converter: pedido aponta para o caso');
select is((select status from public.casos where id = (select id from caso_b)), 'Novo', 'converter: caso entra como Novo (recebido)');
select is((select email from public.casos where id = (select id from caso_b)), 'b@teste.invalid', 'converter: e-mail do caso é o da conta');
select is((select utilizador_id from public.casos where id = (select id from caso_b)), '00000000-0000-4000-a000-00000000000b'::uuid, 'converter: caso da conta que pagou');

-- Repetido (webhook reenviado): devolve o mesmo caso, sem gastar nem criar.
update public.user_access set case_credits = 1 where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is(public.converter_pedido_em_caso('20000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b'), (select id from caso_b),
  'converter: repetido devolve o mesmo caso');
reset role;
select is((select count(*) from public.casos), (select casos from base) + 1, 'converter: repetido não cria outro caso');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 1, 'converter: repetido não gasta outro caso disponível');

-- Anexo do pedido passa para o caso.
update public.pedidos_caso set user_id = '00000000-0000-4000-a000-00000000000b' where id = '20000000-0000-4000-a000-00000000000a';
set local role service_role;
create temp table caso_anexo on commit drop as
  select public.converter_pedido_em_caso('20000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b') as id;
reset role;
select is((select caminho_storage from public.anexos where caso_id = (select id from caso_anexo)), 'pendentes/x-a.pdf', 'converter: anexo do pedido ligado ao caso');

-- Pedido cancelado não converte.
insert into public.pedidos_caso (id, user_id, estado, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em) values
  ('20000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-a000-00000000000b', 'cancelado', 'B', 'Energia', 'x', 'Outro', 'x', true, now());
update public.user_access set case_credits = 1 where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is(public.converter_pedido_em_caso('20000000-0000-4000-a000-0000000000c0', '00000000-0000-4000-a000-00000000000b'), null::uuid, 'converter: pedido cancelado → nada');
reset role;

-- ===========================================================================
-- 5. Cliente B depois da conversão; admin
-- ===========================================================================
select testes.como('00000000-0000-4000-a000-00000000000b');
select is(testes.contar('select id from public.casos'), 2::bigint, 'B: vê os próprios casos criados a partir dos pedidos');
select is(testes.contar($$select id from public.pedidos_caso where estado = 'convertido'$$), 2::bigint, 'B: vê os próprios pedidos convertidos');
reset role;
select testes.como('00000000-0000-4000-a000-0000000000ad');
select is(testes.contar('select id from public.pedidos_caso'), (select pedidos from base) + 1, 'admin: lê todos os pedidos (área separada dos casos)');
reset role;

-- O caso criado pela conversão dispara a notificação "novo caso" (só com segredo).
select is((select count(*) from net.http_request_queue), 0::bigint, 'webhook novo-caso: sem segredo no Vault, nada agendado');

select * from finish();
rollback;
