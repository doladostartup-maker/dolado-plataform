-- DoLado — Proteção: avisos de datas enviados visíveis ao cliente
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que o cliente lê os avisos enviados dos próprios serviços (para o
-- histórico "O que já fizemos por si"), nunca os de outro cliente, e
-- continua sem poder escrever. Tudo numa transação revertida.

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

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('00000000-0000-4000-e000-00000000000a', 'pa@teste.invalid', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-e000-00000000000b', 'pb@teste.invalid', 'authenticated', 'authenticated', now());

insert into public.contratos_monitorizados (id, utilizador_id, setor, fornecedor, data_fim_promocao) values
  ('90000000-0000-4000-e000-0000000000a1', '00000000-0000-4000-e000-00000000000a', 'telecomunicacoes', 'MEO', '2026-11-30'),
  ('90000000-0000-4000-e000-0000000000b1', '00000000-0000-4000-e000-00000000000b', 'telecomunicacoes', 'NOS', '2026-11-30');

insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo) values
  ('90000000-0000-4000-e000-0000000000a1', 'promocao_60d', '2026-11-30'),
  ('90000000-0000-4000-e000-0000000000b1', 'promocao_60d', '2026-11-30');

select testes.como('00000000-0000-4000-e000-00000000000a');

select is(
  (select count(*) from public.contratos_alertas_envios),
  1::bigint,
  'O cliente vê só os avisos enviados dos próprios serviços'
);
select is(
  (select contrato_id from public.contratos_alertas_envios),
  '90000000-0000-4000-e000-0000000000a1'::uuid,
  'O aviso visível é o do serviço do cliente'
);
select is(
  testes.tenta($$insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo)
                 values ('90000000-0000-4000-e000-0000000000a1', 'promocao_30d', '2026-11-30')$$),
  'erro:42501',
  'O cliente não regista avisos'
);
select is(
  testes.tenta($$delete from public.contratos_alertas_envios$$),
  'erro:42501',
  'O cliente não apaga avisos'
);

reset role;
select testes.como('00000000-0000-4000-e000-00000000000b');
select is(
  (select count(*) from public.contratos_alertas_envios where contrato_id = '90000000-0000-4000-e000-0000000000a1'),
  0::bigint,
  'Outro cliente não vê os avisos de serviços que não são dele'
);

reset role;
select * from finish();
rollback;
