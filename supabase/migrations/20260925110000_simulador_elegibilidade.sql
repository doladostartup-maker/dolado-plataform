-- DoLado — Simulador de Elegibilidade (Fase 4)
--
-- Fase 1: regras determinísticas, sem IA, resposta imediata — cobre a
-- maioria dos casos com uma regra fixa, sem interpretação, por isso é
-- seguro enviar directo ao cliente.
--
-- Fase 2: só para os casos que a Fase 1 não consegue decidir. A Claude API
-- gera uma SUGESTÃO (nunca visível ao cliente), mas o estado mantém-se
-- sempre 'em_revisao' até o admin confirmar — é a linha entre apoio
-- administrativo (permitido) e aconselhamento jurídico individualizado
-- (exige supervisão humana), validada com a advogada RGPD. Chave
-- ANTHROPIC_API_KEY ainda por contratar (previsto 01/10); sem ela, o caso
-- vai para revisão manual sem sugestão da IA — o gate humano já era
-- obrigatório de qualquer forma, por isso a falha da API não muda o fluxo
-- do cliente em nada.

create table public.casos_elegibilidade_portal (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  nome text not null,
  email text not null,

  setor text not null check (setor in ('Telecomunicações', 'Energia', 'Água')),
  duracao_contrato text not null check (duracao_contrato in ('menos_6m', '6_12m', '1_2anos', 'mais_2anos')),
  empresa_respondeu_bem boolean not null,
  descricao_problema text not null,

  -- Fase 1
  pontuacao_elegibilidade int not null default 0,
  estado_elegibilidade text not null default 'em_revisao'
    check (estado_elegibilidade in ('elegivel', 'nao_elegivel', 'em_revisao', 'enviado_cliente')),

  -- Fase 2 — sugestão da IA, nunca decide, nunca vai ao cliente
  sugestao_ia_estado text check (sugestao_ia_estado in ('elegivel', 'nao_elegivel', 'pouco_claro')),
  sugestao_ia_razao text,
  confianca_ia text check (confianca_ia in ('high', 'medium', 'low', 'unavailable')),
  resposta_bruta_ia jsonb,

  -- Decisão final humana — obrigatória antes de qualquer e-mail sair
  estado_final text check (estado_final in ('elegivel', 'nao_elegivel')),
  revisto_por_admin_id uuid references auth.users (id),
  revisto_em timestamptz,
  notas_admin text,

  created_at timestamptz not null default now()
);

comment on table public.casos_elegibilidade_portal is 'Simulador de elegibilidade — Fase 1 (regras fixas, resposta imediata) + Fase 2 (sugestão da IA, sempre sujeita a confirmação humana antes de qualquer contacto com o cliente).';
comment on column public.casos_elegibilidade_portal.sugestao_ia_estado is 'Sugestão da Claude API — visível só ao admin, nunca ao cliente. Não é uma decisão.';
comment on column public.casos_elegibilidade_portal.estado_final is 'Único valor que determina o que o cliente recebe. Para casos da Fase 1 claros, é preenchido automaticamente pela regra; para casos da Fase 2, só pelo admin.';

create index casos_elegibilidade_portal_utilizador_id_idx on public.casos_elegibilidade_portal (utilizador_id);
create index casos_elegibilidade_portal_estado_idx on public.casos_elegibilidade_portal (estado_elegibilidade);

alter table public.casos_elegibilidade_portal enable row level security;

create policy "Cliente vê os próprios casos de elegibilidade"
  on public.casos_elegibilidade_portal for select
  using (utilizador_id = auth.uid());

create policy "Cliente cria os próprios casos de elegibilidade"
  on public.casos_elegibilidade_portal for insert
  with check (utilizador_id = auth.uid());

create policy "Admin gere todos os casos de elegibilidade"
  on public.casos_elegibilidade_portal for all
  using (public.is_admin())
  with check (public.is_admin());
