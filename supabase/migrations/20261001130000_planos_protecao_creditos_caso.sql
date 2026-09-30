-- DoLado — Planos Proteção / Caso + Proteção / Avulso e créditos de caso
--
-- O modelo nivel_acesso (nenhum / avulso / assinatura) misturava duas coisas:
-- a subscrição (que dá funcionalidades de proteção) e o direito a abrir um
-- caso. Passam a ser conceitos separados em user_access:
--
--   subscription_plan    none | protecao | caso_protecao
--   subscription_status  status Stripe da subscrição (active, past_due, …)
--   case_credits         casos que a conta ainda pode abrir no portal
--   stripe_subscription_id / stripe_price_id / current_period_start / _end
--
-- Proteção (4,99 €/mês): funcionalidades de proteção, 0 créditos.
-- Caso + Proteção (7,99 €/mês): proteção + 1 crédito por ciclo pago, até 4.
-- Avulso (14,99 €): +1 crédito por compra confirmada, sem proteção.
--
-- nivel_acesso NÃO é apagado nesta migration: o código anterior ainda o lê
-- durante o deploy. Deixa de ser escrito pelo código novo e será removido
-- numa migration posterior.
--
-- Créditos são idempotentes por origem (checkout:<session>, invoice:<id>,
-- migracao:<user>): case_credit_grants tem a origem como chave primária, por
-- isso a mesma compra ou fatura nunca credita duas vezes, mesmo com
-- webhooks repetidos ou /criar-conta e webhook a correr ao mesmo tempo.

-- ---------------------------------------------------------------------------
-- 1. user_access: colunas novas
-- ---------------------------------------------------------------------------
alter table public.user_access
  add column subscription_plan text not null default 'none'
    check (subscription_plan in ('none', 'protecao', 'caso_protecao')),
  add column subscription_status text,
  add column case_credits int not null default 0 check (case_credits >= 0),
  add column stripe_subscription_id text,
  add column stripe_price_id text,
  add column current_period_start timestamptz,
  add column current_period_end timestamptz;

comment on column public.user_access.subscription_plan is 'Plano de subscrição ativo na conta. Só conta como acesso se subscription_status for active/trialing/past_due.';
comment on column public.user_access.case_credits is 'Casos que a conta ainda pode abrir no portal (Avulso: +1 por compra; Caso + Proteção: +1 por ciclo pago, até 4).';
comment on column public.user_access.nivel_acesso is 'OBSOLETO desde 01/10/2026 — substituído por subscription_plan/case_credits. Mantido só para compatibilidade durante o deploy.';

-- ---------------------------------------------------------------------------
-- 2. Registo de créditos concedidos (idempotência)
-- ---------------------------------------------------------------------------
create table public.case_credit_grants (
  origem text primary key,
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  quantidade int not null check (quantidade > 0),
  concedido_em timestamptz not null default now()
);

comment on table public.case_credit_grants is 'Um crédito de caso por origem (checkout:<session>, invoice:<id>, migracao:<user>) — impede créditos duplicados.';
create index case_credit_grants_user_idx on public.case_credit_grants (user_id);

-- ---------------------------------------------------------------------------
-- 3. stripe_payments: crédito de upgrade usado uma só vez
-- ---------------------------------------------------------------------------
alter table public.stripe_payments
  add column credito_upgrade_em timestamptz;

comment on column public.stripe_payments.credito_upgrade_em is 'Quando o valor desta compra Avulso foi creditado no upgrade para Caso + Proteção. Preenchido = já usado, nunca mais elegível.';

-- ---------------------------------------------------------------------------
-- 4. Migração determinística dos dados existentes
-- ---------------------------------------------------------------------------
-- assinatura → caso_protecao ativo (a assinatura antiga já incluía casos e
-- todas as funcionalidades). Sem créditos migrados: o próximo invoice.paid
-- atribui o crédito do ciclo.
update public.user_access
  set subscription_plan = 'caso_protecao', subscription_status = 'active'
  where nivel_acesso = 'assinatura';

-- Avulso: 1 crédito por compra Avulso concluída e ligada à conta, menos os
-- casos que a conta já abriu no portal (nunca abaixo de zero).
insert into public.case_credit_grants (origem, user_id, quantidade)
select 'checkout:' || p.stripe_session_id, p.user_id, 1
  from public.stripe_payments p
  join public.user_access a on a.user_id = p.user_id
 where p.plano = 'avulso' and p.estado = 'concluido' and p.user_id is not null
on conflict (origem) do nothing;

update public.user_access a
   set case_credits = greatest(
         (select count(*) from public.case_credit_grants g where g.user_id = a.user_id)
         - (select count(*) from public.casos c where c.utilizador_id = a.user_id),
         0);

-- ---------------------------------------------------------------------------
-- 5. Funções de créditos (só o backend, com service_role)
-- ---------------------------------------------------------------------------
-- Concede créditos uma única vez por origem. p_maximo limita o saldo
-- resultante (Caso + Proteção: 4); null = sem limite (Avulso). Um crédito
-- que não caiba no limite fica registado como concedido — o ciclo não volta
-- a ser creditado mais tarde.
create or replace function public.conceder_credito_caso(
  p_user_id uuid,
  p_origem text,
  p_maximo int default null
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_inserido int;
begin
  insert into public.case_credit_grants (origem, user_id, quantidade)
  values (p_origem, p_user_id, 1)
  on conflict (origem) do nothing;
  get diagnostics v_inserido = row_count;
  if v_inserido = 0 then
    return false; -- já creditado
  end if;

  update public.user_access
     set case_credits = case
           when p_maximo is null then case_credits + 1
           else greatest(case_credits, least(case_credits + 1, p_maximo))
         end,
         updated_at = now()
   where user_id = p_user_id;
  return true;
end $$;

-- Consome 1 crédito se houver saldo. Atómico: dois pedidos em paralelo não
-- gastam o mesmo crédito.
create or replace function public.consumir_credito_caso(p_user_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_afetadas int;
begin
  update public.user_access
     set case_credits = case_credits - 1, updated_at = now()
   where user_id = p_user_id and case_credits > 0;
  get diagnostics v_afetadas = row_count;
  return v_afetadas > 0;
end $$;

-- Devolve o crédito se a criação do caso falhar depois de o consumir.
create or replace function public.devolver_credito_caso(p_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.user_access
     set case_credits = case_credits + 1, updated_at = now()
   where user_id = p_user_id;
$$;

revoke execute on function public.conceder_credito_caso(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.consumir_credito_caso(uuid) from public, anon, authenticated;
revoke execute on function public.devolver_credito_caso(uuid) from public, anon, authenticated;
grant execute on function public.conceder_credito_caso(uuid, text, int) to service_role;
grant execute on function public.consumir_credito_caso(uuid) to service_role;
grant execute on function public.devolver_credito_caso(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Proteção verificada na base de dados (substitui tem_assinatura)
-- ---------------------------------------------------------------------------
create or replace function public.tem_protecao()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.user_access
    where user_id = auth.uid()
      and subscription_plan in ('protecao', 'caso_protecao')
      and subscription_status in ('active', 'trialing', 'past_due')
  );
$$;

revoke execute on function public.tem_protecao() from public, anon;
grant execute on function public.tem_protecao() to authenticated;

drop policy "Cliente cria os próprios alertas" on public.alertas_fidelizacao_portal;
create policy "Cliente cria os próprios alertas" on public.alertas_fidelizacao_portal
  for insert with check (utilizador_id = auth.uid() and public.tem_protecao());

drop policy "Cliente edita os próprios alertas" on public.alertas_fidelizacao_portal;
create policy "Cliente edita os próprios alertas" on public.alertas_fidelizacao_portal
  for update using (utilizador_id = auth.uid())
  with check (utilizador_id = auth.uid() and public.tem_protecao());

drop policy "Cliente cria os próprios alertas de promoção" on public.alertas_promocao_portal;
create policy "Cliente cria os próprios alertas de promoção" on public.alertas_promocao_portal
  for insert with check (utilizador_id = auth.uid() and public.tem_protecao());

drop policy "Cliente edita os próprios alertas de promoção" on public.alertas_promocao_portal;
create policy "Cliente edita os próprios alertas de promoção" on public.alertas_promocao_portal
  for update using (utilizador_id = auth.uid())
  with check (utilizador_id = auth.uid() and public.tem_protecao());

drop function public.tem_assinatura();

-- ---------------------------------------------------------------------------
-- 7. Casos: contas com plano Stripe só criam casos pelo servidor
-- ---------------------------------------------------------------------------
-- Uma conta com linha em user_access (comprou algum plano) tem de gastar um
-- crédito para abrir um caso — isso é feito pela Server Action, com
-- service_role, depois de consumir o crédito. Um INSERT direto pela API
-- contornava o crédito, por isso deixa de ser permitido para essas contas.
-- Contas sem plano (piloto Remax / registo livre) continuam como antes.
drop policy "Cliente cria os próprios casos" on public.casos;
create policy "Cliente cria os próprios casos" on public.casos
  for insert with check (
    utilizador_id = auth.uid()
    and not exists (select 1 from public.user_access a where a.user_id = auth.uid())
    and status = 'Novo'
    and tipo_abc is null
    and valor_indicado is null
    and notas is null
    and dossie_url is null
    and data_envio_reclamacao is null
    and email_boas_vindas_enviado_em is null
    and primeira_resposta_em is null
  );

-- ---------------------------------------------------------------------------
-- 8. RLS de case_credit_grants: cliente lê os próprios, admin lê tudo
-- ---------------------------------------------------------------------------
alter table public.case_credit_grants enable row level security;

create policy "Cliente vê os próprios créditos" on public.case_credit_grants
  for select to authenticated using (user_id = auth.uid());

create policy "Admin lê créditos" on public.case_credit_grants
  for select to authenticated using (public.is_admin());

revoke all on public.case_credit_grants from anon, authenticated;
grant select on public.case_credit_grants to authenticated;
