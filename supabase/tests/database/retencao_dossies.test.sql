-- DoLado — Retenção dos dossiês PDF (20261008130000_retencao_dossies_pdf.sql).
--
-- Correr com `supabase test db` (stack local, nunca produção). Tudo numa
-- transação revertida.
--
-- Prova que: só os dossiês de casos com o último encerramento há 6 meses ou
-- mais, e ainda num estado final, são devolvidos (todas as versões); casos
-- reabertos ou encerrados de novo mantêm os dossiês; o lote é limitado; o
-- registo só é apagado com o mesmo caminho e continua repetível; casos.dossie_url
-- e o registo do encerramento ficam intactos; só a service_role chama as
-- funções; o agendamento usa o segredo do Vault.

begin;
select * from no_plan();

create schema tr;
grant usage on schema tr to anon, authenticated, service_role;
create function tr.tenta(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return 'erro:' || sqlstate;
end $$;
grant execute on all functions in schema tr to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-d000-00000000000a', 'ra@teste.invalid', 'authenticated', 'authenticated', '{"nome":"RA"}');

-- E: encerrado há 7 meses (2 versões). R: encerrado há 7 meses mas reaberto.
-- N: encerrado há 2 meses. D: encerrado há 8 meses e de novo há 1 mês.
-- S: "Encerrado sem resolução" há 7 meses.
insert into public.casos (id, utilizador_id, nome, email, descricao, empresa, status, dossie_url) values
  ('50000000-0000-4000-d000-0000000000e1', '00000000-0000-4000-d000-00000000000a', 'RA', 'ra@teste.invalid', 'E', 'X', 'Encerrado com encaminhamento externo', 'https://exemplo.invalid/dossie-antigo'),
  ('50000000-0000-4000-d000-0000000000e2', '00000000-0000-4000-d000-00000000000a', 'RA', 'ra@teste.invalid', 'R', 'X', 'Em investigação', null),
  ('50000000-0000-4000-d000-0000000000e3', '00000000-0000-4000-d000-00000000000a', 'RA', 'ra@teste.invalid', 'N', 'X', 'Encerrado com encaminhamento externo', null),
  ('50000000-0000-4000-d000-0000000000e4', '00000000-0000-4000-d000-00000000000a', 'RA', 'ra@teste.invalid', 'D', 'X', 'Encerrado com encaminhamento externo', null),
  ('50000000-0000-4000-d000-0000000000e5', '00000000-0000-4000-d000-00000000000a', 'RA', 'ra@teste.invalid', 'S', 'X', 'Encerrado sem resolução', null);

insert into public.casos_encerramentos (id, caso_id, estado_anterior, motivo, encerrado_em) values
  ('60000000-0000-4000-d000-0000000000e1', '50000000-0000-4000-d000-0000000000e1', 'Aguardando operador', 'motivo de teste', now() - interval '7 months'),
  ('60000000-0000-4000-d000-0000000000e2', '50000000-0000-4000-d000-0000000000e2', 'Aguardando operador', 'motivo de teste', now() - interval '7 months'),
  ('60000000-0000-4000-d000-0000000000e3', '50000000-0000-4000-d000-0000000000e3', 'Aguardando operador', 'motivo de teste', now() - interval '2 months'),
  ('60000000-0000-4000-d000-0000000000e4', '50000000-0000-4000-d000-0000000000e4', 'Aguardando operador', 'motivo de teste', now() - interval '8 months'),
  ('60000000-0000-4000-d000-0000000000f4', '50000000-0000-4000-d000-0000000000e4', 'Aguardando operador', 'motivo de teste', now() - interval '1 month'),
  ('60000000-0000-4000-d000-0000000000e5', '50000000-0000-4000-d000-0000000000e5', 'Aguardando operador', 'motivo de teste', now() - interval '7 months');

insert into public.casos_dossies (id, caso_id, encerramento_id, versao, modelo_versao, nome, storage_path, tamanho_bytes, ficheiro_sha256) values
  ('70000000-0000-4000-d000-0000000000e1', '50000000-0000-4000-d000-0000000000e1', '60000000-0000-4000-d000-0000000000e1', 1, 't', 'dossie-e1-v1.pdf', 'e1/v1.pdf', 10, repeat('a', 64)),
  ('70000000-0000-4000-d000-0000000000f1', '50000000-0000-4000-d000-0000000000e1', null, 2, 't', 'dossie-e1-v2.pdf', 'e1/v2.pdf', 10, repeat('b', 64)),
  ('70000000-0000-4000-d000-0000000000e2', '50000000-0000-4000-d000-0000000000e2', '60000000-0000-4000-d000-0000000000e2', 1, 't', 'dossie-e2-v1.pdf', 'e2/v1.pdf', 10, repeat('c', 64)),
  ('70000000-0000-4000-d000-0000000000e3', '50000000-0000-4000-d000-0000000000e3', '60000000-0000-4000-d000-0000000000e3', 1, 't', 'dossie-e3-v1.pdf', 'e3/v1.pdf', 10, repeat('d', 64)),
  ('70000000-0000-4000-d000-0000000000e4', '50000000-0000-4000-d000-0000000000e4', '60000000-0000-4000-d000-0000000000e4', 1, 't', 'dossie-e4-v1.pdf', 'e4/v1.pdf', 10, repeat('e', 64)),
  ('70000000-0000-4000-d000-0000000000e5', '50000000-0000-4000-d000-0000000000e5', '60000000-0000-4000-d000-0000000000e5', 1, 't', 'dossie-e5-v1.pdf', 'e5/v1.pdf', 10, repeat('f', 64));

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
set local role authenticated;
select is(tr.tenta($$select * from public.dossies_expirados()$$), 'erro:42501', 'cliente/admin pela API não lista dossiês expirados');
select is(tr.tenta($$select public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e1', 'e1/v1.pdf')$$), 'erro:42501', 'cliente/admin pela API não apaga');
reset role;
set local role anon;
select is(tr.tenta($$select * from public.dossies_expirados()$$), 'erro:42501', 'anon não lista dossiês expirados');
reset role;

-- ---------------------------------------------------------------------------
-- Seleção
-- ---------------------------------------------------------------------------
set local role service_role;
create temporary table expirados as select * from public.dossies_expirados();
select set_eq(
  $$select id from expirados where id::text like '70000000-0000-4000-d000-%'$$,
  $$values ('70000000-0000-4000-d000-0000000000e1'::uuid), ('70000000-0000-4000-d000-0000000000f1'::uuid), ('70000000-0000-4000-d000-0000000000e5'::uuid)$$,
  'só o caso encerrado há 6+ meses (todas as versões, mesmo sem encerramento_id) e o encerrado sem resolução');
select is((select storage_path from expirados where id = '70000000-0000-4000-d000-0000000000f1'), 'e1/v2.pdf', 'devolve o caminho exato');
select is((select count(*) from public.dossies_expirados(1)), 1::bigint, 'lote limitado');
select is((select count(*) from public.dossies_expirados(0)), 1::bigint, 'lote mínimo de 1 (nunca ilimitado)');

-- ---------------------------------------------------------------------------
-- Eliminação do registo
-- ---------------------------------------------------------------------------
select ok(not public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e1', 'outro/caminho.pdf'), 'caminho diferente: não apaga');
select ok(not public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e3', 'e3/v1.pdf'), 'encerrado há 2 meses: não apaga');
select ok(not public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e2', 'e2/v1.pdf'), 'caso reaberto: não apaga');
select ok(not public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e4', 'e4/v1.pdf'), 'encerrado de novo há 1 mês: não apaga');
select ok(public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e1', 'e1/v1.pdf'), 'expirado com o mesmo caminho: apaga');
select ok(not public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000e1', 'e1/v1.pdf'), 'repetir é seguro (false, sem erro)');
select ok(public.apagar_dossie_expirado('70000000-0000-4000-d000-0000000000f1', 'e1/v2.pdf'), 'versão anterior também é apagada');
reset role;

select is((select count(*) from public.casos_dossies where caso_id = '50000000-0000-4000-d000-0000000000e1'), 0::bigint, 'nenhuma versão do dossiê fica');
select is((select dossie_url from public.casos where id = '50000000-0000-4000-d000-0000000000e1'), 'https://exemplo.invalid/dossie-antigo',
  'casos.dossie_url (links antigos) não é tocado');
select is((select count(*) from public.casos_encerramentos where caso_id = '50000000-0000-4000-d000-0000000000e1'), 1::bigint,
  'o registo do encerramento mantém-se');
select is((select count(*) from public.casos_dossies where id in ('70000000-0000-4000-d000-0000000000e2', '70000000-0000-4000-d000-0000000000e3', '70000000-0000-4000-d000-0000000000e4')),
  3::bigint, 'os dossiês não expirados continuam');

-- ---------------------------------------------------------------------------
-- Agendamento: diário, Edge Function certa, segredo do Vault (nunca em claro)
-- ---------------------------------------------------------------------------
select is((select schedule from cron.job where jobname = 'limpar-dossies-expirados-diario'), '15 3 * * *', 'agendado às 03:15 UTC');
select matches((select command from cron.job where jobname = 'limpar-dossies-expirados-diario'),
  'functions/v1/limpar-dossies-expirados', 'chama a Edge Function limpar-dossies-expirados');
select matches((select command from cron.job where jobname = 'limpar-dossies-expirados-diario'),
  'vault\.decrypted_secrets[\s\S]*alertas_fidelizacao_cron_secret', 'segredo lido do Vault (o mesmo dos outros trabalhos)');

select * from finish();
rollback;
