-- DoLado — Programa de Parceiros: área do parceiro
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: o acesso só é dado pelo servidor a uma conta de cliente com o e-mail
-- confirmado, de um parceiro activo, uma conta por parceiro; a conta indicada
-- pelo parceiro não o recebe; o resumo só devolve agregados ao próprio
-- parceiro (nunca ids nem e-mails de clientes); clientes e anónimos não lêem
-- nada; a conta com acesso nunca é atribuída a esse parceiro; retirar o
-- acesso é final e nada se apaga. Tudo numa transação revertida.

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

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- a: admin · p: conta do parceiro · q: segunda conta do parceiro ·
-- c1: cliente indicado · c2: cliente sem relação · n: e-mail por confirmar
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e000-0000000000aa', 'apa@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-0000000000bb', 'app@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-0000000000cc', 'apq@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-000000000001', 'ap1@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-000000000002', 'ap2@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-0000000000dd', 'apn@teste.invalid', 'authenticated', 'authenticated', null, now());

update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e000-0000000000aa';

insert into public.parceiros (id, indicacao, nome, estado, alterado_por) values
  ('00000000-0000-4000-e100-000000000001', true, 'Consultora Teste', 'ativo', '00000000-0000-4000-e000-0000000000aa'),
  ('00000000-0000-4000-e100-000000000002', true, 'Outra Teste', 'ativo', '00000000-0000-4000-e000-0000000000aa'),
  ('00000000-0000-4000-e100-000000000003', true, 'Negociação Teste', 'em_negociacao', '00000000-0000-4000-e000-0000000000aa');
insert into public.parceiros_condicoes (parceiro_id) values
  ('00000000-0000-4000-e100-000000000001'), ('00000000-0000-4000-e100-000000000002');
insert into public.parceiros_codigos (codigo, parceiro_id) values
  ('AREA2345', '00000000-0000-4000-e100-000000000001'),
  ('WTRA2345', '00000000-0000-4000-e100-000000000002');

-- c1 indicado pela Consultora, com a 1.ª mensalidade da Protecção paga.
select is(public.parceiro_atribuir('00000000-0000-4000-e000-000000000001', null, 'AREA2345'), 'atribuida',
  'Cliente indicado pela ligação do parceiro');
select is(public.parceiro_registar_fatura('00000000-0000-4000-e000-000000000001', 'in_ap1', 'sub_ap1', 'protecao',
  499, 0, 0, 'pi_ap1', 'cus_ap1', now()) ->> 'resultado', 'pendente', 'Primeira mensalidade registada (comissão pendente)');

-- ===========================================================================
-- Dar o acesso
-- ===========================================================================
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000001', 'ninguem@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'sem_conta', 'Sem conta com esse e-mail');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000001', 'apn@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'email_por_confirmar', 'Conta com o e-mail por confirmar');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000001', 'apa@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'conta_admin', 'Uma conta admin nunca é conta de parceiro');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000003', 'app@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'parceiro_inativo', 'Parceiro em negociação não tem área');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000001', 'ap1@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'indicada_pelo_parceiro', 'A conta indicada pelo parceiro não passa a ser dele');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000001', ' APP@teste.invalid ',
  '00000000-0000-4000-e000-0000000000aa'), 'concedido', 'Acesso dado (e-mail normalizado)');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000001', 'app@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'ja_tem', 'Dar de novo não duplica');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000002', 'app@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'outro_parceiro', 'Uma conta, um parceiro de cada vez');
select ok(exists (select 1 from public.parceiros_historico where entidade = 'parceiros_area_acessos'
                    and parceiro_id = '00000000-0000-4000-e100-000000000001'),
  'Acesso dado fica no histórico do parceiro');

-- ===========================================================================
-- Auto-indicação
-- ===========================================================================
select is(public.parceiro_atribuir('00000000-0000-4000-e000-0000000000bb', null, 'AREA2345'), 'auto_indicacao',
  'A conta com acesso não é atribuída ao próprio parceiro');
select is(public.parceiro_atribuir('00000000-0000-4000-e000-000000000002', null, 'WTRA2345'), 'atribuida',
  'Outros clientes continuam a ser atribuídos normalmente');

-- ===========================================================================
-- Resumo (como a conta do parceiro)
-- ===========================================================================
create temporary table t_resumo (r jsonb);
grant all on t_resumo to authenticated;

select testes.como('00000000-0000-4000-e000-0000000000bb');
insert into t_resumo select public.parceiro_area_resumo();
reset role;

select is((select r -> 'parceiro' ->> 'nome' from t_resumo), 'Consultora Teste', 'O parceiro vê o próprio nome');
select is((select r -> 'codigos' from t_resumo), '["AREA2345"]'::jsonb, 'Vê só o próprio código');
select is((select (r ->> 'contas_associadas')::int from t_resumo), 1, 'Contas associadas: só as dele');
select is((select (r -> 'conversoes' ->> 'protecao')::int from t_resumo), 1, 'Uma conversão na Protecção');
select is((select (r -> 'comissoes' -> 'pendente' ->> 'valor_cents')::int from t_resumo), 500, 'Comissão pendente de 5 €');
select is((select (r -> 'comissoes' -> 'paga' ->> 'quantidade')::int from t_resumo), 0, 'Sem comissões pagas');
select is((select (r -> 'condicoes' ->> 'mensalidades_necessarias')::int from t_resumo), 3, 'Condições em vigor (3 mensalidades)');
select ok((select r::text not like '%00000000-0000-4000-e000-000000000001%'
              and r::text not like '%ap1@teste%'
              and r::text not like '%sub_ap1%'
              and r::text not like '%cus_ap1%' from t_resumo),
  'O resumo não tem ids, e-mails nem dados Stripe de clientes');

-- Leituras directas da conta do parceiro
select testes.como('00000000-0000-4000-e000-0000000000bb');
select is((select count(*)::int from public.parceiros_area_acessos), 1, 'O parceiro lê só a própria linha de acesso');
select is(testes.tenta($$select concedido_por from public.parceiros_area_acessos$$), 'erro:42501',
  'Sem acesso a quem deu o acesso');
select is((select count(*)::int from public.parceiros_comissoes), 0, 'Sem leitura directa das comissões (RLS)');
select is((select count(*)::int from public.parceiros_atribuicoes), 0, 'Sem leitura directa das atribuições (RLS)');
select is(testes.tenta($$insert into public.parceiros_area_acessos (parceiro_id, user_id) values
  ('00000000-0000-4000-e100-000000000002', '00000000-0000-4000-e000-0000000000bb')$$), 'erro:42501',
  'A conta não dá acesso a si própria');
select is(testes.tenta($$select public.parceiro_area_conceder('00000000-0000-4000-e100-000000000002', 'app@teste.invalid', null)$$),
  'erro:42501', 'Só o servidor dá acesso');
reset role;

-- Cliente sem acesso e anónimo
select testes.como('00000000-0000-4000-e000-000000000001');
select ok(public.parceiro_area_resumo() is null, 'Cliente sem acesso: resumo vazio');
select is((select count(*)::int from public.parceiros_area_acessos), 0, 'Cliente não vê acessos de outros');
reset role;
set local role anon;
select is(testes.tenta($$select public.parceiro_area_resumo()$$), 'erro:42501', 'Anónimo não chama o resumo');
reset role;

-- Parceiro suspenso: continua a ver os números, sem código
update public.parceiros set estado = 'suspenso', alterado_por = '00000000-0000-4000-e000-0000000000aa'
 where id = '00000000-0000-4000-e100-000000000001';
select testes.como('00000000-0000-4000-e000-0000000000bb');
select is(public.parceiro_area_resumo() -> 'codigos', '[]'::jsonb, 'Suspenso: sem códigos');
select is((public.parceiro_area_resumo() ->> 'contas_associadas')::int, 1, 'Suspenso: continua a ver os números');
reset role;
update public.parceiros set estado = 'ativo', alterado_por = '00000000-0000-4000-e000-0000000000aa'
 where id = '00000000-0000-4000-e100-000000000001';

-- ===========================================================================
-- Retirar o acesso
-- ===========================================================================
create temporary table t_acesso as
  select id from public.parceiros_area_acessos where user_id = '00000000-0000-4000-e000-0000000000bb';

select is(testes.tenta($$delete from public.parceiros_area_acessos$$), 'erro:42501', 'O acesso nunca se apaga');
select is(testes.tenta($$update public.parceiros_area_acessos set parceiro_id = '00000000-0000-4000-e100-000000000002'$$),
  'erro:42501', 'Não se muda o parceiro de um acesso');
select ok(public.parceiro_area_revogar((select id from t_acesso), 'Fim da parceria', '00000000-0000-4000-e000-0000000000aa'),
  'Acesso retirado');
select ok(not public.parceiro_area_revogar((select id from t_acesso), 'De novo', '00000000-0000-4000-e000-0000000000aa'),
  'Retirar duas vezes não faz nada');
select is(testes.tenta($$update public.parceiros_area_acessos set revogado_motivo = 'outro'$$), 'erro:42501',
  'A revogação é final');

select testes.como('00000000-0000-4000-e000-0000000000bb');
select ok(public.parceiro_area_resumo() is null, 'Sem acesso, o resumo fica vazio');
reset role;

select is(public.parceiro_atribuir('00000000-0000-4000-e000-0000000000bb', null, 'AREA2345'), 'auto_indicacao',
  'Depois de retirado, a conta continua sem poder ser atribuída a esse parceiro');
select is(public.parceiro_area_conceder('00000000-0000-4000-e100-000000000002', 'app@teste.invalid',
  '00000000-0000-4000-e000-0000000000aa'), 'concedido', 'Sem acesso activo, a conta pode passar a outro parceiro');

select * from finish();
rollback;
