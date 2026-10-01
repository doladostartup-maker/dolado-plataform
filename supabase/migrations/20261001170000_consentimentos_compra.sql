-- DoLado — Registo de prova dos consentimentos da compra (checkout).
--
-- Antes de abrir qualquer Stripe Checkout Session, o servidor valida as duas
-- checkboxes obrigatórias (aceitação dos Termos e pedido expresso de início
-- imediato) e grava aqui o que foi aceite: versões dos Termos, da Política de
-- Privacidade e do texto de início imediato, o texto exato apresentado e a
-- hora do servidor. Só depois cria a sessão, com o id deste registo na
-- metadata. O webhook completa a ligação ao pagamento e à subscrição.
--
-- A prova não depende do Stripe. Os campos de prova são imutáveis (trigger):
-- depois de gravados, só se podem preencher as ligações em falta
-- (sessão, pagamento, subscrição, conta, e-mail) — nunca alterar o que foi
-- aceite. Nenhum destes campos decide reembolsos ou a perda do direito de
-- livre resolução.
--
-- A Política de Privacidade NÃO é um consentimento: só se regista a versão
-- disponibilizada no momento da compra.

create table public.consentimentos_compra (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.utilizadores (id) on delete set null,
  email text,
  plano text not null check (plano in ('avulso', 'protecao', 'caso_protecao')),
  tipo_compra text not null check (tipo_compra in ('avulso', 'subscricao', 'conversao_avulso')),
  origem text not null check (origem in ('landing', 'portal', 'novo_caso', 'repetir_pagamento')),
  conversao_id uuid references public.conversoes_avulso (id) on delete set null,
  termos_versao text not null,
  privacidade_versao text not null,
  consentimento_inicio_imediato_versao text not null,
  texto_aceitacao_termos text not null,
  texto_consentimento_inicio_imediato text not null,
  aceitou_termos_em timestamptz not null,
  pediu_inicio_imediato_em timestamptz not null,
  checkout_session_id text unique,
  stripe_payment_id uuid references public.stripe_payments (id) on delete set null,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

comment on table public.consentimentos_compra is 'Prova dos consentimentos dados antes de cada Stripe Checkout (Termos, início imediato, versão da Política de Privacidade disponibilizada). Escrito só pelo servidor; campos de prova imutáveis.';
comment on column public.consentimentos_compra.texto_consentimento_inicio_imediato is 'Texto exato do pedido expresso de início imediato apresentado ao cliente (snapshot).';
comment on column public.consentimentos_compra.privacidade_versao is 'Versão da Política de Privacidade disponibilizada antes da compra — não é um consentimento RGPD.';

create index consentimentos_compra_user_idx on public.consentimentos_compra (user_id);
create index consentimentos_compra_subscription_idx on public.consentimentos_compra (stripe_subscription_id);
create index consentimentos_compra_payment_idx on public.consentimentos_compra (stripe_payment_id);

-- ---------------------------------------------------------------------------
-- Imutabilidade da prova
-- ---------------------------------------------------------------------------
-- Campos de prova nunca mudam. Ligações (sessão, pagamento, subscrição,
-- conta, e-mail) só podem ser preenchidas quando ainda estão vazias — um
-- webhook repetido grava o mesmo valor e não falha.
create or replace function public.consentimentos_compra_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.plano is distinct from old.plano
     or new.tipo_compra is distinct from old.tipo_compra
     or new.origem is distinct from old.origem
     or (new.conversao_id is not null and new.conversao_id is distinct from old.conversao_id)
     or new.termos_versao is distinct from old.termos_versao
     or new.privacidade_versao is distinct from old.privacidade_versao
     or new.consentimento_inicio_imediato_versao is distinct from old.consentimento_inicio_imediato_versao
     or new.texto_aceitacao_termos is distinct from old.texto_aceitacao_termos
     or new.texto_consentimento_inicio_imediato is distinct from old.texto_consentimento_inicio_imediato
     or new.aceitou_termos_em is distinct from old.aceitou_termos_em
     or new.pediu_inicio_imediato_em is distinct from old.pediu_inicio_imediato_em
     or new.created_at is distinct from old.created_at then
    raise exception 'consentimentos_compra: os campos de prova são imutáveis' using errcode = '42501';
  end if;

  if (old.checkout_session_id is not null and new.checkout_session_id is distinct from old.checkout_session_id)
     or (old.stripe_payment_id is not null and new.stripe_payment_id is not null and new.stripe_payment_id <> old.stripe_payment_id)
     or (old.stripe_subscription_id is not null and new.stripe_subscription_id is distinct from old.stripe_subscription_id)
     or (old.email is not null and new.email is distinct from old.email) then
    raise exception 'consentimentos_compra: ligação já preenchida' using errcode = '42501';
  end if;
  -- Referências apagadas (on delete set null: conta, conversão, pagamento)
  -- podem passar a null; nunca ser trocadas por outras.
  if old.user_id is not null and new.user_id is not null and new.user_id <> old.user_id then
    raise exception 'consentimentos_compra: conta já ligada' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger consentimentos_compra_imutavel
  before update on public.consentimentos_compra
  for each row execute function public.consentimentos_compra_imutavel();

-- ---------------------------------------------------------------------------
-- RLS: cliente lê os próprios registos; só o servidor (service_role) escreve.
-- ---------------------------------------------------------------------------
alter table public.consentimentos_compra enable row level security;

create policy "Cliente vê os próprios consentimentos de compra" on public.consentimentos_compra
  for select to authenticated using (user_id = auth.uid());

create policy "Admin lê consentimentos de compra" on public.consentimentos_compra
  for select to authenticated using (public.is_admin());

revoke all on public.consentimentos_compra from anon, authenticated;
grant select on public.consentimentos_compra to authenticated;
