-- DoLado — Autorização para e-mails com novidades e ofertas
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que a caixa opcional do "Tratar o meu caso" fica registada na conta
-- (com versão e texto) quando o pedido é ligado a uma conta, que a prova é
-- imutável, que a retirada é registada uma só vez, e que o cliente só lê a
-- própria autorização e não a cria nem altera pela API.
-- Tudo numa transação revertida.

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

create function testes.contar(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) s', q) into n;
  return n;
exception when others then
  return -1;
end $$;

create function testes.ativas(uid uuid) returns bigint language sql as $$
  select count(*) from public.consentimentos_comunicacoes where user_id = uid and retirado_em is null;
$$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-e000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-4000-e000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', '{"nome":"B"}'),
  ('00000000-0000-4000-e000-00000000000c', 'c@teste.invalid', 'authenticated', 'authenticated', '{"nome":"C"}');

-- Pedido do formulário: a caixa marcada grava versão e texto (pelo servidor).
create function testes.pedido(id uuid, uid uuid, marcou boolean, versao text) returns void language sql as $$
  insert into public.pedidos_caso (id, user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente,
    autorizacao, pedido_confirmado_em, consentimento_alertas, consentimento_alertas_em,
    consentimento_comunicacoes_versao, consentimento_comunicacoes_texto)
  values (id, uid, 'hash_' || id, 'Teste', 'Energia', 'EDP', 'Outro', 'Ainda não reclamei', true, now(),
    marcou, case when marcou then now() end, versao,
    case when versao is not null then 'Opcional: aceito receber e-mails da DoLado com novidades e ofertas…' end);
$$;

-- ===========================================================================
-- 1. Estrutura e privilégios
-- ===========================================================================
select ok((select relrowsecurity from pg_class where oid = 'public.consentimentos_comunicacoes'::regclass), 'RLS ativo');
select ok(not has_function_privilege('authenticated', 'public.registar_consentimento_comunicacoes_do_pedido()', 'EXECUTE'), 'trigger: função não executável pela API');
select is(testes.tenta($$insert into public.pedidos_caso (user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em, consentimento_comunicacoes_versao) values (null, 'h', 'x', 'Energia', 'EDP', 'Outro', 'Ainda não reclamei', true, now(), '2026-10-02')$$), 'erro:23514', 'pedido: versão sem texto rejeitada');

-- ===========================================================================
-- 2. Registo na conta pelo trigger
-- ===========================================================================
-- Pedido ainda sem conta: nada é registado.
select testes.pedido('40000000-0000-4000-e000-000000000001', null, true, '2026-10-02');
select is((select count(*) from public.consentimentos_comunicacoes), 0::bigint, 'sem conta: nada registado');
-- O cliente cria conta e o pedido é reclamado: a autorização passa para a conta.
update public.pedidos_caso set user_id = '00000000-0000-4000-e000-00000000000a' where id = '40000000-0000-4000-e000-000000000001';
select is(testes.ativas('00000000-0000-4000-e000-00000000000a'), 1::bigint, 'pedido reclamado: autorização registada na conta');
select is((select versao || '|' || origem || '|' || pedido_id from public.consentimentos_comunicacoes where user_id = '00000000-0000-4000-e000-00000000000a'),
          '2026-10-02|tratar_caso|40000000-0000-4000-e000-000000000001', 'versão, origem e pedido gravados');
select ok((select texto like 'Opcional: aceito receber e-mails da DoLado%' from public.consentimentos_comunicacoes where user_id = '00000000-0000-4000-e000-00000000000a'), 'texto aceite gravado');

-- Pedido criado já com sessão (B): registado logo.
select testes.pedido('40000000-0000-4000-e000-000000000002', '00000000-0000-4000-e000-00000000000b', true, '2026-10-02');
select is(testes.ativas('00000000-0000-4000-e000-00000000000b'), 1::bigint, 'pedido com sessão: autorização registada');
-- Segundo pedido marcado: não duplica.
select testes.pedido('40000000-0000-4000-e000-000000000003', '00000000-0000-4000-e000-00000000000b', true, '2026-10-02');
select is(testes.ativas('00000000-0000-4000-e000-00000000000b'), 1::bigint, 'segunda marcação: continua uma só ativa');

-- Caixa por marcar, ou texto antigo (sem versão): nada (C).
select testes.pedido('40000000-0000-4000-e000-000000000004', '00000000-0000-4000-e000-00000000000c', false, null);
select testes.pedido('40000000-0000-4000-e000-000000000005', '00000000-0000-4000-e000-00000000000c', true, null);
select is(testes.ativas('00000000-0000-4000-e000-00000000000c'), 0::bigint, 'caixa por marcar ou texto antigo: sem autorização');

-- ===========================================================================
-- 3. Cliente: só lê a própria; não cria, não altera, não retira pela API
-- ===========================================================================
select testes.como('00000000-0000-4000-e000-00000000000a');
select is(testes.contar('select * from public.consentimentos_comunicacoes'), 1::bigint, 'A: vê só a própria');
select ok(testes.tenta($$insert into public.consentimentos_comunicacoes (user_id, versao, texto, origem, aceite_em) values ('00000000-0000-4000-e000-00000000000c', 'x', 'x', 'tratar_caso', now())$$) like 'erro:%', 'A: não cria autorizações (nem de outra conta)');
select is(testes.tenta($$update public.consentimentos_comunicacoes set retirado_em = now(), retirado_origem = 'portal'$$), 'erro:42501', 'A: não altera pela API (a retirada é pelo servidor)');
select testes.como(null);
select ok(testes.contar('select * from public.consentimentos_comunicacoes') <= 0, 'anon: não lê nada (0 linhas ou sem permissão)');
reset role;

-- ===========================================================================
-- 4. Retirada e prova imutável
-- ===========================================================================
set local role service_role;
select is(testes.tenta($$update public.consentimentos_comunicacoes set retirado_em = now(), retirado_origem = 'portal' where user_id = '00000000-0000-4000-e000-00000000000a' and retirado_em is null$$), 'ok:1', 'retirada registada');
select is(testes.ativas('00000000-0000-4000-e000-00000000000a'), 0::bigint, 'depois da retirada: sem autorização ativa');
select is(testes.tenta($$update public.consentimentos_comunicacoes set retirado_em = now() + interval '1 day' where user_id = '00000000-0000-4000-e000-00000000000a'$$), 'erro:P0001', 'a retirada não se reescreve');
select is(testes.tenta($$update public.consentimentos_comunicacoes set texto = 'outro' where user_id = '00000000-0000-4000-e000-00000000000b'$$), 'erro:P0001', 'texto aceite imutável');
select is(testes.tenta($$update public.consentimentos_comunicacoes set retirado_em = now() where user_id = '00000000-0000-4000-e000-00000000000b'$$), 'erro:23514', 'retirada exige a origem');
reset role;

-- Depois de retirar, só uma nova marcação explícita volta a autorizar.
update public.pedidos_caso set estado = 'aguarda_pagamento' where id = '40000000-0000-4000-e000-000000000001';
select is(testes.ativas('00000000-0000-4000-e000-00000000000a'), 0::bigint, 'outras alterações do pedido não reativam');
select testes.pedido('40000000-0000-4000-e000-000000000006', '00000000-0000-4000-e000-00000000000a', true, '2026-10-02');
select is(testes.ativas('00000000-0000-4000-e000-00000000000a'), 1::bigint, 'nova marcação: nova autorização');
select is((select count(*) from public.consentimentos_comunicacoes where user_id = '00000000-0000-4000-e000-00000000000a'), 2::bigint, 'o registo da retirada anterior mantém-se');

select * from finish();
rollback;
