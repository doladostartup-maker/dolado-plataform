-- DoLado — Acompanhamento de serviços (contrato + faturas)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: o cliente só lê os próprios identificadores, versões, eventos e
-- decisões de associação, e nunca escreve; eventos "atencao" só ficam
-- visíveis depois de o achado ser comunicado; identificadores e auditoria
-- são só de inserção; versões fechadas não mudam; a versão do contrato ignora
-- valores lidos de faturas; reanálise substitui eventos (nunca apaga) e
-- marca achados que deixaram de se verificar; a fatura fica "em verificação"
-- enquanto houver achados por rever; o mesmo número de fatura não entra duas
-- vezes no mesmo serviço. Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
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

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('00000000-0000-4000-e000-00000000000a', 'sa@teste.invalid', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-e000-00000000000b', 'sb@teste.invalid', 'authenticated', 'authenticated', now());

insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('80000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', 'telecomunicacoes'),
  ('80000000-0000-4000-e000-0000000000b1', '00000000-0000-4000-e000-00000000000b', 'telecomunicacoes');

insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path) values
  ('81000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', '80000000-0000-4000-e000-0000000000a1', 'fatura', 'sa/f1.pdf'),
  ('81000000-0000-4000-e000-0000000000a2', '00000000-0000-4000-e000-00000000000a', '80000000-0000-4000-e000-0000000000a1', 'fatura', 'sa/f2.pdf');

insert into public.faturas_monitor (id, contrato_id, utilizador_id, documento_id, numero_fatura, data_emissao, total_cents) values
  ('82000000-0000-4000-e000-0000000000a1', '80000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a',
   '81000000-0000-4000-e000-0000000000a1', 'FT 1', '2026-09-10', 7146);

insert into public.servicos_identificadores (contrato_id, utilizador_id, tipo, valor_normalizado, apresentacao, origem) values
  ('80000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', 'referencia_conta', '215960347', '215960347', 'fatura');

-- ===========================================================================
-- 1. Privilégios e RLS
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.monitor_eventos_substituir(uuid, uuid, jsonb, text)', 'EXECUTE'), 'eventos: só o servidor');
select ok(not has_function_privilege('authenticated', 'public.monitor_versao_nova(uuid, date, text)', 'EXECUTE'), 'versão nova: só o servidor');
select ok(has_function_privilege('service_role', 'public.monitor_versao_nova(uuid, date, text)', 'EXECUTE'), 'versão nova: service_role');
select ok(not has_table_privilege('authenticated', 'public.servicos_identificadores', 'INSERT'), 'identificadores: cliente sem INSERT');
select ok(not has_table_privilege('authenticated', 'public.eventos_servico', 'UPDATE'), 'eventos: cliente sem UPDATE');
select ok(not has_table_privilege('authenticated', 'public.associacoes_documento', 'INSERT'), 'associações: cliente sem INSERT');

select testes.como('00000000-0000-4000-e000-00000000000a');
select is((select count(*) from public.servicos_identificadores), 1::bigint, 'A vê os próprios identificadores');
select is(testes.tenta($$insert into public.servicos_identificadores (contrato_id, utilizador_id, tipo, valor_normalizado, origem) values ('80000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', 'cpe', 'PT0001', 'cliente')$$),
  'erro:42501', 'A não cria identificadores');
select testes.como('00000000-0000-4000-e000-00000000000b');
select is((select count(*) from public.servicos_identificadores), 0::bigint, 'B não vê identificadores de A');
select is((select count(*) from public.faturas_monitor), 0::bigint, 'B não vê faturas de A');
reset role;

-- ===========================================================================
-- 2. Só inserção / imutabilidade
-- ===========================================================================
select is(testes.tenta($$update public.servicos_identificadores set valor_normalizado = 'X123'$$), 'erro:42501', 'identificadores: só inserção');
select is(testes.tenta($$insert into public.servicos_identificadores (contrato_id, utilizador_id, tipo, valor_normalizado, origem) values ('80000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000b', 'cpe', 'PT0002', 'fatura')$$),
  'erro:42501', 'identificador de B não aponta para serviço de A');
select is(testes.tenta($$insert into public.faturas_monitor (contrato_id, utilizador_id, documento_id, numero_fatura) values ('80000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', '81000000-0000-4000-e000-0000000000a2', 'FT 1')$$),
  'erro:23505', 'R. o mesmo número de fatura não entra duas vezes no mesmo serviço');
select is(testes.tenta($$update public.documentos_monitor set associacao_sugerida = '80000000-0000-4000-e000-0000000000b1' where id = '81000000-0000-4000-e000-0000000000a2'$$),
  'erro:42501', 'sugestão de associação só para serviços do próprio cliente');

insert into public.associacoes_documento (documento_id, utilizador_id, contrato_id, decisao, papel)
values ('81000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', '80000000-0000-4000-e000-0000000000a1', 'associar_mesmo_assim', 'cliente');
select is(testes.tenta($$update public.associacoes_documento set decisao = 'automatica'$$), 'erro:42501', 'auditoria de associação: só inserção');

-- ===========================================================================
-- 3. Versões do contrato
-- ===========================================================================
-- Valor lido de uma fatura (legado) nunca é condição contratual.
select public.monitor_campo_aceitar(public.monitor_campo_propor('80000000-0000-4000-e000-0000000000a1', 'mensalidade_cents', '5396'::jsonb, 'fatura'), null);
select is((select count(*) from public.contratos_versoes where contrato_id = '80000000-0000-4000-e000-0000000000a1'), 0::bigint,
  'mensalidade lida de fatura não cria versão do contrato');

select public.monitor_campo_definir('80000000-0000-4000-e000-0000000000a1', 'mensalidade_cents', '7146'::jsonb, 'cliente');
select is((select mensalidade_cents from public.contratos_versoes where contrato_id = '80000000-0000-4000-e000-0000000000a1' and valido_ate is null), 7146,
  'condição do contrato cria a versão em vigor');

select public.monitor_versao_nova('80000000-0000-4000-e000-0000000000a1', '2026-07-01', 'alteracao_tarifaria');
select public.monitor_campo_definir('80000000-0000-4000-e000-0000000000a1', 'mensalidade_cents', '7446'::jsonb, 'cliente');
select results_eq(
  $$select valido_desde, valido_ate, mensalidade_cents from public.contratos_versoes where contrato_id = '80000000-0000-4000-e000-0000000000a1' order by valido_desde nulls first$$,
  $$values (null::date, '2026-06-30'::date, 7146), ('2026-07-01'::date, null::date, 7446)$$,
  'O. duas versões: a antiga fecha na véspera e mantém o preço antigo'
);
select is(testes.tenta($$update public.contratos_versoes set mensalidade_cents = 1 where valido_ate is not null$$), 'erro:42501', 'versão fechada não muda');
select is(testes.tenta($$select public.monitor_versao_nova('80000000-0000-4000-e000-0000000000a1', '2026-06-01', 'outro')$$), 'erro:22023',
  'alteração não pode começar antes da versão em vigor');

-- Alteração + decisões na mesma transação: uma decisão inválida desfaz a versão.
select public.monitor_campo_propor('80000000-0000-4000-e000-0000000000a1', 'mensalidade_cents', '7646'::jsonb, 'contrato');
select is(testes.tenta($$select public.monitor_campos_decidir('00000000-0000-4000-e000-00000000000a', '80000000-0000-4000-e000-0000000000a1',
  '[{"campo_id":"00000000-0000-4000-e000-000000000000","acao":"aceitar"}]'::jsonb, '2026-10-01', 'nova_promocao')$$), 'erro:P0002', 'decisão inválida falha');
select is((select count(*) from public.contratos_versoes where contrato_id = '80000000-0000-4000-e000-0000000000a1'), 2::bigint,
  'nenhuma versão nova fica criada quando as decisões falham (atómico)');
select public.monitor_campos_decidir('00000000-0000-4000-e000-00000000000a', '80000000-0000-4000-e000-0000000000a1',
  (select jsonb_agg(jsonb_build_object('campo_id', id, 'acao', 'aceitar')) from public.contratos_campos
    where contrato_id = '80000000-0000-4000-e000-0000000000a1' and estado in ('proposto', 'em_conflito')), '2026-10-01', 'nova_promocao');
select results_eq(
  $$select valido_desde, mensalidade_cents from public.contratos_versoes where contrato_id = '80000000-0000-4000-e000-0000000000a1' order by valido_desde nulls first$$,
  $$values (null::date, 7146), ('2026-07-01'::date, 7446), ('2026-10-01'::date, 7646)$$,
  'N/P. alteração aceite pelo cliente: terceira versão a partir de 01/10'
);

-- ===========================================================================
-- 4. Eventos, achados e revisão humana
-- ===========================================================================
select is(public.monitor_eventos_substituir('80000000-0000-4000-e000-0000000000a1', '82000000-0000-4000-e000-0000000000a1', $$[
  {"tipo":"consumo_adicional","base":"historico","severidade":"info","periodo":"2026-09-10","montante_cents":500,"dados":{},"versao_regra":"acomp_v1","chave":"acomp_v1:f:consumo"},
  {"tipo":"mensalidade_alterada","base":"historico","severidade":"atencao","periodo":"2026-09-10","montante_cents":300,"dados":{"sentido":"aumento"},"versao_regra":"acomp_v1","chave":"acomp_v1:f:alt",
   "achado":{"tipo":"mensalidade_alterada","versao_regra":"acomp_v1","evidencia":{"texto_proposto":"A mensalidade aumentou 3,00 €."}}}
]$$::jsonb, 'atencao'), 2, 'grava 2 eventos');
select is((select count(*) from public.achados_monitor where chave_idempotencia = 'acomp_v1:f:alt' and estado = 'detetado'), 1::bigint, 'evento atencao cria achado por rever');
select ok((select em_verificacao from public.faturas_monitor where id = '82000000-0000-4000-e000-0000000000a1'), 'fatura fica em verificação');

select testes.como('00000000-0000-4000-e000-00000000000a');
select is((select count(*) from public.eventos_servico), 1::bigint, 'cliente não vê o evento atencao antes da revisão');
reset role;

update public.achados_monitor set estado = 'comunicado', texto_cliente = 'A mensalidade aumentou 3,00 €.', comunicado_em = now()
 where chave_idempotencia = 'acomp_v1:f:alt';
select ok(not (select em_verificacao from public.faturas_monitor where id = '82000000-0000-4000-e000-0000000000a1'), 'comunicado: deixa de estar em verificação');
select testes.como('00000000-0000-4000-e000-00000000000a');
select is((select count(*) from public.eventos_servico), 2::bigint, 'depois de comunicado, o cliente vê o evento');
select testes.como('00000000-0000-4000-e000-00000000000b');
select is((select count(*) from public.eventos_servico), 0::bigint, 'B não vê eventos de A');
reset role;

-- Reanálise (ex.: contrato adicionado): substitui, nunca apaga; achado por
-- rever que deixa de se verificar fica obsoleto.
select public.monitor_eventos_substituir('80000000-0000-4000-e000-0000000000a1', '82000000-0000-4000-e000-0000000000a1', $$[
  {"tipo":"promocao_em_falta","base":"historico","severidade":"atencao","periodo":"2026-09-10","montante_cents":2900,"dados":{},"versao_regra":"acomp_v1","chave":"acomp_v1:f:promo",
   "achado":{"tipo":"promocao_em_falta","versao_regra":"acomp_v1","evidencia":{}}}
]$$::jsonb, 'atencao');
select public.monitor_eventos_substituir('80000000-0000-4000-e000-0000000000a1', '82000000-0000-4000-e000-0000000000a1', $$[
  {"tipo":"mensalidade_conforme","base":"contrato","severidade":"ok","periodo":"2026-09-10","montante_cents":7146,"dados":{},"versao_regra":"acomp_v1","chave":"acomp_v1:f:conforme"}
]$$::jsonb, 'ok');
select is((select count(*) from public.eventos_servico where fatura_id = '82000000-0000-4000-e000-0000000000a1'), 4::bigint, 'M. reanálise preserva os eventos anteriores');
select is((select count(*) from public.eventos_servico where fatura_id = '82000000-0000-4000-e000-0000000000a1' and substituido_em is null), 1::bigint, 'só os novos ficam ativos');
select is((select estado from public.achados_monitor where chave_idempotencia = 'acomp_v1:f:promo'), 'obsoleto', 'achado por rever que deixou de se verificar: obsoleto');
select is((select estado from public.achados_monitor where chave_idempotencia = 'acomp_v1:f:alt'), 'comunicado', 'achado já comunicado nunca muda');
select ok(not (select em_verificacao from public.faturas_monitor where id = '82000000-0000-4000-e000-0000000000a1'), 'sem achados por rever: fora de verificação');
select is(testes.tenta($$update public.eventos_servico set montante_cents = 1$$), 'erro:42501', 'eventos não se reescrevem');
select is(testes.tenta($$select public.monitor_eventos_substituir('80000000-0000-4000-e000-0000000000b1', '82000000-0000-4000-e000-0000000000a1', '[]'::jsonb)$$),
  'erro:42501', 'eventos de uma fatura só no serviço dela');

select * from finish();
rollback;
