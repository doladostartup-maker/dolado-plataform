-- DoLado — avisos_setor_destinatarios() só para o servidor (service_role)
--
-- O security advisor da Supabase (03/10/2026) assinalou que a função, sendo
-- SECURITY DEFINER, era executável por `authenticated` em
-- /rest/v1/rpc/avisos_setor_destinatarios. O filtro is_admin() impedia um
-- cliente de ler destinatários, mas a função ficava exposta na API e a
-- proteção dependia só desse filtro.
--
-- Agora: só service_role executa. O backoffice (/backoffice/avisos) valida
-- requireAdmin() e chama-a com createAdminClient(). O is_admin() sai do corpo
-- (com service_role não há auth.uid(), devolveria sempre 0 linhas); quem
-- garante o papel admin é o servidor, antes de usar a service role.
--
-- SECURITY DEFINER justificado: lê auth.users (e-mail atual e confirmado),
-- que nem o service_role lê pela API PostgREST. search_path fixo.

create or replace function public.avisos_setor_destinatarios(p_setor text)
returns table (nome text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(u.nome), ''), au.email) as nome,
         au.email
    from public.preferencias_setor p
    join auth.users au on au.id = p.utilizador_id
    left join public.utilizadores u on u.id = p.utilizador_id
    join public.user_access ua on ua.user_id = p.utilizador_id
   where p.setor = p_setor
     and p.desativado_em is null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and public.protecao_ativa(ua.subscription_plan, ua.subscription_status);
$$;

revoke execute on function public.avisos_setor_destinatarios(text) from public, anon, authenticated;
grant execute on function public.avisos_setor_destinatarios(text) to service_role;
