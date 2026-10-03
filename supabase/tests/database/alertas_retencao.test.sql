-- DoLado — Fim da subscrição: setores do aviso sectorial e Monitor de
-- Proteção desativados, conservados 6 meses
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que, quando a conta perde a Proteção (por qualquer via que altere
-- user_access), os setores do aviso sectorial e os contratos/documentos do
-- Monitor ficam desativados com a data de início da conservação, que nada é
-- apagado de imediato, que um evento repetido não reinicia o prazo, que
-- nenhum setor desativado recebe avisos, que a configuração volta ao
-- reativar a Proteção dentro do prazo, que o cliente não altera
-- desativado_em, e que a limpeza apaga só o que passou 6 meses. Os detalhes
-- do Monitor (alertas de datas, documentos) estão em monitor_protecao.test.sql.
-- Tudo numa transação revertida.

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

create function testes.so_teste_avisos(s text) returns setof text language sql as $$
  select d.email from public.avisos_setor_destinatarios(s) d where d.email in ('a@teste.invalid', 'b@teste.invalid');
$$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- A: Proteção ativa que termina. B: Proteção ativa, não mexe (controlo).
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-f000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-f000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"B"}');

insert into public.user_access (user_id, subscription_plan, subscription_status) values
  ('00000000-0000-4000-f000-00000000000a', 'caso_protecao', 'active'),
  ('00000000-0000-4000-f000-00000000000b', 'protecao', 'active');

insert into public.preferencias_setor (utilizador_id, setor) values
  ('00000000-0000-4000-f000-00000000000a', 'Energia'),
  ('00000000-0000-4000-f000-00000000000b', 'Energia');

insert into public.contratos_monitorizados (id, utilizador_id, fornecedor) values
  ('50000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a', 'MEO'),
  ('50000000-0000-4000-f000-0000000000b1', '00000000-0000-4000-f000-00000000000b', 'NOS');

-- ===========================================================================
-- 1. Estrutura e privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.alertas_seguir_protecao()', 'EXECUTE'), 'trigger: não executável pela API');
select ok(not has_function_privilege('authenticated', 'public.limpar_alertas_desativados()', 'EXECUTE'), 'limpeza: não executável pelo cliente');
select ok(not has_function_privilege('service_role', 'public.limpar_alertas_desativados()', 'EXECUTE'), 'limpeza: só pg_cron (postgres)');
select ok(exists (select 1 from cron.job where jobname = 'limpar-alertas-desativados'), 'job pg_cron agendado');
select ok(not has_function_privilege('authenticated', 'public.avisos_setor_destinatarios(text)', 'EXECUTE')
          and not has_function_privilege('anon', 'public.avisos_setor_destinatarios(text)', 'EXECUTE'), 'avisos_setor_destinatarios: não executável pela API');
select ok(has_function_privilege('service_role', 'public.avisos_setor_destinatarios(text)', 'EXECUTE'), 'avisos_setor_destinatarios: executável pela service_role');
select ok((select 'search_path=""' = any (proconfig) from pg_proc where proname = 'avisos_setor_destinatarios'), 'avisos_setor_destinatarios: search_path fixo');

-- ===========================================================================
-- 2. Fim da subscrição (webhook: plano none, estado canceled)
-- ===========================================================================
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';

select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em = now()), 1::bigint, 'setor: desativado (não apagado), com data');
select is((select desativado_em from public.contratos_monitorizados where id = '50000000-0000-4000-f000-0000000000a1'), now(), 'contrato: desativado (não apagado), com data');
select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000b' and desativado_em is null), 1::bigint, 'outra conta não é afetada');

-- ===========================================================================
-- 3. Webhook repetido / fim por outra via: o prazo não recomeça
-- ===========================================================================
update public.preferencias_setor set desativado_em = now() - interval '10 days'
 where utilizador_id = '00000000-0000-4000-f000-00000000000a';
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';
update public.user_access set subscription_status = 'unpaid'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select desativado_em from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a'), now() - interval '10 days', 'evento repetido: data de início mantém-se');

-- ===========================================================================
-- 4. O cliente não altera desativado_em
-- ===========================================================================
select testes.como('00000000-0000-4000-f000-00000000000b');
select ok(testes.tenta($$update public.preferencias_setor set desativado_em = now() - interval '1 year' where utilizador_id = '00000000-0000-4000-f000-00000000000b'$$) in ('ok:0', 'ok:1', 'erro:42501'), 'cliente: tenta alterar desativado_em do setor…');
select is(testes.tenta($$update public.contratos_monitorizados set desativado_em = now() where id = '50000000-0000-4000-f000-0000000000b1'$$), 'erro:42501', 'cliente: não altera o contrato');
select testes.como('00000000-0000-4000-f000-00000000000a');
select is(testes.tenta($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-f000-00000000000a', 'Água')$$), 'ok:1', 'cliente sem Proteção: pode guardar um setor…');
reset role;
select is((select desativado_em from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000b'), null, '…mas desativado_em não muda');
select is((select desativado_em from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and setor = 'Água'), now(), '…mas sem Proteção o setor nasce desativado');

-- Aviso sectorial: só setores ativos de contas com Proteção, e só pelo
-- servidor (service_role; o backoffice valida requireAdmin() antes).
set local role service_role;
select is((select count(*) from testes.so_teste_avisos('Energia')), 1::bigint, 'aviso sectorial: só a conta com Proteção');
reset role;
-- Nem cliente nem admin chamam a função pela API (/rest/v1/rpc).
select testes.como('00000000-0000-4000-f000-00000000000a');
select is(testes.tenta($$select * from public.avisos_setor_destinatarios('Energia')$$), 'erro:42501', 'aviso sectorial: cliente não executa a função');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-f000-00000000000b';
select testes.como('00000000-0000-4000-f000-00000000000b');
select is(testes.tenta($$select * from public.avisos_setor_destinatarios('Energia')$$), 'erro:42501', 'aviso sectorial: admin com sessão também não (só service_role)');
reset role;

-- ===========================================================================
-- 5. Voltar à Proteção dentro do prazo: configuração recuperada
-- ===========================================================================
update public.user_access set subscription_plan = 'protecao', subscription_status = 'active'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em is null), 2::bigint, 'regresso: setores reativados');
select is((select desativado_em from public.contratos_monitorizados where id = '50000000-0000-4000-f000-0000000000a1'), null, 'regresso: contrato reativado');

-- Fora do prazo não volta.
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';
update public.preferencias_setor set desativado_em = now() - interval '7 months'
 where utilizador_id = '00000000-0000-4000-f000-00000000000a';
update public.user_access set subscription_plan = 'protecao', subscription_status = 'active'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em is null), 0::bigint, 'regresso: o que passou os 6 meses não volta');

-- ===========================================================================
-- 6. Limpeza aos 6 meses
-- ===========================================================================
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';
update public.contratos_monitorizados set desativado_em = now() - interval '5 months'
 where id = '50000000-0000-4000-f000-0000000000a1';

select is(public.limpar_alertas_desativados(), 2, 'limpeza: apaga os 2 setores fora do prazo');
select is((select count(*) from public.contratos_monitorizados where id = '50000000-0000-4000-f000-0000000000a1'), 1::bigint, 'limpeza: contrato dentro dos 6 meses fica');
update public.contratos_monitorizados set desativado_em = now() - interval '7 months'
 where id = '50000000-0000-4000-f000-0000000000a1';
select is(public.limpar_alertas_desativados(), 1, 'limpeza: contrato sem documentos fora do prazo apagado');
select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000b'), 1::bigint, 'limpeza não toca em setores ativos');
select is((select count(*) from public.contratos_monitorizados where id = '50000000-0000-4000-f000-0000000000b1'), 1::bigint, 'limpeza não toca em contratos ativos');

select * from finish();
rollback;
