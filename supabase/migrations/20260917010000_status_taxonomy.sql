-- DoLado — Taxonomia de estados do caso (correcção Fase 2)
--
-- Substitui a lista curta de estados por uma mais granular, alinhada com o
-- fluxo real do backoffice: Novo, Em investigação, Aguardando operador,
-- Aguardando decisão cliente, Resolvido, Bloqueado.

update public.casos set status = 'Em investigação' where status = 'Em Análise';
update public.casos set status = 'Aguardando decisão cliente' where status = 'Aguardando Decisão';

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.casos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.casos drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.casos add constraint casos_status_check
  check (status in (
    'Novo',
    'Em investigação',
    'Aguardando operador',
    'Aguardando decisão cliente',
    'Resolvido',
    'Bloqueado'
  ));
