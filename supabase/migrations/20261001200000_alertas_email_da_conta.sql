-- DoLado — Alertas do portal: o destinatário é sempre o e-mail da conta.
--
-- Vulnerabilidade corrigida: alertas_fidelizacao_portal.email e
-- alertas_promocao_portal.email eram editáveis pelo cliente através da API
-- (só o dono da linha era validado), e as Edge Functions diárias enviavam
-- para esse valor. Um assinante podia pôr o e-mail de um terceiro e fazer a
-- DoLado enviar-lhe, pela Brevo, um e-mail com conteúdo controlado por si
-- (nome, operadora, descrição — sem escape de HTML).
--
-- Correção (duas camadas):
--   1. Base de dados: um trigger força email e nome a partir da conta em
--      cada INSERT/UPDATE — o valor enviado pelo cliente é ignorado. Os
--      alertas existentes são alinhados com a conta.
--   2. Envio: as Edge Functions deixam de ler a coluna email; usam
--      alertas_*_pendentes(), que devolve o e-mail ATUAL e confirmado da
--      conta (auth.users) e só de contas com Proteção ativa.
-- Mais: limites de comprimento nos campos de texto livre que entram no
-- e-mail (o escape de HTML é feito nas Edge Functions).

-- ---------------------------------------------------------------------------
-- 1. Trigger: email e nome vêm sempre da conta
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER justificado: o cliente (authenticated) não lê
-- auth.users. A função só lê o e-mail e o nome do dono da própria linha
-- (new.utilizador_id, que o RLS já obriga a ser auth.uid()) e só escreve
-- nessa linha. search_path fixo; não executável pela API.
create or replace function public.alertas_portal_contacto_da_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_nome text;
begin
  select au.email, nullif(btrim(u.nome), '')
    into v_email, v_nome
    from auth.users au
    left join public.utilizadores u on u.id = au.id
   where au.id = new.utilizador_id;
  if v_email is null then
    raise exception 'alerta sem conta com e-mail' using errcode = '23514';
  end if;
  new.email := v_email;
  new.nome := coalesce(v_nome, v_email);
  return new;
end $$;

revoke execute on function public.alertas_portal_contacto_da_conta() from public, anon, authenticated;

create trigger alertas_fidelizacao_portal_contacto_da_conta
  before insert or update on public.alertas_fidelizacao_portal
  for each row execute function public.alertas_portal_contacto_da_conta();

create trigger alertas_promocao_portal_contacto_da_conta
  before insert or update on public.alertas_promocao_portal
  for each row execute function public.alertas_portal_contacto_da_conta();

-- Alertas já existentes: um UPDATE neutro faz o trigger repor email/nome.
update public.alertas_fidelizacao_portal set utilizador_id = utilizador_id;
update public.alertas_promocao_portal set utilizador_id = utilizador_id;

-- ---------------------------------------------------------------------------
-- 2. Limites dos campos de texto livre que entram no e-mail
-- ---------------------------------------------------------------------------
alter table public.alertas_fidelizacao_portal
  add constraint alertas_fidelizacao_portal_operadora_tamanho check (char_length(operadora) between 1 and 120);
alter table public.alertas_promocao_portal
  add constraint alertas_promocao_portal_operadora_tamanho check (char_length(operadora) between 1 and 120),
  add constraint alertas_promocao_portal_descricao_tamanho check (char_length(descricao_promocao) between 1 and 500);

-- ---------------------------------------------------------------------------
-- 3. Alertas pendentes para as Edge Functions (só service_role)
-- ---------------------------------------------------------------------------
-- Devolvem o destinatário a partir da conta no momento do envio — nunca da
-- coluna email do alerta: e-mail atual e confirmado (auth.users), contas
-- não apagadas nem bloqueadas, com Proteção ativa (mesma regra que
-- public.tem_protecao()). SECURITY DEFINER justificado: a service role não
-- lê auth.users pela API REST. Só leitura; não executável pela API pública.

create or replace function public.alertas_fidelizacao_pendentes(
  p_campo text,
  p_hoje date,
  p_limite date
) returns table (id uuid, nome text, email text, operadora text, data_fim_fidelizacao date)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         coalesce(nullif(btrim(u.nome), ''), au.email) as nome,
         au.email,
         a.operadora,
         a.data_fim_fidelizacao
    from public.alertas_fidelizacao_portal a
    join auth.users au on au.id = a.utilizador_id
    left join public.utilizadores u on u.id = a.utilizador_id
    join public.user_access ua on ua.user_id = a.utilizador_id
   where au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and ua.subscription_plan in ('protecao', 'caso_protecao')
     and ua.subscription_status in ('active', 'trialing', 'past_due')
     and a.data_fim_fidelizacao > p_hoje
     and a.data_fim_fidelizacao <= p_limite
     and case p_campo
           when 'alerta_60d_enviado_em' then a.alerta_60d_enviado_em is null
           when 'alerta_30d_enviado_em' then a.alerta_30d_enviado_em is null
           else false
         end;
$$;

create or replace function public.alertas_promocao_pendentes(
  p_campo text,
  p_hoje date,
  p_limite date
) returns table (id uuid, nome text, email text, operadora text, descricao_promocao text, data_fim_promocao date)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         coalesce(nullif(btrim(u.nome), ''), au.email) as nome,
         au.email,
         a.operadora,
         a.descricao_promocao,
         a.data_fim_promocao
    from public.alertas_promocao_portal a
    join auth.users au on au.id = a.utilizador_id
    left join public.utilizadores u on u.id = a.utilizador_id
    join public.user_access ua on ua.user_id = a.utilizador_id
   where au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and ua.subscription_plan in ('protecao', 'caso_protecao')
     and ua.subscription_status in ('active', 'trialing', 'past_due')
     and a.data_fim_promocao > p_hoje
     and a.data_fim_promocao <= p_limite
     and case p_campo
           when 'alerta_30d_enviado_em' then a.alerta_30d_enviado_em is null
           when 'alerta_7d_enviado_em' then a.alerta_7d_enviado_em is null
           when 'alerta_1d_enviado_em' then a.alerta_1d_enviado_em is null
           else false
         end;
$$;

revoke execute on function public.alertas_fidelizacao_pendentes(text, date, date) from public, anon, authenticated;
revoke execute on function public.alertas_promocao_pendentes(text, date, date) from public, anon, authenticated;
grant execute on function public.alertas_fidelizacao_pendentes(text, date, date) to service_role;
grant execute on function public.alertas_promocao_pendentes(text, date, date) to service_role;
