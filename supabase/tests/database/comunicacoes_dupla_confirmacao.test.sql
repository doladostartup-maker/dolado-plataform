-- DoLado — comunicações comerciais: dupla confirmação e "deixar de receber".
-- Ver 20261024090000_comunicacoes_dupla_confirmacao.sql. Correr com
-- `supabase test db` na stack local, nunca em produção. Transação revertida.

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-4000-c000-00000000000a', 'conta@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Conta","idioma":"en-GB"}', now()),
  ('00000000-0000-4000-c000-00000000000b', 'porconfirmar@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Sem confirmação"}', null);

insert into public.consentimentos_comunicacoes (id, user_id, versao, texto, origem, aceite_em) values
  ('21000000-0000-4000-c000-00000000000a', '00000000-0000-4000-c000-00000000000a', 'v', 'Texto aceite pela conta.', 'tratar_caso', now()),
  ('21000000-0000-4000-c000-00000000000b', '00000000-0000-4000-c000-00000000000b', 'v', 'Texto aceite pela conta.', 'tratar_caso', now());

insert into public.consentimentos_comunicacoes_sem_conta (id, email, origem, versao, texto, dado_em) values
  ('22000000-0000-4000-c000-000000000001', 'novo@teste.invalid', 'guia_facturas', 'v', 'Quero receber dicas.', now()),
  ('22000000-0000-4000-c000-000000000002', 'antigo@teste.invalid', 'guia_facturas', 'v', 'Quero receber dicas.', now() - interval '31 days'),
  ('22000000-0000-4000-c000-000000000003', 'conta@teste.invalid', 'guia_facturas', 'v', 'Quero receber dicas.', now());

-- Reserva do e-mail de confirmação: uma vez por 24 h, nunca expirada.
select is(public.comunicacoes_reservar_confirmacao(' NOVO@teste.invalid '), '22000000-0000-4000-c000-000000000001'::uuid, 'reserva: devolve a autorização por confirmar (e-mail normalizado)');
select is(public.comunicacoes_reservar_confirmacao('novo@teste.invalid'), null, 'reserva: no máximo uma por 24 h');
select public.comunicacoes_libertar_confirmacao('22000000-0000-4000-c000-000000000001');
select is(public.comunicacoes_reservar_confirmacao('novo@teste.invalid'), '22000000-0000-4000-c000-000000000001'::uuid, 'reserva: depois de libertada, volta a sair');
select is(public.comunicacoes_reservar_confirmacao('antigo@teste.invalid'), null, 'reserva: autorização com mais de 30 dias não recebe confirmação');
select is(public.comunicacoes_reservar_confirmacao('ninguem@teste.invalid'), null, 'reserva: sem autorização, nada');

-- Sem confirmação, nunca é destinatário.
select is((select count(*)::int from public.comunicacoes_destinatarios() where email = 'novo@teste.invalid'), 0, 'destinatários: sem conta por confirmar fica de fora');

-- Confirmação.
select is(public.comunicacoes_confirmar('22000000-0000-4000-c000-000000000001'), 'confirmado', 'confirmar: regista');
select is(public.comunicacoes_confirmar('22000000-0000-4000-c000-000000000001'), 'ja_confirmado', 'confirmar: idempotente');
select is(public.comunicacoes_confirmar('22000000-0000-4000-c000-000000000002'), 'expirado', 'confirmar: ligação com mais de 30 dias');
select is(public.comunicacoes_confirmar('22000000-0000-4000-c000-0000000000ff'), 'inexistente', 'confirmar: id desconhecido');
select is(public.comunicacoes_reservar_confirmacao('novo@teste.invalid'), null, 'reserva: já confirmada, não volta a sair');
select throws_ok($$update public.consentimentos_comunicacoes_sem_conta set confirmado_em = now() + interval '1 day' where id = '22000000-0000-4000-c000-000000000001'$$, 'P0001', null, 'confirmação: só uma vez (prova imutável)');
select public.comunicacoes_confirmar('22000000-0000-4000-c000-000000000003');

-- Destinatários: conta com e-mail confirmado; sem conta confirmado; um por endereço (a conta prevalece).
select is((select tipo from public.comunicacoes_destinatarios() where email = 'novo@teste.invalid'), 'sem_conta', 'destinatários: sem conta confirmado entra');
select is((select count(*)::int from public.comunicacoes_destinatarios() where email = 'conta@teste.invalid'), 1, 'destinatários: um registo por endereço');
select is((select tipo from public.comunicacoes_destinatarios() where email = 'conta@teste.invalid'), 'conta', 'destinatários: a autorização da conta prevalece');
select is((select idioma from public.comunicacoes_destinatarios() where email = 'conta@teste.invalid'), 'en-GB', 'destinatários: idioma da conta');
select is((select count(*)::int from public.comunicacoes_destinatarios() where email = 'porconfirmar@teste.invalid'), 0, 'destinatários: conta com e-mail por confirmar fica de fora');

-- Deixar de receber.
select is(public.comunicacoes_retirar('sem_conta', '22000000-0000-4000-c000-000000000001'), 'retirado', 'retirar (sem conta): regista');
select is(public.comunicacoes_retirar('sem_conta', '22000000-0000-4000-c000-000000000001'), 'ja_retirado', 'retirar (sem conta): idempotente');
select is((select retirado_motivo from public.consentimentos_comunicacoes_sem_conta where id = '22000000-0000-4000-c000-000000000001'), 'link_email', 'retirar (sem conta): motivo');
select is(public.comunicacoes_retirar('conta', '21000000-0000-4000-c000-00000000000a'), 'retirado', 'retirar (conta): regista');
select is((select retirado_origem from public.consentimentos_comunicacoes where id = '21000000-0000-4000-c000-00000000000a'), 'link_email', 'retirar (conta): origem link_email');
select is(public.comunicacoes_retirar('outro', '21000000-0000-4000-c000-00000000000a'), 'inexistente', 'retirar: tipo desconhecido');
select is((select count(*)::int from public.comunicacoes_destinatarios() where email in ('novo@teste.invalid')), 0, 'destinatários: retirada sai logo');
select is((select tipo from public.comunicacoes_destinatarios() where email = 'conta@teste.invalid'), 'sem_conta', 'destinatários: retirada a da conta, fica a sem conta confirmada');
select is(public.comunicacoes_confirmar('22000000-0000-4000-c000-000000000001'), 'retirado', 'confirmar: depois de retirada, não confirma');

-- Só a service_role chama as funções.
select ok(not has_function_privilege('anon', 'public.comunicacoes_retirar(text, uuid)', 'EXECUTE'), 'privilégios: anon não retira');
select ok(not has_function_privilege('authenticated', 'public.comunicacoes_confirmar(uuid)', 'EXECUTE'), 'privilégios: authenticated não confirma');
select ok(not has_function_privilege('authenticated', 'public.comunicacoes_destinatarios()', 'EXECUTE'), 'privilégios: authenticated não lista destinatários');
select ok(not has_function_privilege('anon', 'public.comunicacoes_reservar_confirmacao(text)', 'EXECUTE'), 'privilégios: anon não reserva');
select ok(has_function_privilege('service_role', 'public.comunicacoes_destinatarios()', 'EXECUTE'), 'privilégios: service_role lista');

select * from finish();
rollback;
