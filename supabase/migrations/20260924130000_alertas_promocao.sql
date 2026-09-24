-- DoLado — Alerta de fim de período promocional (Fase 4)
--
-- Cliente indica a data de fim da promoção manualmente ou anexa o
-- contrato para extração automática por IA (Claude API — chave ainda por
-- contratar em 01/10; o endpoint cai em modo manual enquanto a chave não
-- existir, ver /api/internal/extract-promotion-date). O cliente confirma
-- sempre a data final antes de o alerta ficar activo — a extração é
-- puramente factual (uma data num documento), nunca uma decisão jurídica.
--
-- `operadora` fica livre (texto), tal como em alertas_fidelizacao_portal —
-- não introduzimos o enum inglês telecom/energy/water do rascunho
-- original.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contratos-promocao',
  'contratos-promocao',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.alertas_promocao_portal (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  nome text not null,
  email text not null,
  operadora text not null,
  descricao_promocao text not null,
  data_fim_promocao date not null,
  origem_data text not null default 'manual'
    check (origem_data in ('manual', 'api_extraida', 'api_extraida_editada')),

  ficheiro_contrato_caminho text,
  ficheiro_contrato_nome text,

  extracao_api_bruta jsonb,
  extracao_api_confianca text check (extracao_api_confianca in ('high', 'medium', 'low')),

  alerta_30d_enviado_em timestamptz,
  alerta_7d_enviado_em timestamptz,
  alerta_1d_enviado_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alertas_promocao_portal is 'Alertas de fim de período promocional geridos pelo cliente — data manual ou sugerida pela extração por IA do contrato, sempre confirmada pelo cliente antes de gravar.';
comment on column public.alertas_promocao_portal.extracao_api_bruta is 'Resposta bruta da Claude API, guardada para auditoria — nunca mostrada ao cliente tal qual.';

create index alertas_promocao_portal_utilizador_id_idx on public.alertas_promocao_portal (utilizador_id);
create index alertas_promocao_portal_data_fim_idx on public.alertas_promocao_portal (data_fim_promocao);

create trigger set_updated_at before update on public.alertas_promocao_portal
  for each row execute function public.set_updated_at();

alter table public.alertas_promocao_portal enable row level security;

create policy "Cliente vê os próprios alertas de promoção"
  on public.alertas_promocao_portal for select
  using (utilizador_id = auth.uid());

create policy "Cliente cria os próprios alertas de promoção"
  on public.alertas_promocao_portal for insert
  with check (utilizador_id = auth.uid());

create policy "Cliente edita os próprios alertas de promoção"
  on public.alertas_promocao_portal for update
  using (utilizador_id = auth.uid())
  with check (utilizador_id = auth.uid());

create policy "Cliente apaga os próprios alertas de promoção"
  on public.alertas_promocao_portal for delete
  using (utilizador_id = auth.uid());

create policy "Admin gere todos os alertas de promoção"
  on public.alertas_promocao_portal for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage do contrato: o upload em si passa sempre por um signed upload
-- URL criado no servidor com a service role (bypassa RLS) — mesmo padrão
-- de anexos-casos. Aqui só é preciso impedir leitura/escrita directa por
-- clientes não autorizados; o admin mantém acesso total para suporte.
create policy "Admin gere contratos de promoção no storage"
  on storage.objects for all
  using (bucket_id = 'contratos-promocao' and public.is_admin())
  with check (bucket_id = 'contratos-promocao' and public.is_admin());
