-- DoLado — Simulador de Elegibilidade: segunda via de entrada pública, sem
-- login (decisão de preços de 24/09: "simulador de elegibilidade passa a
-- ser gratuito e sem login, como isco de aquisição"). Fase 1, Fase 2,
-- gate de revisão humana e templates de e-mail mantêm-se exactamente
-- iguais — isto só relaxa quem pode criar um registo e de onde veio.

alter table public.casos_elegibilidade_portal
  alter column utilizador_id drop not null,
  alter column nome drop not null,
  add column origem text not null default 'dashboard' check (origem in ('publico', 'dashboard'));

comment on column public.casos_elegibilidade_portal.origem is 'dashboard = cliente autenticado no Portal; publico = via /simulador-elegibilidade, sem login, utilizador_id fica NULL.';

-- nome era obrigatório porque só existia a via dashboard (perfil sempre
-- tem nome ou cai no e-mail); a via pública não pede nome, só e-mail.
comment on column public.casos_elegibilidade_portal.nome is 'Pode ser NULL na via pública — os templates de e-mail caem para o e-mail como saudação nesse caso.';

create index casos_elegibilidade_portal_email_idx on public.casos_elegibilidade_portal (email);

-- A via pública insere sempre através da service role (Server Action com
-- createAdminClient), tal como alertas_fidelizacao — por isso não precisa
-- de policy de insert para anon. Mantém-se: cliente vê/cria os próprios
-- (via dashboard), admin gere tudo.
