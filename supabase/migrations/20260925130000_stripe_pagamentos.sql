-- DoLado — Pagamentos Stripe (Fase 4)
--
-- Decisão de 25/09/2026: Pagamentos/Stripe saiu da lista "fora de escopo"
-- do CLAUDE.md. Cobre só o canal B2C directo (planos "Avulso" e
-- "Assinatura Mensal" já anunciados no preçário da homepage). O piloto
-- B2B2C com a Remax continua gratuito e fora deste fluxo — terá página e
-- cupão de desconto 100% próprios, ainda por construir.

create table public.stripe_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.utilizadores (id) on delete set null,
  stripe_session_id text unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  email text not null,
  plano text not null check (plano in ('avulso', 'assinatura')),
  valor_total_centimos int,
  moeda text not null default 'eur',
  codigo_desconto text,
  upgrade_de_avulso boolean not null default false,
  estado text not null default 'concluido'
    check (estado in ('concluido', 'reembolsado', 'assinatura_cancelada')),
  created_at timestamptz not null default now()
);

comment on table public.stripe_payments is 'Registo de cada pagamento Stripe (avulso ou assinatura) — canal B2C directo apenas.';

create index stripe_payments_email_idx on public.stripe_payments (email);
create index stripe_payments_user_id_idx on public.stripe_payments (user_id);

create table public.user_access (
  user_id uuid primary key references public.utilizadores (id) on delete cascade,
  nivel_acesso text not null default 'nenhum'
    check (nivel_acesso in ('nenhum', 'avulso', 'assinatura')),
  stripe_customer_id text,
  updated_at timestamptz not null default now()
);

comment on table public.user_access is 'Nível de acesso do cliente B2C às funcionalidades do portal, definido pelo último pagamento Stripe. Não se aplica a colaboradores de parceiros (Remax), que continuam com acesso gratuito por fora deste mecanismo.';

alter table public.stripe_payments enable row level security;
alter table public.user_access enable row level security;

create policy "Cliente vê os próprios pagamentos"
  on public.stripe_payments for select
  using (user_id = auth.uid());

create policy "Admin gere todos os pagamentos"
  on public.stripe_payments for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Cliente vê o próprio nível de acesso"
  on public.user_access for select
  using (user_id = auth.uid());

create policy "Admin gere todos os níveis de acesso"
  on public.user_access for all
  using (public.is_admin())
  with check (public.is_admin());
