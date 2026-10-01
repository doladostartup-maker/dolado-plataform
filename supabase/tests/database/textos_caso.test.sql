-- DoLado — Texto preparado: versões, revisão, autorização e envio.
--
-- Correr com `supabase test db` (stack local, nunca produção). Tudo dentro
-- de uma transação revertida. As funções do fluxo correm como service_role
-- (é assim que o backend as chama); o RLS é testado com os papéis da API.

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

grant execute on all functions in schema tt to anon, authenticated, service_role;

-- Clientes A e B, admin. Caso de A (com conta) e caso de B.
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-4000-a000-00000000000b', 'b@teste.invalid', 'authenticated', 'authenticated', '{"nome":"B"}'),
  ('00000000-0000-4000-a000-0000000000ad', 'admin@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-a000-0000000000ad';
insert into public.casos (id, utilizador_id, nome, email, descricao, empresa, status) values
  ('20000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso A', 'Operadora X', 'Em investigação'),
  ('20000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', 'B', 'b@teste.invalid', 'caso B', 'Operadora Y', 'Em investigação');

create temporary table ids (nome text primary key, id uuid);
grant all on ids to service_role, authenticated, anon;

set local role service_role;

-- 1. Admin prepara a versão 1 (rascunho) e pode editá-la enquanto rascunho.
insert into ids values ('v1', public.texto_guardar('20000000-0000-4000-a000-00000000000a', 'Texto v1 rascunho', '00000000-0000-4000-a000-0000000000ad'));
select is(public.texto_guardar('20000000-0000-4000-a000-00000000000a', 'Texto v1', '00000000-0000-4000-a000-0000000000ad'),
  (select id from ids where nome = 'v1'), '1. rascunho: guardar de novo edita a mesma versão');
select is((select versao from public.casos_textos where id = (select id from ids where nome = 'v1')), 1, '1. versão 1');
select is((select conteudo_sha256 from public.casos_textos where id = (select id from ids where nome = 'v1')), tt.h('Texto v1'), '8. hash SHA-256 do conteúdo calculado pela base de dados');

-- 2. Envio para revisão: dois links (só hashes guardados).
select is(public.texto_emitir_links((select id from ids where nome = 'v1'), tt.h('rever-1'), tt.h('alterar-1'), now() + interval '14 days'),
  'a@teste.invalid', '2. links emitidos para o e-mail do caso');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v1')), 'aguardando_aprovacao', '2. versão 1 à espera de aprovação');
select is((select count(*) from public.casos_textos_links where texto_id = (select id from ids where nome = 'v1')), 2::bigint, '2. dois links (rever / alterar)');
select ok(not exists (select 1 from public.casos_textos_links where token_hash in ('rever-1', 'alterar-1')), '3. o token puro nunca é guardado');
select is(tt.tenta($$update public.casos_textos set conteudo = 'mudado' where id = (select id from ids where nome = 'v1')$$), 'erro:42501',
  '21. conteúdo mostrado ao cliente não pode ser alterado (só nova versão)');

-- 3. Scanner: abrir o link (GET) não muda nada.
select is(public.texto_consultar_link(tt.h('rever-1'))->>'situacao', 'valido', '4. página abre com o link válido');
select is(public.texto_consultar_link(tt.h('rever-1'))->>'conteudo', 'Texto v1', '4. mostra o texto integral');
select ok(not (public.texto_consultar_link(tt.h('rever-1')) ? 'email'), 'página pública não recebe o e-mail do cliente');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v1')), 'aguardando_aprovacao', '3. depois de vários GET: nada autorizado');
select is((select count(*) from public.casos_textos_links where texto_id = (select id from ids where nome = 'v1') and usado_em is not null), 0::bigint, '3. GET não consome o link');
select is((select count(*) from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'), 0::bigint, '3. GET não cria autorização');

-- 17/18. Link inválido / finalidade errada.
select is(public.texto_consultar_link(tt.h('inventado'))->>'situacao', 'invalido', '17. link inválido');
select is(public.texto_autorizar_por_link(tt.h('inventado'))->>'resultado', 'invalido', '17. autorizar com link inválido → recusado');
select is(public.texto_autorizar_por_link(tt.h('alterar-1'))->>'resultado', 'invalido', 'link de alterações não serve para autorizar');

-- 20. Envio sem autorização → recusado.
select is(public.texto_registar_envio((select id from ids where nome = 'v1'), tt.h('Texto v1'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'nao_autorizado', '20. envio sem autorização → recusado');
select is(tt.tenta($$insert into public.casos_textos_envios (caso_id, texto_id, autorizacao_id, conteudo_sha256, destinatario, canal, enviado_em) values ('20000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'v1'), gen_random_uuid(), 'x', 'y', 'email', now())$$),
  'erro:42501', '20. envio direto sem autorização → recusado (trigger)');

-- 22. Contornar: marcar como autorizado sem autorização do cliente.
select is(tt.tenta($$update public.casos_textos set estado = 'autorizado' where id = (select id from ids where nome = 'v1')$$), 'erro:42501',
  '22. "marcar como autorizado" sem autorização → recusado (mesmo com service role)');

-- 9/10. Cliente pede alterações à versão 1.
select is(public.texto_pedir_alteracoes_por_link(tt.h('alterar-1'), '   ')->>'resultado', 'mensagem_invalida', 'pedido de alterações vazio → recusado');
select is(public.texto_pedir_alteracoes_por_link(tt.h('alterar-1'), 'Corrijam a data do contrato.')->>'resultado', 'pedido_registado', '9. pedido de alterações registado');
select is((select mensagem from public.casos_textos_pedidos_alteracao where caso_id = '20000000-0000-4000-a000-00000000000a'), 'Corrijam a data do contrato.', '9. mensagem guardada integralmente');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v1')), 'alteracoes_solicitadas', '9. estado: alterações solicitadas');
select is(public.texto_pedir_alteracoes_por_link(tt.h('alterar-1'), 'outra vez')->>'resultado', 'alteracoes_pedidas', '15. link usado: "já recebemos o seu pedido"');
select is(public.texto_autorizar_por_link(tt.h('rever-1'))->>'resultado', 'alteracoes_pedidas', 'autorizar depois de pedir alterações → recusado');
select is(public.texto_consultar_link(tt.h('rever-1'))->>'situacao', 'alteracoes_pedidas', 'página: já recebemos o seu pedido de alterações');
select is(public.texto_registar_envio((select id from ids where nome = 'v1'), tt.h('Texto v1'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'nao_autorizado', '10. versão com alterações pedidas não pode ser enviada');

-- 11/12. Admin cria a versão 2; a versão 1 fica preservada.
insert into ids values ('v2', public.texto_guardar('20000000-0000-4000-a000-00000000000a', 'Texto v2 corrigido', '00000000-0000-4000-a000-0000000000ad'));
select is((select versao from public.casos_textos where id = (select id from ids where nome = 'v2')), 2, '11. versão 2 criada');
select is((select conteudo from public.casos_textos where id = (select id from ids where nome = 'v1')), 'Texto v1', '12. versão 1 preservada');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v1')), 'substituido', '12. versão 1 substituída');
select is(public.texto_emitir_links((select id from ids where nome = 'v2'), tt.h('rever-2'), tt.h('alterar-2'), now() + interval '14 days'), 'a@teste.invalid', 'novos links para a versão 2');

-- 19. Link da versão antiga.
select is(public.texto_consultar_link(tt.h('rever-1'))->>'situacao', 'versao_antiga', '19. link da versão 1: existe uma versão mais recente');
select is(public.texto_autorizar_por_link(tt.h('rever-1'))->>'resultado', 'versao_antiga', '19. link da versão 1 não autoriza nada');

-- 16. Link expirado (simulado com a hora do pedido).
select is(public.texto_consultar_link(tt.h('rever-2'), now() + interval '15 days')->>'situacao', 'expirado', '16. link expirado');
select is(public.texto_autorizar_por_link(tt.h('rever-2'), now() + interval '15 days')->>'resultado', 'expirado', '16. link expirado não autoriza');

-- 5/6/23. Autoriza a versão 2 (duas vezes, como dois cliques).
select is(public.texto_autorizar_por_link(tt.h('rever-2'))->>'resultado', 'autorizado', '5. cliente autoriza a versão 2');
select is(public.texto_autorizar_por_link(tt.h('rever-2'))->>'resultado', 'ja_autorizado', '8/23. segundo clique: já autorizado, sem duplicar');
select is((select count(*) from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'), 1::bigint, '8/23. uma única autorização');
select is((select texto_id from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'), (select id from ids where nome = 'v2'), '6/13. autorização presa à versão 2');
select is((select conteudo_sha256 from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'), tt.h('Texto v2 corrigido'), '6. autorização guarda o hash do conteúdo autorizado');
select is((select metodo from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'), 'link_seguro', '6. método: link seguro');
select ok((select link_id is not null and utilizador_id = '00000000-0000-4000-a000-00000000000a' from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'), '6. guarda o link usado e o cliente');
select is(public.texto_pedir_alteracoes_por_link(tt.h('alterar-2'), 'afinal…')->>'resultado', 'ja_autorizado', 'pedir alterações depois de autorizar → já autorizado');
select is(public.texto_consultar_link(tt.h('alterar-2'))->>'situacao', 'ja_autorizado', '15. link: "este texto já foi autorizado em…"');
select ok(public.texto_consultar_link(tt.h('rever-2'))->>'autorizado_em' is not null, '15. data da autorização disponível');
select is(tt.tenta($$update public.casos_textos_autorizacoes set conteudo_sha256 = 'x'$$), 'erro:42501', 'autorização não pode ser editada');

-- 21. Conteúdo diferente do autorizado no envio → recusado.
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('Texto v2 alterado à pressa'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'conteudo_diferente', '21. conteúdo visto pela equipa ≠ autorizado → recusado');
select is(public.texto_registar_envio((select id from ids where nome = 'v1'), tt.h('Texto v1'), 'Operadora X', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'versao_antiga', '15. versão 1 não pode ser enviada');

-- 7/15. Envio da versão 2 autorizada.
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('Texto v2 corrigido'), 'Operadora X — Livro de Reclamações', 'livro_reclamacoes_eletronico', 'Submetida', '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'enviado', '7/15. versão 2 autorizada: envio registado');
select is(public.texto_registar_envio((select id from ids where nome = 'v2'), tt.h('Texto v2 corrigido'), 'x', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'ja_enviado', 'envio repetido não duplica');
select is((select count(*) from public.casos_textos_envios where caso_id = '20000000-0000-4000-a000-00000000000a'), 1::bigint, 'um único envio');
select is((select conteudo_sha256 from public.casos_textos_envios where caso_id = '20000000-0000-4000-a000-00000000000a'), tt.h('Texto v2 corrigido'), '10. envio guarda o hash do conteúdo enviado');
select is((select status from public.casos where id = '20000000-0000-4000-a000-00000000000a'), 'Aguardando operador', 'caso passa a aguardar o operador');
select ok((select data_envio_reclamacao is not null from public.casos where id = '20000000-0000-4000-a000-00000000000a'), 'data de envio registada');

-- 13. Nova versão depois de autorizada/enviada exige nova autorização.
insert into ids values ('v3', public.texto_guardar('20000000-0000-4000-a000-00000000000a', 'Texto v3', '00000000-0000-4000-a000-0000000000ad'));
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v2')), 'enviado', 'versão enviada mantém-se enviada');
select is(public.texto_registar_envio((select id from ids where nome = 'v3'), tt.h('Texto v3'), 'x', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'nao_autorizado', '13. autorização antiga não vale para a nova versão');

-- Versão autorizada (não enviada) alterada → nova versão, autorização não passa.
select public.texto_emitir_links((select id from ids where nome = 'v3'), tt.h('rever-3'), tt.h('alterar-3'), now() + interval '14 days');
select is(public.texto_autorizar_por_link(tt.h('rever-3'))->>'resultado', 'autorizado', 'versão 3 autorizada');
insert into ids values ('v4', public.texto_guardar('20000000-0000-4000-a000-00000000000a', 'Texto v4 (alterado depois de autorizado)', '00000000-0000-4000-a000-0000000000ad'));
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v3')), 'substituido', '21. versão autorizada alterada → substituída');
select is(public.texto_registar_envio((select id from ids where nome = 'v3'), tt.h('Texto v3'), 'x', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'versao_antiga', '21. a versão autorizada antiga já não pode ser enviada');
select is(public.texto_registar_envio((select id from ids where nome = 'v4'), tt.h('Texto v4 (alterado depois de autorizado)'), 'x', 'email', null, '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'nao_autorizado', '13/21. a nova versão precisa de nova autorização');

-- Pedir novo link: só a versão atual à espera, e com intervalo.
select public.texto_emitir_links((select id from ids where nome = 'v4'), tt.h('rever-4'), tt.h('alterar-4'), now() + interval '14 days');
select is(public.texto_reemitir_por_link(tt.h('rever-4'), tt.h('rever-4b'), tt.h('alterar-4b'), now() + interval '14 days'), null, 'novo link: no máximo 1 a cada 10 minutos');
select is(public.texto_reemitir_por_link(tt.h('rever-1'), tt.h('r'), tt.h('a'), now() + interval '14 days'), null, 'novo link: nunca para uma versão antiga');

-- 18. Portal: cliente B não age sobre o caso de A.
select is(public.texto_autorizar_no_portal((select id from ids where nome = 'v4'), '00000000-0000-4000-a000-00000000000b')->>'resultado', 'invalido', '18. outro cliente não autoriza o caso de A');
select is(public.texto_pedir_alteracoes_no_portal((select id from ids where nome = 'v4'), '00000000-0000-4000-a000-00000000000b', 'x')->>'resultado', 'invalido', '18. outro cliente não pede alterações no caso de A');
select is(public.texto_autorizar_no_portal((select id from ids where nome = 'v4'), '00000000-0000-4000-a000-00000000000a')->>'resultado', 'autorizado', '24. cliente autenticado autoriza no portal (mesma lógica)');
select is((select metodo from public.casos_textos_autorizacoes where texto_id = (select id from ids where nome = 'v4')), 'portal', 'autorização pelo portal registada como tal');
select is(public.texto_autorizar_por_link(tt.h('rever-4'))->>'resultado', 'ja_autorizado', 'link do e-mail depois de autorizar no portal → já autorizado');

-- Histórico.
select is((select array_agg(tipo order by created_at, tipo) from public.casos_eventos where caso_id = '20000000-0000-4000-a000-00000000000a' and versao <= 2),
  array['alteracoes_pedidas', 'comunicacao_enviada', 'nova_versao', 'texto_autorizado', 'texto_enviado_revisao', 'texto_enviado_revisao', 'texto_preparado']::text[],
  'histórico: preparado, enviado para revisão, alterações, nova versão, autorizado, enviado');
select is(tt.tenta($$update public.casos_eventos set tipo = 'texto_autorizado'$$), 'erro:42501', 'histórico só de inserção');
reset role;

-- ---------------------------------------------------------------------------
-- RLS e privilégios
-- ---------------------------------------------------------------------------
select public.texto_guardar('20000000-0000-4000-a000-00000000000b', 'Rascunho de B', '00000000-0000-4000-a000-0000000000ad');

select tt.como(null);
select ok(tt.contar('select * from public.casos_textos') <= 0, 'anon: não lê textos');
select ok(tt.tenta($$select public.texto_consultar_link('x')$$) like 'erro:%', 'anon: não chama as funções diretamente');
reset role;

select tt.como('00000000-0000-4000-a000-00000000000a');
select is(tt.contar('select * from public.casos_textos'), 4::bigint, 'A: vê as próprias versões (sem rascunhos de outros)');
select is(tt.contar($$select * from public.casos_textos where caso_id = '20000000-0000-4000-a000-00000000000b'$$), 0::bigint, 'A: não vê textos do caso de B');
select is(tt.contar('select * from public.casos_textos_links'), 0::bigint, 'A: não lê links');
select ok(tt.tenta($$insert into public.casos_textos_autorizacoes (caso_id, texto_id, conteudo_sha256, metodo, autorizado_em) values ('20000000-0000-4000-a000-00000000000a', (select id from public.casos_textos order by versao desc limit 1), 'x', 'portal', now())$$) like 'erro:%', 'A: não cria autorizações diretamente');
select ok(tt.tenta($$select public.texto_autorizar_no_portal(gen_random_uuid(), '00000000-0000-4000-a000-00000000000a')$$) like 'erro:%', 'A: não chama as funções do backend');
reset role;

select tt.como('00000000-0000-4000-a000-00000000000b');
select is(tt.contar('select * from public.casos_textos'), 0::bigint, 'B: não vê o próprio rascunho nem os textos de A');
select is(tt.contar('select * from public.casos_textos_autorizacoes'), 0::bigint, 'B: não vê autorizações de A');
select is(tt.contar('select * from public.casos_eventos'), 1::bigint, 'B: vê só o histórico do próprio caso');
reset role;

select tt.como('00000000-0000-4000-a000-0000000000ad');
select ok(tt.contar('select * from public.casos_textos') >= 5, 'admin: lê todas as versões');
select ok(tt.tenta($$insert into public.casos_textos_autorizacoes (caso_id, texto_id, conteudo_sha256, metodo, autorizado_em) values ('20000000-0000-4000-a000-00000000000b', (select id from public.casos_textos where caso_id = '20000000-0000-4000-a000-00000000000b'), 'x', 'portal', now())$$) like 'erro:%', '22. admin não fabrica autorizações');
select ok(tt.tenta($$update public.casos_textos_autorizacoes set autorizado_em = now()$$) like 'erro:%', '22. admin não edita autorizações');
select ok(tt.tenta($$update public.casos_textos set estado = 'autorizado'$$) in ('ok:0') or tt.tenta($$update public.casos_textos set estado = 'autorizado'$$) like 'erro:%', '22. admin não muda o estado do texto');
select ok(tt.tenta($$select public.texto_registar_envio(gen_random_uuid(), 'x', 'x', 'email', null, null)$$) like 'erro:%', '22. admin não chama as funções do backend com a sessão dele');
reset role;

-- ---------------------------------------------------------------------------
-- Pós-envio: texto enviado, comprovativo e histórico
-- ---------------------------------------------------------------------------
set local role service_role;
insert into ids values ('envio_v2', (select id from public.casos_textos_envios where texto_id = (select id from ids where nome = 'v2')));
select is((select t.conteudo from public.casos_textos_envios e join public.casos_textos t on t.id = e.texto_id where e.id = (select id from ids where nome = 'envio_v2')),
  'Texto v2 corrigido', '2/3. o envio aponta para o texto exato da versão autorizada');
select is((select conteudo_sha256 from public.casos_textos where id = (select id from ids where nome = 'v2')),
  (select conteudo_sha256 from public.casos_textos_envios where id = (select id from ids where nome = 'envio_v2')), '3. hash do texto = hash enviado');
select is(tt.tenta($$update public.casos_textos set conteudo = 'reescrito' where id = (select id from ids where nome = 'v2')$$), 'erro:42501', '4. versão enviada não pode ser editada');
select is(tt.tenta($$update public.casos_textos_envios set destinatario = 'outro'$$), 'erro:42501', '4. registo de envio não pode ser editado');
select is((select estado from public.casos_textos where id = (select id from ids where nome = 'v2')), 'enviado', '5. versões posteriores não mudam a versão enviada');

-- Sem comprovativo: nada associado.
select is((select count(*) from public.casos_comprovativos where caso_id = '20000000-0000-4000-a000-00000000000a'), 0::bigint, '7. sem comprovativo: nenhum registo (UI mostra mensagem neutra)');

-- 6. Comprovativo (ficheiro) associado ao envio.
insert into ids values ('comp1', public.comprovativo_registar('20000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'envio_v2'),
  'ficheiro', 'Comprovativo LR.pdf', '20000000-0000-4000-a000-00000000000a/x.pdf', 'application/pdf', 1000, 'abc', 'LR-123', 'nota interna', '00000000-0000-4000-a000-0000000000ad'));
select is((select texto_id from public.casos_comprovativos where id = (select id from ids where nome = 'comp1')), (select id from ids where nome = 'v2'), '6. comprovativo ligado ao envio e à versão enviada');
select is((select count(*) from public.casos_eventos where caso_id = '20000000-0000-4000-a000-00000000000a' and tipo = 'comprovativo_disponivel'), 1::bigint, '14. evento "comprovativo disponível"');

-- Correção: novo registo substitui o anterior (sem apagar).
insert into ids values ('comp2', public.comprovativo_registar('20000000-0000-4000-a000-00000000000a', (select id from ids where nome = 'envio_v2'),
  'ficheiro', 'Comprovativo LR (corrigido).pdf', '20000000-0000-4000-a000-00000000000a/y.pdf', 'application/pdf', 1200, 'def', 'LR-123', null, '00000000-0000-4000-a000-0000000000ad'));
select ok((select substituido_em is not null from public.casos_comprovativos where id = (select id from ids where nome = 'comp1')), 'correção: o anterior fica marcado como substituído');
select is((select substitui_id from public.casos_comprovativos where id = (select id from ids where nome = 'comp2')), (select id from ids where nome = 'comp1'), 'correção: rastreável (substitui_id)');
select is((select count(*) from public.casos_comprovativos where caso_id = '20000000-0000-4000-a000-00000000000a' and substituido_em is null), 1::bigint, 'um único comprovativo em vigor');
select is((select count(*) from public.casos_eventos where caso_id = '20000000-0000-4000-a000-00000000000a' and tipo = 'comprovativo_disponivel'), 1::bigint, '14. correção não repete o evento');
select is(tt.tenta($$update public.casos_comprovativos set storage_path = 'outro' where id = (select id from ids where nome = 'comp2')$$), 'erro:42501', 'comprovativo não pode ser reescrito');
select is(tt.tenta($$delete from public.casos_comprovativos where caso_id = '20000000-0000-4000-a000-00000000000b'$$), 'ok:0', 'service role pode apagar (apagamento do caso), mas nenhuma ação o faz');
select ok(tt.tenta($$select public.comprovativo_registar('20000000-0000-4000-a000-00000000000b', (select id from ids where nome = 'envio_v2'), 'identificador', null, null, null, null, null, 'X', null, null)$$) like 'erro:%',
  'envio de outro caso não pode ser usado');

-- 12. Caso antigo (sem envio no sistema): comprovativo só por identificador.
select ok(public.comprovativo_registar('20000000-0000-4000-a000-00000000000b', null, 'identificador', null, null, null, null, null, 'LR-ANTIGO-9', null, null) is not null,
  '12. caso antigo: comprovativo sem envio associado (sem inventar a relação)');

-- 14. Dossiê final disponível (evento do trigger).
reset role;
update public.casos set dossie_url = 'https://exemplo.invalid/dossie.pdf' where id = '20000000-0000-4000-a000-00000000000a';
update public.casos set notas = 'outra alteração' where id = '20000000-0000-4000-a000-00000000000a';
select is((select count(*) from public.casos_eventos where caso_id = '20000000-0000-4000-a000-00000000000a' and tipo = 'dossie_disponivel'), 1::bigint, '13/14. dossiê disponível: um evento, dossie_url intacto');
select is((select dossie_url from public.casos where id = '20000000-0000-4000-a000-00000000000a'), 'https://exemplo.invalid/dossie.pdf', '13. dossie_url continua a funcionar');

-- 9/10. RLS dos comprovativos.
select tt.como('00000000-0000-4000-a000-00000000000a');
select is(tt.contar($$select id from public.casos_comprovativos where substituido_em is null$$), 1::bigint, '8. A vê o comprovativo do próprio caso');
select ok(tt.tenta($$select storage_path from public.casos_comprovativos$$) like 'erro:%', '10. A não lê o caminho no storage');
select ok(tt.tenta($$select nota from public.casos_comprovativos$$) like 'erro:%', 'A não lê a nota interna');
select is(tt.contar($$select id from public.casos_comprovativos where caso_id = '20000000-0000-4000-a000-00000000000b'$$), 0::bigint, '9. A não vê comprovativos do caso de B');
select is(tt.contar($$select id from storage.objects where bucket_id = 'comprovativos-casos'$$), 0::bigint, '10. A não acede ao bucket de comprovativos');
select ok(tt.tenta($$insert into storage.objects (bucket_id, name) values ('comprovativos-casos', 'x/y.pdf')$$) like 'erro:%', '10. A não carrega ficheiros no bucket');
reset role;
select tt.como('00000000-0000-4000-a000-00000000000b');
select is(tt.contar($$select id from public.casos_comprovativos where caso_id = '20000000-0000-4000-a000-00000000000a'$$), 0::bigint, '9. B não vê o comprovativo de A');
select is(tt.contar($$select id from public.casos_textos_envios$$), 0::bigint, '9. B não vê o envio de A');
reset role;
select tt.como(null);
select ok(tt.contar('select id from public.casos_comprovativos') <= 0, '10. anon não vê comprovativos');
reset role;
select tt.como('00000000-0000-4000-a000-0000000000ad');
select ok(tt.contar('select id from public.casos_comprovativos') >= 3, '11. admin vê os comprovativos');
select ok(tt.tenta($$insert into public.casos_comprovativos (caso_id, tipo, identificador_externo) values ('20000000-0000-4000-a000-00000000000a', 'identificador', 'forjado')$$) like 'erro:%', 'admin não insere comprovativos com a sessão dele');
select ok(tt.tenta($$delete from storage.objects where bucket_id = 'comprovativos-casos'$$) in ('ok:0') or tt.tenta($$delete from storage.objects where bucket_id = 'comprovativos-casos'$$) like 'erro:%', 'admin não apaga ficheiros de comprovativo pela API');
reset role;
select ok((select public from storage.buckets where id = 'comprovativos-casos') = false, '10. bucket de comprovativos é privado');

-- Apagar a conta do cliente não apaga nem altera a prova.
delete from auth.users where id = '00000000-0000-4000-a000-00000000000a';
select ok((select count(*) from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a') = 3 and (select bool_and(utilizador_id is null) from public.casos_textos_autorizacoes where caso_id = '20000000-0000-4000-a000-00000000000a'),
  'conta apagada: autorizações preservadas (sem a ligação à conta)');

select * from finish();
rollback;
