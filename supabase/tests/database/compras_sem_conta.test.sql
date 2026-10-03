-- DoLado — Compras pagas sem conta, associação a uma conta existente e
-- subscrições duplicadas (20261003130000_compras_sem_conta_associacao.sql).
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: o cliente não lê nem escreve as tabelas novas nem executa as
-- funções; reclamar_compra_sem_conta só associa com e-mail confirmado igual
-- ao do Checkout, pagamento confirmado, IDs Stripe iguais e compra nunca
-- reclamada (idempotente para a mesma conta); a prova é só de inserção; os
-- lembretes saem uma vez por marco e param quando a compra fica ligada; o
-- admin só regista a resolução de uma duplicada.
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

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- A: conta com o e-mail do Checkout (confirmado). B: outra conta. C: mesmo
-- e-mail de uma segunda compra, mas ainda por confirmar. D: admin.
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-c000-00000000000a', 'pessoa@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-c000-00000000000b', 'outra@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"B"}'),
  ('00000000-0000-4000-c000-00000000000c', 'porconfirmar@teste.invalid', 'authenticated', 'authenticated', null, '{"nome":"C"}'),
  ('00000000-0000-4000-c000-00000000000d', 'admin@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"D"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-c000-00000000000d';

insert into public.stripe_payments (stripe_session_id, stripe_customer_id, stripe_subscription_id, email, plano, estado) values
  ('cs_1', 'cus_1', 'sub_1', 'Pessoa@Teste.invalid', 'assinatura', 'concluido'),
  ('cs_pendente', 'cus_2', 'sub_2', 'pessoa@teste.invalid', 'assinatura', 'pendente'),
  ('cs_c', 'cus_3', null, 'porconfirmar@teste.invalid', 'avulso', 'concluido'),
  ('cs_dup', 'cus_4', 'sub_4', 'pessoa@teste.invalid', 'assinatura', 'concluido'),
  ('cs_lembrete', 'cus_5', null, 'semconta@teste.invalid', 'avulso', 'concluido');

-- ---------------------------------------------------------------------------
-- Registo pelo webhook (service_role)
-- ---------------------------------------------------------------------------
select is(public.registar_compra_sem_conta('cs_1', 'pessoa@teste.invalid', 'caso_protecao'), true, 'registar: primeira vez → true');
select is(public.registar_compra_sem_conta('cs_1', 'pessoa@teste.invalid', 'caso_protecao'), false, 'registar: reenvio → false (aviso ao admin uma vez)');
select is(public.registar_compra_sem_conta('cs_lembrete', 'semconta@teste.invalid', 'avulso'), true, 'registar: segunda compra');

-- ---------------------------------------------------------------------------
-- Cliente e anon: sem acesso
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-c000-00000000000a');
select is(testes.contar('select * from public.compras_sem_conta'), 0::bigint, 'cliente: não lê compras_sem_conta');
select is(testes.contar('select * from public.associacoes_compra'), 0::bigint, 'cliente: não lê associacoes_compra');
select is(testes.contar('select * from public.subscricoes_duplicadas'), 0::bigint, 'cliente: não lê subscricoes_duplicadas');
select is(testes.tenta($$insert into public.compras_sem_conta (stripe_session_id, email, plano) values ('cs_pendente', 'x', 'avulso')$$), 'erro:42501', 'cliente: não cria compras_sem_conta');
select is(testes.tenta($$insert into public.associacoes_compra (stripe_session_id, user_id, email_checkout, resultado) values ('cs_1', '00000000-0000-4000-c000-00000000000a', 'x', 'associada')$$), 'erro:42501', 'cliente: não cria associações');
select is(testes.tenta($$select public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000a', 'cus_1', 'sub_1', null)$$), 'erro:42501', 'cliente: não reclama compras pela API');
select is(testes.tenta($$select public.conta_existe_com_email('outra@teste.invalid')$$), 'erro:42501', 'cliente: não pergunta se um e-mail tem conta');
select is(testes.tenta($$select public.reservar_lembrete_compra('cs_1', '1d', now())$$), 'erro:42501', 'cliente: não reserva lembretes');
select is(testes.tenta($$select * from public.compras_sem_conta_pendentes(now())$$), 'erro:42501', 'cliente: não lista compras pendentes');
select testes.como(null);
select is(testes.tenta($$select public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000a', 'cus_1', 'sub_1', null)$$), 'erro:42501', 'anon: não reclama compras');
select is(testes.tenta($$select public.registar_compra_sem_conta('cs_pendente', 'x', 'avulso')$$), 'erro:42501', 'anon: não regista compras');
reset role;

-- ---------------------------------------------------------------------------
-- Reclamar (service_role)
-- ---------------------------------------------------------------------------
select is(public.reclamar_compra_sem_conta('cs_nada', '00000000-0000-4000-c000-00000000000a', null, null, null), 'sem_pagamento', 'reclamar: compra desconhecida');
select is(public.reclamar_compra_sem_conta('cs_pendente', '00000000-0000-4000-c000-00000000000a', 'cus_2', 'sub_2', null), 'pagamento_nao_confirmado', 'reclamar: pagamento pendente → recusado');
select is(public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000b', 'cus_1', 'sub_1', null), 'email_diferente', 'reclamar: e-mail de outra conta → recusado');
select is(public.reclamar_compra_sem_conta('cs_c', '00000000-0000-4000-c000-00000000000c', 'cus_3', null, null), 'email_nao_confirmado', 'reclamar: e-mail por confirmar → recusado');
select is(public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000a', 'cus_1', 'sub_outra', null), 'dados_diferentes', 'reclamar: subscrição diferente da gravada → recusado');
select is(public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000a', 'cus_outro', 'sub_1', null), 'dados_diferentes', 'reclamar: Customer diferente do gravado → recusado');
select is((select count(*) from public.associacoes_compra), 0::bigint, 'recusas não deixam associação');

select is(public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000a', 'cus_1', 'sub_1', null), 'associada', 'reclamar: e-mail confirmado igual (sem diferenças de maiúsculas) → associada');
select is((select user_id from public.stripe_payments where stripe_session_id = 'cs_1'), '00000000-0000-4000-c000-00000000000a'::uuid, 'pagamento ligado à conta');
select is((select resolucao from public.compras_sem_conta where stripe_session_id = 'cs_1'), 'associada', 'compra sem conta resolvida como associada (não conta_criada)');
select is(public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000a', 'cus_1', 'sub_1', null), 'ja_associada', 'reclamar de novo, mesma conta → idempotente');
select is(public.reclamar_compra_sem_conta('cs_1', '00000000-0000-4000-c000-00000000000b', 'cus_1', 'sub_1', null), 'outra_conta', 'reclamar por outra conta → recusado');
select is((select count(*) from public.associacoes_compra where stripe_session_id = 'cs_1'), 1::bigint, 'uma única associação por compra');
select is(testes.tenta($$update public.associacoes_compra set resultado = 'associada'$$), 'erro:42501', 'associacoes_compra: prova só de inserção (nem service_role altera)');

-- Duplicado: não liga o pagamento; fica por rever.
select is(public.reclamar_compra_sem_conta('cs_dup', '00000000-0000-4000-c000-00000000000a', 'cus_4', 'sub_4', 'sub_1'), 'duplicado_por_rever', 'reclamar com subscrição ativa na conta → duplicado_por_rever');
select is((select user_id from public.stripe_payments where stripe_session_id = 'cs_dup'), null, 'duplicado: pagamento não fica ligado');
select is((select estado || '/' || origem || '/' || subscricao_existente_id from public.subscricoes_duplicadas where nova_subscription_id = 'sub_4'), 'por_rever/associacao/sub_1', 'duplicado registado para revisão');
select is(public.reclamar_compra_sem_conta('cs_dup', '00000000-0000-4000-c000-00000000000a', 'cus_4', 'sub_4', 'sub_1'), 'ja_em_revisao', 'duplicado: repetir → ja_em_revisao');

-- ---------------------------------------------------------------------------
-- Lembretes: um por marco; param quando a compra fica ligada
-- ---------------------------------------------------------------------------
update public.compras_sem_conta set confirmado_em = now() - interval '25 hours' where stripe_session_id = 'cs_lembrete';
select is((select marco from public.compras_sem_conta_pendentes(now()) where stripe_session_id = 'cs_lembrete'), '1d', 'pendente: marco de 1 dia');
select is(public.reservar_lembrete_compra('cs_lembrete', '1d', now()), true, 'reservar 1 dia: primeira vez');
select is(public.reservar_lembrete_compra('cs_lembrete', '1d', now()), false, 'reservar 1 dia: segunda vez → false');
select is((select count(*) from public.compras_sem_conta_pendentes(now()) where stripe_session_id = 'cs_lembrete'), 0::bigint, 'depois de reservado: não volta a estar pendente');
select is((select marco from public.compras_sem_conta_pendentes(now() + interval '2 days') where stripe_session_id = 'cs_lembrete'), '3d', 'aos 3 dias: último lembrete');
select is(public.reservar_lembrete_compra('cs_lembrete', '3d', now() + interval '2 days'), true, 'reservar 3 dias: primeira vez');
select is(public.reservar_lembrete_compra('cs_lembrete', '3d', now() + interval '2 days'), false, 'reservar 3 dias: segunda vez → false');
select is(testes.tenta($$select public.reservar_lembrete_compra('cs_lembrete', '7d', now())$$), 'erro:22023', 'marco desconhecido → erro');

-- Compra ligada por /criar-conta: trigger resolve e deixa de haver lembretes.
update public.compras_sem_conta set lembrete_1d_em = null, lembrete_3d_em = null where stripe_session_id = 'cs_lembrete';
update public.stripe_payments set user_id = '00000000-0000-4000-c000-00000000000b' where stripe_session_id = 'cs_lembrete';
select is((select resolucao from public.compras_sem_conta where stripe_session_id = 'cs_lembrete'), 'conta_criada', 'pagamento ligado a uma conta → resolvida (conta_criada)');
select is((select count(*) from public.compras_sem_conta_pendentes(now() + interval '5 days')), 0::bigint, 'resolvida: sem lembretes');
select is(public.reservar_lembrete_compra('cs_lembrete', '3d', now() + interval '5 days'), false, 'resolvida: nenhum marco pode ser reservado');

-- ---------------------------------------------------------------------------
-- Admin: lê e só regista a resolução das duplicadas
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-c000-00000000000d');
select is(testes.contar('select * from public.subscricoes_duplicadas'), 1::bigint, 'admin: lê subscrições duplicadas');
select is(testes.contar('select * from public.compras_sem_conta'), 2::bigint, 'admin: lê compras sem conta');
select is(testes.tenta($$update public.subscricoes_duplicadas set subscricao_existente_id = 'sub_x'$$), 'erro:42501', 'admin: não altera os dados da duplicada');
select is(testes.tenta($$update public.subscricoes_duplicadas set estado = 'resolvida', resolvido_em = now() where nova_subscription_id = 'sub_4'$$), 'erro:23514', 'admin: resolver exige nota');
select is(testes.tenta($$update public.subscricoes_duplicadas set estado = 'resolvida', resolvido_em = now(), nota_resolucao = 'Cancelada no Stripe' where nova_subscription_id = 'sub_4'$$), 'ok:1', 'admin: regista a resolução');
select testes.como('00000000-0000-4000-c000-00000000000a');
select is(testes.tenta($$update public.subscricoes_duplicadas set estado = 'por_rever'$$), 'ok:0', 'cliente: não altera duplicadas (RLS)');
reset role;

select * from finish();
rollback;
