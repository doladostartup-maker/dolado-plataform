-- DoLado — diagnóstico gratuito sem registo (diagnosticos_gratuitos)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: visitante e cliente não lêem nem escrevem diagnósticos (RLS sem
-- policies, sem grants); as funções só correm com a service role; a reserva
-- respeita o limite diário; a associação exige o segredo da sessão e nunca
-- passa um diagnóstico para outra conta; a conservação apaga o conteúdo e o
-- segredo e deixa só as contagens; os ficheiros de diagnósticos válidos não
-- são órfãos. Transação revertida.

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-d100-00000000000a', 'dg-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-d100-00000000000b', 'dg-b@teste.invalid', 'authenticated', 'authenticated', now(), now());

-- ---------------------------------------------------------------------------
-- Reserva (service role) e limite diário
-- ---------------------------------------------------------------------------
set local role service_role;

select isnt(
  public.diagnostico_reservar('11111111-1111-4111-8111-111111111111', repeat('a', 64), 'diagnosticos/d1.pdf',
    'application/pdf', 1000, 100, 'instagram', 'ig', 'paid', 'out26', '/', 'movel'),
  null, 'Reserva cria o diagnóstico');

select is(
  public.diagnostico_reservar('22222222-2222-4222-8222-222222222222', repeat('b', 64), 'diagnosticos/d2.pdf',
    'application/pdf', 1000, (select count(*)::int from public.diagnosticos_gratuitos), 'direto', null, null, null, null, null),
  null, 'Sem reserva quando o limite diário foi atingido');

select throws_ok(
  $$ insert into public.diagnosticos_gratuitos (sessao_id, storage_path) values (gen_random_uuid(), 'outro/x.pdf') $$,
  '23514', null, 'Ficheiros só em diagnosticos/');

-- Diagnóstico concluído para os testes de associação.
update public.diagnosticos_gratuitos
   set estado = 'concluido', resultado = '{"tipo":"fatura"}'::jsonb, analisado_em = now()
 where storage_path = 'diagnosticos/d1.pdf';

-- ---------------------------------------------------------------------------
-- Visitante e cliente: nada
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.diagnosticos_gratuitos $$, '42501', null, 'Visitante não lê diagnósticos');
select throws_ok($$ select public.diagnostico_associar('11111111-1111-4111-8111-111111111111', repeat('a', 64), '00000000-0000-4000-d100-00000000000a') $$,
  '42501', null, 'Visitante não associa');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-d100-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select count(*) from public.diagnosticos_gratuitos $$, '42501', null, 'Cliente não lê diagnósticos');
select throws_ok($$ select public.diagnostico_associar('11111111-1111-4111-8111-111111111111', repeat('a', 64), '00000000-0000-4000-d100-00000000000a') $$,
  '42501', null, 'Cliente não chama a associação directamente');
select throws_ok($$ select public.diagnosticos_expirar() $$, '42501', null, 'Cliente não chama a conservação');

-- ---------------------------------------------------------------------------
-- Associação (service role)
-- ---------------------------------------------------------------------------
reset role;
set local role service_role;

select is(public.diagnostico_associar('11111111-1111-4111-8111-111111111111', repeat('c', 64), '00000000-0000-4000-d100-00000000000a'),
  0, 'Segredo errado: nada associado');
select is(public.diagnostico_associar('11111111-1111-4111-8111-111111111111', repeat('a', 64), '00000000-0000-4000-d100-00000000000a'),
  1, 'Com o segredo da sessão: associado à conta');
select ok((select expira_em > now() + interval '29 days' from public.diagnosticos_gratuitos where storage_path = 'diagnosticos/d1.pdf'),
  'Associado: conservado 30 dias');
select is(public.diagnostico_associar('11111111-1111-4111-8111-111111111111', repeat('a', 64), '00000000-0000-4000-d100-00000000000b'),
  0, 'Nunca passa para outra conta');

-- ---------------------------------------------------------------------------
-- Ficheiros órfãos e conservação
-- ---------------------------------------------------------------------------
insert into storage.objects (bucket_id, name, created_at)
values ('documentos-monitor', 'diagnosticos/d1.pdf', now() - interval '2 days');

select ok(not exists (select 1 from public.monitor_ficheiros_orfaos() where storage_path = 'diagnosticos/d1.pdf'),
  'Ficheiro de um diagnóstico válido não é órfão');

update public.diagnosticos_gratuitos set expira_em = now() - interval '1 minute' where storage_path = 'diagnosticos/d1.pdf';
select is((public.diagnosticos_expirar() ->> 'expirados')::int, 1, 'Diagnóstico expirado');
select ok(
  (select token_hash is null and storage_path is null and resultado is null and dados_apagados_em is not null and canal = 'instagram'
     from public.diagnosticos_gratuitos where sessao_id = '11111111-1111-4111-8111-111111111111'),
  'Conteúdo e segredo apagados; ficam as contagens e a origem');
select ok(exists (select 1 from public.monitor_ficheiros_orfaos() where storage_path = 'diagnosticos/d1.pdf'),
  'Depois de expirar, o ficheiro é órfão (apagado pela Edge Function)');

select * from finish();
rollback;
