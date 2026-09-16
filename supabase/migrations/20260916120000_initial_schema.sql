-- DoLado — Schema inicial (Fase 1)
-- Tabelas: utilizadores, casos, templates + RLS

create extension if not exists "pgcrypto";

-- =========================================================
-- utilizadores — perfil complementar a auth.users
-- =========================================================
create table public.utilizadores (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text,
  role text not null default 'cliente' check (role in ('cliente', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.utilizadores is 'Perfil complementar a auth.users — distingue cliente de admin.';

-- =========================================================
-- casos — substitui a Google Sheet manual
-- =========================================================
create table public.casos (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid references public.utilizadores (id) on delete set null,
  nome text not null,
  email text not null,
  telefone text,
  empresa_parceira text,
  sector text,
  tipo_problema text,
  descricao text,
  status text not null default 'Novo'
    check (status in ('Novo', 'Em Análise', 'Aguardando Decisão', 'Resolvido', 'Bloqueado')),
  tipo_abc text check (tipo_abc in ('A', 'B', 'C')),
  data_fim_fidelidade date,
  minutos integer,
  disposicao_pagar boolean,
  valor_indicado numeric(10, 2),
  notas text,
  dossie_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.casos is 'Casos de reclamação de consumo.';

create index casos_status_idx on public.casos (status);
create index casos_utilizador_id_idx on public.casos (utilizador_id);
create index casos_data_fim_fidelidade_idx on public.casos (data_fim_fidelidade);

-- =========================================================
-- templates — textos-base de reclamação (CRUD na Fase 4)
-- =========================================================
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sector text,
  tipo_problema text,
  texto text not null,
  created_at timestamptz not null default now()
);

comment on table public.templates is 'Templates de texto — variáveis {{}} substituídas em runtime na Fase 4.';

-- =========================================================
-- updated_at automático
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.utilizadores
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.casos
  for each row execute function public.set_updated_at();

-- =========================================================
-- Criar automaticamente o registo em utilizadores no signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.utilizadores (id, email, nome)
  values (new.id, new.email, new.raw_user_meta_data ->> 'nome');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Helper: o utilizador autenticado é admin?
-- =========================================================
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.utilizadores
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.utilizadores enable row level security;
alter table public.casos enable row level security;
alter table public.templates enable row level security;

-- utilizadores: cada um vê o próprio perfil; admin vê e gere todos
create policy "Utilizador vê o próprio perfil"
  on public.utilizadores for select
  using (id = auth.uid());

create policy "Admin gere todos os perfis"
  on public.utilizadores for all
  using (public.is_admin())
  with check (public.is_admin());

-- casos: cliente vê e cria os próprios; admin gere todos
-- Nota: a alteração de status (aceitar/recusar oferta) do cliente é feita
-- via Server Action com a service role, não por UPDATE directo do cliente —
-- por isso não existe policy de UPDATE para 'cliente' aqui.
create policy "Cliente vê os próprios casos"
  on public.casos for select
  using (utilizador_id = auth.uid());

create policy "Cliente cria os próprios casos"
  on public.casos for insert
  with check (utilizador_id = auth.uid());

create policy "Admin gere todos os casos"
  on public.casos for all
  using (public.is_admin())
  with check (public.is_admin());

-- templates: leitura pública (gerador de carta grátis, Fase 4); escrita só admin
create policy "Templates são públicos para leitura"
  on public.templates for select
  using (true);

create policy "Admin gere templates"
  on public.templates for all
  using (public.is_admin())
  with check (public.is_admin());
