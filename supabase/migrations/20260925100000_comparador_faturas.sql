-- DoLado — Comparador de Faturas (Fase 4)
--
-- Cliente envia a fatura, a Claude API extrai o valor (chave
-- ANTHROPIC_API_KEY ainda por contratar, previsto 01/10 — mesma situação
-- do Alerta de Fim de Promoção) e o sistema compara com a fatura anterior
-- do mesmo utilizador+operadora. Extração e comparação numérica são
-- factuais, sem interpretação legal — por isso não exigem o gate de
-- revisão humana obrigatória que os casos de reclamação têm. A rede de
-- segurança aqui é técnica, não jurídica: confiança baixa, falha da API
-- ou resposta inválida caem em revisão manual do admin, nunca num erro
-- visível ao cliente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'faturas-comparador',
  'faturas-comparador',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.comparacoes_fatura_portal (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  nome text not null,
  email text not null,
  operadora text,

  ficheiro_caminho text not null,
  ficheiro_nome text,

  valor_mes_atual numeric(10, 2),
  detalhe_mes_atual jsonb,
  confianca_extracao text check (confianca_extracao in ('high', 'medium', 'low')),
  extracao_bruta jsonb,

  valor_mes_anterior numeric(10, 2),
  diferenca_pct numeric(5, 2),
  analise text,

  status text not null default 'processing'
    check (status in ('processing', 'sent_to_client', 'extraction_failed', 'needs_manual_review')),

  revisto_por_admin_id uuid references auth.users (id),
  revisto_em timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.comparacoes_fatura_portal is 'Comparações de fatura mês a mês — extração automática por IA com fallback para revisão manual do admin quando a confiança é baixa ou a API falha.';
comment on column public.comparacoes_fatura_portal.extracao_bruta is 'Resposta bruta da Claude API, guardada para auditoria — nunca mostrada ao cliente tal qual.';

create index comparacoes_fatura_portal_utilizador_id_idx on public.comparacoes_fatura_portal (utilizador_id);
create index comparacoes_fatura_portal_status_idx on public.comparacoes_fatura_portal (status);

alter table public.comparacoes_fatura_portal enable row level security;

create policy "Cliente vê as próprias comparações de fatura"
  on public.comparacoes_fatura_portal for select
  using (utilizador_id = auth.uid());

create policy "Cliente cria as próprias comparações de fatura"
  on public.comparacoes_fatura_portal for insert
  with check (utilizador_id = auth.uid());

create policy "Admin gere todas as comparações de fatura"
  on public.comparacoes_fatura_portal for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage: o upload passa sempre por um signed upload URL criado no
-- servidor com a service role (bypassa RLS) — mesmo padrão de
-- anexos-casos e contratos-promocao.
create policy "Admin gere faturas no storage"
  on storage.objects for all
  using (bucket_id = 'faturas-comparador' and public.is_admin())
  with check (bucket_id = 'faturas-comparador' and public.is_admin());
