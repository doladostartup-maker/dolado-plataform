-- DoLado Empresas — Fase 6B: marcação e registo da revisão humana (D3).
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-ea00-00000000000a', 'rev-a@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-ea00-0000000000e1', 'rev-e1@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-ea00-00000000000c', 'rev-c@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-ea00-00000000000a';
select is(public.empresa_registar('00000000-0000-4000-ea00-0000000000e1', 'Um', 'sociedade', '500000000', null), 'registada', 'e1');
update public.organizacoes set estado = 'aprovada';
select is(public.empresa_activar((select id from public.organizacoes where nif = '500000000'), '00000000-0000-4000-ea00-00000000000a', 'FT 1'), 'ativa', 'activa');
select is(public.empresa_criar_instalacao('00000000-0000-4000-ea00-0000000000e1', 'Loja', null) ->> 'resultado', 'criada', 'instalação');

create temporary table d as
select (public.empresa_registar_documento('00000000-0000-4000-ea00-0000000000e1', (select id from public.instalacoes where nome = 'Loja'),
         'fatura', false, '00000000-0000-4000-ea00-0000000000e1/' || gen_random_uuid()::text || '.pdf', 'f.pdf', 'application/pdf')
        ->> 'documento_id')::uuid as doc;
grant select on d to public;

select is((select revisao_necessaria::text || '|' || cardinality(revisao_motivos) from public.empresa_documentos where documento_id = (select doc from d)),
  'false|0', 'Antes do processamento: sem marcação');
select throws_ok($$ select public.empresa_marcar_revisao((select doc from d), array['inventado']) $$, null, null, 'Motivo desconhecido recusado');
select ok(public.empresa_marcar_revisao((select doc from d), array['periodo_inicial', 'primeira_fatura_servico']), 'Marcado');
select is((select revisao_necessaria::text || '|' || array_to_string(revisao_motivos, ',') from public.empresa_documentos where documento_id = (select doc from d)),
  'true|periodo_inicial,primeira_fatura_servico', 'Revisão necessária com os motivos');

-- Registo da revisão.
select is(public.empresa_registar_revisao((select doc from d), '00000000-0000-4000-ea00-00000000000c', 3, 'confirmado', null, null), 'sem_permissao', 'Só o admin');
select is(public.empresa_registar_revisao((select doc from d), '00000000-0000-4000-ea00-00000000000a', -1, 'confirmado', null, null), 'invalida', 'Minutos inválidos');
select is(public.empresa_registar_revisao((select doc from d), '00000000-0000-4000-ea00-00000000000a', 4, 'corrigido', null, null), 'invalida', 'Correcção sem tipo de erro');
select is(public.empresa_registar_revisao(gen_random_uuid(), '00000000-0000-4000-ea00-00000000000a', 4, 'confirmado', null, null), 'sem_documento', 'Documento inexistente');
select is(public.empresa_registar_revisao((select doc from d), '00000000-0000-4000-ea00-00000000000a', 7, 'corrigido', 'extracao_valor', 'Total lido 49,90'), 'registada', 'Registada');
select is((select minutos || '|' || resultado || '|' || tipo_erro || '|' || alvo_tipo from public.empresa_revisoes where alvo_id = (select doc from d)),
  '7|corrigido|extracao_valor|documento', 'Minutos e tipo de erro gravados');
select ok((select revisto_em is not null from public.empresa_documentos where documento_id = (select doc from d)), 'Documento revisto');
select ok(not public.empresa_marcar_revisao((select doc from d), array['diferenca_potencial']), 'Revisto: a marcação não volta atrás');

-- O membro (aal2) vê a marcação; não escreve.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-ea00-0000000000e1', 'role', 'authenticated', 'aal', 'aal2')::text, true);
select is((select count(*) from public.empresa_documentos where revisto_em is not null), 1::bigint, 'Membro lê a revisão do próprio documento');
reset role;

select ok(not has_function_privilege('authenticated', 'public.empresa_marcar_revisao(uuid, text[])', 'EXECUTE'), 'marcar: só service_role');
select ok(not has_function_privilege('authenticated', 'public.empresa_registar_revisao(uuid, uuid, integer, text, text, text)', 'EXECUTE'), 'registar: só service_role');

select * from finish();
rollback;
