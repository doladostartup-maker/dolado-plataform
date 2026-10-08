-- DoLado — Testes de segurança RLS (isolamento entre utilizadores)
--
-- Correr com:   supabase test db
-- (contra a stack local — `supabase start` — nunca contra produção)
--
-- Tudo corre dentro de uma transação revertida no fim: os utilizadores e
-- dados de teste nunca ficam gravados. Os testes correm com os papéis reais
-- da API (anon / authenticated) e um JWT simulado — nunca com service_role,
-- que ignora RLS e não provaria nada.
--
-- Convenção: "negado" = erro de permissão/RLS OU zero linhas afetadas (o
-- RLS filtra UPDATE/DELETE em silêncio). Depois de cada tentativa negada,
-- confirma-se como superutilizador que o dado ficou intacto.

begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Ajudantes (só existem dentro desta transação)
-- ---------------------------------------------------------------------------
create schema testes;
grant usage on schema testes to anon, authenticated;

-- Muda o papel para anon (uid null) ou authenticated com o sub indicado.
-- Tem de ser chamado depois de `reset role` (authenticated não pode mudar
-- para anon diretamente).
create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', uid, 'role', 'authenticated', 'email', uid::text || '@teste.invalid')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

-- Executa SQL com o papel atual; devolve 'ok:<linhas>' ou 'erro:<sqlstate>'.
create function testes.tenta(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'erro:' || sqlstate;
end $$;

create function testes.negado(q text) returns boolean language sql as $$
  select r like 'erro:%' or r = 'ok:0' from testes.tenta(q) r;
$$;

create function testes.permitido(q text) returns boolean language sql as $$
  select r like 'ok:%' and r <> 'ok:0' from testes.tenta(q) r;
$$;

create function testes.contar(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) s', q) into n;
  return n;
exception when others then
  return -1; -- sem privilégio de leitura conta como "não vê nada"
end $$;

grant execute on all functions in schema testes to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Dados de teste (como superutilizador)
-- ---------------------------------------------------------------------------
-- USER_A, USER_B: clientes. USER_C: cliente sem user_access. ADMIN: admin.
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Utilizador A"}'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Utilizador B"}'),
  ('00000000-0000-4000-a000-00000000000c', 'c@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Utilizador C"}'),
  ('00000000-0000-4000-a000-0000000000ad', 'admin@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-a000-0000000000ad';

insert into public.casos (id, utilizador_id, nome, email, descricao) values
  ('10000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso de A'),
  ('10000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'B', 'b@teste.invalid', 'caso de B');

insert into public.anexos (id, caso_id, nome_ficheiro, caminho_storage) values
  ('11000000-0000-4000-a000-00000000000a', '10000000-0000-4000-a000-00000000000a', 'a.pdf', 'casoA/a.pdf'),
  ('11000000-0000-4000-a000-00000000000b', '10000000-0000-4000-a000-00000000000b', 'b.pdf', 'casoB/b.pdf');

insert into public.casos_elegibilidade_portal (id, utilizador_id, email, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema) values
  ('12000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'Energia', '6_12m', false, 'A'),
  ('12000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'b@teste.invalid', 'Energia', '6_12m', false, 'B');

insert into public.contratos_monitorizados (id, utilizador_id, setor, fornecedor, data_fim_fidelizacao) values
  ('14000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'telecomunicacoes', 'Op A', '2027-01-01'),
  ('14000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'telecomunicacoes', 'Op B', '2027-01-05');

insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path) values
  ('15000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', '14000000-0000-4000-a000-00000000000a', 'fatura', '00000000-0000-4000-a000-00000000000a/f.pdf'),
  ('15000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', '14000000-0000-4000-a000-00000000000b', 'fatura', '00000000-0000-4000-a000-00000000000b/f.pdf');

insert into public.preferencias_setor (utilizador_id, setor) values
  ('00000000-0000-4000-a000-00000000000a', 'Energia'),
  ('00000000-0000-4000-a000-00000000000b', 'Energia');

insert into public.stripe_payments (id, user_id, stripe_session_id, email, plano) values
  ('16000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'cs_teste_a', 'a@teste.invalid', 'avulso'),
  ('16000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'cs_teste_b', 'b@teste.invalid', 'assinatura');

insert into public.user_access (user_id, nivel_acesso, subscription_plan, subscription_status, case_credits, avulso_credits) values
  ('00000000-0000-4000-a000-00000000000a', 'avulso', 'none', null, 1, 1),
  ('00000000-0000-4000-a000-00000000000b', 'assinatura', 'caso_protecao', 'active', 0, 0);

insert into public.stripe_webhook_events (event_id, tipo) values ('evt_teste', 'invoice.paid');
insert into public.conversoes_avulso (id, stripe_payment_id, user_id, plano_destino, valor_avulso_centimos, valor_primeira_mensalidade_centimos, refund_montante_centimos) values
  ('1a000000-0000-4000-a000-00000000000a', '16000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'protecao', 1499, 499, 1000);
insert into public.case_credit_grants (origem, user_id, quantidade, estado, produto) values
  ('checkout:cs_teste_a', '00000000-0000-4000-a000-00000000000a', 1, 'disponivel', 'avulso'),
  ('invoice:in_teste_b', '00000000-0000-4000-a000-00000000000b', 1, null, null);
insert into public.stripe_subscriptions (stripe_subscription_id, stripe_customer_id, status) values
  ('sub_teste_b', 'cus_teste_b', 'active');

insert into public.avisos_setoriais (id, setor, titulo, descricao, criado_por_admin_id) values
  ('18000000-0000-4000-a000-000000000001', 'Energia', 'Aviso', 'Texto', '00000000-0000-4000-a000-0000000000ad');

insert into public.templates (id, nome, texto) values
  ('19000000-0000-4000-a000-000000000001', 'Modelo', 'Texto {{nome}}');

insert into storage.objects (bucket_id, name) values
  ('anexos-casos',       'casoA/a.pdf'),
  ('anexos-casos',       'casoB/b.pdf'),
  ('documentos-monitor', '00000000-0000-4000-a000-00000000000a/f.pdf'),
  ('documentos-monitor', '00000000-0000-4000-a000-00000000000b/f.pdf');

-- ===========================================================================
-- 1. ANON (sem sessão) — nada privado é visível nem alterável
-- ===========================================================================
select testes.como(null);

select ok(testes.contar('select * from public.utilizadores') <= 0, 'anon: SELECT utilizadores → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.casos') <= 0, 'anon: SELECT casos → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.anexos') <= 0, 'anon: SELECT anexos → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.casos_elegibilidade_portal') <= 0, 'anon: SELECT casos_elegibilidade_portal → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.contratos_monitorizados') <= 0, 'anon: SELECT contratos_monitorizados → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.documentos_monitor') <= 0, 'anon: SELECT documentos_monitor → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.contratos_campos') <= 0, 'anon: SELECT contratos_campos → nada (0 linhas ou sem permissão)');
select ok(to_regclass('public.alertas_fidelizacao_portal') is null and to_regclass('public.alertas_promocao_portal') is null
      and to_regclass('public.comparacoes_fatura_portal') is null, 'tabelas antigas (alertas e comparador) já não existem');
select ok(testes.contar('select * from public.preferencias_setor') <= 0, 'anon: SELECT preferencias_setor → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.stripe_payments') <= 0, 'anon: SELECT stripe_payments → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.user_access') <= 0, 'anon: SELECT user_access → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.stripe_webhook_events') <= 0, 'anon: SELECT stripe_webhook_events → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from public.stripe_subscriptions') <= 0, 'anon: SELECT stripe_subscriptions → nada (0 linhas ou sem permissão)');
select ok(testes.negado($$insert into public.stripe_webhook_events (event_id, tipo) values ('evt_anon', 'x')$$), 'anon: não reclama eventos do webhook');
select ok(testes.contar('select * from public.avisos_setoriais') <= 0, 'anon: SELECT avisos_setoriais → nada (0 linhas ou sem permissão)');
select ok(testes.contar('select * from storage.objects') <= 0, 'anon: SELECT storage.objects → nada (0 linhas ou sem permissão)');
select is(testes.contar('select * from public.templates'), 1::bigint, 'anon: SELECT templates → permitido (público por decisão de produto)');

select ok(testes.negado($$insert into public.casos (nome, email) values ('x', 'x@teste.invalid')$$), 'anon: INSERT casos → negado');
select ok(testes.negado($$insert into public.templates (nome, texto) values ('x', 'x')$$), 'anon: INSERT templates → negado');
select ok(testes.negado($$update public.casos set notas = 'x'$$), 'anon: UPDATE casos → negado');
select ok(testes.negado($$delete from public.casos$$), 'anon: DELETE casos → negado');
select ok(testes.negado($$update public.templates set texto = 'x'$$), 'anon: UPDATE templates → negado');
select ok(testes.negado($$delete from public.templates$$), 'anon: DELETE templates → negado');
select ok(testes.negado($$insert into storage.objects (bucket_id, name) values ('anexos-casos', 'anon/x.pdf')$$), 'anon: upload para anexos-casos → negado');
select is(testes.tenta('select public.is_admin()'), 'erro:42501', 'anon: RPC is_admin() → sem permissão de execução');
select ok(testes.tenta('select public.handle_new_user()') like 'erro:%', 'anon: RPC handle_new_user() → falha');

-- Privilégios mínimos (defesa em profundidade — o RLS é a barreira principal)
reset role;
select is(
  (select count(*) from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE')
          or has_table_privilege('anon', c.oid, 'DELETE') or has_table_privilege('anon', c.oid, 'TRUNCATE'))),
  0::bigint, 'privilégios: anon sem INSERT/UPDATE/DELETE/TRUNCATE em nenhuma tabela de public');
select is(
  (select count(*) from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
     and (has_table_privilege('authenticated', c.oid, 'TRUNCATE') or has_table_privilege('authenticated', c.oid, 'TRIGGER')
          or has_table_privilege('authenticated', c.oid, 'REFERENCES'))),
  0::bigint, 'privilégios: authenticated sem TRUNCATE/TRIGGER/REFERENCES');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'), 'privilégios: handle_new_user() não executável pela API');
select ok(not has_function_privilege('authenticated', 'public.avisos_setor_destinatarios(text)', 'EXECUTE') and not has_function_privilege('anon', 'public.avisos_setor_destinatarios(text)', 'EXECUTE'), 'privilégios: avisos_setor_destinatarios() só service_role (lê auth.users)');
select ok(has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE'), 'privilégios: is_admin() executável por authenticated (as policies precisam)');
select ok(not has_function_privilege('authenticated', 'public.notificar_novo_caso()', 'EXECUTE') and not has_function_privilege('anon', 'public.notificar_novo_caso()', 'EXECUTE'), 'privilégios: notificar_novo_caso() não executável pela API');
select is(
  (select count(*) from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint, 'RLS ativo em todas as tabelas de public');
select is(
  (select count(*) from pg_views where schemaname = 'public'), 0::bigint,
  'sem views em public (se surgir uma, auditar security_invoker e acrescentar testes)');
select is(
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and p.proname not in ('handle_new_user', 'is_admin', 'rls_auto_enable', 'notificar_novo_caso', 'casos_evento_dossie',
                                                      'alertas_seguir_protecao', 'avisos_setor_destinatarios',
                           'monitor_recalcular_estado', 'monitor_fim_fidelizacao_calcular', 'monitor_campo_aceitar', 'monitor_campo_rejeitar',
                           'monitor_campo_propor', 'monitor_campo_definir', 'monitor_campos_decidir', 'monitor_alertas_pendentes',
                           'monitor_reservar_alerta', 'monitor_libertar_alerta', 'monitor_ficheiros_orfaos',
                           -- 20261004090000: só service_role (ou trigger), search_path fixo
                           'monitor_valor_contratual', 'monitor_versao_sincronizar', 'monitor_versao_nova',
                           'monitor_eventos_substituir', 'faturas_monitor_atualizar_verificacao',
                           -- 20261005100000: só service_role; testes em monitor_tipo_documento.test.sql
                           'monitor_documento_alterar_tipo',
                           -- 20261006160000: trigger (sem execute para clientes); testes em monitor_fatura_do_caso.test.sql
                           'documentos_monitor_anexo_dono',
                           -- compras sem conta / associação (só service_role; testes em compras_sem_conta.test.sql)
                           'conta_existe_com_email', 'registar_compra_sem_conta', 'reclamar_compra_sem_conta',
                           'compras_sem_conta_pendentes', 'reservar_lembrete_compra', 'compras_sem_conta_resolver_ao_ligar',
                           -- 20261006100000: trigger do histórico de estados (só insere esse registo); testes em acompanhamento_pos_envio.test.sql
                           'casos_registar_estado',
                           -- Programa de indicação: só service_role (métricas: só admin), testes em indicacoes.test.sql.
                           'indicacao_conta_ja_cliente', 'indicacao_atribuir', 'indicacao_confirmar_compra',
                           'indicacao_reservar_recompensa', 'indicacao_atualizar_reserva', 'indicacao_usar_recompensa',
                           'indicacao_libertar_reserva', 'indicacao_reverter_compra', 'indicacao_rever_recompensa',
                           'indicacoes_metricas', 'indicacoes_expirar_recompensas',
                           'indicacoes_recompensas_registar_historico',
                           'origem_aquisicao_registar',
                           -- 20261008100000: resumo mensal da Proteção (só service_role); testes em resumo_mensal.test.sql
                           'protecao_resumo_destinatarios', 'protecao_resumo_reservar', 'protecao_resumo_concluir')), 0::bigint,
  'sem novas funções SECURITY DEFINER em public por auditar');
-- monitor_* (Monitor de Proteção): escrita controlada de contratos/proveniência e alertas
-- de datas; só service_role (servidor/Edge Function), search_path fixo. Testes em
-- monitor_protecao.test.sql.
select is(
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and p.proname like 'monitor\_%'
     and (has_function_privilege('authenticated', p.oid, 'EXECUTE') or has_function_privilege('anon', p.oid, 'EXECUTE'))),
  0::bigint, 'privilégios: funções monitor_* não executáveis pela API');
-- casos_evento_dossie (trigger): só insere o evento "dossiê disponível"; search_path fixo; fora da API.
select ok(not has_function_privilege('authenticated', 'public.casos_evento_dossie()', 'EXECUTE') and not has_function_privilege('anon', 'public.casos_evento_dossie()', 'EXECUTE'), 'privilégios: casos_evento_dossie() não executável pela API');
select ok((select 'search_path=""' = any (proconfig) from pg_proc where proname = 'casos_evento_dossie'), 'casos_evento_dossie(): search_path fixo');
select is(
  (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')), 0::bigint,
  'todas as funções SECURITY DEFINER fixam search_path');
select is((select count(*) from storage.buckets where public), 0::bigint, 'nenhum bucket público');

-- ===========================================================================
-- 2. USER_A — próprios dados permitidos, dados de USER_B negados
-- ===========================================================================
reset role;
select testes.como('00000000-0000-4000-a000-00000000000a');

-- utilizadores / escalada de privilégios
select is(testes.contar('select * from public.utilizadores'), 1::bigint, 'A: vê só o próprio perfil');
select is(testes.contar($$select * from public.utilizadores where id = '00000000-0000-4000-a000-00000000000b'$$), 0::bigint, 'A: não vê o perfil de B pelo id');
select ok(testes.negado($$update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não se promove a admin');
select ok(testes.negado($$update public.utilizadores set nome = 'x' where id = '00000000-0000-4000-a000-00000000000b'$$), 'A: não altera o perfil de B');
select ok(testes.negado($$delete from public.utilizadores where id = '00000000-0000-4000-a000-00000000000b'$$), 'A: não apaga o perfil de B');
select is(public.is_admin(), false, 'A: is_admin() → false');

-- casos
select is(testes.contar('select * from public.casos'), 1::bigint, 'A: lista só o próprio caso');
select is(testes.contar($$select * from public.casos where id = '10000000-0000-4000-a000-00000000000b'$$), 0::bigint, 'A: não lê o caso de B mesmo conhecendo o UUID');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, descricao, autorizacao) values ('00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'novo', true)$$), 'A (com plano): não cria caso direto pela API — tem de gastar crédito no servidor');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email) values ('00000000-0000-4000-a000-00000000000b', 'A', 'a@teste.invalid')$$), 'A: não cria caso em nome de B');
select ok(testes.negado($$insert into public.casos (nome, email) values ('A', 'a@teste.invalid')$$), 'A: não cria caso sem utilizador_id (órfão)');
select ok(testes.negado($$update public.casos set descricao = 'x' where id = '10000000-0000-4000-a000-00000000000b'$$), 'A: não altera o caso de B');
select ok(testes.negado($$update public.casos set utilizador_id = '00000000-0000-4000-a000-00000000000a' where id = '10000000-0000-4000-a000-00000000000b'$$), 'A: não se apropria do caso de B');
select ok(testes.negado($$update public.casos set status = 'Resolvido' where id = '10000000-0000-4000-a000-00000000000a'$$), 'A: não altera o estado do próprio caso diretamente');
select ok(testes.negado($$delete from public.casos where id = '10000000-0000-4000-a000-00000000000b'$$), 'A: não apaga o caso de B');
select ok(testes.negado($$delete from public.casos where id = '10000000-0000-4000-a000-00000000000a'$$), 'A: não apaga o próprio caso (só pelo backoffice)');
-- atribuição em massa: campos internos na criação do caso
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, status) values ('00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'Resolvido')$$), 'A: não cria caso já com status interno');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, dossie_url) values ('00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'https://exemplo.invalid')$$), 'A: não cria caso com dossie_url');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, valor_indicado, tipo_abc) values ('00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 999, 'A')$$), 'A: não cria caso com valor_indicado/tipo_abc');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, primeira_resposta_em) values ('00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', now())$$), 'A: não marca primeira_resposta_em');

-- anexos (só admin; o cliente não lê anexos diretamente, nem os próprios)
select is(testes.contar('select * from public.anexos'), 0::bigint, 'A: não lê anexos (nem os do próprio caso) diretamente');
select is(testes.contar($$select a.* from public.anexos a join public.casos c on c.id = a.caso_id$$), 0::bigint, 'A: join casos→anexos não revela anexos');
select ok(testes.negado($$insert into public.anexos (caso_id, nome_ficheiro, caminho_storage) values ('10000000-0000-4000-a000-00000000000b', 'x', 'casoB/x')$$), 'A: não associa anexo ao caso de B');
select ok(testes.negado($$insert into public.anexos (caso_id, nome_ficheiro, caminho_storage) values ('10000000-0000-4000-a000-00000000000a', 'x', 'casoA/x')$$), 'A: não insere anexo diretamente (só pelo servidor)');
select ok(testes.negado($$delete from public.anexos where id = '11000000-0000-4000-a000-00000000000b'$$), 'A: não apaga anexo de B');

-- casos_elegibilidade_portal (legado desde 01/10/2026: o cliente já não lê)
select ok(testes.contar('select * from public.casos_elegibilidade_portal') <= 0, 'A: não lê a elegibilidade antiga (nem a própria)');
select is(testes.contar($$select * from public.casos_elegibilidade_portal where id = '12000000-0000-4000-a000-00000000000b'$$), 0::bigint, 'A: não lê a elegibilidade de B pelo UUID');
select ok(testes.negado($$insert into public.casos_elegibilidade_portal (utilizador_id, email, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema) values ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'Energia', '6_12m', false, 'x')$$), 'A: não cria elegibilidade');
select ok(testes.negado($$insert into public.casos_elegibilidade_portal (utilizador_id, email, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema) values ('00000000-0000-4000-a000-00000000000b', 'a@teste.invalid', 'Energia', '6_12m', false, 'x')$$), 'A: não cria elegibilidade em nome de B');
select ok(testes.negado($$update public.casos_elegibilidade_portal set estado_final = 'elegivel' where id = '12000000-0000-4000-a000-00000000000a'$$), 'A: não altera estado_final da própria elegibilidade');
select ok(testes.negado($$update public.casos_elegibilidade_portal set descricao_problema = 'x' where id = '12000000-0000-4000-a000-00000000000b'$$), 'A: não altera a elegibilidade de B');
select ok(testes.negado($$delete from public.casos_elegibilidade_portal where id = '12000000-0000-4000-a000-00000000000b'$$), 'A: não apaga a elegibilidade de B');

-- contratos do Monitor de Proteção (o cliente só lê os próprios)
select is(testes.contar('select * from public.contratos_monitorizados'), 1::bigint, 'A: vê só o próprio contrato monitorizado');
select is(testes.contar($$select * from public.contratos_monitorizados where id = '14000000-0000-4000-a000-00000000000b'$$), 0::bigint, 'A: não lê o contrato de B pelo UUID');
select is(testes.contar('select * from public.documentos_monitor'), 1::bigint, 'A: vê só os próprios documentos do Monitor');
select ok(testes.negado($$insert into public.contratos_monitorizados (utilizador_id) values ('00000000-0000-4000-a000-00000000000a')$$), 'A: não cria contratos pela API (só pelo servidor)');
select ok(testes.negado($$update public.contratos_monitorizados set fornecedor = 'x' where id = '14000000-0000-4000-a000-00000000000a'$$), 'A: não altera o próprio contrato diretamente');
select ok(testes.negado($$update public.contratos_monitorizados set utilizador_id = '00000000-0000-4000-a000-00000000000a' where id = '14000000-0000-4000-a000-00000000000b'$$), 'A: não se apropria do contrato de B');
select ok(testes.negado($$delete from public.contratos_monitorizados where id = '14000000-0000-4000-a000-00000000000b'$$), 'A: não apaga o contrato de B');
select ok(testes.negado($$insert into public.documentos_monitor (utilizador_id, storage_path) values ('00000000-0000-4000-a000-00000000000a', 'x.pdf')$$), 'A: não regista documentos pela API');

-- preferencias_setor
select is(testes.contar('select * from public.preferencias_setor'), 1::bigint, 'A: vê só as próprias preferências');
select ok(testes.permitido($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-a000-00000000000a', 'Água')$$), 'A: acrescenta preferência própria');
select ok(testes.negado($$insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-a000-00000000000b', 'Água')$$), 'A: não cria preferência em nome de B');
select ok(testes.negado($$delete from public.preferencias_setor where utilizador_id = '00000000-0000-4000-a000-00000000000b'$$), 'A: não apaga preferências de B');
select ok(testes.negado($$update public.preferencias_setor set utilizador_id = '00000000-0000-4000-a000-00000000000b' where utilizador_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não transfere preferências para B');

-- stripe_payments / user_access — benefícios comerciais
select is(testes.contar('select * from public.stripe_payments'), 1::bigint, 'A: vê só os próprios pagamentos');
select ok(testes.negado($$insert into public.stripe_payments (user_id, stripe_session_id, email, plano) values ('00000000-0000-4000-a000-00000000000a', 'cs_falso', 'a@teste.invalid', 'assinatura')$$), 'A: não regista um pagamento falso');
select ok(testes.negado($$update public.stripe_payments set plano = 'assinatura' where id = '16000000-0000-4000-a000-00000000000a'$$), 'A: não altera o plano do próprio pagamento');
select ok(testes.negado($$delete from public.stripe_payments where id = '16000000-0000-4000-a000-00000000000a'$$), 'A: não apaga pagamentos');
select is(testes.contar('select * from public.user_access'), 1::bigint, 'A: vê só o próprio nível de acesso');
select ok(testes.negado($$update public.user_access set nivel_acesso = 'assinatura' where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não se promove de avulso a assinatura');
select ok(testes.negado($$update public.user_access set nivel_acesso = 'nenhum' where user_id = '00000000-0000-4000-a000-00000000000b'$$), 'A: não altera o nível de acesso de B');
select ok(testes.negado($$delete from public.user_access where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não apaga o próprio nível de acesso');
select ok(testes.negado($$update public.user_access set case_credits = 99 where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não aumenta os próprios créditos de caso');
select ok(testes.negado($$update public.user_access set avulso_credits = 1 where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não altera os próprios casos Avulso');
select ok(testes.negado($$update public.case_credit_grants set estado = 'disponivel'$$), 'A: não reativa compras Avulso');
select ok(testes.tenta($$select public.retirar_credito_avulso('checkout:cs_teste_a', 'convertido')$$) like 'erro:%', 'A: não chama retirar_credito_avulso');
select ok(testes.negado($$update public.user_access set subscription_plan = 'caso_protecao', subscription_status = 'active' where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não se ativa um plano');
select ok(testes.tenta($$select public.conceder_credito_caso('00000000-0000-4000-a000-00000000000a', 'origem-falsa', null)$$) like 'erro:%', 'A: não chama conceder_credito_caso');
select ok(testes.tenta($$select public.devolver_credito_caso('00000000-0000-4000-a000-00000000000a', 'subscricao')$$) like 'erro:%', 'A: não chama devolver_credito_caso');
select ok(testes.tenta($$select public.consumir_credito_caso('00000000-0000-4000-a000-00000000000b')$$) like 'erro:%', 'A: não chama consumir_credito_caso');
select is(testes.contar('select * from public.case_credit_grants'), 1::bigint, 'A: vê só os próprios créditos concedidos');
select ok(testes.negado($$insert into public.case_credit_grants (origem, user_id, quantidade) values ('forjada', '00000000-0000-4000-a000-00000000000a', 1)$$), 'A: não regista créditos');
select ok(testes.negado($$update public.stripe_payments set credito_upgrade_em = null where id = '16000000-0000-4000-a000-00000000000a'$$), 'A: não reabre o crédito de upgrade da própria compra');
select is(testes.contar('select * from public.conversoes_avulso'), 1::bigint, 'A: vê a própria conversão');
select ok(testes.negado($$update public.conversoes_avulso set estado = 'checkout_aberto', refund_montante_centimos = 1499$$), 'A: não altera a conversão (estado/montante do reembolso)');
select ok(testes.negado($$insert into public.conversoes_avulso (stripe_payment_id, user_id, plano_destino, valor_avulso_centimos, valor_primeira_mensalidade_centimos, refund_montante_centimos) values ('16000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'protecao', 1499, 499, 1000)$$), 'A: não cria conversões');
select ok(testes.negado($$delete from public.conversoes_avulso$$), 'A: não apaga conversões');

-- stripe_webhook_events / stripe_subscriptions — só o backend escreve
select ok(testes.contar('select * from public.stripe_webhook_events') <= 0, 'A: não lê eventos do webhook Stripe');
select ok(testes.contar('select * from public.stripe_subscriptions') <= 0, 'A: não lê subscrições Stripe');
select ok(testes.negado($$insert into public.stripe_webhook_events (event_id, tipo) values ('evt_falso', 'invoice.paid')$$), 'A: não marca um evento como já processado');
select ok(testes.negado($$delete from public.stripe_webhook_events where event_id = 'evt_teste'$$), 'A: não apaga eventos do webhook');
select ok(testes.negado($$insert into public.stripe_subscriptions (stripe_subscription_id, stripe_customer_id, status) values ('sub_falsa', 'cus_falso', 'active')$$), 'A: não cria uma subscrição ativa falsa');
select ok(testes.negado($$update public.stripe_subscriptions set status = 'active'$$), 'A: não altera o estado de subscrições');

-- tabelas só de admin
select ok(to_regclass('public.alertas_fidelizacao') is null, 'alertas_fidelizacao (alerta público retirado) já não existe');
select is(testes.contar('select * from public.avisos_setoriais'), 0::bigint, 'A: não lê avisos sectoriais');
select ok(testes.negado($$insert into public.avisos_setoriais (setor, titulo, descricao, criado_por_admin_id) values ('Energia', 'x', 'x', '00000000-0000-4000-a000-00000000000a')$$), 'A: não cria avisos sectoriais');
select ok(testes.negado($$update public.templates set texto = 'x'$$), 'A: não altera templates');
select ok(testes.negado($$insert into public.templates (nome, texto) values ('x', 'x')$$), 'A: não cria templates');

-- storage (todos os buckets são só de admin; uploads entram pelo servidor)
select is(testes.contar('select * from storage.objects'), 0::bigint, 'A: não lista ficheiros em nenhum bucket (nem os próprios)');
select ok(testes.negado($$insert into storage.objects (bucket_id, name) values ('documentos-monitor', '00000000-0000-4000-a000-00000000000a/x.pdf')$$), 'A: não faz upload direto para documentos-monitor');
select ok(testes.negado($$insert into storage.objects (bucket_id, name) values ('anexos-casos', 'casoB/x.pdf')$$), 'A: não faz upload para a pasta de B');
select ok(testes.negado($$update storage.objects set name = 'roubado.pdf' where name = 'casoB/b.pdf'$$), 'A: não substitui/renomeia ficheiro de B');
select ok(testes.negado($$delete from storage.objects where name = 'casoB/b.pdf'$$), 'A: não apaga ficheiro de B');

-- Campos de decisão/resultado não forjáveis pelo cliente (corrigido a 30/09/2026).
-- Ficam como TODO: documentam o comportamento atual sem falhar a suite.
-- Quando a decisão for tomada e implementada, retirar o todo().
select ok(testes.negado($$insert into public.casos_elegibilidade_portal (utilizador_id, email, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema, estado_final) values ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'Energia', '6_12m', false, 'x', 'elegivel')$$), 'A: não cria elegibilidade já com estado_final (decisão humana)');
select ok(testes.negado($$insert into public.casos_elegibilidade_portal (utilizador_id, email, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema, sugestao_ia_estado) values ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'Energia', '6_12m', false, 'x', 'elegivel')$$), 'A: não forja a sugestão da IA');
-- Alertas do Monitor: o destinatário é sempre o e-mail atual e confirmado da
-- conta (monitor_alertas_pendentes, só service_role); o cliente não guarda
-- nenhum e-mail de envio.
reset role;
update auth.users set email_confirmed_at = now() where id in ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b');
grant usage on schema testes to service_role;
grant execute on all functions in schema testes to service_role;
set local role service_role;
select is((select email from public.monitor_alertas_pendentes('2026-12-01') where contrato_id = '14000000-0000-4000-a000-00000000000b'),
  'b@teste.invalid', 'pendentes (Monitor): devolve o e-mail da conta');
select is((select count(*) from public.monitor_alertas_pendentes('2026-12-01') where contrato_id = '14000000-0000-4000-a000-00000000000a'),
  0::bigint, 'pendentes (Monitor): A (sem Proteção) não recebe alertas');
reset role;
update auth.users set email = 'b-novo@teste.invalid' where id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is((select email from public.monitor_alertas_pendentes('2026-12-01') where contrato_id = '14000000-0000-4000-a000-00000000000b'),
  'b-novo@teste.invalid', 'pendentes (Monitor): segue o e-mail atual da conta (mudança de e-mail)');
reset role;
update auth.users set email = 'b@teste.invalid' where id = '00000000-0000-4000-a000-00000000000b';
select testes.como('00000000-0000-4000-a000-00000000000b');

-- ===========================================================================
-- 2b. Plano: USER_B (assinatura) usa os alertas; USER_C (sem plano) não
-- ===========================================================================
reset role;
select testes.como('00000000-0000-4000-a000-00000000000b');
select is(testes.contar('select * from public.contratos_monitorizados'), 1::bigint, 'B (assinatura): vê o próprio contrato');
select ok(testes.negado($$insert into public.contratos_monitorizados (utilizador_id) values ('00000000-0000-4000-a000-00000000000b')$$), 'B (assinatura): mesmo com Proteção, só o servidor cria contratos');
select is(public.tem_protecao(), true, 'B: tem_protecao() → true');
reset role;
select testes.como('00000000-0000-4000-a000-00000000000c');
select is(public.tem_protecao(), false, 'C: tem_protecao() → false');
select ok(testes.negado($$insert into public.casos (utilizador_id, nome, email, descricao, autorizacao) values ('00000000-0000-4000-a000-00000000000c', 'C', 'c@teste.invalid', 'novo', true)$$), 'C (conta sem compra): não cria caso pela API — criar conta não dá direito a um caso');
reset role;
select testes.como('00000000-0000-4000-a000-00000000000a');
select is(public.tem_protecao(), false, 'A (Avulso): tem_protecao() → false');
reset role;

-- ===========================================================================
-- 2c. Créditos de caso (funções do backend, como service_role)
-- ===========================================================================
reset role;
set local role service_role;
select is(public.conceder_credito_caso('00000000-0000-4000-a000-00000000000b', 'invoice:in_1', 4), true, 'créditos: 1.ª fatura credita');
select is(public.conceder_credito_caso('00000000-0000-4000-a000-00000000000b', 'invoice:in_1', 4), false, 'créditos: a mesma fatura não credita duas vezes');
select public.conceder_credito_caso('00000000-0000-4000-a000-00000000000b', 'invoice:in_' || i, 4) from generate_series(2, 6) i;
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 4, 'créditos: mensais acumulam até 4');
select is(public.conceder_credito_caso('00000000-0000-4000-a000-00000000000b', 'checkout:cs_avulso_b', null), true, 'créditos: Avulso credita');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 5, 'créditos: Avulso soma-se sem limite de 4');
select is(public.consumir_credito_caso('00000000-0000-4000-a000-00000000000b'), 'subscricao', 'créditos: consome com saldo (subscrição primeiro)');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 4, 'créditos: saldo desce 1');
update public.user_access set case_credits = 0, avulso_credits = 0 where user_id = '00000000-0000-4000-a000-00000000000b';
select is(public.consumir_credito_caso('00000000-0000-4000-a000-00000000000b'), null::text, 'créditos: sem saldo não consome');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 0, 'créditos: nunca abaixo de zero');
-- Reserva do crédito de upgrade: só um pedido a consegue fazer.
reset role;
select is(testes.tenta($$update public.stripe_payments set credito_upgrade_em = now() where id = '16000000-0000-4000-a000-00000000000a' and estado = 'concluido' and credito_upgrade_em is null$$), 'ok:1', 'upgrade: 1.ª reserva da compra Avulso');
select is(testes.tenta($$update public.stripe_payments set credito_upgrade_em = now() where id = '16000000-0000-4000-a000-00000000000a' and estado = 'concluido' and credito_upgrade_em is null$$), 'ok:0', 'upgrade: a mesma compra não é reservada duas vezes');

-- ===========================================================================
-- 2d. Gestão de Subscrição: auditoria de cancelamentos e casos congelados
-- ===========================================================================
reset role;
insert into public.subscricao_cancelamentos (user_id, stripe_subscription_id, plano, origem, motivo_codigo, pedido_em, fim_previsto_em) values
  ('00000000-0000-4000-a000-00000000000b', 'sub_teste_b', 'caso_protecao', 'cliente', 'preco', now(), now() + interval '20 days');
insert into public.case_credit_freezes (user_id, stripe_subscription_id, quantidade, congelado_em, expira_em) values
  ('00000000-0000-4000-a000-00000000000a', 'sub_antiga_a', 2, now(), now() + interval '90 days');

select testes.como('00000000-0000-4000-a000-00000000000a');
select is(testes.contar('select * from public.subscricao_cancelamentos'), 0::bigint, 'A: não lê cancelamentos (nem os de B)');
select ok(testes.negado($$insert into public.subscricao_cancelamentos (user_id, stripe_subscription_id, origem) values ('00000000-0000-4000-a000-00000000000a', 'sub_x', 'cliente')$$), 'A: não regista cancelamentos');
select ok(testes.negado($$update public.subscricao_cancelamentos set revertido_em = now()$$), 'A: não reverte cancelamentos');
select is(testes.contar('select * from public.case_credit_freezes'), 1::bigint, 'A: vê só os próprios casos congelados');
select ok(testes.negado($$insert into public.case_credit_freezes (user_id, stripe_subscription_id, quantidade, congelado_em, expira_em) values ('00000000-0000-4000-a000-00000000000a', 'forjado', 4, now(), now() + interval '1 day')$$), 'A: não cria casos congelados');
select ok(testes.negado($$update public.case_credit_freezes set expira_em = now() + interval '10 years'$$), 'A: não prolonga o prazo dos casos congelados');
select ok(testes.negado($$update public.user_access set cancel_at_period_end = true where user_id = '00000000-0000-4000-a000-00000000000a'$$), 'A: não agenda cancelamentos diretamente');
select ok(testes.tenta($$select public.congelar_creditos_caso('sub_teste_b', now(), 90)$$) like 'erro:%', 'A: não executa congelar_creditos_caso');
select ok(testes.tenta($$select public.restaurar_creditos_caso('sub_teste_b', now(), 4)$$) like 'erro:%', 'A: não executa restaurar_creditos_caso');
reset role;

-- Funções, como service_role. B: Caso + Proteção com 3 casos, 1 dos quais
-- Avulso (checkout:cs_avulso_b, concedido em 2c).
update public.user_access
   set stripe_subscription_id = 'sub_teste_b', subscription_plan = 'caso_protecao', subscription_status = 'active', case_credits = 3, avulso_credits = 1
 where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is(public.congelar_creditos_caso('sub_teste_b', now(), 90), 2, 'congelar: só os casos da subscrição (o Avulso fica)');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 1, 'congelar: o caso Avulso continua utilizável');
select is(public.congelar_creditos_caso('sub_teste_b', now(), 90), 0, 'congelar: repetido não congela outra vez');
select is((select count(*) from public.case_credit_freezes where stripe_subscription_id = 'sub_teste_b'), 1::bigint, 'congelar: um registo por fim de subscrição');
select ok((select expira_em - congelado_em = interval '90 days' from public.case_credit_freezes where stripe_subscription_id = 'sub_teste_b'), 'congelar: prazo de 90 dias');
reset role;
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is(public.restaurar_creditos_caso('sub_teste_b', now(), 4), 0, 'restaurar: sem Caso + Proteção ativo não restaura');
reset role;
update public.user_access
   set stripe_subscription_id = 'sub_nova_b', subscription_plan = 'protecao', subscription_status = 'active'
 where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is(public.restaurar_creditos_caso('sub_nova_b', now(), 4), 0, 'restaurar: nova subscrição só Proteção não restaura');
reset role;
update public.user_access set subscription_plan = 'caso_protecao' where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
select is(public.restaurar_creditos_caso('sub_nova_b', now() + interval '89 days', 4), 2, 'restaurar: Caso + Proteção dentro dos 90 dias recupera os casos');
select is((select case_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), 3, 'restaurar: casos de volta à conta');
select is(public.restaurar_creditos_caso('sub_nova_b', now() + interval '89 days', 4), 0, 'restaurar: repetido não duplica');
-- Fim da nova subscrição e regresso depois dos 90 dias: expirados.
select is(public.congelar_creditos_caso('sub_nova_b', now(), 90), 2, 'congelar: fim da nova subscrição');
select is(public.restaurar_creditos_caso('sub_nova_b', now() + interval '91 days', 4), 0, 'restaurar: depois dos 90 dias os casos não voltam');
-- Limite de 4.
reset role;
update public.user_access set case_credits = 3 where user_id = '00000000-0000-4000-a000-00000000000b';
set local role service_role;
-- B tem 3 casos, 1 deles Avulso (avulso_credits = 1): 2 da subscrição + 2
-- congelados. Desde 20261005190000_caso_extra, o limite de 4 conta só os
-- casos da subscrição — o Avulso pago fica à parte.
select is(public.restaurar_creditos_caso('sub_nova_b', now(), 4), 2, 'restaurar: respeita o limite de 4 nos casos da subscrição');
select is((select case_credits || '/' || avulso_credits from public.user_access where user_id = '00000000-0000-4000-a000-00000000000b'), '5/1', 'restaurar: 4 casos da subscrição + 1 Avulso');
reset role;
-- Repõe B como em 2c para as verificações seguintes.
update public.user_access
   set stripe_subscription_id = null, subscription_plan = 'caso_protecao', subscription_status = 'active', case_credits = 0, avulso_credits = 0
 where user_id = '00000000-0000-4000-a000-00000000000b';

-- ===========================================================================
-- 2e. Consentimentos da compra (prova antes do Checkout)
-- ===========================================================================
reset role;
insert into public.consentimentos_compra (id, user_id, email, plano, tipo_compra, origem, termos_versao, privacidade_versao,
  consentimento_inicio_imediato_versao, texto_aceitacao_termos, texto_consentimento_inicio_imediato, aceitou_termos_em, pediu_inicio_imediato_em) values
  ('1c000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'avulso', 'avulso', 'novo_caso',
   '2026-10-01', '2026-09-30', '2026-10-01', 'Li e aceito…', 'Peço expressamente…', now(), now()),
  ('1c000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'b@teste.invalid', 'caso_protecao', 'subscricao', 'portal',
   '2026-10-01', '2026-09-30', '2026-10-01', 'Li e aceito…', 'Peço expressamente…', now(), now()),
  ('1c000000-0000-4000-a000-0000000000c0', null, null, 'protecao', 'subscricao', 'landing',
   '2026-10-01', '2026-09-30', '2026-10-01', 'Li e aceito…', 'Peço expressamente…', now(), now());

select testes.como(null);
select ok(testes.contar('select * from public.consentimentos_compra') <= 0, 'anon: não lê consentimentos de compra');
select ok(testes.negado($$insert into public.consentimentos_compra (plano, tipo_compra, origem, termos_versao, privacidade_versao, consentimento_inicio_imediato_versao, texto_aceitacao_termos, texto_consentimento_inicio_imediato, aceitou_termos_em, pediu_inicio_imediato_em) values ('avulso','avulso','landing','x','x','x','x','x',now(),now())$$), 'anon: não cria consentimentos');
reset role;
select testes.como('00000000-0000-4000-a000-00000000000a');
select is(testes.contar('select * from public.consentimentos_compra'), 1::bigint, 'A: vê só o próprio consentimento de compra');
select ok(testes.negado($$insert into public.consentimentos_compra (user_id, plano, tipo_compra, origem, termos_versao, privacidade_versao, consentimento_inicio_imediato_versao, texto_aceitacao_termos, texto_consentimento_inicio_imediato, aceitou_termos_em, pediu_inicio_imediato_em) values ('00000000-0000-4000-a000-00000000000a','avulso','avulso','portal','x','x','x','x','x',now(),now())$$), 'A: não forja consentimentos');
select ok(testes.negado($$update public.consentimentos_compra set termos_versao = 'outra' where id = '1c000000-0000-4000-a000-00000000000a'$$), 'A: não altera o próprio consentimento');
select ok(testes.negado($$delete from public.consentimentos_compra where id = '1c000000-0000-4000-a000-00000000000a'$$), 'A: não apaga o próprio consentimento');
select ok(testes.negado($$update public.consentimentos_compra set checkout_session_id = 'cs_forjada' where id = '1c000000-0000-4000-a000-00000000000c0'$$), 'A: não liga sessões a consentimentos');
reset role;

grant usage on schema testes to service_role;
grant execute on all functions in schema testes to service_role;
set local role service_role;
select is(testes.tenta($$update public.consentimentos_compra set checkout_session_id = 'cs_c', email = 'c@teste.invalid', stripe_subscription_id = 'sub_c' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'ok:1', 'servidor: completa as ligações vazias');
select is(testes.tenta($$update public.consentimentos_compra set checkout_session_id = 'cs_c', email = 'c@teste.invalid' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'ok:1', 'servidor: webhook repetido com os mesmos valores não falha');
select is(testes.tenta($$update public.consentimentos_compra set checkout_session_id = 'cs_outra' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'erro:42501', 'servidor: não troca a sessão já ligada');
select is(testes.tenta($$update public.consentimentos_compra set texto_consentimento_inicio_imediato = 'outro texto' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'erro:42501', 'imutável: texto aceite não muda');
select is(testes.tenta($$update public.consentimentos_compra set termos_versao = '2099-01-01' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'erro:42501', 'imutável: versão dos Termos não muda');
select is(testes.tenta($$update public.consentimentos_compra set aceitou_termos_em = now() - interval '1 day' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'erro:42501', 'imutável: hora da aceitação não muda');
select is(testes.tenta($$update public.consentimentos_compra set user_id = '00000000-0000-4000-a000-00000000000b' where id = '1c000000-0000-4000-a000-00000000000a'$$), 'erro:42501', 'imutável: não passa para outra conta');
select is(testes.tenta($$update public.consentimentos_compra set user_id = '00000000-0000-4000-a000-00000000000c' where id = '1c000000-0000-4000-a000-0000000000c0'$$), 'ok:1', 'servidor: liga a conta criada depois da compra');
select is(testes.tenta($$insert into public.consentimentos_compra (plano, tipo_compra, origem, termos_versao, privacidade_versao, consentimento_inicio_imediato_versao, texto_aceitacao_termos, texto_consentimento_inicio_imediato, aceitou_termos_em, pediu_inicio_imediato_em, checkout_session_id) values ('avulso','avulso','landing','x','x','x','x','x',now(),now(),'cs_c')$$), 'erro:23505', 'uma sessão só pode estar ligada a um consentimento');
reset role;

-- ===========================================================================
-- 2f. Pedidos de livre resolução (função online — grava só o servidor)
-- ===========================================================================
reset role;
set local role service_role;
select is(testes.tenta($$insert into public.pedidos_livre_resolucao (id, user_id, nome, email, plano, versao_formulario) values
  ('1d000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'Utilizador A', 'a@teste.invalid', 'avulso', '2026-10-01'),
  ('1d000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'Utilizador B', 'b@teste.invalid', 'caso_protecao', '2026-10-01')$$),
  'ok:2', 'servidor: regista pedidos de livre resolução');
select is(testes.tenta($$insert into public.pedidos_livre_resolucao (nome, email, plano, versao_formulario) values ('X', 'x@teste.invalid', 'premium', '2026-10-01')$$),
  'erro:23514', 'plano tem de ser um dos produtos');
reset role;

select testes.como(null);
select ok(testes.contar('select * from public.pedidos_livre_resolucao') <= 0, 'anon: não lê pedidos de livre resolução');
select ok(testes.negado($$insert into public.pedidos_livre_resolucao (nome, email, plano, versao_formulario) values ('Anon', 'anon@teste.invalid', 'avulso', 'x')$$), 'anon: não cria pedidos pela API');
reset role;
select testes.como('00000000-0000-4000-a000-00000000000a');
select is(testes.contar('select * from public.pedidos_livre_resolucao'), 1::bigint, 'A: vê só o próprio pedido de livre resolução');
select ok(testes.negado($$insert into public.pedidos_livre_resolucao (user_id, nome, email, plano, versao_formulario) values ('00000000-0000-4000-a000-00000000000b', 'Forjado', 'b@teste.invalid', 'avulso', 'x')$$), 'A: não cria pedidos em nome de outra conta');
select ok(testes.negado($$update public.pedidos_livre_resolucao set estado = 'concluido' where id = '1d000000-0000-4000-a000-00000000000a'$$), 'A: não altera o estado do próprio pedido');
select ok(testes.negado($$delete from public.pedidos_livre_resolucao where id = '1d000000-0000-4000-a000-00000000000a'$$), 'A: não apaga o próprio pedido');
reset role;
select testes.como('00000000-0000-4000-a000-0000000000ad');
select is(testes.contar($$select * from public.pedidos_livre_resolucao where id::text like '1d000000-%'$$), 2::bigint, 'admin: lê pedidos de livre resolução de todos');
select is(testes.tenta($$update public.pedidos_livre_resolucao set estado = 'em_analise', nota = 'a ver', tratado_em = now() where id = '1d000000-0000-4000-a000-00000000000b'$$), 'ok:1', 'admin: acompanha o pedido (estado e nota)');
select ok(testes.negado($$update public.pedidos_livre_resolucao set plano = 'avulso' where id = '1d000000-0000-4000-a000-00000000000b'$$), 'admin: não altera o que foi declarado');
select ok(testes.negado($$delete from public.pedidos_livre_resolucao where id = '1d000000-0000-4000-a000-00000000000b'$$), 'admin: não apaga pedidos');
reset role;
set local role service_role;
select is(testes.tenta($$update public.pedidos_livre_resolucao set nome = 'Outro' where id = '1d000000-0000-4000-a000-00000000000a'$$), 'erro:23514', 'imutável: nome declarado não muda');
select is(testes.tenta($$update public.pedidos_livre_resolucao set pedido_em = now() - interval '1 day' where id = '1d000000-0000-4000-a000-00000000000a'$$), 'erro:23514', 'imutável: data do pedido não muda');
select is(testes.tenta($$update public.pedidos_livre_resolucao set user_id = '00000000-0000-4000-a000-00000000000b' where id = '1d000000-0000-4000-a000-00000000000a'$$), 'erro:23514', 'imutável: não passa para outra conta');
select is(testes.tenta($$update public.pedidos_livre_resolucao set confirmacao_enviada_em = now() where id = '1d000000-0000-4000-a000-00000000000a'$$), 'ok:1', 'servidor: regista a confirmação enviada');
select is(testes.tenta($$update public.pedidos_livre_resolucao set confirmacao_enviada_em = now() + interval '1 hour' where id = '1d000000-0000-4000-a000-00000000000a'$$), 'erro:23514', 'imutável: confirmação enviada não muda');
select is(testes.tenta($$update public.pedidos_livre_resolucao set user_id = null where id = '1d000000-0000-4000-a000-00000000000a'$$), 'ok:1', 'conta apagada: o pedido fica (user_id a null)');
reset role;

-- ===========================================================================
-- 3. ADMIN — acesso total pelo RLS (via is_admin())
-- ===========================================================================
reset role;
select testes.como('00000000-0000-4000-a000-0000000000ad');
select is(public.is_admin(), true, 'admin: is_admin() → true');
select ok(testes.contar('select * from public.casos') >= 2, 'admin: vê casos de todos os utilizadores');
select is(testes.contar('select * from public.anexos'), 2::bigint, 'admin: vê anexos');
select is(testes.contar('select * from public.stripe_webhook_events'), 1::bigint, 'admin: lê eventos do webhook Stripe');
select is(testes.contar('select * from public.stripe_subscriptions'), 1::bigint, 'admin: lê subscrições Stripe');
select is(testes.contar('select * from public.conversoes_avulso'), 1::bigint, 'admin: lê conversões Avulso');
select is(testes.contar('select * from public.subscricao_cancelamentos'), 1::bigint, 'admin: lê cancelamentos de subscrição');
select is(testes.contar($$select * from public.consentimentos_compra where id::text like '1c000000-%'$$), 3::bigint, 'admin: lê consentimentos de compra de todos');
select ok(testes.contar('select * from public.case_credit_freezes') >= 2, 'admin: lê casos congelados de todos');
select is(testes.contar($$select * from storage.objects where name in ('casoA/a.pdf', 'casoB/b.pdf', '00000000-0000-4000-a000-00000000000a/f.pdf', '00000000-0000-4000-a000-00000000000b/f.pdf')$$), 4::bigint, 'admin: vê ficheiros de todos os buckets');
select ok(testes.permitido($$update public.casos set notas = 'revisto' where id = '10000000-0000-4000-a000-00000000000b'$$), 'admin: altera qualquer caso');

-- ===========================================================================
-- 4. Verificação final como superutilizador — nada de B foi alterado por A
-- ===========================================================================
reset role;
select is((select role from public.utilizadores where id = '00000000-0000-4000-a000-00000000000a'), 'cliente', 'integridade: A continua cliente');
select is((select nivel_acesso from public.user_access where user_id = '00000000-0000-4000-a000-00000000000a'), 'avulso', 'integridade: A continua avulso');
select is((select status from public.stripe_subscriptions where stripe_subscription_id = 'sub_teste_b'), 'active', 'integridade: subscrição intacta');
select is((select count(*) from public.stripe_webhook_events), 1::bigint, 'integridade: nenhum evento do webhook criado ou apagado pelo cliente');
select ok(testes.permitido($$update public.stripe_payments set estado = 'pendente' where id = '16000000-0000-4000-a000-00000000000a'$$), 'stripe_payments.estado aceita pendente');
select ok(testes.permitido($$update public.stripe_payments set estado = 'falhado' where id = '16000000-0000-4000-a000-00000000000a'$$), 'stripe_payments.estado aceita falhado');
select is((select utilizador_id from public.casos where id = '10000000-0000-4000-a000-00000000000b'), '00000000-0000-4000-a000-00000000000b'::uuid, 'integridade: caso de B continua de B');
select is((select descricao from public.casos where id = '10000000-0000-4000-a000-00000000000b'), 'caso de B', 'integridade: descrição do caso de B intacta');
select is((select count(*) from public.contratos_monitorizados where id = '14000000-0000-4000-a000-00000000000b'), 1::bigint, 'integridade: contrato de B continua a existir');
select is((select count(*) from storage.objects where name = 'casoB/b.pdf'), 1::bigint, 'integridade: ficheiro de B continua no storage');

-- ===========================================================================
-- 4b. Conversões Avulso: uma por compra e montante coerente (como superutilizador)
-- ===========================================================================
reset role;
select ok(testes.tenta($$insert into public.conversoes_avulso (stripe_payment_id, user_id, plano_destino, valor_avulso_centimos, valor_primeira_mensalidade_centimos, refund_montante_centimos) values ('16000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'caso_protecao', 1499, 799, 700)$$) like 'erro:23505%', 'conversão: o mesmo Avulso não tem uma segunda conversão');
select ok(testes.tenta($$insert into public.conversoes_avulso (stripe_payment_id, user_id, plano_destino, valor_avulso_centimos, valor_primeira_mensalidade_centimos, refund_montante_centimos) values ('16000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'protecao', 1499, 499, 1499)$$) like 'erro:23514%', 'conversão: reembolso tem de ser Avulso − 1.ª mensalidade');
select is(testes.tenta($$update public.conversoes_avulso set estado = 'convertido', checkout_session_id = 'cs_x' where id = '1a000000-0000-4000-a000-00000000000a' and estado = 'checkout_aberto'$$), 'ok:1', 'conversão: 1.ª confirmação converte');
select is(testes.tenta($$update public.conversoes_avulso set estado = 'convertido' where id = '1a000000-0000-4000-a000-00000000000a' and estado = 'checkout_aberto'$$), 'ok:0', 'conversão: segunda confirmação não converte outra vez');

-- Resolução de intervenções no backoffice: só o admin, só as colunas de resolução.
update public.conversoes_avulso set requer_intervencao = true where id = '1a000000-0000-4000-a000-00000000000a';
select testes.como('00000000-0000-4000-a000-00000000000a');
select ok(testes.negado($$update public.conversoes_avulso set requer_intervencao = false, intervencao_nota = 'x' where id = '1a000000-0000-4000-a000-00000000000a'$$), 'A: não resolve a própria intervenção');
reset role;
select testes.como('00000000-0000-4000-a000-0000000000ad');
select ok(testes.tenta($$update public.conversoes_avulso set refund_montante_centimos = 0 where id = '1a000000-0000-4000-a000-00000000000a'$$) like 'erro:42501%', 'admin: não altera montantes da conversão');
select ok(testes.tenta($$update public.conversoes_avulso set refund_id = 're_falso', estado = 'checkout_aberto' where id = '1a000000-0000-4000-a000-00000000000a'$$) like 'erro:42501%', 'admin: não altera dados do Stripe nem o estado da conversão');
select is(testes.tenta($$update public.conversoes_avulso set requer_intervencao = false, intervencao_nota = 'Reembolso criado à mão', intervencao_resolvida_em = now(), intervencao_resolvida_por = '00000000-0000-4000-a000-0000000000ad' where id = '1a000000-0000-4000-a000-00000000000a' and requer_intervencao$$), 'ok:1', 'admin: resolve a intervenção');
reset role;
select is((select refund_montante_centimos from public.conversoes_avulso where id = '1a000000-0000-4000-a000-00000000000a'), 1000, 'integridade: montante do reembolso intacto');

-- ===========================================================================
-- 5. Webhook novo-caso (trigger + Vault) — nenhum pedido sai daqui: a fila do
--    pg_net só é processada depois de COMMIT e esta transação é revertida.
-- ===========================================================================
reset role;
select is((select count(*) from pg_trigger where tgrelid = 'public.casos'::regclass and tgname = 'novo-caso'), 0::bigint,
  'webhook: trigger antigo do Dashboard (com chave embutida) removido');
select is((select count(*) from pg_trigger where encode(tgargs, 'escape') like '%eyJ%'), 0::bigint,
  'webhook: nenhum trigger guarda um JWT nos argumentos');
select is((select count(*) from pg_trigger where tgrelid = 'public.casos'::regclass and tgname = 'notificar_novo_caso' and tgenabled <> 'D'), 1::bigint,
  'webhook: trigger notificar_novo_caso ativo em casos');

delete from net.http_request_queue;
insert into public.casos (nome, email) values ('Sem segredo', 'x@teste.invalid');
select is((select count(*) from net.http_request_queue), 0::bigint,
  'webhook: sem segredo no Vault não agenda nenhum pedido (e o caso é criado)');

select vault.create_secret('segredo-de-teste-local', 'novo_caso_webhook_secret');
-- Os casos são criados pelo servidor (service_role), que também não tem
-- acesso ao Vault: o trigger (SECURITY DEFINER) lê o segredo por ele.
set local role service_role;
select ok(testes.permitido($$insert into public.casos (utilizador_id, nome, email, descricao, autorizacao) values ('00000000-0000-4000-a000-00000000000c', 'A webhook', 'c@teste.invalid', 'teste webhook', true)$$),
  'webhook: servidor cria caso com o trigger ativo (sem acesso ao Vault)');
reset role;
select is((select count(*) from net.http_request_queue), 1::bigint, 'webhook: exatamente um pedido agendado');
select is((select headers->>'x-webhook-secret' from net.http_request_queue limit 1), 'segredo-de-teste-local',
  'webhook: pedido leva o segredo do Vault no cabeçalho x-webhook-secret');
select ok((select not (headers ? 'Authorization') from net.http_request_queue limit 1),
  'webhook: pedido não leva nenhum JWT/Authorization');
select is((select convert_from(body, 'utf8')::jsonb #>> '{record,nome}' from net.http_request_queue limit 1), 'A webhook',
  'webhook: corpo leva o registo do caso no formato do Database Webhook');
select is((select url from net.http_request_queue limit 1), 'https://eqsmzczjyrcrsbfqioxt.supabase.co/functions/v1/novo-caso',
  'webhook: pedido vai para a Edge Function novo-caso');

select * from finish();
rollback;
