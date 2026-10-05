-- DoLado — Monitor de Proteção: "Deixar de acompanhar" até ao último serviço
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: apagar um serviço com decisões de associação, identificadores,
-- versões fechadas, eventos, achados e alertas reservados funciona (antes
-- falhava em "Registo só de inserção (associacoes_documento)"); o cliente
-- pode ficar com 0 serviços; a Proteção, os casos disponíveis e os dados do
-- Stripe (user_access) não mudam; deixam de existir alertas pendentes; os
-- dados de outros clientes não são tocados; o cliente volta a poder
-- acrescentar um serviço; uma falha a meio não deixa nada apagado; os
-- registos de prova continuam a recusar UPDATE direto. Tudo numa transação
-- revertida.

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

create function testes.pendentes(h date) returns bigint language sql as $$
  select count(*) from public.monitor_alertas_pendentes(h) p where p.email = 'da@teste.invalid';
$$;

create function testes.acesso() returns jsonb language sql as $$
  select to_jsonb(ua) - 'updated_at' from public.user_access ua where ua.user_id = '00000000-0000-4000-d000-00000000000a';
$$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('00000000-0000-4000-d000-00000000000a', 'da@teste.invalid', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-d000-00000000000b', 'db@teste.invalid', 'authenticated', 'authenticated', now());

insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits, stripe_customer_id, stripe_subscription_id) values
  ('00000000-0000-4000-d000-00000000000a', 'caso_protecao', 'active', 2, 'cus_teste_da', 'sub_teste_da'),
  ('00000000-0000-4000-d000-00000000000b', 'protecao', 'active', 0, 'cus_teste_db', 'sub_teste_db');

create temp table acesso_antes as select testes.acesso() as v;

-- Dois serviços do cliente A (com fim de fidelização: geram alertas) e um do cliente B.
insert into public.contratos_monitorizados (id, utilizador_id, setor, fornecedor, data_fim_fidelizacao) values
  ('90000000-0000-4000-d000-0000000000a1', '00000000-0000-4000-d000-00000000000a', 'telecomunicacoes', 'Vodafone', '2026-12-01'),
  ('90000000-0000-4000-d000-0000000000a2', '00000000-0000-4000-d000-00000000000a', 'telecomunicacoes', 'MEO', '2026-12-01'),
  ('90000000-0000-4000-d000-0000000000b1', '00000000-0000-4000-d000-00000000000b', 'telecomunicacoes', 'NOS', '2026-12-01');

-- Cada serviço do cliente A tem tudo o que o pipeline de acompanhamento grava.
do $$
declare
  s record;
  v_doc uuid;
  v_doc2 uuid;
  v_fatura uuid;
  v_fechada uuid;
  v_achado uuid;
begin
  for s in select id, utilizador_id from public.contratos_monitorizados
            where utilizador_id = '00000000-0000-4000-d000-00000000000a' loop
    insert into public.documentos_monitor (utilizador_id, contrato_id, tipo, storage_path, associacao_estado)
    values (s.utilizador_id, s.id, 'fatura', s.utilizador_id || '/' || gen_random_uuid() || '.pdf', 'confirmada')
    returning id into v_doc;
    insert into public.documentos_monitor (utilizador_id, contrato_id, tipo, storage_path, associacao_estado)
    values (s.utilizador_id, s.id, 'contrato', s.utilizador_id || '/' || gen_random_uuid() || '.pdf', 'manual')
    returning id into v_doc2;

    insert into public.associacoes_documento (documento_id, utilizador_id, contrato_id, decisao, papel)
    values (v_doc, s.utilizador_id, s.id, 'automatica', 'sistema'),
           (v_doc2, s.utilizador_id, s.id, 'associar_mesmo_assim', 'cliente');
    insert into public.documentos_tipo_alteracoes (documento_id, utilizador_id, tipo_anterior, tipo_novo, alterado_por, contrato_id)
    values (v_doc2, s.utilizador_id, 'fatura', 'contrato', '00000000-0000-4000-d000-00000000000b', s.id);
    insert into public.servicos_identificadores (contrato_id, utilizador_id, tipo, valor_normalizado, origem, documento_id)
    values (s.id, s.utilizador_id, 'referencia_conta', 'ref-' || s.id, 'fatura', v_doc);

    insert into public.faturas_monitor (contrato_id, utilizador_id, documento_id, numero_fatura, data_emissao, total_cents)
    values (s.id, s.utilizador_id, v_doc, 'FT ' || s.id, '2026-09-10', 7146)
    returning id into v_fatura;

    delete from public.contratos_versoes where contrato_id = s.id;
    insert into public.contratos_versoes (contrato_id, utilizador_id, valido_desde, valido_ate, mensalidade_cents, documento_id, motivo)
    values (s.id, s.utilizador_id, '2025-01-01', '2026-06-30', 6000, v_doc2, 'inicial')
    returning id into v_fechada;
    insert into public.contratos_versoes (contrato_id, utilizador_id, valido_desde, mensalidade_cents, documento_id, motivo)
    values (s.id, s.utilizador_id, '2026-07-01', 7146, v_doc2, 'renegociacao');

    insert into public.achados_monitor (contrato_id, utilizador_id, fatura_id, tipo, versao_regra, chave_idempotencia)
    values (s.id, s.utilizador_id, v_fatura, 'aumento_nao_explicado', 'acomp_v1', 'teste-' || s.id)
    returning id into v_achado;
    insert into public.achados_revisoes (achado_id, decisao, revisor_id)
    values (v_achado, 'pedir_informacao', '00000000-0000-4000-d000-00000000000b');

    insert into public.eventos_servico (contrato_id, utilizador_id, fatura_id, tipo, base, severidade, versao_regra, chave, contrato_versao_id, achado_id)
    values (s.id, s.utilizador_id, v_fatura, 'diferenca_preco_contrato', 'contrato', 'atencao', 'acomp_v1', 'ev-' || s.id, v_fechada, v_achado),
           (s.id, s.utilizador_id, null, 'contrato_adicionado', 'documento', 'info', 'acomp_v1', 'ev2-' || s.id, v_fechada, null);

    insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo) values (s.id, 'fidelizacao_60d', '2026-12-01');
  end loop;
end $$;

-- Documento do cliente A por associar, com sugestão para o 2.º serviço.
insert into public.documentos_monitor (id, utilizador_id, tipo, storage_path, associacao_estado, associacao_sugerida) values
  ('91000000-0000-4000-d000-0000000000a9', '00000000-0000-4000-d000-00000000000a', 'fatura', 'da/por-associar.pdf', 'possivel',
   '90000000-0000-4000-d000-0000000000a2');

-- Documento do cliente B (não pode ser tocado).
insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path) values
  ('91000000-0000-4000-d000-0000000000b1', '00000000-0000-4000-d000-00000000000b', '90000000-0000-4000-d000-0000000000b1', 'fatura', 'db/f.pdf');

select is(testes.pendentes('2026-10-02'), 0::bigint, 'antes: o alerta de 60 dias de A já está reservado em ambos os serviços');
select is(testes.pendentes('2026-11-01'), 2::bigint, 'antes: alertas de 30 dias pendentes para os 2 serviços de A');

-- ===========================================================================
-- 1. Os registos de prova continuam só de inserção (UPDATE direto)
-- ===========================================================================
select is(testes.tenta($$update public.associacoes_documento set contrato_id = null where utilizador_id = '00000000-0000-4000-d000-00000000000a'$$),
  'erro:42501', 'associacoes_documento: UPDATE direto (mesmo para null) recusado');
select is(testes.tenta($$update public.documentos_tipo_alteracoes set contrato_id = null where utilizador_id = '00000000-0000-4000-d000-00000000000a'$$),
  'erro:42501', 'documentos_tipo_alteracoes: UPDATE direto recusado');
select is(testes.tenta($$update public.servicos_identificadores set documento_id = null where utilizador_id = '00000000-0000-4000-d000-00000000000a'$$),
  'erro:42501', 'servicos_identificadores: UPDATE direto recusado');
select is(testes.tenta($$update public.eventos_servico set contrato_versao_id = null where utilizador_id = '00000000-0000-4000-d000-00000000000a'$$),
  'erro:42501', 'eventos_servico: UPDATE direto da versão recusado');
select is(testes.tenta($$update public.contratos_versoes set documento_id = null where valido_ate is not null and utilizador_id = '00000000-0000-4000-d000-00000000000a'$$),
  'erro:42501', 'versão fechada: UPDATE direto recusado');

-- ===========================================================================
-- 2. Falha a meio: nada fica apagado
-- ===========================================================================
create function testes.falhar() returns trigger language plpgsql as $$
begin
  raise exception 'falha simulada';
end $$;
create trigger testes_falhar before delete on public.contratos_alertas_envios
  for each row execute function testes.falhar();

select is(testes.tenta($$delete from public.contratos_monitorizados where id = '90000000-0000-4000-d000-0000000000a1'$$),
  'erro:P0001', 'falha numa cascata: o DELETE é recusado por inteiro');
select is((select count(*) from public.contratos_monitorizados where id = '90000000-0000-4000-d000-0000000000a1'), 1::bigint, 'falha: o serviço mantém-se');
select is((select count(*) from public.documentos_monitor where contrato_id = '90000000-0000-4000-d000-0000000000a1'), 2::bigint, 'falha: os documentos mantêm-se');
select is((select count(*) from public.associacoes_documento where contrato_id = '90000000-0000-4000-d000-0000000000a1'), 2::bigint, 'falha: as associações mantêm-se');

drop trigger testes_falhar on public.contratos_alertas_envios;

-- ===========================================================================
-- 3. Cliente com 2 serviços apaga 1
-- ===========================================================================
select is(testes.tenta($$delete from public.contratos_monitorizados where id = '90000000-0000-4000-d000-0000000000a1'$$),
  'ok:1', 'com 2 serviços: apagar um funciona');
select is((select count(*) from public.contratos_monitorizados where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 1::bigint,
  'fica 1 serviço acompanhado');
select is(testes.pendentes('2026-11-01'), 1::bigint, 'só o serviço que ficou tem alertas pendentes');

-- ===========================================================================
-- 4. Cliente com 1 serviço apaga o último
-- ===========================================================================
select is(testes.tenta($$delete from public.contratos_monitorizados where id = '90000000-0000-4000-d000-0000000000a2'$$),
  'ok:1', 'o último serviço também se apaga');
select is((select count(*) from public.contratos_monitorizados where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 0::bigint,
  'o cliente fica com 0 serviços acompanhados');
select is(testes.pendentes('2026-10-02') + testes.pendentes('2026-11-01') + testes.pendentes('2026-12-01'), 0::bigint,
  'sem alertas pendentes (60, 30 dias e na data)');

select is((select count(*) from public.documentos_monitor where utilizador_id = '00000000-0000-4000-d000-00000000000a' and contrato_id is not null), 0::bigint,
  'documentos dos serviços apagados');
select is((select count(*) from public.contratos_alertas_envios e
            where e.contrato_id in ('90000000-0000-4000-d000-0000000000a1', '90000000-0000-4000-d000-0000000000a2')), 0::bigint,
  'sem reservas de alertas órfãs');
select is((select count(*) from public.eventos_servico where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 0::bigint, 'sem eventos órfãos');
select is((select count(*) from public.achados_monitor where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 0::bigint, 'sem achados órfãos');
select is((select count(*) from public.servicos_identificadores where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 0::bigint, 'sem identificadores órfãos');
select is((select count(*) from public.contratos_versoes where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 0::bigint, 'sem versões órfãs');
select is((select count(*) from public.faturas_monitor where utilizador_id = '00000000-0000-4000-d000-00000000000a'), 0::bigint, 'sem faturas órfãs');

-- O documento por associar (de nenhum serviço) fica, sem a sugestão apagada.
select is((select associacao_sugerida from public.documentos_monitor where id = '91000000-0000-4000-d000-0000000000a9'), null::uuid,
  'documento por associar fica, sem sugestão para o serviço apagado');

-- ===========================================================================
-- 5. Subscrição, casos e Stripe inalterados; outro cliente intocado
-- ===========================================================================
select is(testes.acesso(), (select v from acesso_antes), 'user_access (plano, estado, casos, IDs do Stripe) inalterado');
select ok(public.protecao_ativa((select subscription_plan from public.user_access where user_id = '00000000-0000-4000-d000-00000000000a'),
                                (select subscription_status from public.user_access where user_id = '00000000-0000-4000-d000-00000000000a')),
  'a Proteção continua ativa');
select is((select count(*) from public.contratos_monitorizados where utilizador_id = '00000000-0000-4000-d000-00000000000b'), 1::bigint, 'serviço do cliente B intocado');
select is((select count(*) from public.documentos_monitor where utilizador_id = '00000000-0000-4000-d000-00000000000b'), 1::bigint, 'documento do cliente B intocado');

-- ===========================================================================
-- 6. Depois de ficar a 0, o cliente volta a acrescentar um serviço
-- ===========================================================================
select is(testes.tenta($$insert into public.contratos_monitorizados (utilizador_id, setor, fornecedor, data_fim_fidelizacao)
                         values ('00000000-0000-4000-d000-00000000000a', 'telecomunicacoes', 'DIGI', '2026-12-01')$$),
  'ok:1', 'um serviço novo pode ser acrescentado');
select is(testes.pendentes('2026-11-01'), 1::bigint, 'o serviço novo volta a ter alertas');

-- ===========================================================================
-- 7. Limpeza dos 6 meses: apagar um documento com identificadores
-- ===========================================================================
do $$
declare v_doc uuid;
begin
  insert into public.documentos_monitor (utilizador_id, contrato_id, tipo, storage_path, desativado_em)
  values ('00000000-0000-4000-d000-00000000000b', '90000000-0000-4000-d000-0000000000b1', 'fatura', 'db/expirado.pdf', now() - interval '1 year')
  returning id into v_doc;
  insert into public.servicos_identificadores (contrato_id, utilizador_id, tipo, valor_normalizado, origem, documento_id)
  values ('90000000-0000-4000-d000-0000000000b1', '00000000-0000-4000-d000-00000000000b', 'numero_servico', '912345678', 'fatura', v_doc);
end $$;

select ok(public.apagar_documento_monitor_expirado((select id from public.documentos_monitor where storage_path = 'db/expirado.pdf')),
  'documento expirado com identificadores é apagado');
select is((select documento_id from public.servicos_identificadores where valor_normalizado = '912345678'), null::uuid,
  'o identificador fica no serviço, sem o documento apagado');

select * from finish();
rollback;
