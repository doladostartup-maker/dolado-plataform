-- DoLado — Alertas de fim de fidelização (captação de leads pública, sem
-- login). Guarda o pedido de aviso mesmo quando o cliente só sabe a data de
-- início do contrato — nesse caso estimamos os 24 meses habituais e
-- assinalamos o registo como estimado.

create table public.alertas_fidelizacao (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  operadora text not null,
  data_fim_fidelizacao date,
  data_inicio_contrato date,
  data_estimada boolean not null default false,
  consentimento_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.alertas_fidelizacao is 'Pedidos públicos de aviso de fim de fidelização — captação de leads, sem conta associada.';
comment on column public.alertas_fidelizacao.data_estimada is 'Verdadeiro quando data_fim_fidelizacao foi calculada a partir de data_inicio_contrato (+24 meses), não indicada directamente pelo cliente.';

create index alertas_fidelizacao_email_idx on public.alertas_fidelizacao (email);

grant select, insert on public.alertas_fidelizacao to service_role;

alter table public.alertas_fidelizacao enable row level security;

create policy "Admin gere alertas de fidelização"
  on public.alertas_fidelizacao for all
  using (public.is_admin())
  with check (public.is_admin());
