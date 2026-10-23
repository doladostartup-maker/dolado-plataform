-- DoLado Empresas — Fase 3: contas de empresa fora dos fluxos particulares
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: em todas as tabelas só de particulares, a base de dados recusa
-- (42501, também à service_role/postgres) ligar uma conta de empresa — antes
-- de qualquer outra validação da linha; para uma conta particular o trigger
-- não intervém (o resultado é o de sempre: a linha entra, ou falha por outra
-- regra, nunca por 42501). Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;

create function testes.tenta(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'erro:' || sqlstate;
end $$;

-- e: conta de empresa · p: conta particular
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e600-00000000000e', 'bloq-e@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e600-00000000000f', 'bloq-p@teste.invalid', 'authenticated', 'authenticated', now(), now());
select is(public.empresa_marcar_conta('00000000-0000-4000-e600-00000000000e'), 'marcada', 'Conta de empresa de teste');

-- Inserção mínima por tabela: a coluna da conta é a única preenchida de
-- propósito — o trigger corre antes das outras validações.
create temporary table casos_teste (tabela text, sql_empresa text, sql_particular text);
insert into casos_teste values
  ('user_access',
   $$ insert into public.user_access (user_id) values ('00000000-0000-4000-e600-00000000000e') $$,
   $$ insert into public.user_access (user_id) values ('00000000-0000-4000-e600-00000000000f') $$),
  ('case_credit_grants',
   $$ insert into public.case_credit_grants (origem, user_id, quantidade) values ('invoice:t_e', '00000000-0000-4000-e600-00000000000e', 1) $$,
   $$ insert into public.case_credit_grants (origem, user_id, quantidade) values ('invoice:t_p', '00000000-0000-4000-e600-00000000000f', 1) $$),
  ('casos',
   $$ insert into public.casos (utilizador_id, nome, email) values ('00000000-0000-4000-e600-00000000000e', 'E', 'e@teste.invalid') $$,
   $$ insert into public.casos (utilizador_id, nome, email) values ('00000000-0000-4000-e600-00000000000f', 'P', 'p@teste.invalid') $$),
  ('pedidos_caso',
   $$ insert into public.pedidos_caso (user_id) values ('00000000-0000-4000-e600-00000000000e') $$,
   $$ insert into public.pedidos_caso (user_id) values ('00000000-0000-4000-e600-00000000000f') $$),
  ('protecao_gratuita',
   $$ insert into public.protecao_gratuita (user_id, inicio_em, termina_em, termos_versao, texto_aceite)
      values ('00000000-0000-4000-e600-00000000000e', now(), now() + interval '30 days', 't', 't') $$,
   $$ insert into public.protecao_gratuita (user_id, inicio_em, termina_em, termos_versao, texto_aceite)
      values ('00000000-0000-4000-e600-00000000000f', now(), now() + interval '30 days', 't', 't') $$),
  ('acessos_patrocinados',
   $$ insert into public.acessos_patrocinados (user_id) values ('00000000-0000-4000-e600-00000000000e') $$,
   $$ insert into public.acessos_patrocinados (user_id) values ('00000000-0000-4000-e600-00000000000f') $$),
  ('indicacoes (indicado)',
   $$ insert into public.indicacoes (referrer_user_id, referred_user_id, codigo, visitado_em)
      values ('00000000-0000-4000-e600-00000000000f', '00000000-0000-4000-e600-00000000000e', 'EEEE2222', now()) $$,
   $$ insert into public.indicacoes (referrer_user_id, referred_user_id, codigo, visitado_em)
      values ('00000000-0000-4000-e600-00000000000f', '00000000-0000-4000-e600-00000000000f', 'PPPP2222', now()) $$),
  ('indicacoes_codigos',
   $$ insert into public.indicacoes_codigos (user_id, codigo) values ('00000000-0000-4000-e600-00000000000e', 'EEEE3333') $$,
   $$ insert into public.indicacoes_codigos (user_id, codigo) values ('00000000-0000-4000-e600-00000000000f', 'PPPP3333') $$),
  ('parceiros_atribuicoes',
   $$ insert into public.parceiros_atribuicoes (user_id) values ('00000000-0000-4000-e600-00000000000e') $$,
   $$ insert into public.parceiros_atribuicoes (user_id) values ('00000000-0000-4000-e600-00000000000f') $$),
  ('parceiros_area_acessos',
   $$ insert into public.parceiros_area_acessos (parceiro_id, user_id) values (gen_random_uuid(), '00000000-0000-4000-e600-00000000000e') $$,
   $$ insert into public.parceiros_area_acessos (parceiro_id, user_id) values (gen_random_uuid(), '00000000-0000-4000-e600-00000000000f') $$),
  ('associacoes_compra',
   $$ insert into public.associacoes_compra (stripe_session_id, user_id, email_checkout, resultado)
      values ('cs_e', '00000000-0000-4000-e600-00000000000e', 'x', 'associada') $$,
   $$ insert into public.associacoes_compra (stripe_session_id, user_id, email_checkout, resultado)
      values ('cs_p', '00000000-0000-4000-e600-00000000000f', 'x', 'associada') $$),
  ('preferencias_setor',
   $$ insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e600-00000000000e', 'Energia') $$,
   $$ insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e600-00000000000f', 'Energia') $$),
  ('diagnosticos_gratuitos',
   $$ insert into public.diagnosticos_gratuitos (sessao_id, storage_path, conta_id)
      values (gen_random_uuid(), 'diagnosticos/e.pdf', '00000000-0000-4000-e600-00000000000e') $$,
   $$ insert into public.diagnosticos_gratuitos (sessao_id, storage_path, conta_id)
      values (gen_random_uuid(), 'diagnosticos/p.pdf', '00000000-0000-4000-e600-00000000000f') $$);

select is(testes.tenta(sql_empresa), 'erro:42501', tabela || ': conta de empresa recusada')
  from casos_teste order by tabela;
select isnt(testes.tenta(sql_particular), 'erro:42501', tabela || ': conta particular não é recusada pelo trigger')
  from casos_teste order by tabela;

-- Update que liga uma linha existente a uma conta de empresa: também recusado.
insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e600-00000000000f', 'Água');
select is(testes.tenta($$ update public.preferencias_setor set utilizador_id = '00000000-0000-4000-e600-00000000000e'
  where utilizador_id = '00000000-0000-4000-e600-00000000000f' and setor = 'Água' $$), 'erro:42501',
  'Mudar uma linha para uma conta de empresa é recusado');

-- Pelas funções de sempre (sem alteração no corpo): a recusa chega lá dentro.
select throws_ok($$ select public.protecao_gratuita_ativar('00000000-0000-4000-e600-00000000000e',
  'hmac:' || repeat('e', 64), 'homepage', 't', 't') $$, '42501', null,
  'protecao_gratuita_ativar: conta de empresa recusada');
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e600-0000000000a1', 'bloq-p2@teste.invalid', 'authenticated', 'authenticated', now(), now());
select is(public.protecao_gratuita_ativar('00000000-0000-4000-e600-0000000000a1',
  'hmac:' || repeat('f', 64), 'homepage', 't', 't') ->> 'resultado', 'ativada',
  'protecao_gratuita_ativar: conta particular como sempre');

-- O Monitor continua aberto às contas de empresa (é o produto delas).
select lives_ok($$ insert into public.contratos_monitorizados (utilizador_id, setor)
  values ('00000000-0000-4000-e600-00000000000e', 'agua') $$, 'Monitor: conta de empresa pode ter serviços');

select ok(not has_function_privilege('authenticated', 'public.recusar_conta_empresa()', 'EXECUTE'),
  'recusar_conta_empresa() não executável pela API');

select * from finish();
rollback;
