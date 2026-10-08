-- DoLado — Resumo mensal da Proteção
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: quem recebe (Proteção / Caso + Proteção ativas, e-mail confirmado,
-- conta existente no mês) e quem não recebe (Avulso, cancelada, sem plano,
-- e-mail por confirmar, conta posterior ao mês); um resumo por conta e mês
-- (reserva idempotente, enviado imutável, falhas tentadas até 3 vezes); RLS
-- (cada cliente só lê os próprios resumos enviados; ninguém escreve pela
-- API); funções só para a service_role. Tudo numa transação revertida.

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

-- a: Proteção desde agosto · b: Caso + Proteção (linha antiga, sem start_date) ·
-- c: Avulso (sem subscrição) · d: Proteção cancelada · e: sem plano (sem
-- user_access) · f: Proteção com e-mail por confirmar · g: conta de agosto,
-- Proteção subscrita a 2 de outubro · h: subscrita a 1 de outubro às 00:30 em
-- Lisboa (30/09 23:30 UTC) · i: Proteção sem subscrição Stripe (sem data de
-- início conhecida) · j: subscrita a 30 de setembro às 23:30 em Lisboa.
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-f000-00000000000a', 'ra@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-00000000000b', 'rb@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-00000000000c', 'rc@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-00000000000d', 'rd@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-00000000000e', 're@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-00000000000f', 'rf@teste.invalid', 'authenticated', 'authenticated', null, '2026-08-01'),
  ('00000000-0000-4000-f000-000000000010', 'rg@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-000000000011', 'rh@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-000000000012', 'ri@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01'),
  ('00000000-0000-4000-f000-000000000013', 'rj@teste.invalid', 'authenticated', 'authenticated', now(), '2026-08-01');

insert into public.stripe_subscriptions (stripe_subscription_id, stripe_customer_id, status, start_date) values
  ('sub_resumo_a', 'cus_resumo_a', 'active', '2026-08-01 10:00+00'),
  ('sub_resumo_b', 'cus_resumo_b', 'active', null),
  ('sub_resumo_d', 'cus_resumo_d', 'canceled', '2026-08-01 10:00+00'),
  ('sub_resumo_f', 'cus_resumo_f', 'active', '2026-08-01 10:00+00'),
  ('sub_resumo_g', 'cus_resumo_g', 'active', '2026-10-02 10:00+00'),
  ('sub_resumo_h', 'cus_resumo_h', 'active', '2026-09-30 23:30+00'),
  ('sub_resumo_j', 'cus_resumo_j', 'active', '2026-09-30 22:30+00');

insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits, avulso_credits, stripe_subscription_id) values
  ('00000000-0000-4000-f000-00000000000a', 'protecao', 'active', 0, 0, 'sub_resumo_a'),
  ('00000000-0000-4000-f000-00000000000b', 'caso_protecao', 'active', 1, 0, 'sub_resumo_b'),
  ('00000000-0000-4000-f000-00000000000c', 'none', null, 1, 1, null),
  ('00000000-0000-4000-f000-00000000000d', 'protecao', 'canceled', 0, 0, 'sub_resumo_d'),
  ('00000000-0000-4000-f000-00000000000f', 'protecao', 'active', 0, 0, 'sub_resumo_f'),
  ('00000000-0000-4000-f000-000000000010', 'protecao', 'active', 0, 0, 'sub_resumo_g'),
  ('00000000-0000-4000-f000-000000000011', 'protecao', 'active', 0, 0, 'sub_resumo_h'),
  ('00000000-0000-4000-f000-000000000012', 'protecao', 'active', 0, 0, null),
  ('00000000-0000-4000-f000-000000000013', 'protecao', 'active', 0, 0, 'sub_resumo_j');

-- ---------------------------------------------------------------------------
-- Quem recebe
-- ---------------------------------------------------------------------------
select set_eq(
  $$select utilizador_id from public.protecao_resumo_destinatarios('2026-09-01')
     where utilizador_id::text like '00000000-0000-4000-f000-%'$$,
  $$values ('00000000-0000-4000-f000-00000000000a'::uuid), ('00000000-0000-4000-f000-00000000000b'::uuid),
           ('00000000-0000-4000-f000-000000000013'::uuid)$$,
  'Só Proteção e Caso + Proteção ativas agora e durante setembro, com e-mail confirmado'
);
select ok(
  not exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-000000000010'),
  'Conta de agosto que só subscreveu em outubro não recebe o resumo de setembro'
);
select ok(
  exists (select 1 from public.protecao_resumo_destinatarios('2026-10-01') where utilizador_id = '00000000-0000-4000-f000-000000000010'),
  '…e recebe o de outubro'
);
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-000000000010', '2026-09-01'), null, 'Subscrita depois do mês: a reserva também é recusada');
select ok(
  not exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-000000000011'),
  'Fim do mês em Lisboa: subscrita a 1 de outubro às 00:30 (30/09 23:30 UTC) não conta para setembro'
);
select ok(
  exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-000000000013'),
  'Subscrita a 30 de setembro às 23:30 em Lisboa conta para setembro'
);
select ok(
  exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-00000000000b'),
  'Subscrição gravada antes de haver start_date (null): conta como anterior ao mês'
);
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-000000000012', '2026-09-01'), null, 'Proteção sem subscrição Stripe (início desconhecido): não recebe');
select is(
  (select email from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-00000000000a'),
  'ra@teste.invalid',
  'O destinatário é o e-mail da conta'
);
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000c', '2026-09-01'), null, 'Avulso: a reserva é recusada');
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000d', '2026-09-01'), null, 'Subscrição cancelada: a reserva é recusada');
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000e', '2026-09-01'), null, 'Sem plano: a reserva é recusada');

-- ---------------------------------------------------------------------------
-- Idempotência
-- ---------------------------------------------------------------------------
create temp table ids (nome text primary key, id uuid);
grant all on ids to authenticated;
insert into ids values ('a', public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000a', '2026-09-15'));
select isnt((select id from ids where nome = 'a'), null, 'A primeira reserva do mês é aceite (qualquer dia do mês conta como o mês)');
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000a', '2026-09-01'), null, 'Segunda reserva do mesmo mês: recusada');
select ok(
  not exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-00000000000a'),
  'Com reserva em curso, a conta sai da lista'
);
select ok(
  public.protecao_resumo_concluir((select id from ids where nome = 'a'), true, '{"mes":"2026-09"}'::jsonb, 'resumo_v1'),
  'Conclusão como enviado'
);
select ok(
  not public.protecao_resumo_concluir((select id from ids where nome = 'a'), false, null, null, 'brevo_500'),
  'Um resumo enviado não volta a falhou'
);
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000a', '2026-09-01'), null, 'Depois de enviado, nunca é reservado de novo');
select throws_ok(
  $$update public.protecao_resumos_mensais set conteudo = '{}' where utilizador_id = '00000000-0000-4000-f000-00000000000a'$$,
  '42501', null, 'Um resumo enviado não pode ser alterado'
);
select isnt(
  public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000a', '2026-10-01'),
  null,
  'O mês seguinte é uma nova reserva'
);

-- Falhas: tentadas de novo até 3 vezes.
insert into ids values ('b', public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000b', '2026-09-01'));
select ok(public.protecao_resumo_concluir((select id from ids where nome = 'b'), false, null, null, 'brevo_502'), 'Falha registada');
select is(
  (select erro_codigo from public.protecao_resumos_mensais where id = (select id from ids where nome = 'b')),
  'brevo_502',
  'O código do erro fica registado'
);
select ok(
  exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-00000000000b'),
  'Depois de uma falha, a conta volta à lista'
);
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000b', '2026-09-01'), (select id from ids where nome = 'b'), '2.ª tentativa: mesma linha');
select ok(public.protecao_resumo_concluir((select id from ids where nome = 'b'), false, null, null, 'brevo_502'), '2.ª falha');
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000b', '2026-09-01'), (select id from ids where nome = 'b'), '3.ª tentativa');
select ok(public.protecao_resumo_concluir((select id from ids where nome = 'b'), false, null, null, 'brevo_502'), '3.ª falha');
select is(
  (select tentativas from public.protecao_resumos_mensais where id = (select id from ids where nome = 'b')),
  3,
  'Três tentativas registadas'
);
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000b', '2026-09-01'), null, 'Ao fim de 3 tentativas, não há mais');
select ok(
  not exists (select 1 from public.protecao_resumo_destinatarios('2026-09-01') where utilizador_id = '00000000-0000-4000-f000-00000000000b'),
  'Com as tentativas esgotadas, a conta sai da lista'
);

-- Envio incerto: sem nova tentativa automática.
insert into ids values ('b10', public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000b', '2026-10-01'));
select ok(public.protecao_resumo_concluir((select id from ids where nome = 'b10'), false, null, null, 'envio_incerto', false), 'Envio incerto registado');
select is(public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000b', '2026-10-01'), null, 'Envio incerto: nunca repetido automaticamente');

select throws_ok(
  $$insert into public.protecao_resumos_mensais (utilizador_id, mes_referencia) values ('00000000-0000-4000-f000-00000000000a', '2026-09-02')$$,
  '23514', null, 'O mês de referência é sempre o primeiro dia do mês'
);

-- ---------------------------------------------------------------------------
-- RLS e permissões
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-f000-00000000000a');
select is(
  (select count(*) from public.protecao_resumos_mensais),
  1::bigint,
  'O cliente vê só o próprio resumo enviado (não a reserva de outubro)'
);
select is(
  (select utilizador_id from public.protecao_resumos_mensais),
  '00000000-0000-4000-f000-00000000000a'::uuid,
  'O resumo visível é o do próprio cliente'
);
select is(
  testes.tenta($$insert into public.protecao_resumos_mensais (utilizador_id, mes_referencia) values ('00000000-0000-4000-f000-00000000000a', '2026-11-01')$$),
  'erro:42501',
  'O cliente não cria resumos'
);
select is(
  testes.tenta($$update public.protecao_resumos_mensais set estado = 'falhou'$$),
  'erro:42501',
  'O cliente não altera resumos'
);
select is(
  testes.tenta($$delete from public.protecao_resumos_mensais$$),
  'erro:42501',
  'O cliente não apaga resumos'
);
select is(
  testes.tenta($$select public.protecao_resumo_reservar('00000000-0000-4000-f000-00000000000a', '2026-12-01')$$),
  'erro:42501',
  'O cliente não reserva envios'
);
select is(
  testes.tenta($$select * from public.protecao_resumo_destinatarios('2026-09-01')$$),
  'erro:42501',
  'O cliente não lê a lista de destinatários'
);
select is(
  testes.tenta($$select public.protecao_resumo_concluir('00000000-0000-0000-0000-000000000000', true, '{}'::jsonb, 'x')$$),
  'erro:42501',
  'O cliente não conclui envios'
);
reset role;

select testes.como('00000000-0000-4000-f000-00000000000b');
select is((select count(*) from public.protecao_resumos_mensais), 0::bigint, 'Outro cliente não vê resumos alheios nem os próprios falhados');
reset role;

set local role anon;
select is(
  testes.tenta($$select * from public.protecao_resumos_mensais$$),
  'erro:42501',
  'Sem sessão: sem acesso'
);
reset role;

select is(
  (select count(*) from cron.job where jobname = 'resumo-mensal-protecao' and schedule = '0 9 1-3 * *'),
  1::bigint,
  'Agendamento mensal (dias 1 a 3, 09:00 UTC)'
);

select * from finish();
rollback;
