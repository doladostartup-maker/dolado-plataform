-- DoLado — Acompanhamento depois do envio: estados, comunicações recebidas,
-- análise, pedidos ao cliente, confirmação da resolução, RLS.
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
  ('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso A', 'Operadora X', 'Em investigação'),
  ('30000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'B', 'b@teste.invalid', 'caso B', 'Operadora Y', 'Em investigação');

create temporary table ids (nome text primary key, id uuid);
grant all on ids to service_role, authenticated, anon;

set local role service_role;

-- ---------------------------------------------------------------------------
-- Transições explícitas
-- ---------------------------------------------------------------------------
select is(tt.tenta($$update public.casos set status = 'Resolvido' where id = '30000000-0000-4000-a000-00000000000a'$$), 'erro:42501',
  'transição arbitrária (Em investigação → Resolvido) recusada, mesmo com service role');
select is(tt.tenta($$update public.casos set status = 'Resposta em análise' where id = '30000000-0000-4000-a000-00000000000a'$$), 'erro:42501',
  'Em investigação → Resposta em análise recusada (só depois do envio)');
select ok(public.caso_transicao_permitida('Aguardando operador', 'Resposta em análise'), 'matriz: aguardar resposta → em análise');
select ok(not public.caso_transicao_permitida('Resolvido', 'Novo'), 'matriz: Resolvido é final');

-- ---------------------------------------------------------------------------
-- Reclamação: versão → autorização → envio com referência → aguardar resposta
-- ---------------------------------------------------------------------------
insert into ids values ('v1', public.texto_guardar('30000000-0000-4000-a000-00000000000a', 'Reclamação v1', '00000000-0000-4000-a000-0000000000ad'));
select public.texto_emitir_links((select id from ids where nome = 'v1'), tt.h('r1'), tt.h('a1'), now() + interval '14 days');
select is(public.texto_autorizar_por_link(tt.h('r1'))->>'resultado', 'autorizado', 'cliente autoriza a versão 1');
select is(public.texto_registar_envio((select id from ids where nome = 'v1'), tt.h('Reclamação v1'), 'Operadora X', 'livro_reclamacoes_eletronico', null,
  '00000000-0000-4000-a000-0000000000ad', now(), 'p_referencia_sem_prazo', current_date + 10, null)->>'resultado',
  'prazo_sem_base', 'prazo de resposta sem base → recusado (nunca inventar prazos)');
select is(public.texto_registar_envio((select id from ids where nome = 'v1'), tt.h('Reclamação v1'), 'Operadora X', 'livro_reclamacoes_eletronico', null,
  '00000000-0000-4000-a000-0000000000ad', now(), 'LRE-2026-001')->>'resultado', 'enviado', 'envio registado com referência');
select is(tt.estado('30000000-0000-4000-a000-00000000000a'), 'Aguardando operador', 'enviado → A aguardar resposta da empresa (nunca concluído)');
select is((select referencia from public.casos_textos_envios where texto_id = (select id from ids where nome = 'v1')), 'LRE-2026-001', 'referência guardada no envio');
select ok(exists (select 1 from public.casos_eventos where caso_id = '30000000-0000-4000-a000-00000000000a' and tipo = 'aguarda_resposta_empresa' and visivel_cliente),
  'cronologia: a aguardar resposta da empresa (visível)');
select ok(exists (select 1 from public.casos_estados_historico where caso_id = '30000000-0000-4000-a000-00000000000a' and de = 'Em investigação' and para = 'Aguardando operador' and not correcao),
  'histórico de estados regista a transição');

-- ---------------------------------------------------------------------------
-- Comunicação recebida → em análise; duplicados; estado inesperado; spam
-- ---------------------------------------------------------------------------
insert into ids values ('m1', ((public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'email', 'canal', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-1', 'message_id', '<m1@operadora.invalid>',
  'remetente_email', 'apoio@operadora.invalid', 'assunto', 'Resposta à reclamação', 'corpo_texto', 'Lamentamos…',
  'corpo_html', '<p>Lamentamos…</p><script>alert(1)</script>', 'corpo_apresentacao', 'Lamentamos…', 'sem_anexos', true)))->>'comunicacao_id')::uuid);
select is(tt.estado('30000000-0000-4000-a000-00000000000a'), 'Resposta em análise', 'mensagem recebida: aguardar resposta → em análise');
select is((select transitou from public.casos_comunicacoes_recebidas where id = (select id from ids where nome = 'm1')), true, 'regista que a mensagem provocou a transição');
select is((select corpo_html from public.casos_comunicacoes_recebidas where id = (select id from ids where nome = 'm1')), '<p>Lamentamos…</p><script>alert(1)</script>',
  'HTML original preservado como prova (apresentado só como texto)');
select is(public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-1', 'message_id', '<outro@x>'))->>'resultado', 'duplicada', 'mesmo e-mail (reenvio do webhook) → duplicado');
select is(public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-1b', 'message_id', '<m1@operadora.invalid>'))->>'resultado', 'duplicada', 'mesmo Message-ID no caso → duplicado');
select is((select count(*) from public.casos_comunicacoes_recebidas where caso_id = '30000000-0000-4000-a000-00000000000a'), 1::bigint, 'um só registo lógico');
select is(public.comunicacao_registar_recebida('30000000-0000-4000-a000-0000000000ff', jsonb_build_object(
  'origem', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-x'))->>'resultado', 'caso_inexistente', 'caso inexistente → nada registado');
select is(tt.tenta($$update public.casos_comunicacoes_recebidas set corpo_texto = 'reescrito' where id = (select id from ids where nome = 'm1')$$), 'erro:42501',
  'conteúdo original imutável');

-- Segunda mensagem com o caso já em análise: guardada, sem mudar o estado.
insert into ids values ('m2', ((public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-2', 'message_id', '<m2@x>', 'automatica', true, 'sem_anexos', true)))->>'comunicacao_id')::uuid);
select is((select transitou from public.casos_comunicacoes_recebidas where id = (select id from ids where nome = 'm2')), false, 'estado inesperado: guardada sem transição');
select is((select visivel_cliente from public.casos_eventos where comunicacao_id = (select id from ids where nome = 'm2')), false, 'estado inesperado: evento só interno');

-- Processamento depois do registo e custo da IA.
select is((select estado_processamento from public.casos_comunicacoes_recebidas where id = (select id from ids where nome = 'm1')), 'recebida', 'e-mail nasce "recebida" (anexos e avisos depois)');
update public.casos_comunicacoes_recebidas set estado_processamento = 'processada' where id = (select id from ids where nome = 'm1');
select is(tt.tenta($$update public.casos_comunicacoes_recebidas set estado_processamento = 'falhou' where id = (select id from ids where nome = 'm1')$$), 'erro:42501',
  'processada não volta atrás');
select ok(public.analise_ia_iniciar((select id from ids where nome = 'm1'), 'automatico', null, 'p', 's') is not null, 'análise automática iniciada');
select is(public.analise_ia_iniciar((select id from ids where nome = 'm1'), 'automatico', null, 'p', 's'), null::uuid, 'uma análise automática por mensagem');

-- E. Resposta automática → sem ação; com outra por analisar, o estado mantém-se.
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm2'), 'mensagem_sem_acao', 'resposta_automatica',
  null, null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'estado', 'Resposta em análise', 'sem ação (mensagem que não provocou a análise) → estado mantém-se');
select is((select estado_analise from public.casos_comunicacoes_recebidas where id = (select id from ids where nome = 'm2')), 'sem_acao', 'mensagem marcada sem ação (não apagada)');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm2'), 'mensagem_sem_acao', null,
  null, null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'ja_analisada', 'mesma mensagem não é decidida duas vezes');
select is(tt.tenta($$update public.casos_comunicacoes_recebidas set classificacao = 'resposta_negativa' where id = (select id from ids where nome = 'm2')$$), 'erro:42501',
  'análise registada é imutável');

select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm1'), 'mensagem_sem_acao', 'confirmacao_rececao',
  'Só confirmação de receção.', null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'estado', 'Aguardando operador',
  'resposta automática → volta a A aguardar resposta da empresa');
select ok(exists (select 1 from public.casos_eventos where caso_id = '30000000-0000-4000-a000-00000000000a' and tipo = 'mensagem_sem_acao' and not visivel_cliente),
  'mensagem sem ação: só na cronologia interna');

-- Spam provável: guardado, sem transição.
insert into ids values ('m3', ((public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-3', 'suspeita_spam', true, 'sem_anexos', true)))->>'comunicacao_id')::uuid);
select is(tt.estado('30000000-0000-4000-a000-00000000000a'), 'Aguardando operador', 'spam provável não muda o estado');
select is(public.analise_ia_iniciar((select id from ids where nome = 'm3'), 'automatico', null, 'p', 's'), null::uuid, 'spam provável: sem análise automática (custo)');
select public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm3'), 'mensagem_sem_acao', 'mensagem_irrelevante',
  null, null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad');

-- ---------------------------------------------------------------------------
-- Registo manual (carta) → em análise → C. pedir informação → cliente responde
-- ---------------------------------------------------------------------------
select is(public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object('origem', 'manual', 'canal', 'carta'))->>'resultado',
  'invalido', 'registo manual exige o admin');
insert into ids values ('m4', ((public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'manual', 'canal', 'carta', 'remetente_nome', 'Operadora X', 'assunto', 'Pedido de documentos', 'corpo_texto', 'Envie a fatura de setembro.', 'sem_anexos', true),
  '00000000-0000-4000-a000-0000000000ad'))->>'comunicacao_id')::uuid);
select is(tt.estado('30000000-0000-4000-a000-00000000000a'), 'Resposta em análise', 'registo manual também passa a em análise');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm4'), 'pedir_informacao_cliente', 'pedido_documentos',
  null, null, null, '', null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'falta_pedido', 'pedido de informação vazio → recusado');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm4'), 'pedir_informacao_cliente', 'pedido_documentos',
  'A empresa pede a fatura.', null, null, 'Fatura de setembro', 'Envie o PDF da fatura.', current_date + 7, null, '00000000-0000-4000-a000-0000000000ad')->>'estado',
  'Aguardando cliente', 'pedido ao cliente → aguardar cliente');
insert into ids select 'p1', id from public.casos_pedidos_cliente where caso_id = '30000000-0000-4000-a000-00000000000a' and estado = 'aberto';
select is(public.pedido_cliente_responder((select id from ids where nome = 'p1'), '00000000-0000-4000-a000-00000000000b', 'tentativa', '[]')->>'resultado',
  'invalido', 'cliente B não responde ao pedido do caso de A');
select is(public.pedido_cliente_responder((select id from ids where nome = 'p1'), '00000000-0000-4000-a000-00000000000a', '  ', '[]')->>'resultado',
  'vazio', 'resposta vazia → recusada');
select is(public.pedido_cliente_responder((select id from ids where nome = 'p1'), '00000000-0000-4000-a000-00000000000a', 'Segue a fatura.',
  '[{"nome":"fatura.pdf","tamanho_bytes":1000}]')->>'estado', 'Resposta em análise', 'informação enviada → em análise');
select is(public.pedido_cliente_responder((select id from ids where nome = 'p1'), '00000000-0000-4000-a000-00000000000a', 'outra vez', '[]')->>'resultado',
  'ja_respondido', 'pedido respondido só uma vez');

-- ---------------------------------------------------------------------------
-- B. Nova resposta: nova versão → sem autorização não sai → autorizada → enviada
-- ---------------------------------------------------------------------------
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', null, 'preparar_nova_resposta', 'resposta_negativa',
  'A empresa recusou sem fundamento claro.', null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'estado', 'Em investigação',
  'preparar nova resposta → preparação pela DoLado');
insert into ids values ('v2', public.texto_guardar('30000000-0000-4000-a000-00000000000a', 'Contestação v2', '00000000-0000-4000-a000-0000000000ad'));
select is((select versao from public.casos_textos where id = (select id from ids where nome = 'v2')), 2, 'nova comunicação = nova versão no mesmo caso');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v1')), 'enviado', 'a reclamação enviada continua "enviado" (preservada)');
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('Contestação v2'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'nao_autorizado', 'nova comunicação sem autorização do cliente → recusada');
select public.texto_emitir_links((select id from ids where nome = 'v2'), tt.h('r2'), tt.h('a2'), now() + interval '14 days');
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('Contestação v2'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'nao_autorizado', 'à espera de aprovação → recusada');
select is(public.texto_autorizar_por_link(tt.h('r2'))->>'resultado', 'autorizado', 'cliente autoriza explicitamente a versão 2');
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('outro conteúdo'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'conteudo_diferente', 'conteúdo diferente do autorizado → recusado');
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('Contestação v2'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'enviado', 'nova comunicação autorizada enviada');
select is(tt.estado('30000000-0000-4000-a000-00000000000a'), 'Aguardando operador', 'nova comunicação enviada → A aguardar resposta da empresa');
select is((select count(*) from public.casos where utilizador_id = '00000000-0000-4000-a000-00000000000a'), 1::bigint, 'não cria um novo caso');

-- ---------------------------------------------------------------------------
-- A. Solução apresentada → cliente rejeita → em análise → solução → confirma
-- ---------------------------------------------------------------------------
insert into ids values ('m5', ((public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', jsonb_build_object(
  'origem', 'email', 'provider', 'resend', 'provider_message_id', 'uuid-5', 'message_id', '<m5@x>', 'sem_anexos', true)))->>'comunicacao_id')::uuid);
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm5'), 'resolucao_proposta', 'proposta_resolucao',
  null, null, null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'falta_mensagem_cliente', 'solução sem explicação ao cliente → recusada');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'm5'), 'resolucao_proposta', 'proposta_resolucao',
  'Empresa devolve 30 €.', 'A empresa vai devolver 30 € na próxima fatura.', null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'estado',
  'Aguardando decisão cliente', 'resolução proposta → aguardar confirmação do cliente (nunca resolvido automaticamente)');
select is(public.caso_confirmar_resolucao('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b', true)->>'resultado', 'invalido',
  'cliente B não confirma o caso de A');
select is(public.caso_confirmar_resolucao('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', false)->>'estado', 'Resposta em análise',
  'cliente rejeita a resolução → em análise');
select is(public.caso_confirmar_resolucao('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', true)->>'resultado', 'estado_invalido',
  'confirmar fora de "aguardar confirmação" → recusado');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', null, 'resolucao_proposta', 'proposta_resolucao',
  null, 'A empresa corrigiu a fatura.', null, null, null, null, null, '00000000-0000-4000-a000-0000000000ad')->>'estado', 'Aguardando decisão cliente', 'nova proposta');
select is(public.caso_confirmar_resolucao('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', true)->>'estado', 'Resolvido',
  'cliente confirma → resolvido');
select is(tt.tenta($$update public.casos set status = 'Aguardando operador' where id = '30000000-0000-4000-a000-00000000000a'$$), 'erro:42501', 'Resolvido é final');
select is((select count(*) from public.casos_comunicacoes_recebidas where caso_id = '30000000-0000-4000-a000-00000000000a'), 5::bigint,
  'nada apagado: todas as comunicações continuam no caso');

-- Correção manual (admin, com motivo) — auditada.
select is(public.caso_corrigir_estado('30000000-0000-4000-a000-00000000000a', 'Resposta em análise', 'x', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'motivo_invalido', 'correção exige motivo');
select is(public.caso_corrigir_estado('30000000-0000-4000-a000-00000000000a', 'Resposta em análise', 'Cliente ligou: afinal não recebeu o reembolso.', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'ok', 'correção manual aceite');
select ok(exists (select 1 from public.casos_estados_historico where caso_id = '30000000-0000-4000-a000-00000000000a' and correcao and motivo like 'Cliente ligou%'),
  'correção marcada no histórico de estados, com motivo');

-- D. Encaminhamento.
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', null, 'encaminhar', null, null, null, 'inexistente', null, null, null, null,
  '00000000-0000-4000-a000-0000000000ad')->>'resultado', 'encaminhamento_invalido', 'tipo de encaminhamento desconhecido → recusado');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', null, 'encaminhar', null, null, null, 'centro_arbitragem', null, null, null, null,
  '00000000-0000-4000-a000-0000000000ad')->>'estado', 'Bloqueado', 'encaminhamento para centro de arbitragem');
select is((select mensagem_cliente from public.casos_analises where caso_id = '30000000-0000-4000-a000-00000000000a' and decisao = 'encaminhar'),
  (select descricao_cliente from public.tipos_encaminhamento where codigo = 'centro_arbitragem'), 'sem texto próprio, o cliente vê a descrição do tipo');
select is(public.caso_decidir_analise('30000000-0000-4000-a000-00000000000a', null, 'encaminhar', null, null, null, 'encerramento_sem_resolucao', null, null, null, null,
  '00000000-0000-4000-a000-0000000000ad')->>'estado', 'Encerrado sem resolução', 'encerramento sem resolução');

-- Quarentena: e-mail sem caso nunca é descartado nem associado.
insert into public.comunicacoes_nao_associadas (provider, provider_message_id, destinatarios, remetente, assunto, motivo)
values ('resend', 'email-sem-caso', array['caso-aaaaaa-aaaaaaaaaaaaaaaaaaaaaaaaaa@respostas.dolado.test'], 'x@y.test', 'Olá', 'endereco_inexistente');
select is(tt.tenta($$insert into public.comunicacoes_nao_associadas (provider, provider_message_id, motivo) values ('resend', 'email-sem-caso', 'endereco_inexistente')$$),
  'erro:23505', 'quarentena idempotente (mesmo e-mail)');
select is(tt.tenta($$update public.comunicacoes_nao_associadas set assunto = 'outro'$$), 'erro:42501', 'quarentena: conteúdo imutável');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
reset role;
select tt.como('00000000-0000-4000-a000-00000000000a');
select is(tt.contar('select id from public.casos_comunicacoes_recebidas'), 0::bigint, 'cliente não lê mensagens recebidas (nem as do próprio caso)');
select is(tt.contar('select id from public.casos_comunicacoes_anexos'), 0::bigint, 'cliente não lê anexos de comunicações');
select is(tt.contar('select id from public.casos_analises_ia'), 0::bigint, 'cliente não lê a análise da IA');
select is(tt.contar('select id from public.casos_enderecos_resposta'), 0::bigint, 'cliente não lê endereços técnicos');
select is(tt.contar('select id from public.casos_estados_historico'), 0::bigint, 'cliente não lê o histórico técnico de estados');
select is(tt.contar('select id from public.comunicacoes_nao_associadas'), 0::bigint, 'cliente não lê e-mails em quarentena');
select is(tt.contar($$select id from public.casos_eventos where not visivel_cliente$$), 0::bigint, 'cliente não vê eventos internos');
select ok(tt.contar($$select id from public.casos_eventos where tipo = 'comunicacao_recebida'$$) >= 1, 'cliente vê "comunicação recebida" (a que provocou a análise)');
select ok(tt.contar('select id from public.casos_pedidos_cliente') = 1, 'cliente lê o próprio pedido de informação');
select is(tt.contar('select resumo from public.casos_analises'), -1::bigint, 'cliente não lê a análise interna (coluna sem permissão)');
select is(tt.contar($$select id from public.casos_analises where decisao = 'mensagem_sem_acao'$$), 0::bigint, 'cliente não vê decisões internas (sem ação)');
select ok(tt.contar('select mensagem_cliente from public.casos_analises') >= 1, 'cliente lê o que lhe foi comunicado');
select is(tt.tenta($$update public.casos set status = 'Resolvido' where id = '30000000-0000-4000-a000-00000000000a'$$), 'ok:0', 'cliente não altera o estado do caso');
select ok(tt.tenta($$select public.caso_confirmar_resolucao('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', true)$$) like 'erro:%',
  'cliente não chama as funções diretamente');
select ok(tt.tenta($$select public.comunicacao_registar_recebida('30000000-0000-4000-a000-00000000000a', '{"origem":"email"}')$$) like 'erro:%',
  'cliente não regista comunicações');
select ok(tt.tenta($$insert into public.casos_pedidos_cliente (caso_id, pedido) values ('30000000-0000-4000-a000-00000000000a', 'forjado')$$) like 'erro:%',
  'cliente não cria pedidos');
reset role;
select tt.como('00000000-0000-4000-a000-00000000000b');
select is(tt.contar($$select id from public.casos_pedidos_cliente where caso_id = '30000000-0000-4000-a000-00000000000a'$$), 0::bigint, 'B não vê os pedidos de A');
select is(tt.contar($$select id from public.casos_analises where caso_id = '30000000-0000-4000-a000-00000000000a'$$), 0::bigint, 'B não vê as decisões de A');
select is(tt.contar($$select id from public.casos_eventos where caso_id = '30000000-0000-4000-a000-00000000000a'$$), 0::bigint, 'B não vê a cronologia de A');
reset role;
select tt.como(null);
select ok(tt.contar('select id from public.casos_pedidos_cliente') <= 0, 'anon não lê pedidos');
select ok(tt.contar('select id from public.tipos_encaminhamento') <= 0, 'anon não lê tipos de encaminhamento');
reset role;
select tt.como('00000000-0000-4000-a000-0000000000ad');
select ok(tt.contar('select id from public.casos_comunicacoes_recebidas') >= 5, 'admin lê as comunicações');
select ok(tt.contar('select id from public.casos_estados_historico') >= 1, 'admin lê o histórico de estados');
select ok(tt.contar('select id from public.comunicacoes_nao_associadas') >= 1, 'admin lê a quarentena');
select ok(tt.tenta($$insert into public.casos_comunicacoes_recebidas (caso_id, origem, canal, estado_caso_na_rececao) values ('30000000-0000-4000-a000-00000000000a', 'manual', 'carta', 'x')$$) like 'erro:%',
  'admin não insere comunicações com a sessão (só pelo servidor)');
select ok(tt.tenta($$delete from public.casos_comunicacoes_recebidas$$) in ('ok:0') or tt.tenta($$delete from public.casos_comunicacoes_recebidas$$) like 'erro:%',
  'admin não apaga comunicações pela API');
select is(tt.tenta($$update public.casos set status = 'Novo' where id = '30000000-0000-4000-a000-00000000000b'$$), 'erro:42501', 'admin: transição arbitrária recusada');
reset role;
select ok((select public from storage.buckets where id = 'comunicacoes-casos') = false, 'bucket de anexos de comunicações é privado');
select ok(not exists (select 1 from storage.buckets where id = 'comunicacoes-casos' and 'text/html' = any (allowed_mime_types)), 'bucket não aceita HTML');
select ok(not exists (select 1 from storage.buckets where id = 'comunicacoes-casos' and 'image/svg+xml' = any (allowed_mime_types)), 'bucket não aceita SVG');

select * from finish();
rollback;
