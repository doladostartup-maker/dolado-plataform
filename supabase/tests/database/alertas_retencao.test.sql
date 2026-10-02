-- DoLado — Alertas desativados no fim da subscrição, conservados 6 meses
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que, quando a conta perde a Proteção (por qualquer via que altere
-- user_access), os alertas de fidelização, de promoção e os setores do
-- aviso sectorial ficam desativados com a data de início da conservação,
-- que nada é apagado de imediato, que um evento repetido não reinicia o
-- prazo, que nenhum alerta desativado é devolvido para envio, que a
-- configuração volta ao reativar a Proteção dentro do prazo, que o cliente
-- não altera desativado_em, e que a limpeza apaga só o que passou 6 meses.
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

-- Os pendentes/destinatários filtrados às contas deste teste (a stack local
-- pode ter outros dados).
create function testes.so_teste_fid(c text, h date, l date) returns setof uuid language sql as $$
  select p.id from public.alertas_fidelizacao_pendentes(c, h, l) p where p.email in ('a@teste.invalid', 'b@teste.invalid');
$$;
create function testes.so_teste_promo(c text, h date, l date) returns setof uuid language sql as $$
  select p.id from public.alertas_promocao_pendentes(c, h, l) p where p.email in ('a@teste.invalid', 'b@teste.invalid');
$$;
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

insert into public.alertas_fidelizacao_portal (id, utilizador_id, nome, email, operadora, data_fim_fidelizacao) values
  ('50000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a', 'x', 'x', 'MEO', current_date + 20),
  ('50000000-0000-4000-f000-0000000000b1', '00000000-0000-4000-f000-00000000000b', 'x', 'x', 'NOS', current_date + 20);
insert into public.alertas_promocao_portal (id, utilizador_id, nome, email, operadora, descricao_promocao, data_fim_promocao, ficheiro_contrato_caminho) values
  ('60000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a', 'x', 'x', 'Vodafone', 'Desconto', current_date + 5, null),
  ('60000000-0000-4000-f000-0000000000a2', '00000000-0000-4000-f000-00000000000a', 'x', 'x', 'Vodafone', 'Desconto', current_date + 5, 'a/contrato.pdf');
insert into public.preferencias_setor (utilizador_id, setor) values
  ('00000000-0000-4000-f000-00000000000a', 'Energia'),
  ('00000000-0000-4000-f000-00000000000b', 'Energia');

-- ===========================================================================
-- 1. Estrutura e privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.alertas_seguir_protecao()', 'EXECUTE'), 'trigger: não executável pela API');
select ok(not has_function_privilege('authenticated', 'public.limpar_alertas_desativados()', 'EXECUTE'), 'limpeza: não executável pelo cliente');
select ok(not has_function_privilege('service_role', 'public.limpar_alertas_desativados()', 'EXECUTE'), 'limpeza: só pg_cron (postgres)');
select ok(not has_function_privilege('authenticated', 'public.apagar_alerta_promocao_expirado(uuid)', 'EXECUTE'), 'apagar expirado: não executável pelo cliente');
select ok(has_function_privilege('service_role', 'public.apagar_alerta_promocao_expirado(uuid)', 'EXECUTE'), 'apagar expirado: Edge Function (service_role)');
select ok(exists (select 1 from cron.job where jobname = 'limpar-alertas-desativados'), 'job pg_cron agendado');

select is((select count(*) from testes.so_teste_fid('alerta_30d_enviado_em', current_date, current_date + 30)), 2::bigint,
  'com Proteção ativa: os dois alertas de fidelização são elegíveis');

-- ===========================================================================
-- 2. Fim da subscrição (webhook: plano none, estado canceled)
-- ===========================================================================
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';

select is((select count(*) from public.alertas_fidelizacao_portal where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em = now()), 1::bigint, 'fidelização: desativado (não apagado), com data');
select is((select count(*) from public.alertas_promocao_portal where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em = now()), 2::bigint, 'promoção: desativados (não apagados), com data');
select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em = now()), 1::bigint, 'setor: desativado, com data');
select is((select count(*) from public.alertas_fidelizacao_portal where utilizador_id = '00000000-0000-4000-f000-00000000000b' and desativado_em is null), 1::bigint, 'outra conta não é afetada');

select is((select count(*) from testes.so_teste_fid('alerta_30d_enviado_em', current_date, current_date + 30)), 1::bigint, 'fidelização: só o alerta da conta com Proteção é elegível');
select is((select count(*) from testes.so_teste_promo('alerta_7d_enviado_em', current_date, current_date + 7)), 0::bigint, 'promoção: nada elegível');

-- Mesmo que o plano volte a parecer ativo por engano, um alerta desativado nunca é enviado.
update public.alertas_fidelizacao_portal set desativado_em = now() - interval '1 day'
 where id = '50000000-0000-4000-f000-0000000000b1';
select is((select count(*) from testes.so_teste_fid('alerta_30d_enviado_em', current_date, current_date + 30)), 0::bigint, 'desativado + Proteção ativa: não elegível');
update public.alertas_fidelizacao_portal set desativado_em = null where id = '50000000-0000-4000-f000-0000000000b1';

-- ===========================================================================
-- 3. Webhook repetido / fim por outra via: o prazo não recomeça
-- ===========================================================================
update public.alertas_fidelizacao_portal set desativado_em = now() - interval '10 days'
 where id = '50000000-0000-4000-f000-0000000000a1';
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';
update public.user_access set subscription_status = 'unpaid'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select desativado_em from public.alertas_fidelizacao_portal where id = '50000000-0000-4000-f000-0000000000a1'), now() - interval '10 days', 'evento repetido: data de início mantém-se');

-- ===========================================================================
-- 4. O cliente não altera desativado_em
-- ===========================================================================
select testes.como('00000000-0000-4000-f000-00000000000b');
select is(testes.tenta($$update public.alertas_fidelizacao_portal set desativado_em = now() - interval '1 year' where id = '50000000-0000-4000-f000-0000000000b1'$$), 'ok:1', 'cliente: update aceite…');
select testes.como('00000000-0000-4000-f000-00000000000a');
select is(testes.tenta($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-f000-00000000000a', 'Água')$$), 'ok:1', 'cliente sem Proteção: pode guardar um setor…');
reset role;
select is((select desativado_em from public.alertas_fidelizacao_portal where id = '50000000-0000-4000-f000-0000000000b1'), null, '…mas desativado_em não muda');
select is((select desativado_em from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and setor = 'Água'), now(), '…mas sem Proteção o setor nasce desativado');

-- Aviso sectorial: só setores ativos de contas com Proteção (e só para o admin).
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-f000-00000000000b';
select testes.como('00000000-0000-4000-f000-00000000000b');
select is((select count(*) from testes.so_teste_avisos('Energia')), 1::bigint, 'aviso sectorial: só a conta com Proteção');
select testes.como('00000000-0000-4000-f000-00000000000a');
select is((select count(*) from testes.so_teste_avisos('Energia')), 0::bigint, 'aviso sectorial: cliente não-admin não lê destinatários');
reset role;

-- ===========================================================================
-- 5. Voltar à Proteção dentro do prazo: configuração recuperada
-- ===========================================================================
update public.alertas_promocao_portal set desativado_em = now() - interval '7 months'
 where id = '60000000-0000-4000-f000-0000000000a1';
update public.user_access set subscription_plan = 'protecao', subscription_status = 'active'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select desativado_em from public.alertas_fidelizacao_portal where id = '50000000-0000-4000-f000-0000000000a1'), null, 'regresso: alerta de fidelização reativado');
select is((select count(*) from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-00000000000a' and desativado_em is null), 2::bigint, 'regresso: setores reativados');
select isnt((select desativado_em from public.alertas_promocao_portal where id = '60000000-0000-4000-f000-0000000000a1'), null, 'regresso: o que passou os 6 meses não volta');

-- ===========================================================================
-- 6. Limpeza aos 6 meses
-- ===========================================================================
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';
update public.alertas_fidelizacao_portal set desativado_em = now() - interval '5 months'
 where id = '50000000-0000-4000-f000-0000000000a1';
update public.alertas_promocao_portal set desativado_em = now() - interval '7 months'
 where utilizador_id = '00000000-0000-4000-f000-00000000000a';
update public.preferencias_setor set desativado_em = now() - interval '7 months'
 where utilizador_id = '00000000-0000-4000-f000-00000000000a';

select is(public.limpar_alertas_desativados(), 3, 'limpeza: apaga promoção sem ficheiro e os 2 setores');
select is((select count(*) from public.alertas_fidelizacao_portal where id = '50000000-0000-4000-f000-0000000000a1'), 1::bigint, 'limpeza: dentro dos 6 meses fica');
select is((select count(*) from public.alertas_promocao_portal where id = '60000000-0000-4000-f000-0000000000a2'), 1::bigint, 'limpeza SQL: alerta com ficheiro fica para a Edge Function');
select is((select count(*) from public.alertas_promocao_expirados()), 1::bigint, 'Edge Function: 1 alerta com ficheiro a apagar');
select ok(not public.apagar_alerta_promocao_expirado('50000000-0000-4000-f000-0000000000a1'), 'apagar expirado: id que não é de promoção expirada → false');
select ok(public.apagar_alerta_promocao_expirado('60000000-0000-4000-f000-0000000000a2'), 'apagar expirado: apaga depois do ficheiro');
select is((select count(*) from public.alertas_promocao_portal where utilizador_id = '00000000-0000-4000-f000-00000000000a'), 0::bigint, 'promoção: nada retido além do prazo');
select is((select count(*) from public.alertas_fidelizacao_portal where utilizador_id = '00000000-0000-4000-f000-00000000000b'), 1::bigint, 'limpeza não toca em alertas ativos');

select * from finish();
rollback;
