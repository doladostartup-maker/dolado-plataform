-- DoLado — casos_elegibilidade_portal (legado): removida a 31/10/2026.
-- Ver 20261031090000_remover_elegibilidade_legado.sql. Correr com `supabase test db`
-- na stack local, nunca em produção. Tudo dentro de uma transação revertida.

begin;
select * from no_plan();

select ok(to_regclass('public.casos_elegibilidade_portal') is null, 'tabela antiga removida');
select ok(to_regprocedure('public.limpar_casos_elegibilidade_antigos()') is null, 'função de limpeza removida');
select is((select count(*)::int from cron.job where jobname = 'limpar-elegibilidade-antiga'), 0, 'job de limpeza removido');

select * from finish();
rollback;
