-- DoLado — Alertas desativados no fim da subscrição, conservados 6 meses
-- (decisão de Thiago, 02/10/2026).
--
-- Regra:
--   * Quando a conta deixa de ter Proteção ativa (fim efetivo da
--     subscrição: customer.subscription.deleted, ou updated para
--     canceled/unpaid/incomplete_expired, ou qualquer outra alteração de
--     user_access), todos os alertas ficam DESATIVADOS: alertas de fim de
--     fidelização, de fim de promoção e setores subscritos para o aviso
--     sectorial. Nenhum envio a partir desse momento.
--   * Os dados ficam conservados durante 6 meses, só para o cliente
--     recuperar a configuração se voltar. desativado_em marca o início
--     desse prazo e nunca é alterado pelo cliente.
--   * Se a conta voltar a ter Proteção dentro do prazo, os alertas
--     retidos voltam a ficar ativos (mesma ideia dos casos congelados).
--   * Ao fim de 6 meses: apagados (limpar_alertas_desativados(), pg_cron
--     diário). Os alertas de promoção com contrato anexado são apagados
--     pela Edge Function verificar-alertas-promocao, que remove primeiro o
--     ficheiro do Storage (o Storage não deixa apagar ficheiros por SQL).
--
-- Tudo é feito por um trigger em user_access, para não depender de cada
-- rotina que termina o acesso: o webhook, o fim por falta de pagamento ou
-- uma alteração manual passam todos por aqui. Só transições mudam alguma
-- coisa, por isso webhooks repetidos não têm efeito, e desativado_em nunca
-- é reescrito (só linhas com desativado_em null são desativadas).

-- ---------------------------------------------------------------------------
-- 1. Colunas
-- ---------------------------------------------------------------------------
alter table public.alertas_fidelizacao_portal add column desativado_em timestamptz;
alter table public.alertas_promocao_portal add column desativado_em timestamptz;
alter table public.preferencias_setor add column desativado_em timestamptz;

comment on column public.alertas_fidelizacao_portal.desativado_em is
  'Fim da Proteção da conta: alerta desativado (sem envios) e início dos 6 meses de conservação. null = ativo. Só o servidor/triggers alteram.';
comment on column public.alertas_promocao_portal.desativado_em is
  'Fim da Proteção da conta: alerta desativado (sem envios) e início dos 6 meses de conservação. null = ativo. Só o servidor/triggers alteram.';
comment on column public.preferencias_setor.desativado_em is
  'Conta sem Proteção: setor desativado (sem avisos) e início dos 6 meses de conservação. null = ativo. Só o servidor/triggers alteram.';

create index alertas_fidelizacao_portal_desativado_em_idx
  on public.alertas_fidelizacao_portal (desativado_em) where desativado_em is not null;
create index alertas_promocao_portal_desativado_em_idx
  on public.alertas_promocao_portal (desativado_em) where desativado_em is not null;
create index preferencias_setor_desativado_em_idx
  on public.preferencias_setor (desativado_em) where desativado_em is not null;

-- ---------------------------------------------------------------------------
-- 2. Proteção ativa (mesma regra que tem_protecao() e alertas_*_pendentes())
-- ---------------------------------------------------------------------------
create or replace function public.protecao_ativa(p_plano text, p_estado text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_plano in ('protecao', 'caso_protecao') and p_estado in ('active', 'trialing', 'past_due'),
    false
  );
$$;

revoke execute on function public.protecao_ativa(text, text) from public, anon, authenticated;

-- Prazo de conservação dos alertas desativados (uma só fonte na BD).
create or replace function public.retencao_alertas_desativados()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '6 months' $$;

revoke execute on function public.retencao_alertas_desativados() from public, anon, authenticated;
grant execute on function public.retencao_alertas_desativados() to service_role;

-- ---------------------------------------------------------------------------
-- 3. O cliente nunca define desativado_em
-- ---------------------------------------------------------------------------
-- Pela API (anon/authenticated): ao criar, um alerta fica ativo — e um setor
-- só fica ativo com Proteção (sem Proteção nasce desativado, para seguir o
-- mesmo prazo de conservação); ao editar, desativado_em mantém-se. O
-- servidor (service_role) e os triggers SECURITY DEFINER (postgres) não
-- passam por esta regra.
create or replace function public.alertas_proteger_desativado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if tg_table_name = 'preferencias_setor' and not public.tem_protecao() then
      new.desativado_em := now();
    else
      new.desativado_em := null;
    end if;
  else
    new.desativado_em := old.desativado_em;
  end if;
  return new;
end $$;

revoke execute on function public.alertas_proteger_desativado_em() from public, anon, authenticated;

create trigger alertas_fidelizacao_portal_desativado_em
  before insert or update on public.alertas_fidelizacao_portal
  for each row execute function public.alertas_proteger_desativado_em();
create trigger alertas_promocao_portal_desativado_em
  before insert or update on public.alertas_promocao_portal
  for each row execute function public.alertas_proteger_desativado_em();
create trigger preferencias_setor_desativado_em
  before insert or update on public.preferencias_setor
  for each row execute function public.alertas_proteger_desativado_em();

-- ---------------------------------------------------------------------------
-- 4. Desativar / reativar com a Proteção (trigger em user_access)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER justificado: escreve nas tabelas de alertas de uma conta
-- que pode não ser a da sessão (o webhook corre como service_role; um admin
-- pode alterar user_access). Só toca nas linhas do user_id alterado e só em
-- desativado_em. search_path fixo; não executável pela API.
create or replace function public.alertas_seguir_protecao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes boolean := false;
  v_agora boolean := public.protecao_ativa(new.subscription_plan, new.subscription_status);
begin
  if tg_op = 'UPDATE' then
    v_antes := public.protecao_ativa(old.subscription_plan, old.subscription_status);
  end if;

  if v_antes and not v_agora then
    -- Fim da Proteção: desativa o que está ativo; o que já estava
    -- desativado mantém a data original (o prazo não recomeça).
    update public.alertas_fidelizacao_portal set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.alertas_promocao_portal set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.preferencias_setor set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
  elsif v_agora and not v_antes then
    -- Volta da Proteção dentro do prazo: a configuração retida volta a
    -- ficar ativa.
    update public.alertas_fidelizacao_portal set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.alertas_promocao_portal set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.preferencias_setor set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
  end if;
  return null;
end $$;

revoke execute on function public.alertas_seguir_protecao() from public, anon, authenticated;

create trigger user_access_alertas_seguir_protecao
  after insert or update of subscription_plan, subscription_status on public.user_access
  for each row execute function public.alertas_seguir_protecao();

-- ---------------------------------------------------------------------------
-- 5. Envio: só alertas ativos (além da Proteção ativa, já exigida)
-- ---------------------------------------------------------------------------
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
   where a.desativado_em is null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
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
   where a.desativado_em is null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
     and a.data_fim_promocao > p_hoje
     and a.data_fim_promocao <= p_limite
     and case p_campo
           when 'alerta_30d_enviado_em' then a.alerta_30d_enviado_em is null
           when 'alerta_7d_enviado_em' then a.alerta_7d_enviado_em is null
           when 'alerta_1d_enviado_em' then a.alerta_1d_enviado_em is null
           else false
         end;
$$;

-- Destinatários do aviso sectorial: só setores ativos de contas com
-- Proteção ativa, para o e-mail atual e confirmado da conta. Só o admin
-- recebe linhas (o backoffice chama com a sessão do admin). SECURITY
-- DEFINER justificado: o admin não lê auth.users pela API.
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
   where public.is_admin()
     and p.setor = p_setor
     and p.desativado_em is null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and public.protecao_ativa(ua.subscription_plan, ua.subscription_status);
$$;

revoke execute on function public.avisos_setor_destinatarios(text) from public, anon;
grant execute on function public.avisos_setor_destinatarios(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Fim dos 6 meses: eliminação
-- ---------------------------------------------------------------------------
-- Apaga o que já passou o prazo e não tem ficheiro no Storage. Devolve o
-- número de linhas apagadas. Só o dono (postgres, que corre o pg_cron).
create or replace function public.limpar_alertas_desativados()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_limite timestamptz := now() - public.retencao_alertas_desativados();
  v_total integer := 0;
  v_n integer;
begin
  delete from public.alertas_fidelizacao_portal where desativado_em <= v_limite;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.alertas_promocao_portal
   where desativado_em <= v_limite and ficheiro_contrato_caminho is null;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.preferencias_setor where desativado_em <= v_limite;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return v_total;
end $$;

revoke execute on function public.limpar_alertas_desativados() from public, anon, authenticated, service_role;

-- Alertas de promoção com contrato, já fora do prazo: a Edge Function
-- remove o ficheiro do Storage e depois chama apagar_alerta_promocao_expirado().
create or replace function public.alertas_promocao_expirados()
returns table (id uuid, ficheiro_contrato_caminho text)
language sql
stable
set search_path = ''
as $$
  select a.id, a.ficheiro_contrato_caminho
    from public.alertas_promocao_portal a
   where a.desativado_em <= now() - public.retencao_alertas_desativados()
     and a.ficheiro_contrato_caminho is not null;
$$;

-- Só apaga se o alerta continuar fora do prazo (ex.: não foi reativado
-- entretanto). true se apagou.
create or replace function public.apagar_alerta_promocao_expirado(p_id uuid)
returns boolean
language sql
set search_path = ''
as $$
  with apagado as (
    delete from public.alertas_promocao_portal
     where id = p_id
       and desativado_em <= now() - public.retencao_alertas_desativados()
    returning 1
  )
  select exists (select 1 from apagado);
$$;

revoke execute on function public.alertas_promocao_expirados() from public, anon, authenticated;
revoke execute on function public.apagar_alerta_promocao_expirado(uuid) from public, anon, authenticated;
grant execute on function public.alertas_promocao_expirados() to service_role;
grant execute on function public.apagar_alerta_promocao_expirado(uuid) to service_role;

select cron.schedule(
  'limpar-alertas-desativados',
  '45 3 * * *',
  $$select public.limpar_alertas_desativados()$$
);

-- ---------------------------------------------------------------------------
-- 7. Dados existentes
-- ---------------------------------------------------------------------------
-- Contas sem Proteção ativa hoje: os alertas ficam já desativados. O prazo
-- conta desde o fim efetivo da subscrição registado na auditoria, se
-- existir; senão, desde hoje.
with sem_protecao as (
  select u.id as user_id,
         coalesce(
           (select max(c.terminado_em) from public.subscricao_cancelamentos c where c.user_id = u.id),
           now()
         ) as desde
    from public.utilizadores u
    left join public.user_access ua on ua.user_id = u.id
   where not public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
)
update public.alertas_fidelizacao_portal a set desativado_em = s.desde
  from sem_protecao s where a.utilizador_id = s.user_id and a.desativado_em is null;

with sem_protecao as (
  select u.id as user_id,
         coalesce(
           (select max(c.terminado_em) from public.subscricao_cancelamentos c where c.user_id = u.id),
           now()
         ) as desde
    from public.utilizadores u
    left join public.user_access ua on ua.user_id = u.id
   where not public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
)
update public.alertas_promocao_portal a set desativado_em = s.desde
  from sem_protecao s where a.utilizador_id = s.user_id and a.desativado_em is null;

with sem_protecao as (
  select u.id as user_id,
         coalesce(
           (select max(c.terminado_em) from public.subscricao_cancelamentos c where c.user_id = u.id),
           now()
         ) as desde
    from public.utilizadores u
    left join public.user_access ua on ua.user_id = u.id
   where not public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
)
update public.preferencias_setor p set desativado_em = s.desde
  from sem_protecao s where p.utilizador_id = s.user_id and p.desativado_em is null;
