-- DoLado — Monitor de Proteção (base)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que o cliente só lê os próprios dados e nunca escreve; que só lê
-- achados comunicados; que as funções do servidor não são chamáveis pela
-- API; que a proveniência é imutável e coerente com o dono; que uma
-- extração nunca substitui em silêncio um valor do cliente; que os alertas
-- de datas saem a 60/30 dias e na data, só com Proteção, uma única vez; e
-- que o fim da Proteção desativa e a limpeza só apaga contratos sem
-- documentos. Tudo numa transação revertida.

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

create function testes.pendentes(h date) returns table (contrato_id uuid, regra text, data_alvo date) language sql as $$
  select p.contrato_id, p.regra, p.data_alvo from public.monitor_alertas_pendentes(h) p
   where p.email in ('a@teste.invalid', 'b@teste.invalid');
$$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-f000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"A"}'),
  ('00000000-0000-4000-f000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"B"}');

insert into public.user_access (user_id, subscription_plan, subscription_status) values
  ('00000000-0000-4000-f000-00000000000a', 'caso_protecao', 'active'),
  ('00000000-0000-4000-f000-00000000000b', 'protecao', 'active');

insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('70000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a', 'telecomunicacoes'),
  ('70000000-0000-4000-f000-0000000000b1', '00000000-0000-4000-f000-00000000000b', 'telecomunicacoes');

insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path, sha256) values
  ('71000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a', '70000000-0000-4000-f000-0000000000a1',
   'fatura', 'a/f1.pdf', repeat('a', 64));

insert into public.achados_monitor (id, contrato_id, utilizador_id, tipo, estado, versao_regra, chave_idempotencia, texto_cliente, comunicado_em) values
  ('72000000-0000-4000-f000-0000000000a1', '70000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a',
   'linha_nova', 'em_revisao', 'f2_linha_nova_v1', 'k1', null, null),
  ('72000000-0000-4000-f000-0000000000a2', '70000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a',
   'linha_nova', 'comunicado', 'f2_linha_nova_v1', 'k2', 'Apareceu uma cobrança nova.', now());

-- ===========================================================================
-- 1. Privilégios: funções do servidor fora da API
-- ===========================================================================
select ok(not has_function_privilege('authenticated', 'public.monitor_campo_definir(uuid, text, jsonb, text, uuid)', 'EXECUTE'), 'definir campo: não executável pelo cliente');
select ok(not has_function_privilege('authenticated', 'public.monitor_campo_propor(uuid, text, jsonb, text, uuid, uuid, integer, text, text)', 'EXECUTE'), 'propor campo: não executável pelo cliente');
select ok(not has_function_privilege('authenticated', 'public.monitor_campo_aceitar(uuid, text)', 'EXECUTE'), 'aceitar campo: não executável pelo cliente');
select ok(not has_function_privilege('anon', 'public.monitor_alertas_pendentes(date)', 'EXECUTE'), 'pendentes: não executável por anon');
select ok(not has_function_privilege('authenticated', 'public.monitor_reservar_alerta(uuid, text, date)', 'EXECUTE'), 'reservar alerta: não executável pelo cliente');
select ok(has_function_privilege('service_role', 'public.monitor_alertas_pendentes(date)', 'EXECUTE'), 'pendentes: Edge Function (service_role)');
select ok(has_function_privilege('service_role', 'public.monitor_campo_propor(uuid, text, jsonb, text, uuid, uuid, integer, text, text)', 'EXECUTE'), 'propor: servidor (service_role)');
select ok(not has_function_privilege('service_role', 'public.limpar_alertas_desativados()', 'EXECUTE'), 'limpeza: só pg_cron (postgres)');
select ok(not has_table_privilege('authenticated', 'public.contratos_monitorizados', 'INSERT'), 'contratos: cliente sem INSERT');
select ok(not has_table_privilege('authenticated', 'public.contratos_campos', 'UPDATE'), 'proveniência: cliente sem UPDATE');
select ok(not has_table_privilege('authenticated', 'public.uso_api_claude', 'INSERT'), 'custo da API: cliente sem INSERT');

-- ===========================================================================
-- 2. RLS: o cliente só lê o que é seu, e nunca escreve
-- ===========================================================================
select testes.como('00000000-0000-4000-f000-00000000000a');
select is((select count(*) from public.contratos_monitorizados), 1::bigint, 'A vê só o próprio contrato');
select is((select count(*) from public.documentos_monitor), 1::bigint, 'A vê o próprio documento');
select is((select count(*) from public.achados_monitor), 1::bigint, 'A só vê o achado comunicado');
select is((select count(*) from public.extracoes_documento), 0::bigint, 'A não lê extrações');
select is((select count(*) from public.uso_api_claude), 0::bigint, 'A não lê custos da API');
select is(testes.tenta($$insert into public.contratos_monitorizados (utilizador_id) values ('00000000-0000-4000-f000-00000000000a')$$), 'erro:42501', 'A não cria contratos');
select is(testes.tenta($$update public.contratos_monitorizados set fornecedor = 'X'$$), 'erro:42501', 'A não altera contratos');
select is(testes.tenta($$delete from public.documentos_monitor$$), 'erro:42501', 'A não apaga documentos');
select is(testes.tenta($$update public.achados_monitor set estado = 'comunicado'$$), 'erro:42501', 'A não altera achados');

select testes.como('00000000-0000-4000-f000-00000000000b');
select is((select count(*) from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 0::bigint, 'B não vê o contrato de A');
select is((select count(*) from public.documentos_monitor), 0::bigint, 'B não vê documentos de A');
select is((select count(*) from public.achados_monitor), 0::bigint, 'B não vê achados de A');

select testes.como('00000000-0000-4000-f000-00000000000c');
select is((select count(*) from public.contratos_monitorizados), 0::bigint, 'conta sem dados não vê nada');
reset role;

update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-f000-00000000000b';
select testes.como('00000000-0000-4000-f000-00000000000b');
select is((select count(*) from public.achados_monitor where contrato_id = '70000000-0000-4000-f000-0000000000a1'), 2::bigint, 'admin vê todos os achados');
select is(testes.tenta($$update public.contratos_monitorizados set fornecedor = 'X'$$), 'erro:42501', 'admin também só escreve pelo servidor');
reset role;
update public.utilizadores set role = 'cliente' where id = '00000000-0000-4000-f000-00000000000b';

-- ===========================================================================
-- 3. Coerência do dono
-- ===========================================================================
select is(testes.tenta($$insert into public.documentos_monitor (utilizador_id, contrato_id, storage_path) values ('00000000-0000-4000-f000-00000000000b', '70000000-0000-4000-f000-0000000000a1', 'b/x.pdf')$$),
  'erro:42501', 'documento de B não pode apontar para contrato de A');
select is(testes.tenta($$insert into public.documentos_monitor (utilizador_id, storage_path, sha256) values ('00000000-0000-4000-f000-00000000000a', 'a/f2.pdf', repeat('a', 64))$$),
  'erro:23505', 'o mesmo ficheiro (hash) do mesmo cliente não entra duas vezes');

-- ===========================================================================
-- 4. Campos: proveniência, propostas, conflitos
-- ===========================================================================
-- Fatura propõe mensalidade e fim de fidelização.
select isnt(public.monitor_campo_propor('70000000-0000-4000-f000-0000000000a1', 'mensalidade_cents', '4299', 'fatura',
  '71000000-0000-4000-f000-0000000000a1', null, 1, 'Mensalidade 42,99 €', 'high'), null, 'proposta criada');
select is((select mensalidade_cents from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), null,
  'proposta não altera o valor atual antes de aceite');

select public.monitor_campo_aceitar(
  (select id from public.contratos_campos where contrato_id = '70000000-0000-4000-f000-0000000000a1' and campo = 'mensalidade_cents'),
  'cliente');
select is((select mensalidade_cents from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 4299,
  'aceite pelo cliente: valor atual atualizado');

-- O cliente corrige: o valor anterior fica substituído.
select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000a1', 'mensalidade_cents', '3999', 'cliente');
select is((select mensalidade_cents from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 3999, 'correção do cliente aplicada');
select is((select estado from public.contratos_campos where contrato_id = '70000000-0000-4000-f000-0000000000a1' and campo = 'mensalidade_cents' and valor = '4299'),
  'substituido', 'valor anterior preservado como substituido');

-- Nova fatura com valor diferente: nunca substitui em silêncio o valor do cliente.
select public.monitor_campo_propor('70000000-0000-4000-f000-0000000000a1', 'mensalidade_cents', '4499', 'fatura');
select is((select mensalidade_cents from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 3999, 'valor do cliente mantém-se');
select is((select estado from public.contratos_campos where contrato_id = '70000000-0000-4000-f000-0000000000a1' and valor = '4499'), 'em_conflito', 'extração diferente fica em conflito');
select is((select estado from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 'a_confirmar', 'contrato passa a a_confirmar');

-- O cliente rejeita: o contrato deixa de estar a confirmar.
select public.monitor_campo_rejeitar((select id from public.contratos_campos where contrato_id = '70000000-0000-4000-f000-0000000000a1' and valor = '4499'));
select is((select estado from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 'parcial', 'conflito rejeitado: contrato volta a parcial');

-- Extração igual ao valor atual: não cria linhas novas.
select is(public.monitor_campo_propor('70000000-0000-4000-f000-0000000000a1', 'mensalidade_cents', '3999', 'fatura'),
  (select id from public.contratos_campos where contrato_id = '70000000-0000-4000-f000-0000000000a1' and campo = 'mensalidade_cents' and estado = 'atual'),
  'valor igual: devolve o atual, sem duplicar');

-- Um contrato telecom fica completo com os dados do cálculo do custo de saída.
select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000a1', 'fornecedor', '"Vodafone"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000a1', 'data_inicio', to_jsonb(current_date - 100), 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000a1', 'data_fim_fidelizacao', to_jsonb(current_date + 45), 'cliente');
select is((select estado from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 'parcial', 'telecom sem vantagem: parcial');
select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000a1', 'vantagem_cents', '12000', 'cliente');
select is((select estado from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 'completo', 'telecom com todos os dados: completo');
select is((select data_fim_fidelizacao from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), current_date + 45, 'data guardada como date');

-- Proveniência imutável.
select is(testes.tenta($$update public.contratos_campos set valor = '1' where campo = 'vantagem_cents'$$), 'erro:42501', 'valor de um campo não pode ser reescrito');
select is(testes.tenta($$select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000a1', 'nao_existe', '1', 'cliente')$$), 'erro:23514', 'campo fora da lista é rejeitado');
select is(testes.tenta($$select public.monitor_campo_propor('70000000-0000-4000-f000-0000000000a1', 'mensalidade_cents', '1', 'cliente')$$), 'erro:22023', 'propostas só vêm de documentos');

-- Extração bem-sucedida única por documento + modelo + schema + prompt.
insert into public.extracoes_documento (documento_id, modelo, schema_versao, prompt_versao, estado)
values ('71000000-0000-4000-f000-0000000000a1', 'claude-sonnet-5-5', 'telecom_invoice_v1', 'p1', 'sucesso');
select is(testes.tenta($$insert into public.extracoes_documento (documento_id, modelo, schema_versao, prompt_versao, estado) values ('71000000-0000-4000-f000-0000000000a1', 'claude-sonnet-5-5', 'telecom_invoice_v1', 'p1', 'sucesso')$$),
  'erro:23505', 'mesma extração não é repetida');
select is(testes.tenta($$insert into public.extracoes_documento (documento_id, modelo, schema_versao, prompt_versao, estado) values ('71000000-0000-4000-f000-0000000000a1', 'claude-sonnet-5-5', 'telecom_invoice_v1', 'p2', 'sucesso')$$),
  'ok:1', 'prompt novo permite reprocessar');

-- Revisões de achados: só inserção.
insert into public.achados_revisoes (achado_id, decisao, revisor_id)
values ('72000000-0000-4000-f000-0000000000a1', 'confirmar', '00000000-0000-4000-f000-00000000000b');
select is(testes.tenta($$update public.achados_revisoes set decisao = 'descartar'$$), 'erro:42501', 'revisão não pode ser alterada');

-- ===========================================================================
-- 5. Alertas de datas: 60 / 30 dias e na data, uma única vez
-- ===========================================================================
-- A: fidelização a 45 dias → 60d.
select results_eq($$select regra from testes.pendentes(current_date) where contrato_id = '70000000-0000-4000-f000-0000000000a1'$$,
  array['fidelizacao_60d'], 'a 45 dias: alerta dos 60 dias');
select is(public.monitor_reservar_alerta('70000000-0000-4000-f000-0000000000a1', 'fidelizacao_60d', current_date + 45), true, 'reserva feita');
select is(public.monitor_reservar_alerta('70000000-0000-4000-f000-0000000000a1', 'fidelizacao_60d', current_date + 45), false, 'segunda reserva recusada');
select is((select count(*) from testes.pendentes(current_date) where contrato_id = '70000000-0000-4000-f000-0000000000a1'), 0::bigint, 'reservado: deixa de estar pendente');

-- 20 dias depois → 30d (o de 60 já não volta).
select results_eq($$select regra from testes.pendentes(current_date + 20) where contrato_id = '70000000-0000-4000-f000-0000000000a1'$$,
  array['fidelizacao_30d'], 'a 25 dias: alerta dos 30 dias');
-- No dia → fim; no dia seguinte ainda (cron falhado); depois, nada.
select results_eq($$select regra from testes.pendentes(current_date + 45) where contrato_id = '70000000-0000-4000-f000-0000000000a1'$$,
  array['fidelizacao_fim'], 'na data: alerta de fim');
select results_eq($$select regra from testes.pendentes(current_date + 46) where contrato_id = '70000000-0000-4000-f000-0000000000a1'$$,
  array['fidelizacao_fim'], 'dia seguinte: ainda envia o de fim');
select is((select count(*) from testes.pendentes(current_date + 47) where contrato_id = '70000000-0000-4000-f000-0000000000a1'), 0::bigint, 'dois dias depois: nada');

-- Libertar a reserva quando o envio falha.
select public.monitor_libertar_alerta('70000000-0000-4000-f000-0000000000a1', 'fidelizacao_60d', current_date + 45);
select is((select count(*) from testes.pendentes(current_date) where contrato_id = '70000000-0000-4000-f000-0000000000a1'), 1::bigint, 'reserva libertada: volta a pendente');

-- Promoção a 90 dias: ainda nada; refidelização (data nova) gera alertas novos.
select public.monitor_campo_definir('70000000-0000-4000-f000-0000000000b1', 'data_fim_promocao', to_jsonb(current_date + 90), 'cliente');
select is((select count(*) from testes.pendentes(current_date) where contrato_id = '70000000-0000-4000-f000-0000000000b1'), 0::bigint, 'a 90 dias: sem alerta');
select results_eq($$select regra from testes.pendentes(current_date + 40) where contrato_id = '70000000-0000-4000-f000-0000000000b1'$$,
  array['promocao_60d'], 'promoção a 50 dias: alerta dos 60 dias');

-- Contrato criado depois da data: sem alerta de fim.
insert into public.contratos_monitorizados (id, utilizador_id, data_fim_fidelizacao, created_at)
values ('70000000-0000-4000-f000-0000000000b2', '00000000-0000-4000-f000-00000000000b', current_date - 1, now());
select is((select count(*) from testes.pendentes(current_date) where contrato_id = '70000000-0000-4000-f000-0000000000b2'), 0::bigint, 'data já passada na criação: sem alerta de fim');

-- E-mail por confirmar: sem alertas.
update auth.users set email_confirmed_at = null where id = '00000000-0000-4000-f000-00000000000b';
select is((select count(*) from testes.pendentes(current_date + 40) where contrato_id = '70000000-0000-4000-f000-0000000000b1'), 0::bigint, 'e-mail por confirmar: sem alertas');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-f000-00000000000b';

-- ===========================================================================
-- 6. Fim da Proteção e conservação
-- ===========================================================================
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select desativado_em from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), now(), 'fim da Proteção: contrato desativado');
select is((select desativado_em from public.documentos_monitor where id = '71000000-0000-4000-f000-0000000000a1'), now(), 'fim da Proteção: documento desativado');
select is((select count(*) from testes.pendentes(current_date) where contrato_id = '70000000-0000-4000-f000-0000000000a1'), 0::bigint, 'sem Proteção: sem alertas');
select is((select desativado_em from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000b1'), null, 'outra conta não é afetada');

-- Voltar à Proteção dentro do prazo reativa.
update public.user_access set subscription_plan = 'protecao', subscription_status = 'active'
 where user_id = '00000000-0000-4000-f000-00000000000a';
select is((select desativado_em from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), null, 'Proteção de volta: contrato reativado');
select is((select desativado_em from public.documentos_monitor where id = '71000000-0000-4000-f000-0000000000a1'), null, 'Proteção de volta: documento reativado');

-- Passados 6 meses: o documento é listado para apagar o ficheiro primeiro;
-- o contrato só é apagado quando já não tem documentos.
update public.contratos_monitorizados set desativado_em = now() - interval '7 months' where id = '70000000-0000-4000-f000-0000000000a1';
update public.documentos_monitor set desativado_em = now() - interval '7 months' where id = '71000000-0000-4000-f000-0000000000a1';
select is((select count(*) from public.monitor_documentos_expirados() where id = '71000000-0000-4000-f000-0000000000a1'), 1::bigint, 'documento expirado listado');
select public.limpar_alertas_desativados();
select is((select count(*) from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 1::bigint, 'contrato com documento ainda não é apagado');
select is(public.apagar_documento_monitor_expirado('71000000-0000-4000-f000-0000000000a1'), true, 'documento expirado apagado (após o ficheiro)');
select public.limpar_alertas_desativados();
select is((select count(*) from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000a1'), 0::bigint, 'contrato sem documentos apagado aos 6 meses');
select is((select count(*) from public.contratos_campos where contrato_id = '70000000-0000-4000-f000-0000000000a1'), 0::bigint, 'proveniência apagada com o contrato');
select is((select count(*) from public.contratos_monitorizados where id = '70000000-0000-4000-f000-0000000000b1'), 1::bigint, 'contrato ativo não é apagado');
select is(public.apagar_documento_monitor_expirado('71000000-0000-4000-f000-0000000000a1'), false, 'apagar duas vezes: sem efeito');

select * from finish();
rollback;
