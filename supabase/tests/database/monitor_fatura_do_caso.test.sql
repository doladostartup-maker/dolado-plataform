-- DoLado — Proteção: a fatura enviada num caso como primeiro documento
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: um documento da Proteção só pode vir de um anexo de um caso do
-- mesmo utilizador (mesmo para a service role); cada anexo dá origem a um só
-- documento; o cliente não cria documentos (só lê os próprios, sem acesso aos
-- anexos); apagar o anexo do caso não apaga o documento da Proteção e apagar
-- o documento da Proteção não toca no anexo do caso. Transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.tenta(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return 'erro:' || sqlstate;
end $$;
grant execute on all functions in schema testes to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('00000000-0000-4000-f000-00000000000a', 'fa@teste.invalid', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-f000-00000000000b', 'fb@teste.invalid', 'authenticated', 'authenticated', now());

insert into public.casos (id, utilizador_id, nome, email, descricao, empresa, status) values
  ('30000000-0000-4000-f000-00000000000a', '00000000-0000-4000-f000-00000000000a', 'A', 'fa@teste.invalid', 'caso A', 'Operadora X', 'Novo'),
  ('30000000-0000-4000-f000-00000000000b', '00000000-0000-4000-f000-00000000000b', 'B', 'fb@teste.invalid', 'caso B', 'Operadora Y', 'Novo');

insert into public.anexos (id, caso_id, nome_ficheiro, caminho_storage, tipo_mime, tamanho_bytes) values
  ('40000000-0000-4000-f000-0000000000a1', '30000000-0000-4000-f000-00000000000a', 'fatura.pdf', 'pendentes/x-fatura.pdf', 'application/pdf', 1000),
  ('40000000-0000-4000-f000-0000000000b1', '30000000-0000-4000-f000-00000000000b', 'fatura.pdf', 'pendentes/y-fatura.pdf', 'application/pdf', 1000);

-- ===========================================================================
-- 1. Service role: só anexos de casos do próprio utilizador
-- ===========================================================================
set local role service_role;

select is(
  testes.tenta($$insert into public.documentos_monitor (utilizador_id, tipo, storage_path, anexo_origem_id)
                 values ('00000000-0000-4000-f000-00000000000a', 'fatura', '00000000-0000-4000-f000-00000000000a/b.pdf',
                         '40000000-0000-4000-f000-0000000000b1')$$),
  'erro:42501', 'anexo do caso de outro cliente é recusado (mesmo à service role)');

select is(
  testes.tenta($$insert into public.documentos_monitor (id, utilizador_id, tipo, storage_path, anexo_origem_id)
                 values ('50000000-0000-4000-f000-0000000000a1', '00000000-0000-4000-f000-00000000000a', 'fatura',
                         '00000000-0000-4000-f000-00000000000a/a.pdf', '40000000-0000-4000-f000-0000000000a1')$$),
  'ok', 'anexo de um caso do próprio cliente é aceite');

select is(
  testes.tenta($$insert into public.documentos_monitor (utilizador_id, tipo, storage_path, anexo_origem_id)
                 values ('00000000-0000-4000-f000-00000000000a', 'fatura', '00000000-0000-4000-f000-00000000000a/a2.pdf',
                         '40000000-0000-4000-f000-0000000000a1')$$),
  'erro:23505', 'o mesmo anexo só dá origem a um documento');

select is(
  testes.tenta($$update public.documentos_monitor set utilizador_id = '00000000-0000-4000-f000-00000000000b'
                  where id = '50000000-0000-4000-f000-0000000000a1'$$),
  'erro:42501', 'o documento não passa para outro cliente mantendo o anexo');

select is(
  testes.tenta($$update public.documentos_monitor set anexo_origem_id = '40000000-0000-4000-f000-0000000000b1'
                  where id = '50000000-0000-4000-f000-0000000000a1'$$),
  'erro:42501', 'o documento não passa a apontar para o anexo de outro cliente');
reset role;

-- ===========================================================================
-- 2. Cliente: lê o próprio documento, não cria nem lê anexos
-- ===========================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-f000-00000000000a", "role": "authenticated"}';

select is((select anexo_origem_id from public.documentos_monitor where id = '50000000-0000-4000-f000-0000000000a1'),
  '40000000-0000-4000-f000-0000000000a1'::uuid, 'cliente A lê a origem do próprio documento');
select is((select count(*) from public.anexos)::int, 0, 'cliente A não lê anexos (só o admin)');
select isnt(
  testes.tenta($$insert into public.documentos_monitor (utilizador_id, tipo, storage_path, anexo_origem_id)
                 values ('00000000-0000-4000-f000-00000000000a', 'fatura', '00000000-0000-4000-f000-00000000000a/c.pdf',
                         '40000000-0000-4000-f000-0000000000a1')$$),
  'ok', 'cliente não cria documentos da Proteção diretamente');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-f000-00000000000b", "role": "authenticated"}';
select is((select count(*) from public.documentos_monitor where id = '50000000-0000-4000-f000-0000000000a1')::int, 0,
  'cliente B não vê o documento de A');
reset role;

-- ===========================================================================
-- 3. Ciclos de vida separados
-- ===========================================================================
delete from public.documentos_monitor where id = '50000000-0000-4000-f000-0000000000a1';
select is((select count(*) from public.anexos where id = '40000000-0000-4000-f000-0000000000a1')::int, 1,
  'apagar o documento da Proteção não apaga o anexo do caso');

insert into public.documentos_monitor (id, utilizador_id, tipo, storage_path, anexo_origem_id)
values ('50000000-0000-4000-f000-0000000000a2', '00000000-0000-4000-f000-00000000000a', 'fatura',
        '00000000-0000-4000-f000-00000000000a/d.pdf', '40000000-0000-4000-f000-0000000000a1');
delete from public.anexos where id = '40000000-0000-4000-f000-0000000000a1';
select is((select anexo_origem_id from public.documentos_monitor where id = '50000000-0000-4000-f000-0000000000a2'), null,
  'apagar o anexo do caso mantém o documento da Proteção (sem origem)');

select * from finish();
rollback;
