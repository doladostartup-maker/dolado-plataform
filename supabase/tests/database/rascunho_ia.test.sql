-- DoLado — Sugestão do texto pela IA: revisão humana obrigatória, regeneração
-- sem destruir edições, autorização presa à versão, auditoria imutável, RLS.
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

-- Conclui uma geração com um texto sugerido (como o servidor faz).
create function tt.gerada(p_caso uuid, p_draft text, p_origem text default 'manual') returns uuid language plpgsql as $$
declare g uuid;
begin
  g := public.rascunho_ia_iniciar(p_caso, p_origem, null, 'reclamacao_v1', 'rascunho_v1');
  update public.casos_rascunhos_ia
     set estado = 'gerado', concluido_em = now(), modelo = 'teste', confianca = 'medium',
         resposta = jsonb_build_object('draft', p_draft, 'legal_basis', '[]'::jsonb, 'missing_information', '[]'::jsonb,
                                       'warnings', '[]'::jsonb, 'confidence', 'medium', 'server_warnings', '[]'::jsonb)
   where id = g;
  return g;
end $$;

grant execute on all functions in schema tt to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'a@teste.invalid', 'authenticated', 'authenticated', '{"nome":"A"}'),
  ('00000000-0000-4000-a000-0000000000ad', 'admin@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-a000-0000000000ad';
insert into public.casos (id, utilizador_id, nome, email, descricao, empresa, status) values
  ('30000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso A', 'Operadora X', 'Novo'),
  ('30000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000a', 'A', 'a@teste.invalid', 'caso B', 'Operadora Y', 'Novo');

create temporary table ids (nome text primary key, id uuid);
grant all on ids to service_role, authenticated, anon;

set local role service_role;

-- ---------------------------------------------------------------------------
-- 1. Caso normal: sugestão entra como versão 1, origem "ia", por rever.
insert into ids values ('g1', tt.gerada('30000000-0000-4000-a000-00000000000a', 'Sugestão 1 da IA'));
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g1'), null)->>'resultado', 'aplicado', '1. sugestão aplicada ao caso sem texto');
insert into ids select 'v1', id from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000a' and versao = 1;
select results_eq(
  $$select estado, origem, revisto_em is null, conteudo from public.casos_textos where id = (select id from ids where nome = 'v1')$$,
  $$values ('rascunho', 'ia', true, 'Sugestão 1 da IA')$$,
  '9. sugestão nasce em rascunho, origem ia, por rever');
select is((select count(*) from public.casos_eventos where caso_id = '30000000-0000-4000-a000-00000000000a'), 0::bigint,
  '10. aplicar a sugestão não cria eventos no histórico que o cliente vê');
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g1'), null)->>'resultado', 'ja_aplicado', '1. aplicar duas vezes é idempotente');

-- 9/10. Nunca sai para o cliente sem revisão humana — nem pela service role.
select is(tt.tenta($$select public.texto_emitir_links((select id from ids where nome = 'v1'), tt.h('r1'), tt.h('a1'), now() + interval '14 days')$$),
  'erro:42501', '10. enviar ao cliente uma sugestão por rever é recusado');
select is((select count(*) from public.casos_textos_links where texto_id = (select id from ids where nome = 'v1')), 0::bigint, '10. nenhum link criado');
select is(tt.tenta($$update public.casos_textos set estado = 'aguardando_aprovacao' where id = (select id from ids where nome = 'v1')$$),
  'erro:42501', '10. nem por update direto');
select is(tt.tenta($$insert into public.casos_textos_autorizacoes (caso_id, texto_id, conteudo_sha256, metodo, autorizado_em)
  select caso_id, id, conteudo_sha256, 'portal', now() from public.casos_textos where id = (select id from ids where nome = 'v1')$$),
  'erro:42501', '9. sugestão por rever não pode ser autorizada');
select is(tt.tenta($$insert into public.casos_textos (caso_id, versao, conteudo, conteudo_sha256, origem, rascunho_ia_id, revisto_em)
  values ('30000000-0000-4000-a000-00000000000b', 1, 'x', '', 'ia', (select id from ids where nome = 'g1'), now())$$),
  'erro:42501', '9. uma sugestão nunca nasce já revista');

-- 8. Regeneração: sugestão sem edições é trocada pela nova (a anterior fica na auditoria).
insert into ids values ('g2', tt.gerada('30000000-0000-4000-a000-00000000000a', 'Sugestão 2 da IA'));
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g2'), null)->>'resultado', 'aplicado', '8. sugestão sem edições é trocada');
select results_eq(
  $$select versao, conteudo, rascunho_ia_id from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000a'$$,
  $$values (1, 'Sugestão 2 da IA', (select id from ids where nome = 'g2'))$$,
  '8. mesma versão, nova sugestão');
select is((select resposta->>'draft' from public.casos_rascunhos_ia where id = (select id from ids where nome = 'g1')), 'Sugestão 1 da IA',
  '8. a sugestão anterior fica guardada na auditoria');

-- 8. Edição humana: nunca é substituída sem confirmação.
select public.texto_guardar('30000000-0000-4000-a000-00000000000a', 'Texto editado pela DoLado', '00000000-0000-4000-a000-0000000000ad');
insert into ids values ('g3', tt.gerada('30000000-0000-4000-a000-00000000000a', 'Sugestão 3 da IA'));
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g3'), null)->>'resultado', 'requer_confirmacao',
  '8. rascunho editado: regenerar pede confirmação');
select is((select conteudo from public.casos_textos where id = (select id from ids where nome = 'v1')), 'Texto editado pela DoLado',
  '8. a edição humana continua intacta');
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g3'), '00000000-0000-4000-a000-0000000000ad', true)->>'resultado', 'aplicado',
  '8. com confirmação, a sugestão entra como nova versão');
select results_eq(
  $$select versao, estado, conteudo from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000a' order by versao$$,
  $$values (1, 'substituido', 'Texto editado pela DoLado'), (2, 'rascunho', 'Sugestão 3 da IA')$$,
  '8. o texto editado fica preservado como versão anterior');
insert into ids select 'v2', id from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000a' and versao = 2;

-- Revisão humana: presa ao conteúdo visto.
select is(public.texto_marcar_revisto((select id from ids where nome = 'v2'), tt.h('outro texto'), '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'conteudo_diferente', 'revisão recusada se o texto mudou entretanto');
select is(public.texto_marcar_revisto((select id from ids where nome = 'v2'), tt.h('Sugestão 3 da IA'), null)->>'resultado',
  'invalido', 'revisão exige uma pessoa');
select is(public.texto_marcar_revisto((select id from ids where nome = 'v2'), tt.h('Sugestão 3 da IA'), '00000000-0000-4000-a000-0000000000ad')->>'resultado',
  'revisto', 'revisão humana registada');
select is((select tipo from public.casos_eventos where texto_id = (select id from ids where nome = 'v2')), 'nova_versao',
  'o histórico do cliente só regista o texto depois da revisão');
select is(tt.tenta($$update public.casos_textos set revisto_em = now() + interval '1 hour' where id = (select id from ids where nome = 'v2')$$),
  'erro:42501', 'a revisão não pode ser reescrita');
-- Revista: uma nova sugestão já não a substitui sem confirmação.
insert into ids values ('g4', tt.gerada('30000000-0000-4000-a000-00000000000a', 'Sugestão 4 da IA'));
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g4'), null)->>'resultado', 'requer_confirmacao',
  '8. sugestão revista conta como texto humano');

-- 11. Envio ao cliente e autorização presa à versão.
select is(public.texto_emitir_links((select id from ids where nome = 'v2'), tt.h('r2'), tt.h('a2'), now() + interval '14 days'),
  'a@teste.invalid', 'depois de revista, segue o fluxo normal de envio ao cliente');
select is(public.texto_autorizar_por_link(tt.h('r2'))->>'resultado', 'autorizado', '11. cliente autoriza a versão que recebeu');
select is(public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g4'), null, true)->>'resultado', 'bloqueado',
  '11. texto autorizado: uma sugestão nunca o substitui, nem com confirmação');
select results_eq(
  $$select a.texto_id, a.conteudo_sha256 from public.casos_textos_autorizacoes a where a.caso_id = '30000000-0000-4000-a000-00000000000a'$$,
  $$select id, tt.h('Sugestão 3 da IA') from ids where nome = 'v2'$$,
  '11. a autorização está presa à versão 2 e ao hash do texto revisto');
select is((select count(*) from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000a'), 2::bigint,
  '11. nenhuma versão nova foi criada');

-- ---------------------------------------------------------------------------
-- Gerações: automática idempotente, uma em curso por caso, auditoria imutável.
select is(public.rascunho_ia_iniciar('30000000-0000-4000-a000-00000000000a', 'automatico', null, 'p', 's'), null::uuid,
  'automática não corre se o caso já tem texto/gerações (reenvio do webhook)');
insert into ids values ('gb', public.rascunho_ia_iniciar('30000000-0000-4000-a000-00000000000b', 'automatico', null, 'p', 's'));
select isnt((select id from ids where nome = 'gb'), null::uuid, 'automática corre num caso novo');
select is(public.rascunho_ia_iniciar('30000000-0000-4000-a000-00000000000b', 'manual', null, 'p', 's'), null::uuid,
  'só uma geração em curso por caso');
-- Simula um processo interrompido há 10 minutos (o trigger não deixa mudar created_at).
reset role;
alter table public.casos_rascunhos_ia disable trigger casos_rascunhos_ia_integridade;
update public.casos_rascunhos_ia set created_at = now() - interval '10 minutes' where id = (select id from ids where nome = 'gb');
alter table public.casos_rascunhos_ia enable trigger casos_rascunhos_ia_integridade;
set local role service_role;
select isnt(public.rascunho_ia_iniciar('30000000-0000-4000-a000-00000000000b', 'manual', null, 'p', 's'), null::uuid,
  'geração interrompida (> 5 min) não bloqueia nova tentativa');
select is((select erro from public.casos_rascunhos_ia where id = (select id from ids where nome = 'gb')), 'interrompido',
  'a interrompida fica registada como falhada');
select is(tt.tenta($$update public.casos_rascunhos_ia set erro = 'outro' where id = (select id from ids where nome = 'gb')$$),
  'erro:42501', 'geração concluída é imutável');
select is(tt.tenta($$update public.casos_rascunhos_ia set resposta = '{"draft":"x"}' where id = (select id from ids where nome = 'g1')$$),
  'erro:42501', 'resposta gravada não pode ser reescrita');
select is((select rascunho_sha256 from public.casos_rascunhos_ia where id = (select id from ids where nome = 'g1')), tt.h('Sugestão 1 da IA'),
  'hash da sugestão calculado pela base de dados');
-- 2. Falha da IA: o caso fica intacto, sem texto.
update public.casos_rascunhos_ia set estado = 'falhou', erro = 'erro_api', concluido_em = now()
 where caso_id = '30000000-0000-4000-a000-00000000000b' and estado = 'a_gerar';
select is((select count(*) from public.casos where id = '30000000-0000-4000-a000-00000000000b'), 1::bigint, '2. falha da IA não mexe no caso');
select is((select count(*) from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000b'), 0::bigint, '2. sem texto: preparação manual');

-- Base jurídica: só regras revistas podem ficar ativas.
select is(tt.tenta($$insert into public.regras_juridicas (codigo, titulo, diploma, resumo, ativa) values ('TEST-01', 'Título', 'Lei n.º 1/2020', 'Resumo aprovado.', true)$$),
  'erro:23514', 'regra ativa sem revisão é recusada');
select is(tt.tenta($$insert into public.regras_juridicas (codigo, titulo, diploma, resumo, ativa, revista_em) values ('TEST-01', 'Título', 'Lei n.º 1/2020', 'Resumo aprovado.', true, current_date)$$),
  'ok:1', 'regra revista pode ficar ativa');

-- ---------------------------------------------------------------------------
-- RLS: o cliente não vê sugestões nem a base jurídica; o admin vê; só o backend escreve gerações.
reset role;
select tt.como('00000000-0000-4000-a000-00000000000a');
select is(tt.contar('select * from public.casos_rascunhos_ia'), 0::bigint, 'cliente não lê as sugestões da IA (nem a confiança)');
select is(tt.contar('select * from public.regras_juridicas'), 0::bigint, 'cliente não lê a base jurídica');
select is(tt.tenta($$insert into public.regras_juridicas (codigo, titulo, diploma, resumo) values ('X-01', 'Título', 'Lei n.º 1/2020', 'Resumo aprovado.')$$),
  'erro:42501', 'cliente não cria regras');
select is(tt.contar($$select * from public.casos_textos where caso_id = '30000000-0000-4000-a000-00000000000a' and estado = 'rascunho'$$), 0::bigint,
  'cliente nunca vê rascunhos (incluindo sugestões)');
select is(tt.tenta($$select public.texto_aplicar_rascunho_ia((select id from ids where nome = 'g4'), null, true)$$), 'erro:42501',
  'cliente não chama as funções da IA');
select is(tt.tenta($$select public.texto_marcar_revisto(gen_random_uuid(), 'x', auth.uid())$$), 'erro:42501',
  'cliente não marca textos como revistos');

reset role;
select tt.como('00000000-0000-4000-a000-0000000000ad');
select cmp_ok(tt.contar('select * from public.casos_rascunhos_ia'), '>', 0::bigint, 'admin lê as sugestões');
select is(tt.contar('select * from public.regras_juridicas'), 1::bigint, 'admin lê a base jurídica');
select is(tt.tenta($$update public.casos_rascunhos_ia set erro = 'x'$$), 'erro:42501', 'admin não reescreve a auditoria pela API');
select is(tt.tenta($$delete from public.regras_juridicas$$), 'erro:42501', 'regras não se apagam (desativar)');

reset role;
select * from finish();
rollback;
