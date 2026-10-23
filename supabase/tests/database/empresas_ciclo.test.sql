-- DoLado Empresas — Fase 5: activação, ciclo de pagamento manual,
-- cancelamento e acções do admin. Datas simuladas com p_hoje.
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)

begin;
select * from no_plan();

-- a: admin · c: particular · e1/e2/e3: contas de empresa
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e800-00000000000a', 'ciclo-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e800-00000000000c', 'ciclo-c@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e800-0000000000e1', 'ciclo-e1@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e800-0000000000e2', 'ciclo-e2@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e800-0000000000e3', 'ciclo-e3@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e800-00000000000a';
select is(public.empresa_registar('00000000-0000-4000-e800-0000000000e1', 'Um', 'sociedade', '500000000', null), 'registada', 'e1');
select is(public.empresa_registar('00000000-0000-4000-e800-0000000000e2', 'Dois', 'sociedade', '500000018', null), 'registada', 'e2');
select is(public.empresa_registar('00000000-0000-4000-e800-0000000000e3', 'Tres', 'sociedade', '512345678', null), 'registada', 'e3');

create temporary table ids as
select (select id from public.organizacoes where nif = '500000000') as o1,
       (select id from public.organizacoes where nif = '500000018') as o2,
       (select id from public.organizacoes where nif = '512345678') as o3;
grant select on ids to public;

-- ===========================================================================
-- Datas: período n = âncora + (n-1) meses … âncora + n meses
-- ===========================================================================
select is(public.empresa_fim_periodo('2026-01-31', 1), '2026-02-28'::date, '31/01 → 28/02');
select is(public.empresa_fim_periodo('2026-01-31', 2), '2026-03-31'::date, 'sem deriva: 31/03');
select is(public.empresa_fim_periodo('2028-01-31', 1), '2028-02-29'::date, 'ano bissexto: 29/02');
select is(public.empresa_fim_periodo('2026-03-15', 12), '2027-03-15'::date, 'doze meses');

-- ===========================================================================
-- Activação
-- ===========================================================================
select is(public.empresa_activar((select o1 from ids), '00000000-0000-4000-e800-00000000000a', 'FT 1'), 'estado_invalido',
  'Só uma organização aprovada é activada');
update public.organizacoes set estado = 'aprovada' where id in ((select o1 from ids), (select o2 from ids), (select o3 from ids));
select is(public.empresa_activar((select o1 from ids), '00000000-0000-4000-e800-00000000000c', 'FT 1'), 'sem_permissao', 'Só o admin');
select is(public.empresa_activar((select o1 from ids), '00000000-0000-4000-e800-00000000000a', ' '), 'referencia_em_falta',
  'Referência da factura obrigatória');
select is(public.empresa_activar((select o1 from ids), '00000000-0000-4000-e800-00000000000a', 'FT 2026/1'), 'ativa', 'Activada');
select is((select estado || '|' || (ciclo_ancora = public.empresa_hoje())::text || '|' ||
                  (revisao_obrigatoria_ate > now() + interval '29 days')::text || '|' || (preco_garantido_ate > now() + interval '5 months')::text
             from public.organizacoes where id = (select o1 from ids)),
  'ativa|true|true|true', 'Âncora hoje, revisão obrigatória 30 dias, preço garantido (cinco primeiras)');
select is((select numero || '|' || estado_pagamento || '|' || referencia_factura || '|' || valor_cents
             from public.empresa_periodos where organizacao_id = (select o1 from ids)),
  '1|pago|FT 2026/1|4900', 'Primeiro período pago, sem IVA');
select is((select count(*) from public.empresa_avisos where organizacao_id = (select o1 from ids) and tipo = 'ativada'), 1::bigint,
  'Aviso de activação');

-- ===========================================================================
-- Ciclo: o1 com âncora 31/01/2026 (simulada)
-- ===========================================================================
update public.organizacoes set ciclo_ancora = '2026-01-31' where id = (select o1 from ids);
update public.empresa_periodos set inicio = '2026-01-31', fim = '2026-02-28' where organizacao_id = (select o1 from ids);

select is((public.empresa_ciclo_diario('2026-02-20') ->> 'periodos_criados')::integer, 0, 'Mais de 7 dias antes: nada');
select is((public.empresa_ciclo_diario('2026-02-21') ->> 'periodos_criados')::integer, 1, '7 dias antes: período seguinte');
select is((select inicio || '>' || fim || '|' || estado_pagamento from public.empresa_periodos
            where organizacao_id = (select o1 from ids) and numero = 2), '2026-02-28>2026-03-31|por_pagar', 'Período 2');
select is((public.empresa_ciclo_diario('2026-02-21') ->> 'periodos_criados')::integer, 0, 'Idempotente no mesmo dia');
select is((select count(*) from public.empresa_avisos where organizacao_id = (select o1 from ids) and tipo = 'a_vencer'), 1::bigint,
  'Um aviso de vencimento');

select is((public.empresa_ciclo_diario('2026-02-27') ->> 'em_atraso')::integer, 0, 'Antes do vencimento: activa');
select is((public.empresa_ciclo_diario('2026-02-28') ->> 'em_atraso')::integer, 1, 'No vencimento sem pagamento: em atraso');
select is(public.empresa_tem_acesso((select o1 from ids)), 'total', 'Em atraso: ainda acesso total');
select is((public.empresa_ciclo_diario('2026-03-06') ->> 'suspensas')::integer, 0, '6 dias de atraso: ainda não');
select is((public.empresa_ciclo_diario('2026-03-07') ->> 'suspensas')::integer, 1, '7 dias de atraso: suspensa');
select is(public.empresa_tem_acesso((select o1 from ids)), 'consulta', 'Suspensa: só consulta e exportação');
select is((public.empresa_ciclo_diario('2026-03-07') ->> 'suspensas')::integer, 0, 'Idempotente');
select is((select count(*) from public.empresa_periodos where organizacao_id = (select o1 from ids)), 2::bigint,
  'Suspensa: não cria períodos novos');

-- Pagamento confirmado → activa.
select is(public.empresa_confirmar_pagamento((select id from public.empresa_periodos where organizacao_id = (select o1 from ids) and numero = 2),
  '00000000-0000-4000-e800-00000000000a', 'FT 2026/2'), '{"estado": "ativa", "resultado": "pago"}'::jsonb, 'Regularizada: activa');
select is(public.empresa_confirmar_pagamento((select id from public.empresa_periodos where organizacao_id = (select o1 from ids) and numero = 2),
  '00000000-0000-4000-e800-00000000000a', 'FT 2026/2') ->> 'resultado', 'ja_pago', 'Confirmar duas vezes não muda nada');
select is((select count(*) from public.empresa_avisos where organizacao_id = (select o1 from ids) and tipo = 'pagamento_confirmado'), 1::bigint,
  'Aviso de pagamento');

-- Período 3 não pago até ao cancelamento por falta de pagamento.
select is((public.empresa_ciclo_diario('2026-03-24') ->> 'periodos_criados')::integer, 1, 'Período 3 a 7 dias');
select is((public.empresa_ciclo_diario('2026-03-31') ->> 'em_atraso')::integer, 1, 'Período 3 em atraso');
select is((public.empresa_ciclo_diario('2026-04-07') ->> 'suspensas')::integer, 1, 'Suspensa');
select is((public.empresa_ciclo_diario('2026-05-06') ->> 'canceladas')::integer, 0, '29 dias suspensa: ainda não');
select is((public.empresa_ciclo_diario('2026-05-07') ->> 'canceladas')::integer, 1, '30 dias suspensa: cancelada');
select is((select estado || '|' || motivo_cancelamento || '|' || eliminacao_prevista_em || '|' || coalesce(acesso_consulta_ate::text, '-')
             from public.organizacoes where id = (select o1 from ids)),
  'cancelada|falta_pagamento|2026-08-05|-', 'Falta de pagamento: sem acesso, eliminação prevista em 90 dias');
select is(public.empresa_tem_acesso((select o1 from ids)), 'nenhum', 'Sem acesso');
select is((select estado_pagamento from public.empresa_periodos where organizacao_id = (select o1 from ids) and numero = 3), 'anulado',
  'Período por pagar anulado');
select is((public.empresa_ciclo_diario('2026-06-01') ->> 'encerradas')::integer, 0, 'Cancelada sem consulta: fica cancelada');

-- ===========================================================================
-- Cancelamento pelo cliente (o2, datas reais)
-- ===========================================================================
select is(public.empresa_pedir_cancelamento('00000000-0000-4000-e800-0000000000e2') ->> 'resultado', 'estado_invalido',
  'Só uma organização activa cancela');
select is(public.empresa_activar((select o2 from ids), '00000000-0000-4000-e800-00000000000a', 'FT 2026/3'), 'ativa', 'o2 activa');
select is(public.empresa_pedir_cancelamento('00000000-0000-4000-e800-0000000000e2'),
  jsonb_build_object('resultado', 'agendado', 'termina_em', public.empresa_fim_periodo(public.empresa_hoje(), 1)),
  'Cancelamento agendado para o fim do período pago');
select is(public.empresa_pedir_cancelamento('00000000-0000-4000-e800-0000000000e2') ->> 'resultado', 'ja_agendado', 'Já agendado');
select is(public.empresa_retirar_cancelamento('00000000-0000-4000-e800-0000000000e2'), 'retirado', 'Retirado');
select is(public.empresa_retirar_cancelamento('00000000-0000-4000-e800-0000000000e2'), 'sem_pedido', 'Nada a retirar');
select is(public.empresa_pedir_cancelamento('00000000-0000-4000-e800-0000000000e2') ->> 'resultado', 'agendado', 'Pedido de novo');

select is((public.empresa_ciclo_diario(public.empresa_fim_periodo(public.empresa_hoje(), 1) - 7) ->> 'periodos_criados')::integer, 0,
  'Com cancelamento pedido não cria período seguinte');
select is((public.empresa_ciclo_diario(public.empresa_fim_periodo(public.empresa_hoje(), 1) - 1) ->> 'canceladas')::integer, 0,
  'Activa até ao fim do período pago');
select is(public.empresa_tem_acesso((select o2 from ids)), 'total', 'Ainda activa');
select is((public.empresa_ciclo_diario(public.empresa_fim_periodo(public.empresa_hoje(), 1)) ->> 'canceladas')::integer, 1,
  'No fim do período: cancelada');
select is((select estado || '|' || motivo_cancelamento || '|' ||
                  (acesso_consulta_ate = public.empresa_inicio_do_dia(public.empresa_fim_periodo(public.empresa_hoje(), 1) + 30))::text
             from public.organizacoes where id = (select o2 from ids)),
  'cancelada|pedido_cliente|true', '30 dias de consulta');
select is((public.empresa_ciclo_diario(public.empresa_fim_periodo(public.empresa_hoje(), 1) + 29) ->> 'encerradas')::integer, 0,
  'Consulta ainda a decorrer');
select is((public.empresa_ciclo_diario(public.empresa_fim_periodo(public.empresa_hoje(), 1) + 30) ->> 'encerradas')::integer, 1,
  'Fim da consulta: encerrada');
select is((select estado || '|' || (eliminacao_prevista_em = public.empresa_fim_periodo(public.empresa_hoje(), 1) + 120)::text
             from public.organizacoes where id = (select o2 from ids)), 'encerrada|true', 'Eliminação prevista em 90 dias');

-- ===========================================================================
-- Acções do admin (o3)
-- ===========================================================================
select is(public.empresa_activar((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'FT 2026/4'), 'ativa', 'o3 activa');
select is(public.empresa_admin_transicao((select o3 from ids), '00000000-0000-4000-e800-00000000000c', 'suspender', 'x'), 'sem_permissao', 'Só o admin');
select is(public.empresa_admin_transicao((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'suspender', ' '), 'motivo_em_falta', 'Motivo obrigatório');
select is(public.empresa_admin_transicao((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'suspender', 'Ensaio'), 'suspensa', 'Suspensa');
select is(public.empresa_admin_transicao((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'reativar', 'Ensaio'), 'ativa', 'Reactivada');
select is((select motivo from public.organizacoes_historico where organizacao_id = (select o3 from ids) and estado_depois = 'suspensa'),
  'Ensaio', 'Motivo no histórico');
select is(public.empresa_admin_transicao((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'cancelar', 'Pedido por telefone'), 'cancelada', 'Cancelada pelo admin');
select is(public.empresa_tem_acesso((select o3 from ids)), 'consulta', 'Cancelada pelo admin: 30 dias de consulta');
select is(public.empresa_admin_transicao((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'reativar', 'x'), 'estado_invalido',
  'Cancelada não se reactiva por aqui');

-- ===========================================================================
-- Vagas (D4)
-- ===========================================================================
insert into public.organizacoes (nome, tipo_entidade, nif, estado)
select 'Activa ' || n, 'sociedade', lpad((600000000 + n)::text, 9, '0'), 'ativa' from generate_series(1, 5) n;
update public.organizacoes set estado = 'aprovada', motivo_cancelamento = null where id = (select o3 from ids);
select is(public.empresa_activar((select o3 from ids), '00000000-0000-4000-e800-00000000000a', 'FT 2026/5'), 'lista_espera',
  'Sem vaga na activação: lista de espera');
select is((select count(*) from public.empresa_periodos where organizacao_id = (select o3 from ids) and referencia_factura = 'FT 2026/5'),
  0::bigint, 'Sem período criado');

-- ===========================================================================
-- Privilégios
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.empresa_activar(uuid, uuid, text)', 'EXECUTE'), 'activar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_confirmar_pagamento(uuid, uuid, text)', 'EXECUTE'), 'pagamento: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_ciclo_diario(date)', 'EXECUTE'), 'ciclo: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_pedir_cancelamento(uuid)', 'EXECUTE'), 'cancelar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_admin_transicao(uuid, uuid, text, text)', 'EXECUTE'), 'admin: só service_role');
select ok(not has_table_privilege('authenticated', 'public.empresa_avisos', 'INSERT'), 'Avisos: cliente não escreve');
select is((select count(*) from cron.job where jobname in ('empresas-ciclo-diario', 'empresas-avisos')), 2::bigint, 'Jobs agendados');

select * from finish();
rollback;
