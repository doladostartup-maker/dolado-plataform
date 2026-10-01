-- DoLado — casos_elegibilidade_portal (legado): retenção e fim das escritas.
-- Ver 20261001230000_elegibilidade_retencao.sql. Correr com `supabase test db`
-- na stack local, nunca em produção. Tudo dentro de uma transação revertida.

begin;
select * from no_plan();

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-b000-00000000000a', 'ra@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Cliente"}'),
  ('00000000-0000-4000-b000-0000000000ad', 'radmin@teste.invalid', 'authenticated', 'authenticated', '{"nome":"Admin"}');
update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-b000-0000000000ad';

-- antigo decidido (apaga), recente decidido (fica), antigo em revisão (fica)
insert into public.casos_elegibilidade_portal
  (id, utilizador_id, origem, email, setor, duracao_contrato, empresa_respondeu_bem, descricao_problema, estado_elegibilidade, estado_final, created_at) values
  ('13000000-0000-4000-b000-000000000001', null, 'publico', 'x@teste.invalid', 'Água', 'menos_6m', false, 'x', 'enviado_cliente', 'elegivel', now() - interval '31 days'),
  ('13000000-0000-4000-b000-000000000002', '00000000-0000-4000-b000-00000000000a', 'dashboard', 'ra@teste.invalid', 'Água', 'menos_6m', false, 'x', 'enviado_cliente', 'nao_elegivel', now() - interval '29 days'),
  ('13000000-0000-4000-b000-000000000003', null, 'publico', 'y@teste.invalid', 'Energia', '6_12m', false, 'x', 'em_revisao', null, now() - interval '90 days');

-- limpeza
select is(public.limpar_casos_elegibilidade_antigos(), 1, 'limpeza: apaga só o registo decidido com mais de 30 dias');
select is((select count(*) from public.casos_elegibilidade_portal where id = '13000000-0000-4000-b000-000000000001'), 0::bigint, 'limpeza: decidido com 31 dias apagado');
select is((select count(*) from public.casos_elegibilidade_portal where id = '13000000-0000-4000-b000-000000000002'), 1::bigint, 'limpeza: decidido com 29 dias mantém-se');
select is((select count(*) from public.casos_elegibilidade_portal where id = '13000000-0000-4000-b000-000000000003'), 1::bigint, 'limpeza: em revisão mantém-se, mesmo antigo');
select is(public.limpar_casos_elegibilidade_antigos(), 0, 'limpeza: idempotente');
select ok((select count(*) = 1 from cron.job where jobname = 'limpar-elegibilidade-antiga' and command like '%limpar_casos_elegibilidade_antigos%'), 'cron: limpeza diária agendada');

-- a limpeza não é chamável pela API
select ok(not has_function_privilege('anon', 'public.limpar_casos_elegibilidade_antigos()', 'EXECUTE'), 'privilégios: anon não executa a limpeza');
select ok(not has_function_privilege('authenticated', 'public.limpar_casos_elegibilidade_antigos()', 'EXECUTE'), 'privilégios: authenticated não executa a limpeza');
select ok(not has_function_privilege('service_role', 'public.limpar_casos_elegibilidade_antigos()', 'EXECUTE'), 'privilégios: service_role não executa a limpeza');

-- sem novas escritas, nem pelo servidor
select ok(not has_table_privilege('service_role', 'public.casos_elegibilidade_portal', 'INSERT'), 'servidor (service_role) não cria registos');
select ok(not has_table_privilege('service_role', 'public.casos_elegibilidade_portal', 'UPDATE'), 'servidor (service_role) não altera registos');
select ok(not has_table_privilege('authenticated', 'public.casos_elegibilidade_portal', 'INSERT'), 'authenticated não cria registos');
select ok(not has_table_privilege('anon', 'public.casos_elegibilidade_portal', 'INSERT'), 'anon não cria registos');

-- cliente já não lê o próprio histórico
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-00000000000a","role":"authenticated"}', true);
select is((select count(*) from public.casos_elegibilidade_portal), 0::bigint, 'cliente: não lê o próprio histórico');
reset role;

-- admin lê e apaga, mas não altera
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000ad","role":"authenticated"}', true);
select is((select count(*) from public.casos_elegibilidade_portal where id::text like '13000000-%'), 2::bigint, 'admin: lê os registos que restam');
select throws_ok($$update public.casos_elegibilidade_portal set notas_admin = 'x'$$, '42501', null, 'admin: não altera registos');
delete from public.casos_elegibilidade_portal where id = '13000000-0000-4000-b000-000000000002';
reset role;
select is((select count(*) from public.casos_elegibilidade_portal where id = '13000000-0000-4000-b000-000000000002'), 0::bigint, 'admin: apaga um registo');

select * from finish();
rollback;
