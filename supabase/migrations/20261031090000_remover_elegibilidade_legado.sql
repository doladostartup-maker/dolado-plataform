-- DoLado — remover a tabela antiga do Simulador de Elegibilidade (31/10/2026)
--
-- Fecha o que ficou previsto em 20261001230000_elegibilidade_retencao.sql:
-- casos_elegibilidade_portal é legado desde 01/10/2026 (o simulador público
-- corre só no browser e não grava nada) e os registos decididos apagaram-se
-- aos 30 dias. Com a tabela vazia, saem a tabela, a função de limpeza e o
-- job 'limpar-elegibilidade-antiga'.
--
-- Só aplicar a partir de 31/10/2026 e depois de confirmar em produção:
--   select count(*) from public.casos_elegibilidade_portal;   -- tem de dar 0
-- Se ainda houver registos (por exemplo, 'em_revisao', que a limpeza nunca
-- apaga), a migration falha e não remove nada: decidir esses registos antes.

do $$
begin
  if to_regclass('public.casos_elegibilidade_portal') is not null
     and exists (select 1 from public.casos_elegibilidade_portal) then
    raise exception 'casos_elegibilidade_portal ainda tem registos: rever e apagar antes de remover a tabela';
  end if;
end $$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'limpar-elegibilidade-antiga') then
    perform cron.unschedule('limpar-elegibilidade-antiga');
  end if;
end $$;

drop function if exists public.limpar_casos_elegibilidade_antigos();
drop table if exists public.casos_elegibilidade_portal;
