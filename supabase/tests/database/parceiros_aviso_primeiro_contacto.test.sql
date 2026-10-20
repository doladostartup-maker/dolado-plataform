-- DoLado — Programa de Parceiros: aviso de primeiro contacto (art. 14.º RGPD)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: a prova do aviso é só de inserção (nem a service role a altera ou
-- apaga), só o admin a lê, e nem o cliente nem o anónimo escrevem.

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

insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-f100-0000000000aa', 'apa@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f100-000000000001', 'ap1@teste.invalid', 'authenticated', 'authenticated', now(), now());
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-f100-0000000000aa';

insert into public.parceiros (id, indicacao, distribuicao, nome, estado)
values ('00000000-0000-4000-f100-0000000000b1', true, false, 'Parceiro Aviso', 'ativo');
insert into public.parceiros_oportunidades (id, parceiro_id, entidade, contacto)
values ('00000000-0000-4000-f100-0000000000c1', '00000000-0000-4000-f100-0000000000b1', 'Empresa Aviso, Lda.', 'Ana · ana@empresa.invalid');

insert into public.parceiros_oportunidades_avisos (oportunidade_id, destinatario_email, aviso_versao, assunto, texto, enviado_por)
values ('00000000-0000-4000-f100-0000000000c1', 'ana@empresa.invalid', '2026-10-23', 'Assunto', 'Texto do aviso', '00000000-0000-4000-f100-0000000000aa');

select is(testes.tenta($$insert into public.parceiros_oportunidades_avisos (oportunidade_id, destinatario_email, aviso_versao, assunto, texto)
  values ('00000000-0000-4000-f100-0000000000c1', 'nao-e-email', 'v', 'a', 't')$$), 'erro:23514', 'E-mail inválido recusado');

-- Só inserção, mesmo para a service role.
set local role service_role;
select is(testes.tenta($$update public.parceiros_oportunidades_avisos set destinatario_email = 'outro@empresa.invalid'$$),
  'erro:42501', 'Service role não altera a prova');
select is(testes.tenta($$delete from public.parceiros_oportunidades_avisos$$), 'erro:42501', 'Service role não apaga a prova');
reset role;

-- RLS: o admin lê; o cliente não lê nem escreve.
select testes.como('00000000-0000-4000-f100-0000000000aa');
select is((select count(*)::int from public.parceiros_oportunidades_avisos), 1, 'Admin lê a prova');
reset role;

select testes.como('00000000-0000-4000-f100-000000000001');
select is((select count(*)::int from public.parceiros_oportunidades_avisos), 0, 'Cliente não lê a prova');
select is(testes.tenta($$insert into public.parceiros_oportunidades_avisos (oportunidade_id, destinatario_email, aviso_versao, assunto, texto)
  values ('00000000-0000-4000-f100-0000000000c1', 'x@empresa.invalid', 'v', 'a', 't')$$), 'erro:42501', 'Cliente não escreve');
reset role;

set local role anon;
select is(testes.tenta($$select 1 from public.parceiros_oportunidades_avisos$$), 'erro:42501', 'Anónimo sem acesso');
reset role;

select * from finish();
rollback;
