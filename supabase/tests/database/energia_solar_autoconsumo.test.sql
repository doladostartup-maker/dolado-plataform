-- DoLado — Energia Solar / Autoconsumo (20261013100000_energia_solar_autoconsumo.sql)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: detalhes_caso só aceita as chaves e valores das listas fechadas
-- (pedidos_caso e casos); converter_pedido_em_caso() copia as respostas para
-- o caso; o cliente lê as do próprio caso e não as altera; as 17 regras novas
-- entram inativas e por rever, sem tocar nas existentes. A seleção com as
-- regras reais está em src/lib/rascunhoIA/autoconsumo.test.mjs. Tudo numa
-- transação revertida.

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

-- ===========================================================================
-- 1. detalhes_caso_valido
-- ===========================================================================
select ok(public.detalhes_caso_valido(null), 'null é válido (casos que não são de painéis solares)');
select ok(public.detalhes_caso_valido('{"forma_contratacao":"domicilio","financiamento":"sim_com_compra","tipo_contrato_solar":"caer"}'), 'respostas completas');
select ok(public.detalhes_caso_valido('{"financiamento":"nao_sei"}'), 'respostas parciais');
select ok(not public.detalhes_caso_valido('{"forma_contratacao":"porta a porta"}'), 'valor fora da lista');
select ok(not public.detalhes_caso_valido('{"nif":"123456789"}'), 'chave fora da lista (nunca dados pessoais)');
select ok(not public.detalhes_caso_valido('{"financiamento":1}'), 'valor que não é texto da lista');
select ok(not public.detalhes_caso_valido('["domicilio"]'), 'só objeto');

-- ===========================================================================
-- 2. Pedido → caso (caminho de sempre)
-- ===========================================================================
insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-f000-00000000005a', 'solar-a@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"Solar A"}'),
  ('00000000-0000-4000-f000-00000000005b', 'solar-b@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"Solar B"}');

insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits) values
  ('00000000-0000-4000-f000-00000000005a', 'none', null, 1),
  ('00000000-0000-4000-f000-00000000005b', 'none', null, 1);

select throws_ok($$
  insert into public.pedidos_caso (user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em, detalhes_caso)
  values ('00000000-0000-4000-f000-00000000005a', 'hash_solar_x', 'Solar A', 'Energia', 'Solar X', 'Painéis solares: instalação, avaria ou garantia',
          'Ainda não reclamei', true, now(), '{"forma_contratacao":"rua"}')
$$, '23514', null, 'pedido com resposta inválida é recusado');

insert into public.pedidos_caso (id, user_id, token_hash, nome, sector, empresa, problema_tipo, momento_cliente, autorizacao, pedido_confirmado_em, detalhes_caso) values
  ('31000000-0000-4000-f000-00000000005a', '00000000-0000-4000-f000-00000000005a', 'hash_solar_a', 'Solar A', 'Energia', 'Solar X',
   'Painéis solares: contrato, cancelamento ou promessa comercial', 'Ainda não reclamei', true, now(),
   '{"forma_contratacao":"domicilio","financiamento":"sim_com_compra","tipo_contrato_solar":"compra_instalacao"}'),
  ('31000000-0000-4000-f000-00000000005b', '00000000-0000-4000-f000-00000000005b', 'hash_solar_b', 'Solar B', 'Energia', 'EDP',
   'Cobrança indevida', 'Ainda não reclamei', true, now(), null);

delete from net.http_request_queue;
set local role service_role;
create temp table novos on commit drop as
  select u.user_id, public.converter_pedido_em_caso(u.pedido_id, u.user_id) as caso_id
  from (values
    ('31000000-0000-4000-f000-00000000005a'::uuid, '00000000-0000-4000-f000-00000000005a'::uuid),
    ('31000000-0000-4000-f000-00000000005b'::uuid, '00000000-0000-4000-f000-00000000005b'::uuid)
  ) as u(pedido_id, user_id);
reset role;
grant select on novos to authenticated;

select is((select count(*) from novos where caso_id is not null), 2::bigint, 'os dois pedidos criam caso');
select is(
  (select c.detalhes_caso from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-f000-00000000005a'),
  '{"forma_contratacao":"domicilio","financiamento":"sim_com_compra","tipo_contrato_solar":"compra_instalacao"}'::jsonb,
  'as respostas do pedido passam para o caso');
select is(
  (select c.detalhes_caso from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-f000-00000000005b'),
  null::jsonb, 'caso sem respostas fica com null');
select is(
  (select c.status from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-f000-00000000005a'),
  'Novo', 'o caso solar entra como Novo, como os outros');

-- ===========================================================================
-- 3. RLS: o cliente lê as próprias respostas, não as altera nem vê as de outros
-- ===========================================================================
select testes.como('00000000-0000-4000-f000-00000000005a');
select is((select detalhes_caso ->> 'financiamento' from public.casos where utilizador_id = '00000000-0000-4000-f000-00000000005a'),
  'sim_com_compra', 'o cliente lê as respostas do próprio caso');
select is((select count(*) from public.casos where utilizador_id = '00000000-0000-4000-f000-00000000005b'), 0::bigint, 'não vê casos de outras contas');
select is(
  testes.tenta($$update public.casos set detalhes_caso = '{"financiamento":"nao"}' where utilizador_id = '00000000-0000-4000-f000-00000000005a'$$),
  'ok:0', 'o cliente não altera as respostas do caso (sem permissão de escrita)');
reset role;
select is((select detalhes_caso ->> 'financiamento' from public.casos c join novos n on n.caso_id = c.id where n.user_id = '00000000-0000-4000-f000-00000000005a'),
  'sim_com_compra', 'respostas inalteradas');

-- ===========================================================================
-- 4. Regras novas: 17, inativas, por rever; existentes intactas
-- ===========================================================================
create temporary table solar_novas as
  select * from public.regras_juridicas where codigo in (
    'GAR_EMPREITADA_3', 'GAR_ENTREGA_INSTALACAO_11', 'GAR_RECUSA_PAGAMENTO_15_7', 'GAR_COMERCIAL_43', 'GAR_PRODUTOR_DIRETO_40',
    'CONS_REPARACAO_DANOS_12', 'CRED_COLIGADO_18', 'DIST_FORA_ESTAB_FORMA_9', 'DIST_ACESSORIOS_16',
    'UPAC_CONTROLO_PREVIO_11_81', 'UPAC_CERTIFICADO_EXPLORACAO_81A', 'UPAC_INSTALADOR_84', 'UPAC_EQUIPAMENTOS_CERTIFICADOS_96', 'UPAC_DEVERES_AUTOCONSUMIDOR_88',
    'CAER_AMBITO_FORMA_2_4', 'CAER_INFORMACAO_5_6', 'CAER_EMPRESA_DGEG_3');

select is((select count(*) from solar_novas), 17::bigint, '17 regras novas');
select is((select count(*) from solar_novas where ativa or revista_em is not null or revista_por is not null), 0::bigint,
  'nenhuma entra ativa ou revista');
select is((select count(*) from solar_novas where setor is null), 9::bigint, '9 gerais');
select is((select count(*) from solar_novas where setor = 'Energia' and categoria = 'Autoconsumo'), 5::bigint, '5 de Energia → Autoconsumo');
select is((select count(*) from solar_novas where setor = 'Energia' and categoria = 'CAER'), 3::bigint, '3 de CAER');
select is((select count(*) from solar_novas where diploma = '' or artigo is null or fonte_url not like 'https://%'
           or efeito_juridico is null or provas_necessarias is null or resultado_pretendido is null or palavras_chave is null), 0::bigint,
  'diploma, artigo, fonte oficial e campos de produção preenchidos');

-- As regras reutilizadas continuam no setor de sempre.
select is((select setor from public.regras_juridicas where codigo = 'COMPRA_INSTALACAO_INCORRETA_9'), 'Compras & Reembolsos',
  'COMPRA_INSTALACAO_INCORRETA_9 não muda de setor');

select * from finish();
rollback;
