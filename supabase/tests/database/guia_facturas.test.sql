-- DoLado — e-book gratuito /guia-facturas (pedidos e autorização comercial sem conta)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: só a service role regista pedidos (visitante e cliente não lêem nem
-- escrevem); o mesmo e-mail não duplica (contador, UTM do primeiro pedido);
-- o e-mail com a ligação é reservado no máximo uma vez por 24 h e pode ser
-- libertado; a autorização comercial só nasce com a caixa marcada, nunca é
-- retirada por um pedido sem ela, não duplica, e a prova é imutável; só o
-- admin lê as métricas; nada é criado em auth.users. Transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to authenticated, service_role, anon;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
grant execute on all functions in schema testes to authenticated, service_role, anon;

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e200-00000000000a', 'gf-cliente@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e200-00000000000f', 'gf-admin@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e200-00000000000f';

create temp table utilizadores_antes as select count(*) as n from auth.users;

-- ---------------------------------------------------------------------------
-- Registo pela service role
-- ---------------------------------------------------------------------------
set local role service_role;

select is(
  (public.guia_registar_pedido('guia_facturas', '  Ana@Exemplo.PT ', 'pt-PT', 'instagram',
     '{"utm_source":"instagram","utm_medium":"social","utm_campaign":"guia_out26"}', null, null) ->> 'novo')::boolean,
  true, 'Primeiro pedido é novo');
select is((select email from public.guias_pedidos where guia = 'guia_facturas' and email like 'ana@%'), 'ana@exemplo.pt', 'E-mail normalizado (minúsculas, sem espaços)');
select is((select email_enviado_em is not null from public.guias_pedidos where email = 'ana@exemplo.pt'), true, 'E-mail com a ligação reservado');
select is((select count(*)::int from public.consentimentos_comunicacoes_sem_conta where email = 'ana@exemplo.pt'), 0, 'Sem caixa marcada não há autorização comercial');

-- Segundo pedido do mesmo e-mail: sem duplicado, UTM do primeiro, sem novo e-mail.
select is(
  (public.guia_registar_pedido('guia_facturas', 'ana@exemplo.pt', 'pt-PT', 'facebook',
     '{"utm_source":"facebook","utm_campaign":"outra"}', null, null) ->> 'enviar_email')::boolean,
  false, 'Segundo pedido em 24 h não envia outro e-mail');
select is((select count(*)::int from public.guias_pedidos where email = 'ana@exemplo.pt'), 1, 'Sem duplicados');
select is((select pedidos from public.guias_pedidos where email = 'ana@exemplo.pt'), 2, 'Contador de pedidos');
select is((select origem || '/' || utm_campaign from public.guias_pedidos where email = 'ana@exemplo.pt'), 'instagram/guia_out26', 'Origem e UTM do primeiro pedido');

-- Falha da Brevo: a reserva é libertada e o pedido seguinte volta a enviar.
select public.guia_libertar_email((select id from public.guias_pedidos where email = 'ana@exemplo.pt'));
select is(
  (public.guia_registar_pedido('guia_facturas', 'ana@exemplo.pt', 'pt-PT', 'directo', '{}', null, null) ->> 'enviar_email')::boolean,
  true, 'Depois de libertada, a reserva volta a ser feita');

-- Autorização comercial
select is(
  public.guia_registar_pedido('guia_facturas', 'rui@exemplo.pt', 'en-GB', 'meta_ads', '{}',
    'Quero receber dicas, novidades e comunicações da DoLado por e-mail.', '2026-10-22') ->> 'consentimento',
  'registado', 'Caixa marcada regista a autorização');
select is((select versao || '|' || idioma || '|' || origem from public.consentimentos_comunicacoes_sem_conta where email = 'rui@exemplo.pt'),
  '2026-10-22|en-GB|guia_facturas', 'Versão, idioma e origem gravados');
select is((select confirmado_em is null and retirado_em is null from public.consentimentos_comunicacoes_sem_conta where email = 'rui@exemplo.pt'),
  true, 'Autorização activa, ainda por confirmar');
select is(
  public.guia_registar_pedido('guia_facturas', 'rui@exemplo.pt', 'pt-PT', 'directo', '{}',
    'Quero receber dicas, novidades e comunicações da DoLado por e-mail.', '2026-10-22') ->> 'consentimento',
  'ja_existia', 'Nova caixa marcada não duplica');
select is(
  public.guia_registar_pedido('guia_facturas', 'rui@exemplo.pt', 'pt-PT', 'directo', '{}', null, null) ->> 'consentimento',
  'nao_pedido', 'Pedido sem a caixa');
select is((select count(*)::int from public.consentimentos_comunicacoes_sem_conta where email = 'rui@exemplo.pt' and retirado_em is null), 1,
  'Pedido sem a caixa não retira a autorização existente');

select throws_ok(
  $$update public.consentimentos_comunicacoes_sem_conta set texto = 'outro texto qualquer' where email = 'rui@exemplo.pt'$$,
  'P0001', 'consentimento_imutavel', 'Texto da prova imutável, mesmo para a service role');
select lives_ok(
  $$update public.consentimentos_comunicacoes_sem_conta set retirado_em = now(), retirado_motivo = 'pedido por e-mail' where email = 'rui@exemplo.pt'$$,
  'Retirada registada');
select throws_ok(
  $$update public.consentimentos_comunicacoes_sem_conta set retirado_em = null where email = 'rui@exemplo.pt'$$,
  'P0001', 'consentimento_ja_retirado', 'Retirada não se desfaz');
select is(
  public.guia_registar_pedido('guia_facturas', 'rui@exemplo.pt', 'pt-PT', 'directo', '{}',
    'Quero receber dicas, novidades e comunicações da DoLado por e-mail.', '2026-10-22') ->> 'consentimento',
  'registado', 'Depois de retirada, uma nova autorização é um registo novo');
select is((select count(*)::int from public.consentimentos_comunicacoes_sem_conta where email = 'rui@exemplo.pt'), 2, 'A prova antiga fica');

select throws_ok(
  $$select public.guia_registar_pedido('outro_guia', 'x@exemplo.pt', 'pt-PT', 'directo', '{}', null, null)$$,
  '23514', null, 'Guia desconhecido recusado');
select throws_ok(
  $$select public.guia_registar_pedido('guia_facturas', 'nao-e-um-email', 'pt-PT', 'directo', '{}', null, null)$$,
  '23514', null, 'E-mail inválido recusado pela base de dados');
select throws_ok(
  $$select public.guia_registar_pedido('guia_facturas', 'y@exemplo.pt', 'pt-PT', 'tiktok', '{}', null, null)$$,
  '23514', null, 'Origem fora da lista recusada');

reset role;
select is((select count(*) from auth.users), (select n from utilizadores_antes), 'Nenhuma conta criada em auth.users');

-- ---------------------------------------------------------------------------
-- Visitante e cliente: sem leitura nem escrita
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok($$select * from public.guias_pedidos$$, '42501', null, 'Visitante não lê os pedidos');
select throws_ok($$select public.guia_registar_pedido('guia_facturas', 'z@exemplo.pt', 'pt-PT', 'directo', '{}', null, null)$$,
  '42501', null, 'Visitante não regista pela API');
select throws_ok($$insert into public.consentimentos_comunicacoes_sem_conta (email, origem, versao, texto) values ('z@exemplo.pt','guia_facturas','1','texto forjado aqui')$$,
  '42501', null, 'Visitante não cria autorizações');
reset role;

select testes.como('00000000-0000-4000-e200-00000000000a');
select is((select count(*)::int from public.guias_pedidos), 0, 'Cliente não vê pedidos (RLS)');
select is((select count(*)::int from public.consentimentos_comunicacoes_sem_conta), 0, 'Cliente não vê autorizações (RLS)');
select throws_ok($$select public.guia_registar_pedido('guia_facturas', 'z@exemplo.pt', 'pt-PT', 'directo', '{}', null, null)$$,
  '42501', null, 'Cliente não regista pela API');
select throws_ok($$insert into public.guias_pedidos (guia, email) values ('guia_facturas', 'z@exemplo.pt')$$,
  '42501', null, 'Cliente não escreve na tabela');
select throws_ok($$select public.guia_metricas()$$, '42501', null, 'Métricas só para admin');
reset role;

select testes.como('00000000-0000-4000-e200-00000000000f');
select is((select count(*)::int from public.guias_pedidos where email in ('ana@exemplo.pt', 'rui@exemplo.pt')), 2, 'Admin lê os pedidos');
select is((public.guia_metricas() ->> 'pedidos')::int >= 2, true, 'Métricas: pedidos');
select is((public.guia_metricas() -> 'por_origem' ->> 'instagram')::int >= 1, true, 'Métricas: por origem');
select is((public.guia_metricas() ->> 'autorizacoes_comerciais')::int >= 1, true, 'Métricas: autorizações activas');
reset role;

-- ---------------------------------------------------------------------------
-- Retenção
-- ---------------------------------------------------------------------------
update public.guias_pedidos set ultimo_pedido_em = now() - interval '13 months' where email = 'ana@exemplo.pt';
select public.limpar_guias_pedidos();
select is((select count(*)::int from public.guias_pedidos where email = 'ana@exemplo.pt'), 0, 'Pedido apagado 12 meses depois do último');
select is((select count(*)::int from public.guias_pedidos where email = 'rui@exemplo.pt'), 1, 'Pedido recente mantém-se');
select is((select count(*)::int from cron.job where jobname = 'limpar-guias-pedidos'), 1, 'Limpeza agendada');

select * from finish();
rollback;
