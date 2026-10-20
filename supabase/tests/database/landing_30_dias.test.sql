-- DoLado — landing /30-dias-gratis (origem 'landing_30d' e funil nas métricas)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: a activação aceita a origem 'landing_30d' (e continua a reduzir
-- valores desconhecidos a 'outro'); o funil da landing conta uma linha por
-- conta (criadas, e-mail confirmado, activadas) e só o admin o lê. Tudo numa
-- transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on all functions in schema testes to authenticated, service_role;

-- a: conta da landing, confirmada · b: conta da landing por confirmar ·
-- c: conta sem origem · f: admin.
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at, raw_user_meta_data) values
  ('00000000-0000-4000-e100-00000000000a', 'l30a@teste.invalid', 'authenticated', 'authenticated', now(), now(), '{"origem_registo":"landing_30d"}'),
  ('00000000-0000-4000-e100-00000000000b', 'l30b@teste.invalid', 'authenticated', 'authenticated', null, now(), '{"origem_registo":"landing_30d"}'),
  ('00000000-0000-4000-e100-00000000000c', 'l30c@teste.invalid', 'authenticated', 'authenticated', now(), now(), '{}'),
  ('00000000-0000-4000-e100-00000000000f', 'l30f@teste.invalid', 'authenticated', 'authenticated', now(), now(), '{}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e100-00000000000f';

select is(
  (select public.protecao_gratuita_ativar('00000000-0000-4000-e100-00000000000a', 'hmac:' || repeat('a', 64), 'landing_30d', '2026-10-19', 'Aceito') ->> 'resultado'),
  'ativada', 'Activação com a origem da landing');
select is((select origem from public.protecao_gratuita where user_id = '00000000-0000-4000-e100-00000000000a'),
  'landing_30d', 'Origem landing_30d gravada');

select is(
  (select public.protecao_gratuita_ativar('00000000-0000-4000-e100-00000000000c', 'hmac:' || repeat('c', 64), '<script>', '2026-10-19', 'Aceito') ->> 'resultado'),
  'ativada', 'Activação com origem desconhecida');
select is((select origem from public.protecao_gratuita where user_id = '00000000-0000-4000-e100-00000000000c'),
  'outro', 'Origem desconhecida continua a ser outro');

select throws_ok(
  $$update public.protecao_gratuita set origem = 'facebook' where user_id = '00000000-0000-4000-e100-00000000000c'$$,
  null, 'Origem fora da lista recusada pela base de dados');

select testes.como('00000000-0000-4000-e100-00000000000a');
select throws_ok($$select public.protecao_gratuita_metricas()$$, 'P0001', null, 'Funil só para admin');

select testes.como('00000000-0000-4000-e100-00000000000f');
select is((public.protecao_gratuita_metricas() -> 'landing_30d' ->> 'contas_criadas')::int >= 2, true, 'Contas criadas na landing');
select is(
  (select (m -> 'landing_30d' ->> 'contas_criadas')::int - (m -> 'landing_30d' ->> 'emails_confirmados')::int
     from (select public.protecao_gratuita_metricas() as m) x) >= 1,
  true, 'Conta por confirmar não conta como confirmada');
select is((public.protecao_gratuita_metricas() -> 'landing_30d' ->> 'ativadas')::int >= 1, true, 'Activações da landing');
select is((public.protecao_gratuita_metricas() -> 'por_origem' ->> 'landing_30d')::int >= 1, true, 'Origem no resumo por origem');

select * from finish();
rollback;
