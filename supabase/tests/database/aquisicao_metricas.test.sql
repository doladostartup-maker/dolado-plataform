-- DoLado — painel Aquisição e Conversão (aquisicao_metricas)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: só o admin lê; sessões, documentos e contas contam-se em separado
-- (uma sessão com dois documentos é uma sessão); o período experimental e o
-- pagamento só contam se forem confirmados pela base de dados e depois do
-- diagnóstico; o pagamento a 0 € não conta; custos da IA por modelo e da
-- coorte. Transação revertida.

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-d200-00000000000a', 'aq-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-d200-00000000000b', 'aq-b@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-d200-00000000000f', 'aq-admin@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-d200-00000000000f';

-- Sessão 1 (Instagram): dois documentos, um concluído e visto, ligada à conta A.
-- Sessão 2 (directo): um documento falhado.
-- Sessão 3 (Google): concluído e visto, conta B, sem pagamento confirmado (0 €).
insert into public.diagnosticos_gratuitos
  (id, sessao_id, estado, motivo_falha, canal, utm_source, utm_campaign, setor, tipo_documento,
   carregado_em, analisado_em, visualizado_em, protecao_clicada_em, conta_id, created_at)
values
  ('00000000-0000-4000-d200-000000000101', '11111111-0000-4000-8000-000000000001', 'concluido', null, 'instagram', 'ig', 'out26', 'telecomunicacoes', 'fatura',
   now() - interval '2 days', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days', '00000000-0000-4000-d200-00000000000a', now() - interval '2 days'),
  ('00000000-0000-4000-d200-000000000102', '11111111-0000-4000-8000-000000000001', 'a_carregar', null, 'instagram', 'ig', 'out26', null, null,
   null, null, null, null, null, now() - interval '2 days'),
  ('00000000-0000-4000-d200-000000000103', '11111111-0000-4000-8000-000000000002', 'falhou', 'ilegivel', 'direto', null, null, null, null,
   now() - interval '1 day', null, null, null, null, now() - interval '1 day'),
  ('00000000-0000-4000-d200-000000000104', '11111111-0000-4000-8000-000000000003', 'concluido', null, 'google', null, null, 'eletricidade', 'fatura',
   now() - interval '1 day', now() - interval '1 day', now() - interval '1 day', null, '00000000-0000-4000-d200-00000000000b', now() - interval '1 day'),
  -- Fora do período: não conta.
  ('00000000-0000-4000-d200-000000000105', '11111111-0000-4000-8000-000000000004', 'concluido', null, 'google', null, null, 'gas', 'fatura',
   now() - interval '40 days', now() - interval '40 days', null, null, null, now() - interval '40 days');

insert into public.protecao_gratuita (user_id, inicio_em, termina_em, termos_versao, texto_aceite) values
  ('00000000-0000-4000-d200-00000000000a', now() - interval '1 day', now() + interval '29 days', 'teste', 'teste');

insert into public.stripe_payments (user_id, stripe_session_id, email, plano, valor_total_centimos, estado, created_at) values
  ('00000000-0000-4000-d200-00000000000a', 'cs_aq_1', 'aq-a@teste.invalid', 'avulso', 1199, 'concluido', now() - interval '1 hour'),
  ('00000000-0000-4000-d200-00000000000b', 'cs_aq_2', 'aq-b@teste.invalid', 'avulso', 0, 'concluido', now() - interval '1 hour');

insert into public.uso_api_claude (funcionalidade, diagnostico_id, modelo, tokens_entrada, tokens_saida, custo_estimado_usd, estado, created_at) values
  ('diagnostico_gratuito', '00000000-0000-4000-d200-000000000101', 'claude-haiku-5-5', 4000, 1000, 0.0009, 'sucesso', now() - interval '2 days'),
  ('diagnostico_gratuito', '00000000-0000-4000-d200-000000000103', 'claude-haiku-5-5', 3000, 500, 0.00055, 'sucesso', now() - interval '1 day'),
  ('monitor_fatura', null, 'claude-sonnet-5-5', 5000, 1500, 0.025, 'sucesso', now() - interval '1 day');

-- Funil da Protecção (23/10/2026): a sessão 1 entrou por /analisar-fatura e
-- abriu o checkout depois do diagnóstico; a conta B abriu um checkout antes
-- do diagnóstico (não conta).
update public.diagnosticos_gratuitos set pagina_entrada = '/analisar-fatura' where id = '00000000-0000-4000-d200-000000000101';
insert into public.consentimentos_compra (user_id, email, plano, tipo_compra, origem, termos_versao, privacidade_versao,
  consentimento_inicio_imediato_versao, texto_aceitacao_termos, texto_consentimento_inicio_imediato, aceitou_termos_em, pediu_inicio_imediato_em, created_at) values
  ('00000000-0000-4000-d200-00000000000a', 'aq-a@teste.invalid', 'protecao', 'subscricao', 'portal', 't', 'p', 'i', 'x', 'x', now(), now(), now() - interval '2 hours'),
  ('00000000-0000-4000-d200-00000000000b', 'aq-b@teste.invalid', 'protecao', 'subscricao', 'portal', 't', 'p', 'i', 'x', 'x', now(), now(), now() - interval '10 days');

-- ---------------------------------------------------------------------------
-- Só o admin
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-d200-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok($$ select public.aquisicao_metricas(now() - interval '7 days', now()) $$, 'P0001', null, 'Cliente não lê as métricas');
reset role;

set local role anon;
select throws_ok($$ select public.aquisicao_metricas(now() - interval '7 days', now()) $$, '42501', null, 'Visitante não chama a função');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-d200-00000000000f', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok($$ select public.aquisicao_metricas(now(), now() - interval '1 day') $$, 'P0001', null, 'Período invertido recusado');

create temp table m as select public.aquisicao_metricas(now() - interval '7 days', now() + interval '1 minute') as j;

-- ---------------------------------------------------------------------------
-- Unidades separadas
-- ---------------------------------------------------------------------------
select is((select (j -> 'sessoes' ->> 'iniciaram')::int from m), 3, 'Três sessões (a sessão com dois documentos conta uma vez)');
select is((select (j -> 'documentos' ->> 'reservados')::int from m), 4, 'Quatro documentos no período');
select is((select (j -> 'documentos' ->> 'carregados')::int from m), 3, 'Três carregados');
select is((select (j -> 'documentos' ->> 'concluidos')::int from m), 2, 'Dois concluídos');
select is((select (j -> 'documentos' ->> 'falhados')::int from m), 1, 'Um falhado');
select is((select (j -> 'documentos' -> 'falhas_por_motivo' ->> 'ilegivel')::int from m), 1, 'Motivo da falha');
select is((select (j -> 'sessoes' ->> 'viram')::int from m), 2, 'Duas sessões viram o diagnóstico');
select is((select (j -> 'sessoes' ->> 'clicaram_protecao')::int from m), 1, 'Um clique na Protecção');

-- ---------------------------------------------------------------------------
-- Conversões confirmadas
-- ---------------------------------------------------------------------------
select is((select (j -> 'contas' ->> 'criadas_ou_ligadas')::int from m), 2, 'Duas contas');
select is((select (j -> 'contas' ->> 'experimental')::int from m), 1, 'Um período experimental depois do diagnóstico');
select is((select (j -> 'contas' ->> 'pagas')::int from m), 1, 'Só o pagamento > 0 € conta como cliente pago');
select is((select (j -> 'contas' ->> 'checkout')::int from m), 1, 'Checkout aberto só depois do diagnóstico');
select is(
  (select jsonb_build_object('viram', x -> 'viram', 'clicaram', x -> 'clicaram_protecao', 'contas', x -> 'contas', 'checkout', x -> 'checkout', 'pagas', x -> 'pagas')
     from m, jsonb_array_elements(j -> 'funil_protecao') x where x ->> 'pagina' = '/analisar-fatura'),
  '{"viram": 1, "clicaram": 1, "contas": 1, "checkout": 1, "pagas": 1}'::jsonb,
  'Funil da Protecção por página de entrada');
select is(
  (select (x ->> 'clicaram_protecao')::int from m, jsonb_array_elements(j -> 'funil_protecao') x where x ->> 'pagina' = '—'),
  0, 'Sem página de entrada: sem clique na Protecção');

select is(
  (select (x ->> 'pagas')::int from m, jsonb_array_elements(j -> 'por_canal') x where x ->> 'canal' = 'instagram'),
  1, 'Cliente pago atribuído ao canal do primeiro diagnóstico');

-- ---------------------------------------------------------------------------
-- Custos
-- ---------------------------------------------------------------------------
select is((select (j -> 'ia' ->> 'gratuito_usd')::numeric from m), 0.00145, 'Custo das leituras gratuitas');
select is((select (j -> 'ia' ->> 'gratuito_falhado_usd')::numeric from m), 0.00055, 'Custo das leituras que acabaram em falha');
select is((select (j -> 'ia' ->> 'total_usd')::numeric from m), 0.02645, 'Custo total no período (todas as funcionalidades)');
select is(
  (select (x ->> 'chamadas')::int from m, jsonb_array_elements(j -> 'ia' -> 'por_modelo') x where x ->> 'modelo' = 'claude-haiku-5-5'),
  2, 'Chamadas por modelo');

select * from finish();
rollback;
