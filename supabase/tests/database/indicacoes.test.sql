-- DoLado — Programa de indicação (20261007090000_programa_indicacoes.sql).
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: o cliente só lê o próprio código e os próprios descontos (sem
-- dados de terceiros) e não escreve nada; o código não muda; a atribuição
-- recusa auto-indicação, contas já clientes, visitas expiradas e uma segunda
-- atribuição; a primeira compra dá uma única recompensa (idempotente), nunca
-- a 0 €, nunca com o mesmo Customer Stripe, e "em_revisao" com sinal de
-- suspeita; uma cobrança usa no máximo um desconto; 3 descontos = 3
-- cobranças; reembolso reverte e anula o desconto por usar.
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

-- A: quem indica (Customer cus_a). B, C, E: indicados. D: admin. F: já cliente.
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-d000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-d000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"B"}'),
  ('00000000-0000-4000-d000-00000000000c', 'c@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"C"}'),
  ('00000000-0000-4000-d000-00000000000d', 'd@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"D"}'),
  ('00000000-0000-4000-d000-00000000000e', 'e@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"E"}'),
  ('00000000-0000-4000-d000-00000000000f', 'f@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"F"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-d000-00000000000d';
insert into public.user_access (user_id, stripe_customer_id) values ('00000000-0000-4000-d000-00000000000a', 'cus_a');

insert into public.indicacoes_codigos (user_id, codigo) values
  ('00000000-0000-4000-d000-00000000000a', 'AAAA2222'),
  ('00000000-0000-4000-d000-00000000000b', 'BBBB3333');
insert into public.indicacoes_visitas (id, codigo, criado_em) values
  ('10000000-0000-4000-a000-000000000001', 'AAAA2222', now() - interval '1 day'),
  ('10000000-0000-4000-a000-000000000002', 'AAAA2222', now() - interval '31 days'),
  ('10000000-0000-4000-a000-000000000003', 'BBBB3333', now());

-- F já é cliente (compra confirmada).
insert into public.stripe_payments (stripe_session_id, user_id, email, plano, estado)
values ('cs_f_antiga', '00000000-0000-4000-d000-00000000000f', 'f@teste.invalid', 'avulso', 'concluido');

-- ---------------------------------------------------------------------------
-- Código: formato e imutabilidade
-- ---------------------------------------------------------------------------
select is(testes.tenta($$insert into public.indicacoes_codigos (user_id, codigo) values ('00000000-0000-4000-d000-00000000000c', 'abc')$$), 'erro:23514', 'código: formato inválido recusado');
select is(testes.tenta($$update public.indicacoes_codigos set codigo = 'ZZZZ9999' where codigo = 'AAAA2222'$$), 'erro:42501', 'código: nunca muda (mesmo para a service role)');

-- ---------------------------------------------------------------------------
-- Atribuição
-- ---------------------------------------------------------------------------
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000a', '10000000-0000-4000-a000-000000000001'), 'auto_indicacao', 'atribuir: o próprio link → auto_indicacao');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000c', '10000000-0000-4000-a000-000000000002'), 'expirada', 'atribuir: visita com mais de 30 dias → expirada');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000f', '10000000-0000-4000-a000-000000000001'), 'ja_cliente', 'atribuir: conta já cliente → recusada');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000c', '99999999-0000-4000-a000-000000000009'), 'visita_invalida', 'atribuir: visita inexistente');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000b', '10000000-0000-4000-a000-000000000001'), 'atribuida', 'atribuir: B pelo link de A');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000b', '10000000-0000-4000-a000-000000000003'), 'ja_atribuida', 'atribuir: uma segunda vez (outro link) → não muda');
select is((select referrer_user_id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000b'), '00000000-0000-4000-d000-00000000000a'::uuid, 'a primeira atribuição fica');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000c', '10000000-0000-4000-a000-000000000001'), 'atribuida', 'atribuir: C pelo link de A');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-00000000000e', '10000000-0000-4000-a000-000000000001'), 'atribuida', 'atribuir: E pelo link de A');
select is(testes.tenta($$insert into public.indicacoes (referrer_user_id, referred_user_id, codigo, visitado_em) values ('00000000-0000-4000-d000-00000000000a', '00000000-0000-4000-d000-00000000000a', 'AAAA2222', now())$$), 'erro:23514', 'auto-indicação recusada pela tabela');

-- ---------------------------------------------------------------------------
-- Cliente e anon: só leitura dos próprios dados, sem escrita nem funções
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-d000-00000000000b');
select is(testes.contar('select * from public.indicacoes_codigos'), 1::bigint, 'cliente: lê só o próprio código');
select is(testes.contar('select * from public.indicacoes'), 0::bigint, 'cliente: não lê indicações (quem indicou / quem foi indicado)');
select is(testes.contar('select * from public.indicacoes_visitas'), 0::bigint, 'cliente: não lê visitas');
select is(testes.tenta($$insert into public.indicacoes_codigos (user_id, codigo) values ('00000000-0000-4000-d000-00000000000c', 'CCCC4444')$$), 'erro:42501', 'cliente: não cria códigos');
select is(testes.tenta($$update public.indicacoes set referrer_user_id = '00000000-0000-4000-d000-00000000000d'$$), 'erro:42501', 'cliente: não muda quem o indicou');
select is(testes.tenta($$insert into public.indicacoes_recompensas (user_id, indicacao_id, estado) select '00000000-0000-4000-d000-00000000000b', id, 'disponivel' from public.indicacoes limit 1$$), 'erro:42501', 'cliente: não cria descontos');
select is(testes.tenta($$select public.indicacao_atribuir('00000000-0000-4000-d000-00000000000b', '10000000-0000-4000-a000-000000000001')$$), 'erro:42501', 'cliente: não atribui pela API');
select is(testes.tenta($$select public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000b', 'checkout:x', null)$$), 'erro:42501', 'cliente: não reserva descontos');
select is(testes.tenta($$select public.indicacoes_metricas()$$), 'erro:42501', 'cliente: não lê métricas');
select testes.como(null);
select is(testes.contar('select * from public.indicacoes_codigos'), -1::bigint, 'anon: sem permissão para ler códigos');
select is(testes.tenta($$select public.indicacao_confirmar_compra('00000000-0000-4000-d000-00000000000b', 'cs_x', 'avulso', 1499, 0, false, null, null, null, null)$$), 'erro:42501', 'anon: não confirma compras');
reset role;

-- ---------------------------------------------------------------------------
-- Primeira compra
-- ---------------------------------------------------------------------------
insert into public.stripe_payments (stripe_session_id, user_id, email, plano, estado)
values ('cs_b1', '00000000-0000-4000-d000-00000000000b', 'b@teste.invalid', 'avulso', 'concluido');
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-00000000000b', 'cs_b1', 'avulso', 1199, 300, true, 'cus_b', null, 'pi_b1', null)->>'resultado', 'recompensa_disponivel', 'B paga → 1 desconto para A');
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-00000000000b', 'cs_b1', 'avulso', 1199, 300, true, 'cus_b', null, 'pi_b1', null)->>'resultado', 'ja_registada', 'webhook duplicado → idempotente');
insert into public.stripe_payments (stripe_session_id, user_id, email, plano, estado)
values ('cs_b2', '00000000-0000-4000-d000-00000000000b', 'b@teste.invalid', 'avulso', 'concluido');
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-00000000000b', 'cs_b2', 'avulso', 1499, 0, false, 'cus_b', null, 'pi_b2', null)->>'resultado', 'nao_primeira_compra', 'segunda compra de B → sem nova recompensa');
select is((select count(*) from public.indicacoes_recompensas where user_id = '00000000-0000-4000-d000-00000000000a'), 1::bigint, 'A tem 1 desconto');
select is(testes.tenta($$update public.indicacoes set compra_session_id = 'cs_outra' where referred_user_id = '00000000-0000-4000-d000-00000000000c'$$), 'erro:23514', 'indicação registada não pode ter compra sem decisão');

-- Mesmo Customer Stripe de quem indicou → rejeitada.
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-00000000000c', 'cs_c1', 'protecao', 399, 100, true, 'cus_a', 'sub_c', 'pi_c1', null)->>'resultado', 'rejeitada_mesmo_cliente_stripe', 'mesmo Customer de A → rejeitada');
select is((select count(*) from public.indicacoes_recompensas where indicacao_id = (select id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000c')), 0::bigint, 'sem recompensa para a auto-indicação');

-- Sinal de suspeita → em revisão; o admin decide.
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-00000000000e', 'cs_e1', 'caso_protecao', 799, 0, false, 'cus_e', 'sub_e', 'pi_e1', 'mesmo_meio_de_pagamento')->>'resultado', 'recompensa_em_revisao', 'Caso + Proteção com o mesmo cartão → em revisão');
select is(public.indicacao_rever_recompensa((select id from public.indicacoes_recompensas where estado = 'em_revisao'), true, 'verificado'), true, 'admin aprova → disponível');
select is(public.indicacao_rever_recompensa((select id from public.indicacoes_recompensas where motivo = 'verificado'), true, 'x'), false, 'decisão só uma vez');

-- 0 € não recompensa (novo indicado F2 por C).
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-d000-000000000010', 'g@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"G"}');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-000000000010', '10000000-0000-4000-a000-000000000003'), 'atribuida', 'G pelo link de B');
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-000000000010', 'cs_g1', 'caso_protecao', 0, 799, false, 'cus_g', 'sub_g', null, null)->>'resultado', 'rejeitada_compra_sem_pagamento', 'cupão de 100% (0 €) → sem recompensa');

-- ---------------------------------------------------------------------------
-- Reserva e uso: um desconto por cobrança; 2 descontos = 2 cobranças
-- ---------------------------------------------------------------------------
select is((select count(*) from public.indicacoes_recompensas where user_id = '00000000-0000-4000-d000-00000000000a' and estado = 'disponivel'), 2::bigint, 'A tem 2 descontos disponíveis');
-- Ordem explícita (numa transação, now() é igual para todos): o de B é o mais antigo.
update public.indicacoes_recompensas set criado_em = now() - interval '2 days'
 where indicacao_id = (select id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000b');
update public.indicacoes_recompensas set criado_em = now() - interval '1 day'
 where indicacao_id = (select id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000e');
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'subscricao:sub_a', null),
          (select id from public.indicacoes_recompensas where indicacao_id = (select id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000b')),
          'reserva o mais antigo (o de B) para a próxima mensalidade');
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'subscricao:sub_a', null),
          (select id from public.indicacoes_recompensas where reserva_origem = 'subscricao:sub_a'), 'mesma origem → mesma reserva (nunca duas na mesma cobrança)');
select is((select count(*) from public.indicacoes_recompensas where estado = 'reservada'), 1::bigint, 'só 1 reservado');
select is(testes.tenta($$update public.indicacoes_recompensas set estado = 'reservada', reserva_origem = 'subscricao:sub_a', reservada_em = now() where user_id = '00000000-0000-4000-d000-00000000000a' and estado = 'disponivel'$$), 'erro:23505', 'a base de dados recusa 2 descontos reservados para a mesma cobrança');
select is(public.indicacao_usar_recompensa((select id from public.indicacoes_recompensas where reserva_origem = 'subscricao:sub_a'), '00000000-0000-4000-d000-00000000000a', 'invoice:in_1', 100), 'usada', 'fatura paga → usado');
select is(public.indicacao_usar_recompensa((select id from public.indicacoes_recompensas where usada_origem = 'invoice:in_1'), '00000000-0000-4000-d000-00000000000a', 'invoice:in_1', 100), 'ja_usada', 'reenvio → idempotente');
select is(public.indicacao_usar_recompensa((select id from public.indicacoes_recompensas where user_id = '00000000-0000-4000-d000-00000000000a' and estado = 'disponivel'), '00000000-0000-4000-d000-00000000000a', 'invoice:in_1', 100), 'cobranca_ja_com_desconto', 'segundo desconto na mesma cobrança → recusado (nunca 40%)');
select is(public.indicacao_usar_recompensa((select id from public.indicacoes_recompensas where user_id = '00000000-0000-4000-d000-00000000000a' and estado = 'disponivel'), '00000000-0000-4000-d000-00000000000b', 'invoice:in_2', 100), 'inexistente', 'desconto de outra conta → recusado');
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'checkout:cs_a2', now() + interval '70 minutes') is not null, true, 'reserva o segundo para um Checkout Avulso');
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'checkout:cs_a3', now() + interval '70 minutes'), null, 'sem mais descontos → nada');
select is(public.indicacao_libertar_reserva('checkout:cs_a2'), 1, 'pagamento falhado → desconto volta');
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'checkout:cs_a4', now() - interval '1 minute') is not null, true, 'reserva (já expirada)');
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'checkout:cs_a5', now() + interval '70 minutes') is not null, true, 'reserva expirada volta a poder ser usada');

-- ---------------------------------------------------------------------------
-- Reembolso integral: reverte e anula o desconto por usar
-- ---------------------------------------------------------------------------
select is(public.indicacao_reverter_compra(null, 'pi_e1', 'reembolso_integral')->>'resultado', 'revertida', 'reembolso da 1.ª compra de E → revertida');
select is((select estado from public.indicacoes_recompensas where indicacao_id = (select id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000e')), 'anulada', 'desconto de E (reservado para cs_a5) anulado');
select is(public.indicacao_reverter_compra(null, 'pi_e1', 'reembolso_integral')->>'resultado', 'ja_revertida', 'reembolso repetido → idempotente');
select is(public.indicacao_reverter_compra(null, 'pi_b1', 'disputa')->>'resultado', 'revertida_recompensa_ja_usada', 'desconto já usado → não é tocado');
select is(public.indicacao_reverter_compra(null, 'pi_inexistente', 'disputa')->>'resultado', 'sem_indicacao', 'pagamento sem indicação → nada');

-- ---------------------------------------------------------------------------
-- Cliente vê os próprios descontos (só estado e datas); admin vê métricas
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-d000-00000000000a');
select is(testes.contar('select id, estado, criado_em, usada_em from public.indicacoes_recompensas'), 2::bigint, 'A lê os próprios 2 descontos');
select is(testes.contar('select indicacao_id from public.indicacoes_recompensas'), -1::bigint, 'A não lê a indicação de cada desconto');
select is(testes.contar('select usada_origem from public.indicacoes_recompensas'), -1::bigint, 'A não lê as origens Stripe');
select testes.como('00000000-0000-4000-d000-00000000000b');
select is(testes.contar('select id from public.indicacoes_recompensas'), 0::bigint, 'B não lê os descontos de A');
select testes.como('00000000-0000-4000-d000-00000000000d');
select is((public.indicacoes_metricas()->>'compras')::int, 0, 'admin: métricas — compras confirmadas e não revertidas');
select is((public.indicacoes_metricas()->>'compras_revertidas')::int, 2, 'admin: métricas — revertidas');
select is((public.indicacoes_metricas()->>'recompensas_usadas')::int, 1, 'admin: métricas — descontos usados');
select is((public.indicacoes_metricas()->>'visitas')::int, 3, 'admin: visitas');
reset role;

-- ---------------------------------------------------------------------------
-- Validade de 12 meses, expiração automática e auditoria
-- ---------------------------------------------------------------------------
select ok((select expira_em between now() + interval '12 months' - interval '1 minute' and now() + interval '12 months'
             from public.indicacoes_recompensas
            where indicacao_id = (select id from public.indicacoes where referred_user_id = '00000000-0000-4000-d000-00000000000e')),
          'aprovado na revisão → válido 12 meses a partir da aprovação');
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-d000-000000000011', 'h@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"H"}');
select is(public.indicacao_atribuir('00000000-0000-4000-d000-000000000011', '10000000-0000-4000-a000-000000000001'), 'atribuida', 'H pelo link de A');
select is(public.indicacao_confirmar_compra('00000000-0000-4000-d000-000000000011', 'cs_h1', 'avulso', 1199, 300, true, 'cus_h', null, 'pi_h1', null)->>'resultado', 'recompensa_disponivel', 'H paga → novo desconto para A');
create temp table rec_h as
  select r.id from public.indicacoes_recompensas r join public.indicacoes i on i.id = r.indicacao_id
   where i.referred_user_id = '00000000-0000-4000-d000-000000000011';
grant select on rec_h to authenticated;
select ok((select disponivel_desde = now() and expira_em = now() + interval '12 months' from public.indicacoes_recompensas where id = (select id from rec_h)),
          'disponível agora, válido 12 meses');

-- Passa a validade (simulado): deixa de poder ser reservado ou usado.
update public.indicacoes_recompensas set disponivel_desde = now() - interval '13 months', expira_em = now() - interval '1 month'
 where id = (select id from rec_h);
select is(public.indicacao_reservar_recompensa('00000000-0000-4000-d000-00000000000a', 'checkout:cs_a9', now() + interval '70 minutes'), null, 'desconto expirado não é reservado');
select is(public.indicacao_usar_recompensa((select id from rec_h), '00000000-0000-4000-d000-00000000000a', 'checkout:cs_a9', 300), 'expirada', 'desconto expirado não é usado');
select ok(public.indicacoes_expirar_recompensas() >= 1, 'expiração automática');
select is((select estado from public.indicacoes_recompensas where id = (select id from rec_h)), 'expirada', 'estado expirada');
select is((select motivo from public.indicacoes_recompensas where id = (select id from rec_h)), 'validade_12_meses', 'motivo registado');
select is(public.indicacoes_expirar_recompensas(), 0, 'expirar de novo → nada (idempotente)');
select is((select array_agg(estado_novo order by id) from public.indicacoes_recompensas_historico where recompensa_id = (select id from rec_h)),
          array['disponivel', 'expirada'], 'histórico auditável: criação e expiração');
select is(testes.tenta($$update public.indicacoes_recompensas_historico set estado_novo = 'usada'$$), 'erro:42501', 'histórico: só inserção');
select is(testes.tenta($$delete from public.indicacoes_recompensas_historico$$), 'erro:42501', 'histórico: não se apaga');
select is((select count(*) from cron.job where jobname = 'indicacoes-expirar-recompensas'), 1::bigint, 'job diário de expiração agendado');
-- Uma reserva ativa numa subscrição (próxima mensalidade) é honrada, mesmo que a validade passe entretanto.
select is((select count(*) from public.indicacoes_recompensas where estado = 'reservada' and reserva_expira_em is null and expira_em <= now()), 0::bigint, 'sem reservas de subscrição expiradas por engano');

select testes.como('00000000-0000-4000-d000-00000000000a');
select is(testes.contar('select expira_em, expirada_em from public.indicacoes_recompensas'), 3::bigint, 'A lê a validade dos próprios descontos');
select is(testes.contar('select * from public.indicacoes_recompensas_historico'), 0::bigint, 'A não lê o histórico de auditoria');
select testes.como('00000000-0000-4000-d000-00000000000d');
select is((public.indicacoes_metricas()->>'recompensas_expiradas')::int, 1, 'admin: métricas — expirados');
reset role;

select * from finish();
rollback;
