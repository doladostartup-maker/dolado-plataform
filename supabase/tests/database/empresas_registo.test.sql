-- DoLado Empresas — Fase 4: registo, estados antes da aprovação, decisão do
-- admin, recuperação assistida do MFA e retirada da identidade Google.
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)

begin;
select * from no_plan();

-- a: admin · e: conta nova de empresa · e2: segunda empresa · v: conta antiga
-- (com mais de 15 minutos) · c: cliente particular
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e700-00000000000a', 'reg-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e700-00000000000e', 'reg-e@teste.invalid', 'authenticated', 'authenticated', null, now()),
  ('00000000-0000-4000-e700-0000000000e2', 'reg-e2@teste.invalid', 'authenticated', 'authenticated', null, now()),
  ('00000000-0000-4000-e700-00000000000b', 'reg-v@teste.invalid', 'authenticated', 'authenticated', now(), now() - interval '1 hour'),
  ('00000000-0000-4000-e700-00000000000c', 'reg-c@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e700-00000000000a';

-- ===========================================================================
-- NIPC/NIF
-- ===========================================================================
select ok(public.nif_valido('500000000'), 'NIPC válido');
select ok(public.nif_valido('200000004'), 'NIF de pessoa singular válido');
select ok(not public.nif_valido('500000001'), 'Dígito de controlo errado');
select ok(not public.nif_valido('50000000'), '8 dígitos');
select ok(not public.nif_valido(null), 'Sem NIF');

-- ===========================================================================
-- Registo
-- ===========================================================================
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000e', 'Loja E', 'sociedade', '500000001', null),
  'nif_invalido', 'NIF com dígito errado recusado');
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000e', 'Loja E', 'sociedade', '200000004', null),
  'nif_invalido', 'Sociedade com NIF de pessoa singular recusada');
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000e', 'Loja E', 'empresario_nome_individual', '500000000', null),
  'nif_invalido', 'Empresário em nome individual com NIPC recusado');
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000e', 'Loja E', 'outro', '500000000', null),
  'tipo_invalido', 'Tipo de entidade desconhecido');
select is((select tipo_conta from public.utilizadores where id = '00000000-0000-4000-e700-00000000000e'), 'particular',
  'Recusas não marcam a conta');

select is(public.empresa_registar('00000000-0000-4000-e700-00000000000e', ' Loja E ', 'sociedade', '500000000', 'Ana'),
  'registada', 'Registo de uma conta nova');
select is((select tipo_conta from public.utilizadores where id = '00000000-0000-4000-e700-00000000000e'), 'empresa',
  'Conta marcada como empresa');
select is((select o.estado || '|' || o.nome || '|' || o.responsavel_nome from public.organizacoes o
            join public.organizacoes_membros m on m.organizacao_id = o.id
           where m.utilizador_id = '00000000-0000-4000-e700-00000000000e'),
  'email_por_confirmar|Loja E|Ana', 'Organização criada por confirmar');
select is((select count(*) from public.organizacoes_historico h join public.organizacoes o on o.id = h.organizacao_id
           where o.nif = '500000000' and h.motivo = 'Registo' and h.alterado_por = '00000000-0000-4000-e700-00000000000e'),
  1::bigint, 'Registo no histórico');

select is(public.empresa_registar('00000000-0000-4000-e700-0000000000e2', 'Outra', 'sociedade', '500000000', null),
  'nif_em_uso', 'O mesmo NIPC numa organização em curso é recusado');
select is((select tipo_conta from public.utilizadores where id = '00000000-0000-4000-e700-0000000000e2'), 'particular',
  'NIPC em uso não marca a conta');
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000b', 'Antiga', 'sociedade', '500000018', null),
  'conta_antiga', 'Conta com mais de 15 minutos não passa a empresa');
select is((select count(*) from public.organizacoes where nif = '500000018'), 0::bigint, 'Nenhuma organização criada');
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000a', 'Admin', 'sociedade', '500000018', null),
  'conta_admin', 'Conta de admin nunca passa a empresa');
select is(public.empresa_registar('00000000-0000-4000-e700-00000000000e', 'De novo', 'sociedade', '500000018', null),
  'ja_empresa', 'Uma conta de empresa não regista segunda organização');

-- ===========================================================================
-- Estados antes da aprovação
-- ===========================================================================
select is(public.empresa_sincronizar_estado('00000000-0000-4000-e700-00000000000e') ->> 'estado', 'email_por_confirmar',
  'Sem e-mail confirmado: continua por confirmar');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-e700-00000000000e';
select is(public.empresa_sincronizar_estado('00000000-0000-4000-e700-00000000000e') ->> 'estado', 'mfa_por_configurar',
  'E-mail confirmado: MFA por configurar');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('00000000-0000-4000-e700-0000000000f1', '00000000-0000-4000-e700-00000000000e', 'Principal', 'totp', 'verified', now(), now()),
  ('00000000-0000-4000-e700-0000000000f2', '00000000-0000-4000-e700-00000000000e', 'Reserva', 'totp', 'unverified', now(), now());
select is(public.empresa_sincronizar_estado('00000000-0000-4000-e700-00000000000e') ->> 'estado', 'mfa_por_configurar',
  'Um factor verificado (o outro por verificar): ainda não chega');
update auth.mfa_factors set status = 'verified' where id = '00000000-0000-4000-e700-0000000000f2';
select is(public.empresa_sincronizar_estado('00000000-0000-4000-e700-00000000000e'),
  jsonb_build_object('organizacao_id', (select id from public.organizacoes where nif = '500000000'),
                     'estado', 'a_aguardar_aprovacao', 'passou_a_aguardar', true),
  'Dois factores: a aguardar aprovação (transição assinalada)');
select is(public.empresa_sincronizar_estado('00000000-0000-4000-e700-00000000000e') ->> 'passou_a_aguardar', 'false',
  'A transição só é assinalada uma vez');
select is(public.empresa_sincronizar_estado('00000000-0000-4000-e700-00000000000c'), null, 'Conta particular: sem organização');

-- ===========================================================================
-- Decisão do admin
-- ===========================================================================
select is(public.empresa_aprovar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000c'),
  'sem_permissao', 'Só o admin aprova');
select is(public.empresa_rejeitar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000a', '  '),
  'motivo_em_falta', 'Rejeitar exige motivo');

-- Vagas ocupadas por cinco organizações activas (fictícias).
insert into public.organizacoes (nome, tipo_entidade, nif, estado)
select 'Activa ' || n, 'sociedade', lpad((600000000 + n)::text, 9, '0'), 'ativa' from generate_series(1, 5) n;
select is(public.empresa_aprovar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000a'),
  'lista_espera', 'Sem vaga: lista de espera');
select is((select estado from public.organizacoes where nif = '500000000'), 'lista_espera', 'Estado gravado');
update public.organizacoes set estado = 'cancelada' where nome = 'Activa 1';
select is(public.empresa_aprovar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000a'),
  'aprovada', 'Com vaga, a lista de espera passa a aprovada');
select is(public.empresa_aprovar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000a'),
  'estado_invalido', 'Aprovar duas vezes não muda nada');
select is((select alterado_por from public.organizacoes_historico h join public.organizacoes o on o.id = h.organizacao_id
            where o.nif = '500000000' and h.estado_depois = 'aprovada'),
  '00000000-0000-4000-e700-00000000000a'::uuid, 'Quem aprovou fica no histórico');

-- Rejeição: só antes da activação.
select is(public.empresa_registar('00000000-0000-4000-e700-0000000000e2', 'Outra', 'sociedade', '500000018', null),
  'registada', 'Segunda empresa registada');
select is(public.empresa_rejeitar((select id from public.organizacoes where nif = '500000018'), '00000000-0000-4000-e700-00000000000a', 'Dados não confirmados'),
  'rejeitada', 'Rejeitada com motivo');
select is((select motivo from public.organizacoes_historico h join public.organizacoes o on o.id = h.organizacao_id
            where o.nif = '500000018' and h.estado_depois = 'rejeitada'),
  'Dados não confirmados', 'Motivo no histórico');
select is(public.empresa_rejeitar((select id from public.organizacoes where nome = 'Activa 2'), '00000000-0000-4000-e700-00000000000a', 'x'),
  'estado_invalido', 'Uma organização activa não é rejeitada');

-- ===========================================================================
-- Recuperação assistida do MFA
-- ===========================================================================
insert into auth.sessions (id, user_id, created_at) values
  (gen_random_uuid(), '00000000-0000-4000-e700-00000000000e', now());
select is(public.empresa_mfa_reposicao((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000c', 'x'),
  null, 'Só o admin repõe o MFA');
insert into public.empresa_pedidos_recuperacao (id, email, organizacao_id) values
  ('00000000-0000-4000-e700-0000000000d1', 'reg-e@teste.invalid', (select id from public.organizacoes where nif = '500000000'));
select is(public.empresa_mfa_reposicao((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-e700-00000000000a',
  'Telefone oficial confirmado', '00000000-0000-4000-e700-0000000000d1'), 2, 'Dois factores apagados');
select is((select count(*) from auth.mfa_factors where user_id = '00000000-0000-4000-e700-00000000000e'), 0::bigint, 'Sem factores');
select is((select count(*) from auth.sessions where user_id = '00000000-0000-4000-e700-00000000000e'), 0::bigint, 'Sessões terminadas');
select is((select estado from public.organizacoes where nif = '500000000'), 'aprovada', 'O estado da organização não muda');
select is((select count(*) from public.organizacoes_historico h join public.organizacoes o on o.id = h.organizacao_id
            where o.nif = '500000000' and h.motivo = 'Reposição do MFA: Telefone oficial confirmado'), 1::bigint,
  'Reposição registada no histórico');
select is((select estado from public.empresa_pedidos_recuperacao where id = '00000000-0000-4000-e700-0000000000d1'), 'reposto',
  'Pedido resolvido');

-- ===========================================================================
-- Google nunca numa conta de empresa
-- ===========================================================================
insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) values
  (gen_random_uuid(), '00000000-0000-4000-e700-00000000000e', '00000000-0000-4000-e700-00000000000e', '{}', 'email', now(), now()),
  (gen_random_uuid(), 'google-e', '00000000-0000-4000-e700-00000000000e', '{}', 'google', now(), now()),
  (gen_random_uuid(), 'google-c', '00000000-0000-4000-e700-00000000000c', '{}', 'google', now(), now()),
  (gen_random_uuid(), '00000000-0000-4000-e700-00000000000c', '00000000-0000-4000-e700-00000000000c', '{}', 'email', now(), now());
select is(public.empresa_retirar_identidade_google('00000000-0000-4000-e700-00000000000c'), 0, 'Conta particular: Google intacto');
select is(public.empresa_retirar_identidade_google('00000000-0000-4000-e700-00000000000e'), 1, 'Conta de empresa: Google retirado');
select is((select count(*) from auth.identities where user_id = '00000000-0000-4000-e700-00000000000e'), 1::bigint,
  'A identidade de e-mail mantém-se');

-- ===========================================================================
-- Privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.empresa_registar(uuid, text, text, text, text)', 'EXECUTE'), 'registar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_sincronizar_estado(uuid)', 'EXECUTE'), 'sincronizar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_aprovar(uuid, uuid)', 'EXECUTE'), 'aprovar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_rejeitar(uuid, uuid, text)', 'EXECUTE'), 'rejeitar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_mfa_reposicao(uuid, uuid, text, uuid)', 'EXECUTE'), 'reposição: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_retirar_identidade_google(uuid)', 'EXECUTE'), 'Google: só service_role');
select ok(not has_table_privilege('authenticated', 'public.empresa_pedidos_recuperacao', 'INSERT'), 'Pedidos: cliente não escreve');
select ok(not has_table_privilege('anon', 'public.empresa_pedidos_recuperacao', 'SELECT'), 'Pedidos: anon não lê');

select * from finish();
rollback;
