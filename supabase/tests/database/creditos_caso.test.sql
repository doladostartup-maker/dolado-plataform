-- DoLado — Casos disponíveis: Avulso por usar vs. casos da subscrição
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que um Avulso dá exatamente um caso e que um Avulso já usado,
-- convertido ou reembolsado nunca mais protege casos da subscrição do
-- congelamento nem volta ao saldo (20261001235000_creditos_avulso_disponiveis).
-- Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.tenta(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'erro:' || sqlstate;
end $$;

-- "case_credits/avulso_credits" da conta.
create function testes.saldo(uid uuid) returns text language sql as $$
  select case_credits || '/' || avulso_credits from public.user_access where user_id = uid;
$$;

create function testes.estado(p_origem text) returns text language sql as $$
  select estado from public.case_credit_grants where origem = p_origem;
$$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Dados: uma conta por cenário (u1 … u9), todas sem casos de início.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select ('00000000-0000-4000-c000-00000000000' || i)::uuid, 'u' || i || '@teste.invalid', 'authenticated', 'authenticated',
       json_build_object('nome', 'U' || i)::jsonb
  from generate_series(1, 9) i;

insert into public.user_access (user_id, subscription_plan, subscription_status)
select ('00000000-0000-4000-c000-00000000000' || i)::uuid, 'caso_protecao', 'active'
  from generate_series(1, 9) i;

-- ===========================================================================
-- 0. Estrutura e privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.consumir_credito_caso(uuid)', 'EXECUTE'), 'consumir_credito_caso: não executável por authenticated');
select ok(not has_function_privilege('authenticated', 'public.devolver_credito_caso(uuid, text)', 'EXECUTE'), 'devolver_credito_caso: não executável por authenticated');
select ok(not has_function_privilege('authenticated', 'public.retirar_credito_avulso(text, text)', 'EXECUTE'), 'retirar_credito_avulso: não executável por authenticated');
select ok(not has_function_privilege('anon', 'public.retirar_credito_avulso(text, text)', 'EXECUTE'), 'retirar_credito_avulso: não executável por anon');
select ok(has_function_privilege('service_role', 'public.retirar_credito_avulso(text, text)', 'EXECUTE'), 'retirar_credito_avulso: executável pelo servidor');
select ok((select bool_and(not prosecdef and 'search_path=""' = any (proconfig)) from pg_proc
            where proname in ('consumir_credito_caso', 'devolver_credito_caso', 'retirar_credito_avulso', 'conceder_credito_caso', 'congelar_creditos_caso')),
          'funções de casos: SECURITY INVOKER e search_path fixo');

set local role service_role;

-- ===========================================================================
-- 1. Avulso usado + 3 casos da subscrição (o bug original)
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000001', 'checkout:cs_u1', null);
select is(public.consumir_credito_caso('00000000-0000-4000-c000-000000000001'), 'checkout:cs_u1', '1: sem casos da subscrição, gasta o Avulso');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000001', 'invoice:u1_' || i, 4) from generate_series(1, 3) i;
reset role;
update public.user_access set stripe_subscription_id = 'sub_u1' where user_id = '00000000-0000-4000-c000-000000000001';
set local role service_role;
select is(testes.saldo('00000000-0000-4000-c000-000000000001'), '3/0', '1: antes do fim, 3 utilizáveis (nenhum Avulso)');
select is(public.congelar_creditos_caso('sub_u1', now(), 90), 3, '1: o fim congela os 3 casos da subscrição');
select is(testes.saldo('00000000-0000-4000-c000-000000000001'), '0/0', '1: depois do fim, 0 utilizáveis — o Avulso usado já não protege nada');
select is((select quantidade from public.case_credit_freezes where stripe_subscription_id = 'sub_u1'), 3, '1: 3 congelados');

-- ===========================================================================
-- 2. Avulso por usar + 2 casos da subscrição
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000002', 'checkout:cs_u2', null);
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000002', 'invoice:u2_' || i, 4) from generate_series(1, 2) i;
reset role;
update public.user_access set stripe_subscription_id = 'sub_u2' where user_id = '00000000-0000-4000-c000-000000000002';
set local role service_role;
select is(testes.saldo('00000000-0000-4000-c000-000000000002'), '3/1', '2: 3 utilizáveis, 1 deles Avulso');
select is(public.congelar_creditos_caso('sub_u2', now(), 90), 2, '2: 2 congelados');
select is(testes.saldo('00000000-0000-4000-c000-000000000002'), '1/1', '2: fica 1 utilizável e é o Avulso');
select is(testes.estado('checkout:cs_u2'), 'disponivel', '2: o Avulso continua disponível');

-- ===========================================================================
-- 3. 2 Avulsos (1 já usado) + casos da subscrição
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000003', 'checkout:cs_u3_a', null);
select public.consumir_credito_caso('00000000-0000-4000-c000-000000000003');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000003', 'checkout:cs_u3_b', null);
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000003', 'invoice:u3_' || i, 4) from generate_series(1, 3) i;
reset role;
update public.user_access set stripe_subscription_id = 'sub_u3' where user_id = '00000000-0000-4000-c000-000000000003';
set local role service_role;
select is(testes.saldo('00000000-0000-4000-c000-000000000003'), '4/1', '3: 4 utilizáveis, só 1 Avulso por usar');
select is(public.congelar_creditos_caso('sub_u3', now(), 90), 3, '3: congela os 3 da subscrição');
select is(testes.saldo('00000000-0000-4000-c000-000000000003'), '1/1', '3: só o Avulso por usar fica fora do congelamento');
select is(testes.estado('checkout:cs_u3_a'), 'consumido', '3: o Avulso usado continua consumido');

-- ===========================================================================
-- 4/5. Ordem de consumo: subscrição primeiro, Avulso depois
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000004', 'checkout:cs_u4', null);
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000004', 'invoice:u4_' || i, 4) from generate_series(1, 2) i;
select is(public.consumir_credito_caso('00000000-0000-4000-c000-000000000004'), 'subscricao', '4: com Avulso + subscrição, gasta a subscrição');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '2/1', '4: avulso_credits inalterado');
select is(public.consumir_credito_caso('00000000-0000-4000-c000-000000000004'), 'subscricao', '4: continua a gastar a subscrição');
select is(public.consumir_credito_caso('00000000-0000-4000-c000-000000000004'), 'checkout:cs_u4', '5: sem casos da subscrição, gasta o Avulso');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '0/0', '5: case_credits e avulso_credits descem juntos');
select is(testes.estado('checkout:cs_u4'), 'consumido', '5: o Avulso fica consumido');
select is(public.consumir_credito_caso('00000000-0000-4000-c000-000000000004'), null::text, '5: sem casos, não gasta nada');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '0/0', '5: nunca abaixo de zero');

-- ===========================================================================
-- 6. Devolver repõe exatamente o tipo gasto
-- ===========================================================================
select public.devolver_credito_caso('00000000-0000-4000-c000-000000000004', 'checkout:cs_u4');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '1/1', '6: o Avulso volta como Avulso');
select is(testes.estado('checkout:cs_u4'), 'disponivel', '6: e volta a estar disponível');
select public.devolver_credito_caso('00000000-0000-4000-c000-000000000004', 'subscricao');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '2/1', '6: o caso da subscrição volta como subscrição');
select public.devolver_credito_caso('00000000-0000-4000-c000-000000000004', 'checkout:cs_u4');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '2/1', '6: devolver um Avulso que não estava gasto não cria nada');

-- converter_pedido_em_caso usa a mesma regra (sem subtração própria).
reset role;
insert into public.pedidos_caso (id, user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em) values
  ('30000000-0000-4000-c000-000000000001', '00000000-0000-4000-c000-000000000004', 'hash_u4_1', 'U4', 'Energia', 'EDP', 'Outro', 'Ainda não reclamei', true, now()),
  ('30000000-0000-4000-c000-000000000002', '00000000-0000-4000-c000-000000000004', 'hash_u4_2', 'U4', 'Energia', 'EDP', 'Outro', 'Ainda não reclamei', true, now());
set local role service_role;
select isnt(public.converter_pedido_em_caso('30000000-0000-4000-c000-000000000001', '00000000-0000-4000-c000-000000000004'), null::uuid, 'pedido: cria o caso');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '1/1', 'pedido: gastou o caso da subscrição, o Avulso fica');
select isnt(public.converter_pedido_em_caso('30000000-0000-4000-c000-000000000002', '00000000-0000-4000-c000-000000000004'), null::uuid, 'pedido: segundo caso');
select is(testes.saldo('00000000-0000-4000-c000-000000000004'), '0/0', 'pedido: sem subscrição, gastou o Avulso');

-- ===========================================================================
-- 7. Conversão de um Avulso por usar
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000005', 'checkout:cs_u5', null);
select is(public.retirar_credito_avulso('checkout:cs_u5', 'convertido'), 'retirado', '7: o Avulso convertido sai do saldo');
select is(testes.saldo('00000000-0000-4000-c000-000000000005'), '0/0', '7: já não fica disponível');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000005', 'invoice:u5_1', 4);
select is(testes.saldo('00000000-0000-4000-c000-000000000005'), '1/0', '7: só o caso do 1.º ciclo — sem duplicação');
select is(public.retirar_credito_avulso('checkout:cs_u5', 'convertido'), 'convertido', '7: repetido não retira outra vez');
select is(testes.saldo('00000000-0000-4000-c000-000000000005'), '1/0', '7: saldo intacto no reenvio');

-- ===========================================================================
-- 8. Avulso já usado não é convertível
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000006', 'checkout:cs_u6', null);
select public.consumir_credito_caso('00000000-0000-4000-c000-000000000006');
select is(public.retirar_credito_avulso('checkout:cs_u6', 'convertido'), 'consumido', '8: Avulso usado → consumido (o webhook não reembolsa)');
select is(testes.saldo('00000000-0000-4000-c000-000000000006'), '0/0', '8: sem saldo negativo');
select is(testes.estado('checkout:cs_u6'), 'consumido', '8: continua consumido (não passa a convertido)');
select is(public.retirar_credito_avulso('checkout:cs_inexistente', 'convertido'), 'sem_credito', '8: compra que nunca deu crédito');

-- ===========================================================================
-- 9. Reembolso de um Avulso
-- ===========================================================================
reset role;
insert into public.stripe_payments (user_id, stripe_session_id, email, plano, estado) values
  ('00000000-0000-4000-c000-000000000007', 'cs_u7', 'u7@teste.invalid', 'avulso', 'concluido'),
  ('00000000-0000-4000-c000-000000000007', 'cs_u7_antes', 'u7@teste.invalid', 'avulso', 'reembolsado');
set local role service_role;
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000007', 'checkout:cs_u7', null);
select is(public.retirar_credito_avulso('checkout:cs_u7', 'reembolsado'), 'retirado', '9: Avulso por usar reembolsado sai do saldo');
select is(testes.saldo('00000000-0000-4000-c000-000000000007'), '0/0', '9: removido');
select is(public.retirar_credito_avulso('checkout:cs_u7', 'reembolsado'), 'reembolsado', '9: repetido não mexe');
select is(public.conceder_credito_caso('00000000-0000-4000-c000-000000000007', 'checkout:cs_u7_antes', null), false, '9: pagamento reembolsado nunca dá crédito');
select is(testes.saldo('00000000-0000-4000-c000-000000000007'), '0/0', '9: saldo intacto');
reset role;
update public.stripe_payments set estado = 'concluido' where stripe_session_id = 'cs_u7_antes';
select is((select estado from public.stripe_payments where stripe_session_id = 'cs_u7_antes'), 'reembolsado', '9: reembolsado é final (um upsert não o volta a pôr concluído)');
set local role service_role;

-- ===========================================================================
-- 10. Ciclo subscrever → acumular → terminar → voltar → terminar
-- ===========================================================================
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000008', 'checkout:cs_u8', null);
select public.consumir_credito_caso('00000000-0000-4000-c000-000000000008');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000008', 'invoice:u8_a' || i, 4) from generate_series(1, 3) i;
reset role;
update public.user_access set stripe_subscription_id = 'sub_u8_a' where user_id = '00000000-0000-4000-c000-000000000008';
set local role service_role;
select is(public.congelar_creditos_caso('sub_u8_a', now(), 90), 3, '10: 1.º fim congela os 3');
select is(testes.saldo('00000000-0000-4000-c000-000000000008'), '0/0', '10: nada utilizável sem subscrição');
reset role;
update public.user_access set stripe_subscription_id = 'sub_u8_b' where user_id = '00000000-0000-4000-c000-000000000008';
set local role service_role;
select is(public.restaurar_creditos_caso('sub_u8_b', now() + interval '10 days', 4), 3, '10: volta nos 90 dias e recupera os 3');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000008', 'invoice:u8_b1', 4);
select is(testes.saldo('00000000-0000-4000-c000-000000000008'), '4/0', '10: 4 casos da subscrição');
select is(public.congelar_creditos_caso('sub_u8_b', now() + interval '20 days', 90), 4, '10: 2.º fim congela os 4');
select is(testes.saldo('00000000-0000-4000-c000-000000000008'), '0/0', '10: nenhum caso da subscrição escapa');

-- ===========================================================================
-- 11. Constraints
-- ===========================================================================
reset role;
select is(testes.tenta($$update public.user_access set avulso_credits = -1 where user_id = '00000000-0000-4000-c000-000000000002'$$), 'erro:23514', '11: avulso_credits < 0 rejeitado');
select is(testes.tenta($$update public.user_access set avulso_credits = case_credits + 1 where user_id = '00000000-0000-4000-c000-000000000002'$$), 'erro:23514', '11: avulso_credits > case_credits rejeitado');
select is(testes.tenta($$update public.user_access set case_credits = 0 where user_id = '00000000-0000-4000-c000-000000000002'$$), 'erro:23514', '11: case_credits abaixo de avulso_credits rejeitado');
select is(testes.tenta($$insert into public.case_credit_grants (origem, user_id, quantidade) values ('checkout:cs_sem_estado', '00000000-0000-4000-c000-000000000002', 1)$$), 'erro:23514', '11: compra Avulso sem estado rejeitada');
select is(testes.tenta($$insert into public.case_credit_grants (origem, user_id, quantidade, estado) values ('invoice:com_estado', '00000000-0000-4000-c000-000000000002', 1, 'disponivel')$$), 'erro:23514', '11: caso da subscrição com estado Avulso rejeitado');

-- ===========================================================================
-- 12. Limite de 4 (regra inalterada)
-- ===========================================================================
set local role service_role;
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000009', 'invoice:u9_' || i, 4) from generate_series(1, 6) i;
select is(testes.saldo('00000000-0000-4000-c000-000000000009'), '4/0', '12: casos mensais acumulam até 4');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000009', 'checkout:cs_u9', null);
select is(testes.saldo('00000000-0000-4000-c000-000000000009'), '5/1', '12: Avulso soma-se sem limite de 4');
select public.conceder_credito_caso('00000000-0000-4000-c000-000000000009', 'invoice:u9_7', 4);
select is(testes.saldo('00000000-0000-4000-c000-000000000009'), '5/1', '12: acima do limite, o caso mensal não sobe nem retira');

-- Invariante final: avulso_credits = compras Avulso disponíveis, em todas as contas.
reset role;
select is(
  (select count(*) from public.user_access a
    where a.avulso_credits <> (select count(*) from public.case_credit_grants g where g.user_id = a.user_id and g.estado = 'disponivel')),
  0::bigint, 'invariante: avulso_credits = compras Avulso disponíveis');

select * from finish();
rollback;
