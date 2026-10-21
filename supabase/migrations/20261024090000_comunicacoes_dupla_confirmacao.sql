-- DoLado — comunicações comerciais: dupla confirmação e "deixar de receber"
-- (21/10/2026)
--
-- Pré-requisito de qualquer envio comercial (CLAUDE.md, "E-mails com
-- novidades e ofertas" e guia gratuito). Ainda não há envios: esta migration
-- prepara as regras para o primeiro.
--
--   * Sem conta (guia gratuito): a autorização só vale depois de a pessoa
--     confirmar o endereço pela ligação enviada por e-mail (confirmado_em).
--     A ligação vale 30 dias a contar da autorização; o e-mail de
--     confirmação sai no máximo uma vez por 24 h (confirmacao_enviada_em).
--   * Contas: o endereço é o e-mail confirmado da conta (Supabase Auth); a
--     autorização (consentimentos_comunicacoes) não precisa de outra
--     confirmação, mas só vale enquanto o e-mail da conta estiver confirmado.
--   * Deixar de receber: ligação em cada e-mail comercial (token HMAC, sem
--     sessão) → comunicacoes_retirar(). Também pelo Perfil (contas).
--   * comunicacoes_destinatarios() é a única fonte de destinatários de um
--     envio comercial: só autorizações activas e confirmadas, um registo por
--     endereço.
--
-- Tudo só service_role; os campos de prova continuam imutáveis (triggers
-- existentes: só a confirmação e a retirada são registadas, uma vez cada).

alter table public.consentimentos_comunicacoes_sem_conta
  add column confirmacao_enviada_em timestamptz;

comment on column public.consentimentos_comunicacoes_sem_conta.confirmado_em is
  'Data em que a pessoa confirmou o endereço pela ligação do e-mail de confirmação (dupla confirmação). Sem ela, nunca há envios comerciais.';
comment on column public.consentimentos_comunicacoes_sem_conta.confirmacao_enviada_em is
  'Último envio do e-mail de confirmação (no máximo um por 24 h). Não é prova de consentimento.';

-- ---------------------------------------------------------------------------
-- 1. Confirmação do endereço (sem conta)
-- ---------------------------------------------------------------------------

-- Reserva o envio do e-mail de confirmação da autorização activa deste
-- e-mail. Devolve o id da autorização quando o e-mail deve sair agora; null
-- quando já está confirmada, retirada, expirada ou foi enviada há < 24 h.
create or replace function public.comunicacoes_reservar_confirmacao(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  update public.consentimentos_comunicacoes_sem_conta
     set confirmacao_enviada_em = now()
   where email = lower(btrim(p_email))
     and retirado_em is null
     and confirmado_em is null
     and dado_em > now() - interval '30 days'
     and (confirmacao_enviada_em is null or confirmacao_enviada_em < now() - interval '24 hours')
  returning id;
$$;

-- A Brevo recusou: liberta a reserva para um pedido seguinte poder tentar.
create or replace function public.comunicacoes_libertar_confirmacao(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.consentimentos_comunicacoes_sem_conta
     set confirmacao_enviada_em = null
   where id = p_id and confirmado_em is null;
$$;

-- Confirma o endereço. Devolve 'confirmado' | 'ja_confirmado' | 'retirado' |
-- 'expirado' | 'inexistente'. Idempotente.
create or replace function public.comunicacoes_confirmar(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.consentimentos_comunicacoes_sem_conta;
begin
  select * into v from public.consentimentos_comunicacoes_sem_conta where id = p_id for update;
  if not found then return 'inexistente'; end if;
  if v.retirado_em is not null then return 'retirado'; end if;
  if v.confirmado_em is not null then return 'ja_confirmado'; end if;
  if v.dado_em <= now() - interval '30 days' then return 'expirado'; end if;
  update public.consentimentos_comunicacoes_sem_conta set confirmado_em = now() where id = p_id;
  return 'confirmado';
end $$;

-- ---------------------------------------------------------------------------
-- 2. Deixar de receber (ligação do e-mail)
-- ---------------------------------------------------------------------------

-- p_tipo: 'conta' (consentimentos_comunicacoes) | 'sem_conta'
-- (consentimentos_comunicacoes_sem_conta). Devolve 'retirado' | 'ja_retirado'
-- | 'inexistente'. Idempotente; nada é apagado (prova).
create or replace function public.comunicacoes_retirar(p_tipo text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retirado timestamptz;
begin
  if p_tipo = 'conta' then
    select retirado_em into v_retirado from public.consentimentos_comunicacoes where id = p_id for update;
    if not found then return 'inexistente'; end if;
    if v_retirado is not null then return 'ja_retirado'; end if;
    update public.consentimentos_comunicacoes
       set retirado_em = now(), retirado_origem = 'link_email'
     where id = p_id;
    return 'retirado';
  elsif p_tipo = 'sem_conta' then
    select retirado_em into v_retirado from public.consentimentos_comunicacoes_sem_conta where id = p_id for update;
    if not found then return 'inexistente'; end if;
    if v_retirado is not null then return 'ja_retirado'; end if;
    update public.consentimentos_comunicacoes_sem_conta
       set retirado_em = now(), retirado_motivo = 'link_email'
     where id = p_id;
    return 'retirado';
  end if;
  return 'inexistente';
end $$;

-- ---------------------------------------------------------------------------
-- 3. Destinatários de um envio comercial
-- ---------------------------------------------------------------------------

-- Única fonte de destinatários: contas com autorização activa e e-mail da
-- conta confirmado (e a conta activa); sem conta, só autorizações activas e
-- confirmadas. Um registo por endereço — a autorização da conta prevalece.
create or replace function public.comunicacoes_destinatarios()
returns table (tipo text, consentimento_id uuid, email text, idioma text)
language sql
stable
security definer
set search_path = ''
as $$
  with contas as (
    select 'conta'::text as tipo, c.id as consentimento_id, lower(au.email::text) as email,
           case when au.raw_user_meta_data ->> 'idioma' = 'en-GB' then 'en-GB' else 'pt-PT' end as idioma,
           0 as ordem
      from public.consentimentos_comunicacoes c
      join auth.users au on au.id = c.user_id
     where c.retirado_em is null
       and au.email is not null
       and au.email_confirmed_at is not null
       and au.deleted_at is null
       and (au.banned_until is null or au.banned_until < now())
  ),
  sem_conta as (
    select 'sem_conta'::text, s.id, s.email, s.idioma, 1
      from public.consentimentos_comunicacoes_sem_conta s
     where s.retirado_em is null
       and s.confirmado_em is not null
  )
  select distinct on (email) tipo, consentimento_id, email, idioma
    from (select * from contas union all select * from sem_conta) t
   order by email, ordem;
$$;

revoke execute on function public.comunicacoes_reservar_confirmacao(text) from public, anon, authenticated;
revoke execute on function public.comunicacoes_libertar_confirmacao(uuid) from public, anon, authenticated;
revoke execute on function public.comunicacoes_confirmar(uuid) from public, anon, authenticated;
revoke execute on function public.comunicacoes_retirar(text, uuid) from public, anon, authenticated;
revoke execute on function public.comunicacoes_destinatarios() from public, anon, authenticated;
grant execute on function public.comunicacoes_reservar_confirmacao(text) to service_role;
grant execute on function public.comunicacoes_libertar_confirmacao(uuid) to service_role;
grant execute on function public.comunicacoes_confirmar(uuid) to service_role;
grant execute on function public.comunicacoes_retirar(text, uuid) to service_role;
grant execute on function public.comunicacoes_destinatarios() to service_role;
