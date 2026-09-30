-- DoLado — Webhook Stripe: idempotência, pagamentos assíncronos (SEPA) e
-- estado das subscrições.
--
-- 1) stripe_webhook_events: cada event.id do Stripe é reclamado antes de ser
--    processado. Um evento reenviado (ou entregue duas vezes em paralelo)
--    encontra a linha e é ignorado. Se o processamento falhar, a linha é
--    apagada e o webhook devolve 500 para o Stripe voltar a tentar.
-- 2) stripe_subscriptions: último estado conhecido de cada subscrição
--    (status, período, cancelamento no fim do período, price, falhas de
--    cobrança). Não depende de a conta já existir — uma subscrição comprada
--    de raiz só fica ligada a um utilizador quando /criar-conta corre; a
--    ligação faz-se por stripe_customer_id, como em user_access.
-- 3) stripe_payments.estado passa a aceitar 'pendente' (pagamento assíncrono
--    ainda por confirmar) e 'falhado'.
--
-- Nenhuma destas tabelas é lida pelo cliente: só o backend (service_role)
-- escreve e só o admin lê.

create table public.stripe_webhook_events (
  event_id text primary key,
  tipo text not null,
  estado text not null default 'processando'
    check (estado in ('processando', 'processado')),
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);

comment on table public.stripe_webhook_events is 'Idempotência do webhook Stripe: um event.id só é processado uma vez.';

create table public.stripe_subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text not null,
  price_id text,
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  ultimo_pagamento_estado text
    check (ultimo_pagamento_estado in ('pago', 'falhado', 'acao_necessaria')),
  ultimo_pagamento_em timestamptz,
  -- event.created (segundos Unix) do evento que gravou este estado — um
  -- evento mais antigo entregue fora de ordem não sobrepõe um mais recente.
  estado_em bigint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.stripe_subscriptions is 'Último estado conhecido de cada subscrição Stripe (sincronizado pelo webhook).';

create index stripe_subscriptions_customer_idx on public.stripe_subscriptions (stripe_customer_id);
create index stripe_payments_subscription_idx on public.stripe_payments (stripe_subscription_id);
create index user_access_customer_idx on public.user_access (stripe_customer_id);

alter table public.stripe_payments drop constraint stripe_payments_estado_check;
alter table public.stripe_payments add constraint stripe_payments_estado_check
  check (estado in ('concluido', 'pendente', 'falhado', 'reembolsado', 'assinatura_cancelada'));

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_subscriptions enable row level security;

create policy "Admin lê eventos do webhook Stripe"
  on public.stripe_webhook_events for select
  to authenticated
  using (public.is_admin());

create policy "Admin lê subscrições Stripe"
  on public.stripe_subscriptions for select
  to authenticated
  using (public.is_admin());

-- Só o backend escreve (service_role ignora RLS e grants de tabela).
revoke all on public.stripe_webhook_events from anon, authenticated;
revoke all on public.stripe_subscriptions from anon, authenticated;
grant select on public.stripe_webhook_events to authenticated;
grant select on public.stripe_subscriptions to authenticated;
