-- DoLado — Conversão de um Avulso pago numa assinatura, com reembolso parcial
--
-- Regra comercial (01/10/2026): quem pagou um Avulso (14,99 €) e adere a uma
-- assinatura tem o primeiro mês coberto pelo Avulso e recebe a diferença de
-- volta no método de pagamento original:
--   Avulso → Proteção (4,99 €):        1.ª mensalidade a 0 €, reembolso 10,00 €
--   Avulso → Caso + Proteção (7,99 €): 1.ª mensalidade a 0 €, reembolso  7,00 €
-- Sem Customer Balance: a 1.ª fatura leva um cupão de 100% "once" e o resto
-- é um reembolso parcial (Refund) do PaymentIntent do Avulso.
--
-- Uma linha por compra Avulso (unique stripe_payment_id): o mesmo Avulso
-- nunca é convertido duas vezes.
--   checkout_aberto → criada ao abrir o Checkout de upgrade. NÃO consome o
--                     direito: se o cliente abandonar, continua elegível
--                     (um novo Checkout substitui checkout_session_id).
--   convertido      → a subscrição foi confirmada pelo webhook para ESTE
--                     checkout_session_id. Só depois se cria o reembolso.
-- O estado do reembolso (refund_estado) é o do Stripe e é atualizado pelos
-- eventos refund.created / refund.updated / refund.failed — um pedido
-- aceite pela API não significa dinheiro devolvido.

create table public.conversoes_avulso (
  id uuid primary key default gen_random_uuid(),
  stripe_payment_id uuid not null unique references public.stripe_payments (id) on delete restrict,
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  plano_destino text not null check (plano_destino in ('protecao', 'caso_protecao')),
  estado text not null default 'checkout_aberto'
    check (estado in ('checkout_aberto', 'convertido')),
  checkout_session_id text,
  stripe_subscription_id text,
  -- Fixados quando o Checkout é aberto (o que foi mostrado ao cliente).
  valor_avulso_centimos int not null check (valor_avulso_centimos > 0),
  valor_primeira_mensalidade_centimos int not null check (valor_primeira_mensalidade_centimos > 0),
  refund_montante_centimos int not null check (refund_montante_centimos >= 0),
  payment_intent_id text,
  refund_id text unique,
  refund_estado text,
  requer_intervencao boolean not null default false,
  intervencao_motivo text,
  convertido_em timestamptz,
  refund_atualizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (refund_montante_centimos = valor_avulso_centimos - valor_primeira_mensalidade_centimos)
);

comment on table public.conversoes_avulso is 'Conversão de uma compra Avulso na 1.ª mensalidade de uma assinatura, com reembolso parcial da diferença. Uma por compra Avulso.';
comment on column public.conversoes_avulso.requer_intervencao is 'Reembolso falhado ou recusado — resolver manualmente no Stripe. A assinatura NÃO é cancelada automaticamente.';

create index conversoes_avulso_user_idx on public.conversoes_avulso (user_id);
create index conversoes_avulso_checkout_idx on public.conversoes_avulso (checkout_session_id);

-- O crédito em saldo Stripe (Customer Balance) deixou de ser usado.
comment on column public.stripe_payments.credito_upgrade_em is 'OBSOLETO desde 01/10/2026 — substituído por conversoes_avulso. Mantido só para compatibilidade durante o deploy.';

alter table public.conversoes_avulso enable row level security;

create policy "Cliente vê as próprias conversões" on public.conversoes_avulso
  for select to authenticated using (user_id = auth.uid());

create policy "Admin lê conversões" on public.conversoes_avulso
  for select to authenticated using (public.is_admin());

-- Só o backend (service_role) escreve.
revoke all on public.conversoes_avulso from anon, authenticated;
grant select on public.conversoes_avulso to authenticated;
