-- DoLado — Permissões que faltavam depois de recriar o esquema
-- "supabase_functions" (ver 20260922110000). Sem estes grants, o
-- service_role (usado pelo formulário público) não conseguia gravar em
-- `casos`, porque o trigger do webhook chama uma função nesse esquema.

grant usage on schema supabase_functions to postgres, anon, authenticated, service_role;
grant all on all tables in schema supabase_functions to postgres, anon, authenticated, service_role;
alter default privileges in schema supabase_functions grant all on tables to postgres, anon, authenticated, service_role;
grant execute on function supabase_functions.http_request() to postgres, anon, authenticated, service_role;
