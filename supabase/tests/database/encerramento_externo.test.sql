-- DoLado — Encerramento com encaminhamento externo e dossiê do caso:
-- transição, registo, passos em aberto, bloqueio de novas ações, versões do
-- dossiê, imutabilidade e RLS.
--
-- Correr com `supabase test db` (stack local, nunca produção). Tudo dentro
-- de uma transação revertida. As funções correm como service_role (é assim
-- que o backend as chama); o RLS é testado com os papéis da API.

begin;
select * from no_plan();

create schema tt;
grant usage on schema tt to anon, authenticated, service_role;

create function tt.como(uid uuid) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

create function tt.tenta(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'erro:' || sqlstate;
end $$;

create function tt.contar(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) s', q) into n;
  return n;
exception when others then
  return -1;
end $$;

create function tt.h(t text) returns text language sql immutable as $$ select encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;
create function tt.estado(c uuid) returns text language sql as $$ select status from public.casos where id = c $$;

grant execute on all functions in schema tt to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', '{"nome":"B"}'),
  ('00000000-0000-4000-a000-0000000000ad', 'admin@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-a000-0000000000ad';
insert into public.casos (id, utilizador_id, nome, email, descricao, empresa, status) values
  ('40000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso A', 'Operadora X', 'Em investigação'),
  ('40000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'B', 'b@teste.invalid', 'caso B', 'Operadora Y', 'Novo'),
  ('40000000-0000-4000-a000-00000000000c', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso C', 'Operadora Z', 'Em investigação');

create temporary table ids (nome text primary key, id uuid);
grant all on ids to service_role, authenticated, anon;

set local role service_role;

-- ---------------------------------------------------------------------------
-- Preparação: reclamação enviada, resposta recebida e analisada, nova versão
-- do texto à espera do cliente e um pedido de informação em aberto.
-- ---------------------------------------------------------------------------
insert into ids values ('v1', public.texto_guardar('40000000-0000-4000-a000-00000000000a', 'Reclamação v1', '00000000-0000-4000-a000-0000000000ad'));
select public.texto_emitir_links((select id from ids where nome = 'v1'), tt.h('r1'), tt.h('a1'), now() + interval '14 days');
select is(public.texto_autorizar_por_link(tt.h('r1'))->>'resultado', 'autorizado', 'preparação: cliente autoriza a versão 1');
select is(public.texto_registar_envio((select id from ids where nome = 'v1'), tt.h('Reclamação v1'), 'Operadora X', 'livro_reclamacoes_eletronico', null,
  '00000000-0000-4000-a000-0000000000ad', now(), 'LRE-2026-777')->>'resultado', 'enviado', 'preparação: reclamação enviada');

insert into ids values ('com1', (public.comunicacao_registar_recebida('40000000-0000-4000-a000-00000000000a',
  '{"origem":"manual","canal":"carta","corpo_texto":"Não há lugar a devolução.","sem_anexos":true}'::jsonb,
  '00000000-0000-4000-a000-0000000000ad')->>'comunicacao_id')::uuid);
select is(tt.estado('40000000-0000-4000-a000-00000000000a'), 'Resposta em análise', 'preparação: resposta em análise');

-- Antes de analisar: encerrar é recusado (a mensagem pode mudar o desfecho).
select is(public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000a', 'Serviço esgotado', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'comunicacoes_por_analisar', 'com comunicações por analisar, o encerramento é recusado');

select is(public.caso_decidir_analise('40000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'com1'), 'pedir_informacao_cliente',
  'resposta_negativa', 'resumo interno', null, null, 'Envie a fatura de agosto.', null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'ok', 'preparação: pedido de informação ao cliente');
select is(tt.estado('40000000-0000-4000-a000-00000000000a'), 'Aguardando cliente', 'preparação: a aguardar o cliente');
insert into ids values ('v2', public.texto_guardar('40000000-0000-4000-a000-00000000000a', 'Nova comunicação v2', '00000000-0000-4000-a000-0000000000ad'));

-- ---------------------------------------------------------------------------
-- Transições
-- ---------------------------------------------------------------------------
select ok(public.caso_transicao_permitida('Resposta em análise', 'Encerrado com encaminhamento externo'), 'matriz: em análise → encerrado (externo)');
select ok(public.caso_transicao_permitida('Encerrado sem resolução', 'Encerrado com encaminhamento externo'), 'matriz: encerrado sem resolução → encerrado (externo)');
select ok(not public.caso_transicao_permitida('Novo', 'Encerrado com encaminhamento externo'), 'matriz: caso novo não é encerrado assim (nada foi tratado)');
select ok(not public.caso_transicao_permitida('Resolvido', 'Encerrado com encaminhamento externo'), 'matriz: um caso resolvido não passa a encerrado');
select ok(not public.caso_transicao_permitida('Encerrado com encaminhamento externo', 'Em investigação'), 'matriz: estado terminal (sem saídas)');
select ok(not public.caso_transicao_permitida('Encerrado com encaminhamento externo', 'Resolvido'), 'matriz: nunca passa a Resolvido');
select is(tt.tenta($$update public.casos set status = 'Encerrado com encaminhamento externo' where id = '40000000-0000-4000-a000-00000000000b'$$), 'erro:42501',
  'Novo → encerrado (externo) recusado, mesmo com service role');

select is(public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000b', 'Serviço esgotado', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'transicao_invalida', 'função: caso Novo não pode ser encerrado com encaminhamento externo');
select is(public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000a', 'abc', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'motivo_invalido', 'motivo obrigatório');
select is(public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000a', 'Serviço esgotado', null)->>'resultado',
  'motivo_invalido', 'responsável obrigatório');

-- Dossiê antes do encerramento: recusado.
select is(public.dossie_registar('40000000-0000-4000-a000-00000000000a', '40000000-0000-4000-a000-00000000000a/x.pdf', 'dossie.pdf', 100, repeat('a', 64), 'dossie_v1',
  '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'estado_invalido', 'dossiê só depois do encerramento');

-- ---------------------------------------------------------------------------
-- Encerramento
-- ---------------------------------------------------------------------------
select is(public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000a', 'Todas as ações do serviço feitas; empresa recusa.',
  '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'ok', 'caso encerrado com encaminhamento externo');
select is(tt.estado('40000000-0000-4000-a000-00000000000a'), 'Encerrado com encaminhamento externo', 'estado novo');
select is((select row(estado_anterior, encerrado_por, motivo)::text from public.casos_encerramentos where caso_id = '40000000-0000-4000-a000-00000000000a'),
  row('Aguardando cliente', '00000000-0000-4000-a000-0000000000ad'::uuid, 'Todas as ações do serviço feitas; empresa recusa.')::text,
  'registo do encerramento: estado anterior, responsável e motivo');
select ok(exists (select 1 from public.casos_estados_historico where caso_id = '40000000-0000-4000-a000-00000000000a'
  and de = 'Aguardando cliente' and para = 'Encerrado com encaminhamento externo' and por = '00000000-0000-4000-a000-0000000000ad' and ator = 'equipa' and not correcao),
  'histórico de estados: transição com responsável');
select ok(exists (select 1 from public.casos_eventos where caso_id = '40000000-0000-4000-a000-00000000000a' and tipo = 'caso_encerrado'
  and visivel_cliente and dados->>'modo' = 'encaminhamento_externo'), 'cronologia: caso encerrado (externo), visível ao cliente');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v2')), 'substituido', 'texto por enviar deixa de estar em curso');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v1')), 'enviado', 'texto enviado fica como estava');
select is((select count(*)::int from public.casos_pedidos_cliente where caso_id = '40000000-0000-4000-a000-00000000000a' and estado = 'aberto'), 0,
  'pedido de informação em aberto fica cancelado');
select is((select count(*)::int from public.casos_comunicacoes_recebidas where caso_id = '40000000-0000-4000-a000-00000000000a'), 1,
  'comunicação recebida preservada');
select is(public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000a', 'Outra vez', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'ja_encerrado', 'idempotente');
select is((select count(*)::int from public.casos_encerramentos where caso_id = '40000000-0000-4000-a000-00000000000a'), 1, 'um só registo de encerramento');

-- ---------------------------------------------------------------------------
-- Sem novas ações operacionais
-- ---------------------------------------------------------------------------
select is(tt.tenta($$select public.texto_guardar('40000000-0000-4000-a000-00000000000a', 'Texto novo', '00000000-0000-4000-a000-0000000000ad')$$), 'erro:42501',
  'nova versão do texto recusada');
select is(tt.tenta($$insert into public.casos_pedidos_cliente (caso_id, pedido, criado_por) values ('40000000-0000-4000-a000-00000000000a', 'Mais informação', '00000000-0000-4000-a000-0000000000ad')$$),
  'erro:42501', 'novo pedido ao cliente recusado');
select is(tt.tenta($$select public.rascunho_ia_iniciar('40000000-0000-4000-a000-00000000000a', 'manual', '00000000-0000-4000-a000-0000000000ad', 'p', 's')$$), 'erro:42501',
  'nova sugestão da IA recusada');
select is(tt.tenta($$update public.casos set status = 'Em investigação' where id = '40000000-0000-4000-a000-00000000000a'$$), 'erro:42501',
  'sair do estado sem correção recusado');
select is(tt.tenta($$update public.casos_encerramentos set motivo = 'outro' where caso_id = '40000000-0000-4000-a000-00000000000a'$$), 'erro:42501',
  'registo do encerramento imutável');

-- Uma mensagem que chegue depois continua a ser guardada (prova), sem mudar o estado.
select is(public.comunicacao_registar_recebida('40000000-0000-4000-a000-00000000000a',
  '{"origem":"manual","canal":"carta","corpo_texto":"Mensagem tardia.","sem_anexos":true}'::jsonb,
  '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'registada', 'mensagem tardia guardada');
select is(tt.estado('40000000-0000-4000-a000-00000000000a'), 'Encerrado com encaminhamento externo', 'mensagem tardia não muda o estado');
insert into ids values ('com2', (select id from public.casos_comunicacoes_recebidas where caso_id = '40000000-0000-4000-a000-00000000000a' and corpo_texto = 'Mensagem tardia.'));
select is(tt.tenta(format($$select public.analise_ia_iniciar(%L, 'manual', '00000000-0000-4000-a000-0000000000ad', 'p', 's')$$, (select id from ids where nome = 'com2'))),
  'erro:42501', 'análise pela IA de uma mensagem tardia recusada');
select is(tt.tenta(format($$select public.caso_decidir_analise('40000000-0000-4000-a000-00000000000a', %L, 'mensagem_sem_acao', null, null, null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')$$,
  (select id from ids where nome = 'com2'))), 'erro:42501', 'decisão de análise recusada (sem novas ações)');
select is((select estado_analise from public.casos_comunicacoes_recebidas where id = (select id from ids where nome = 'com2')), 'por_analisar',
  'a decisão recusada não deixa nada a meio');

-- ---------------------------------------------------------------------------
-- Dossiê: versões, imutabilidade
-- ---------------------------------------------------------------------------
select is(public.dossie_registar('40000000-0000-4000-a000-00000000000a', '40000000-0000-4000-a000-00000000000a/v1.pdf', 'dossie-v1.pdf', 1234, repeat('a', 64), 'dossie_v1',
  '00000000-0000-4000-a000-0000000000ad')->>'versao', '1', 'dossiê versão 1');
select is(public.dossie_registar('40000000-0000-4000-a000-00000000000a', '40000000-0000-4000-a000-00000000000a/v2.pdf', 'dossie-v2.pdf', 1300, repeat('b', 64), 'dossie_v1',
  '00000000-0000-4000-a000-0000000000ad')->>'versao', '2', 'nova geração = versão 2 (a anterior fica)');
select is((select count(*)::int from public.casos_dossies where caso_id = '40000000-0000-4000-a000-00000000000a'), 2, 'as duas versões ficam guardadas');
select ok((select encerramento_id is not null from public.casos_dossies where caso_id = '40000000-0000-4000-a000-00000000000a' and versao = 1), 'dossiê ligado ao encerramento');
select is((select count(*)::int from public.casos_eventos where caso_id = '40000000-0000-4000-a000-00000000000a' and tipo = 'dossie_gerado' and visivel_cliente), 2,
  'cronologia: geração do dossiê registada (por versão)');
select is(tt.tenta($$update public.casos_dossies set storage_path = 'outro.pdf' where caso_id = '40000000-0000-4000-a000-00000000000a'$$), 'erro:42501',
  'registo do dossiê imutável');
select is(tt.tenta($$insert into public.casos_dossies (caso_id, versao, modelo_versao, nome, storage_path, tamanho_bytes, ficheiro_sha256) values ('40000000-0000-4000-a000-00000000000a', 9, 'x', 'nome.pdf', 'x/y.pdf', 1, 'z')$$),
  'erro:23514', 'hash inválido recusado');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
reset role;
select tt.como('00000000-0000-4000-a000-00000000000a');
select is(tt.contar($$select id from public.casos_dossies where caso_id = '40000000-0000-4000-a000-00000000000a'$$), 2::bigint, 'cliente vê os dossiês do próprio caso');
select is(tt.tenta($$select storage_path from public.casos_dossies$$), 'erro:42501', 'cliente não lê o caminho no storage');
select is(tt.tenta($$select gerado_por from public.casos_dossies$$), 'erro:42501', 'cliente não lê quem gerou');
select is(tt.contar($$select id from public.casos_encerramentos$$), 0::bigint, 'cliente não lê o registo do encerramento (motivo interno)');
select is(tt.tenta($$insert into public.casos_dossies (caso_id, versao, modelo_versao, nome, storage_path, tamanho_bytes, ficheiro_sha256) values ('40000000-0000-4000-a000-00000000000a', 9, 'x', 'nome.pdf', 'x/y.pdf', 1, repeat('c', 64))$$),
  'erro:42501', 'cliente não cria dossiês');
select is(tt.tenta($$select public.caso_encerrar_encaminhamento_externo('40000000-0000-4000-a000-00000000000c', 'quero encerrar', '00000000-0000-4000-a000-00000000000a')$$),
  'erro:42501', 'cliente não chama a função de encerramento');
select is(tt.tenta($$select public.dossie_registar('40000000-0000-4000-a000-00000000000a', 'x/y.pdf', 'nome.pdf', 1, repeat('c', 64), 'x', '00000000-0000-4000-a000-00000000000a')$$),
  'erro:42501', 'cliente não chama o registo do dossiê');
select is(tt.contar($$select id from storage.objects where bucket_id = 'dossies-casos'$$), 0::bigint, 'cliente não lista o bucket dos dossiês');

select tt.como('00000000-0000-4000-a000-00000000000b');
select is(tt.contar($$select id from public.casos_dossies$$), 0::bigint, 'outro cliente não vê os dossiês');

select tt.como(null);
select is(tt.contar($$select id from public.casos_dossies$$), -1::bigint, 'anónimo sem acesso aos dossiês');

select tt.como('00000000-0000-4000-a000-0000000000ad');
select is(tt.contar($$select id from public.casos_dossies$$), 2::bigint, 'admin vê os dossiês');
select is(tt.contar($$select id from public.casos_encerramentos$$), 1::bigint, 'admin vê o registo do encerramento');
select is(tt.tenta($$update public.casos_encerramentos set motivo = 'x'$$), 'erro:42501', 'admin não altera o encerramento pela API');

-- ---------------------------------------------------------------------------
-- Correção auditada: retomar o caso
-- ---------------------------------------------------------------------------
reset role;
set local role service_role;
select is(public.caso_corrigir_estado('40000000-0000-4000-a000-00000000000a', 'Em investigação', 'Empresa voltou a responder', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'ok', 'retomar o caso só por correção auditada');
select ok(public.texto_guardar('40000000-0000-4000-a000-00000000000a', 'Texto depois de retomar', '00000000-0000-4000-a000-0000000000ad') is not null,
  'depois de retomar, volta a ser possível preparar texto');
select is((select count(*)::int from public.casos_encerramentos where caso_id = '40000000-0000-4000-a000-00000000000a'), 1, 'o registo do encerramento mantém-se');

select * from finish();
rollback;
