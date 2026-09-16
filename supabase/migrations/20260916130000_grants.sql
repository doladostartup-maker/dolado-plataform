-- DoLado — Permissões base nas tabelas (Fase 2)
--
-- As tabelas criadas via SQL Editor não herdaram automaticamente os grants
-- que a Supabase normalmente configura para anon/authenticated/service_role,
-- causando "permission denied for table X" mesmo com RLS bem configurado.
-- Esta migração garante os grants base; a RLS continua a ser quem decide
-- efectivamente quem vê/edita cada linha.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select on all tables in schema public to anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant select on tables to anon;
