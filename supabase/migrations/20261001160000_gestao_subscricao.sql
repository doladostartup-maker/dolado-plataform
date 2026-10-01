-- DoLado — Gestão de Subscrição: cancelamento no fim do período pago,
-- reversão do cancelamento e casos disponíveis congelados durante 90 dias.
--
-- 1) user_access.cancel_at_period_end: espelho do campo do Stripe, para o
--    portal mostrar "Cancelamento agendado" sem ler stripe_subscriptions
--    (que o cliente não lê). Escrito pelo webhook e pela Server Action de
--    cancelar/manter — nunca pelo cliente.
--
-- 2) subscricao_cancelamentos: auditoria mínima de cada pedido de
--    cancelamento (quando foi pedido, quando termina, motivo opcional,
--    reversão, fim efetivo). Só o backend escreve; só o admin lê.
--
-- 3) case_credit_freezes: quando uma subscrição Caso + Proteção termina, os
--    casos disponíveis que vieram da subscrição saem de case_credits e ficam
--    aqui congelados durante 90 dias. Se a conta voltar a ter Caso + Proteção
--    ativo nesse prazo, voltam (até ao limite de 4). Depois do prazo deixam
--    de poder ser recuperados — sem cron: o prazo é verificado na
--    restauração. Esta regra é comercial e não tem nada a ver com a
--    conservação de dados pessoais: nada é apagado aqui.
--
-- Os casos, documentos e histórico NUNCA são apagados por um cancelamento.

-- ---------------------------------------------------------------------------
-- 1. user_access.cancel_at_period_end
-- ---------------------------------------------------------------------------
alter table public.user_access
  add column cancel_at_period_end boolean not null default false;

comment on column public.user_access.cancel_at_period_end is 'Cancelamento agendado para o fim do período pago (espelho do Stripe). A proteção mantém-se até current_period_end.';

-- Data marcada para o cancelamento no Stripe (cancel_at). Faz parte do
-- snapshot que o webhook grava em stripe_subscriptions.
alter table public.stripe_subscriptions
  add column cancel_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Auditoria de cancelamentos
-- ---------------------------------------------------------------------------
create table public.subscricao_cancelamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  stripe_subscription_id text not null,
  plano text check (plano in ('protecao', 'caso_protecao')),
  -- cliente: pedido no portal; stripe: feito fora do portal (ex.: admin no
  -- Stripe Dashboard, cancelamento imediato excecional, falta de pagamento).
  origem text not null check (origem in ('cliente', 'stripe')),
  motivo_codigo text
    check (motivo_codigo in ('ja_nao_preciso', 'preco', 'pouco_uso', 'problema_resolvido', 'outro')),
  motivo_texto text check (char_length(motivo_texto) <= 500),
  pedido_em timestamptz,
  fim_previsto_em timestamptz,
  revertido_em timestamptz,
  terminado_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.subscricao_cancelamentos is 'Pedidos de cancelamento de subscrição (motivo opcional), reversões e fim efetivo. Só dados necessários para gestão/estatística.';

-- No máximo um cancelamento "em aberto" (nem revertido nem terminado) por
-- subscrição: pedidos repetidos não criam linhas novas.
create unique index subscricao_cancelamentos_aberto_idx
  on public.subscricao_cancelamentos (stripe_subscription_id)
  where revertido_em is null and terminado_em is null;
create index subscricao_cancelamentos_user_idx on public.subscricao_cancelamentos (user_id);

alter table public.subscricao_cancelamentos enable row level security;

create policy "Admin lê cancelamentos de subscrição" on public.subscricao_cancelamentos
  for select to authenticated using (public.is_admin());

revoke all on public.subscricao_cancelamentos from anon, authenticated;
grant select on public.subscricao_cancelamentos to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Casos disponíveis congelados
-- ---------------------------------------------------------------------------
create table public.case_credit_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  stripe_subscription_id text not null,
  quantidade int not null check (quantidade >= 0),
  congelado_em timestamptz not null,
  expira_em timestamptz not null,
  restaurado_em timestamptz,
  check (expira_em > congelado_em)
);

comment on table public.case_credit_freezes is 'Casos disponíveis do Caso + Proteção congelados no fim da subscrição; recuperáveis durante 90 dias com nova subscrição Caso + Proteção. Regra comercial, independente da conservação de dados.';

-- Um congelamento ativo (não restaurado) por subscrição e conta: o mesmo fim
-- de subscrição recebido várias vezes (updated + deleted, reenvios) só
-- congela uma vez.
create unique index case_credit_freezes_ativo_idx
  on public.case_credit_freezes (stripe_subscription_id, user_id)
  where restaurado_em is null;
create index case_credit_freezes_user_idx on public.case_credit_freezes (user_id);

alter table public.case_credit_freezes enable row level security;

create policy "Cliente vê os próprios casos congelados" on public.case_credit_freezes
  for select to authenticated using (user_id = auth.uid());

create policy "Admin lê casos congelados" on public.case_credit_freezes
  for select to authenticated using (public.is_admin());

revoke all on public.case_credit_freezes from anon, authenticated;
grant select on public.case_credit_freezes to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Funções (só o backend, com service_role)
-- ---------------------------------------------------------------------------
-- Congela os casos disponíveis que vieram da subscrição p_subscription_id,
-- nas contas que ainda têm esta subscrição (uma conta que entretanto aderiu
-- a outra não é tocada). Idempotente: um congelamento ativo para esta
-- subscrição encerra a função.
--
-- case_credits junta casos Avulso e casos do Caso + Proteção. Não há registo
-- de qual foi gasto primeiro, por isso os casos Avulso comprados por esta
-- conta (origem checkout:%) nunca são congelados — só o excedente. Em caso de
-- dúvida, fica utilizável (a favor do cliente).
create or replace function public.congelar_creditos_caso(
  p_subscription_id text,
  p_em timestamptz,
  p_dias int default 90
) returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta record;
  v_avulso int;
  v_quantidade int;
  v_total int := 0;
begin
  for v_conta in
    select user_id, case_credits from public.user_access
     where stripe_subscription_id = p_subscription_id
     for update
  loop
    if exists (
      select 1 from public.case_credit_freezes
       where stripe_subscription_id = p_subscription_id
         and user_id = v_conta.user_id
         and restaurado_em is null
    ) then
      continue; -- já congelado
    end if;

    select count(*) into v_avulso from public.case_credit_grants
     where user_id = v_conta.user_id and origem like 'checkout:%';
    v_quantidade := greatest(v_conta.case_credits - v_avulso, 0);

    -- Grava mesmo com 0: marca o fim desta subscrição como tratado.
    insert into public.case_credit_freezes (user_id, stripe_subscription_id, quantidade, congelado_em, expira_em)
    values (v_conta.user_id, p_subscription_id, v_quantidade, p_em, p_em + make_interval(days => p_dias));

    update public.user_access
       set case_credits = case_credits - v_quantidade, updated_at = now()
     where user_id = v_conta.user_id;
    v_total := v_total + v_quantidade;
  end loop;
  return v_total;
end $$;

-- Restaura os casos congelados ainda no prazo nas contas que têm agora a
-- subscrição p_subscription_id ativa como Caso + Proteção. O saldo
-- resultante respeita p_maximo (4), como os casos mensais. Idempotente: cada
-- congelamento só é restaurado uma vez (restaurado_em). Congelamentos fora
-- do prazo ficam como estão (expirados).
create or replace function public.restaurar_creditos_caso(
  p_subscription_id text,
  p_em timestamptz,
  p_maximo int
) returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta record;
  v_soma int;
  v_novo int;
  v_total int := 0;
begin
  for v_conta in
    select user_id, case_credits from public.user_access
     where stripe_subscription_id = p_subscription_id
       and subscription_plan = 'caso_protecao'
       and subscription_status in ('active', 'trialing', 'past_due')
     for update
  loop
    select coalesce(sum(quantidade), 0) into v_soma from public.case_credit_freezes
     where user_id = v_conta.user_id and restaurado_em is null and expira_em > p_em;

    update public.case_credit_freezes
       set restaurado_em = p_em
     where user_id = v_conta.user_id and restaurado_em is null and expira_em > p_em;
    if not found then
      continue;
    end if;

    v_novo := greatest(v_conta.case_credits, least(v_conta.case_credits + v_soma, p_maximo));
    update public.user_access
       set case_credits = v_novo, updated_at = now()
     where user_id = v_conta.user_id;
    v_total := v_total + (v_novo - v_conta.case_credits);
  end loop;
  return v_total;
end $$;

revoke execute on function public.congelar_creditos_caso(text, timestamptz, int) from public, anon, authenticated;
revoke execute on function public.restaurar_creditos_caso(text, timestamptz, int) from public, anon, authenticated;
grant execute on function public.congelar_creditos_caso(text, timestamptz, int) to service_role;
grant execute on function public.restaurar_creditos_caso(text, timestamptz, int) to service_role;
