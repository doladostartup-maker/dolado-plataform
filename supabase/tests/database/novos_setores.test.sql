-- DoLado — novos setores: Gás, Compras & Reembolsos, Ginásios
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que os três setores novos (20261006120000_novos_setores.sql) criam
-- casos pelo caminho de sempre (pedido pago → converter_pedido_em_caso), com
-- o setor gravado tal como foi escolhido; que o isolamento entre contas não
-- muda; que o Aviso Sectorial e as regras jurídicas aceitam os novos setores
-- e continuam a recusar valores fora da lista; e que os setores antigos
-- continuam válidos. Tudo numa transação revertida.

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

-- G (Gás), C (Compras & Reembolsos), I (Ginásios), T (Telecomunicações), admin.
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-e000-00000000000a', 'g@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"G"}'),
  ('00000000-0000-4000-e000-00000000000b', 'c@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"C"}'),
  ('00000000-0000-4000-e000-00000000000c', 'i@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"I"}'),
  ('00000000-0000-4000-e000-00000000000d', 't@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"T"}'),
  ('00000000-0000-4000-e000-0000000000ad', 'admin-setores@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e000-0000000000ad';

insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits) values
  ('00000000-0000-4000-e000-00000000000a', 'none', null, 1),
  ('00000000-0000-4000-e000-00000000000b', 'none', null, 1),
  ('00000000-0000-4000-e000-00000000000c', 'none', null, 1),
  ('00000000-0000-4000-e000-00000000000d', 'caso_protecao', 'active', 1);

insert into public.pedidos_caso (id, user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em) values
  ('21000000-0000-4000-e000-00000000000a', '00000000-0000-4000-e000-00000000000a', 'hash_g', 'G', 'Gás', 'Galp', 'Cobrança indevida', 'Ainda não reclamei', true, now()),
  ('21000000-0000-4000-e000-00000000000b', '00000000-0000-4000-e000-00000000000b', 'hash_c', 'C', 'Compras & Reembolsos', 'Loja Y', 'Outro', 'Ainda não reclamei', true, now()),
  ('21000000-0000-4000-e000-00000000000c', '00000000-0000-4000-e000-00000000000c', 'hash_i', 'I', 'Ginásios', 'Ginásio Z', 'Cancelamento recusado', 'Sim, e não me responderam', true, now()),
  ('21000000-0000-4000-e000-00000000000d', '00000000-0000-4000-e000-00000000000d', 'hash_t', 'T', 'Telecomunicações', 'MEO', 'Aumento de mensalidade', 'Ainda não reclamei', true, now());

-- Casos já existentes na stack local: o setor de nenhum deles pode mudar.
create temp table casos_antes on commit drop as select id, sector, updated_at from public.casos;

-- ===========================================================================
-- 1. Criação do caso pelo caminho de sempre, com o setor gravado
-- ===========================================================================
delete from net.http_request_queue;
set local role service_role;
create temp table novos on commit drop as
  select u.user_id, p.sector, public.converter_pedido_em_caso(p.id, u.user_id) as caso_id
  from public.pedidos_caso p
  join (values
    ('21000000-0000-4000-e000-00000000000a'::uuid, '00000000-0000-4000-e000-00000000000a'::uuid),
    ('21000000-0000-4000-e000-00000000000b'::uuid, '00000000-0000-4000-e000-00000000000b'::uuid),
    ('21000000-0000-4000-e000-00000000000c'::uuid, '00000000-0000-4000-e000-00000000000c'::uuid),
    ('21000000-0000-4000-e000-00000000000d'::uuid, '00000000-0000-4000-e000-00000000000d'::uuid)
  ) as u(pedido_id, user_id) on u.pedido_id = p.id;
reset role;
grant select on novos to authenticated;

select is((select count(*) from novos where caso_id is not null), 4::bigint, 'cada setor (novo e antigo) cria um caso');
select is((select c.sector from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-e000-00000000000a'), 'Gás', 'Gás fica gravado no caso');
select is((select c.sector from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-e000-00000000000b'), 'Compras & Reembolsos', 'Compras & Reembolsos fica gravado no caso');
select is((select c.sector from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-e000-00000000000c'), 'Ginásios', 'Ginásios fica gravado no caso');
select is((select c.sector from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-e000-00000000000d'), 'Telecomunicações', 'setores antigos continuam válidos');
select is((select count(*) from public.casos c join novos n on n.caso_id = c.id where c.status = 'Novo'), 4::bigint, 'casos dos novos setores entram como Novo, como os outros');
select is((select count(*) from public.user_access where user_id in (select user_id from novos) and case_credits = 0), 4::bigint, 'cada caso gasta 1 caso disponível');

select is(
  (select count(*) from casos_antes a join public.casos c on c.id = a.id where c.sector is distinct from a.sector or c.updated_at is distinct from a.updated_at),
  0::bigint, 'casos antigos não são alterados');

-- ===========================================================================
-- 2. Isolamento entre contas (RLS) igual
-- ===========================================================================
select testes.como('00000000-0000-4000-e000-00000000000a');
select is((select count(*) from public.casos where sector = 'Gás' and utilizador_id = '00000000-0000-4000-e000-00000000000a'), 1::bigint, 'G vê o próprio caso de Gás');
select is((select count(*) from public.casos where utilizador_id <> '00000000-0000-4000-e000-00000000000a'), 0::bigint, 'G não vê casos de outras contas');
select is(testes.tenta($$update public.casos set sector = 'Ginásios' where utilizador_id = '00000000-0000-4000-e000-00000000000a'$$), 'ok:0', 'G não altera o setor do próprio caso pela API');
reset role;

select testes.como('00000000-0000-4000-e000-0000000000ad');
select ok((select count(*) from public.casos where sector in ('Gás', 'Compras & Reembolsos', 'Ginásios')) >= 3, 'admin vê os casos dos novos setores (filtro por setor)');
reset role;

-- ===========================================================================
-- 3. Aviso Sectorial e regras jurídicas aceitam os novos setores
-- ===========================================================================
select testes.como('00000000-0000-4000-e000-00000000000d');
select is(testes.tenta($$insert into public.preferencias_setor (utilizador_id, setor) values
  ('00000000-0000-4000-e000-00000000000d', 'Gás'),
  ('00000000-0000-4000-e000-00000000000d', 'Compras & Reembolsos'),
  ('00000000-0000-4000-e000-00000000000d', 'Ginásios'),
  ('00000000-0000-4000-e000-00000000000d', 'Água')$$), 'ok:4', 'cliente subscreve os novos setores (e os antigos)');
select is(testes.tenta($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e000-00000000000d', 'Banca')$$), 'erro:23514', 'setor fora da lista continua recusado');
select is(testes.tenta($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e000-00000000000d', 'gas')$$), 'erro:23514', 'slug sem acento não é um setor');
select ok(testes.tenta($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e000-00000000000a', 'Gás')$$) like 'erro:%', 'cliente não subscreve setores por outra conta');
reset role;

set local role service_role;
select is((select count(*) from public.avisos_setor_destinatarios('Ginásios') d where d.email = 't@teste.invalid'), 1::bigint, 'Aviso Sectorial: Ginásios chega a quem o subscreveu (com Proteção)');
reset role;

select is(testes.tenta($$insert into public.avisos_setoriais (setor, titulo, descricao, criado_por_admin_id) values
  ('Compras & Reembolsos', 'Título', 'Descrição', '00000000-0000-4000-e000-0000000000ad')$$), 'ok:1', 'aviso sectorial para Compras & Reembolsos');
select is(testes.tenta($$insert into public.avisos_setoriais (setor, titulo, descricao, criado_por_admin_id) values
  ('Outro', 'Título', 'Descrição', '00000000-0000-4000-e000-0000000000ad')$$), 'erro:23514', 'aviso sectorial: setor fora da lista recusado');

select is(testes.tenta($$insert into public.regras_juridicas (codigo, setor, titulo, diploma, resumo) values
  ('TESTE-GAS-01', 'Gás', 'Título', 'Diploma', 'Resumo de teste aprovado.'),
  ('TESTE-COMPRAS-01', 'Compras & Reembolsos', 'Título', 'Diploma', 'Resumo de teste aprovado.'),
  ('TESTE-GIN-01', 'Ginásios', 'Título', 'Diploma', 'Resumo de teste aprovado.'),
  ('TESTE-GERAL-01', null, 'Título', 'Diploma', 'Resumo de teste aprovado.')$$), 'ok:4', 'regras jurídicas para os novos setores (e gerais)');
select is(testes.tenta($$insert into public.regras_juridicas (codigo, setor, titulo, diploma, resumo) values
  ('TESTE-X-01', 'Banca', 'Título', 'Diploma', 'Resumo de teste aprovado.')$$), 'erro:23514', 'regras jurídicas: setor fora da lista recusado');

-- Um só `check` de setor por tabela (o antigo foi retirado).
select is((select count(*) from pg_constraint where contype = 'c' and conrelid = 'public.preferencias_setor'::regclass and pg_get_constraintdef(oid) like '%Telecomunicações%'), 1::bigint, 'preferencias_setor: um só check de setor');
select is((select count(*) from pg_constraint where contype = 'c' and conrelid = 'public.avisos_setoriais'::regclass and pg_get_constraintdef(oid) like '%Telecomunicações%'), 1::bigint, 'avisos_setoriais: um só check de setor');
select is((select count(*) from pg_constraint where contype = 'c' and conrelid = 'public.regras_juridicas'::regclass and pg_get_constraintdef(oid) like '%Telecomunicações%'), 1::bigint, 'regras_juridicas: um só check de setor');

select * from finish();
rollback;
