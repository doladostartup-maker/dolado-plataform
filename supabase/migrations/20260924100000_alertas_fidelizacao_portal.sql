-- DoLado — Alertas de fim de fidelização dentro do Portal do Cliente
-- (Fase 4). Diferente de `alertas_fidelizacao` (captação pública, sem
-- conta), esta tabela pertence sempre a um utilizador autenticado e
-- suporta edição/remoção pelo próprio.

create table public.alertas_fidelizacao_portal (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  nome text not null,
  email text not null,
  operadora text not null,
  data_inicio_contrato date,
  data_fim_fidelizacao date not null,
  alerta_60d_enviado_em timestamptz,
  alerta_30d_enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alertas_fidelizacao_portal is 'Alertas de fim de fidelização geridos pelo próprio cliente autenticado no Portal — distinto de alertas_fidelizacao (captação pública, sem conta).';
comment on column public.alertas_fidelizacao_portal.alerta_60d_enviado_em is 'Preenchido pela função verificar-alertas-fidelizacao quando o aviso a 60 dias é enviado — evita reenvio.';
comment on column public.alertas_fidelizacao_portal.alerta_30d_enviado_em is 'Preenchido pela função verificar-alertas-fidelizacao quando o aviso a 30 dias é enviado — evita reenvio.';

create index alertas_fidelizacao_portal_utilizador_id_idx on public.alertas_fidelizacao_portal (utilizador_id);
create index alertas_fidelizacao_portal_data_fim_idx on public.alertas_fidelizacao_portal (data_fim_fidelizacao);

create trigger set_updated_at before update on public.alertas_fidelizacao_portal
  for each row execute function public.set_updated_at();

alter table public.alertas_fidelizacao_portal enable row level security;

create policy "Cliente vê os próprios alertas"
  on public.alertas_fidelizacao_portal for select
  using (utilizador_id = auth.uid());

create policy "Cliente cria os próprios alertas"
  on public.alertas_fidelizacao_portal for insert
  with check (utilizador_id = auth.uid());

create policy "Cliente edita os próprios alertas"
  on public.alertas_fidelizacao_portal for update
  using (utilizador_id = auth.uid())
  with check (utilizador_id = auth.uid());

create policy "Cliente apaga os próprios alertas"
  on public.alertas_fidelizacao_portal for delete
  using (utilizador_id = auth.uid());

create policy "Admin gere todos os alertas do portal"
  on public.alertas_fidelizacao_portal for all
  using (public.is_admin())
  with check (public.is_admin());
