-- DoLado — Aviso Sectorial (Fase 4)
--
-- O admin publica um aviso para um setor (Telecomunicações, Energia ou
-- Água) e todos os clientes que subscreveram esse setor recebem um e-mail
-- automático. `setor` usa os mesmos três valores em português já usados em
-- `casos.sector` e no formulário guiado — não o enum inglês
-- telecom/energy/water do rascunho original, para não introduzir uma
-- segunda taxonomia de setor no mesmo projecto.

create table public.preferencias_setor (
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  setor text not null check (setor in ('Telecomunicações', 'Energia', 'Água')),
  criado_em timestamptz not null default now(),
  primary key (utilizador_id, setor)
);

comment on table public.preferencias_setor is 'Setores que cada cliente autorizou receber avisos — consultada pelos avisos_setoriais do admin.';

create index preferencias_setor_utilizador_id_idx on public.preferencias_setor (utilizador_id);
create index preferencias_setor_setor_idx on public.preferencias_setor (setor);

create table public.avisos_setoriais (
  id uuid primary key default gen_random_uuid(),
  setor text not null check (setor in ('Telecomunicações', 'Energia', 'Água')),
  titulo text not null,
  descricao text not null,
  criado_por_admin_id uuid not null references auth.users (id),
  enviado_em timestamptz not null default now(),
  destinatarios_count integer not null default 0
);

comment on table public.avisos_setoriais is 'Avisos sectoriais enviados pelo admin a todos os clientes que subscreveram o setor.';

create index avisos_setoriais_setor_idx on public.avisos_setoriais (setor);

alter table public.preferencias_setor enable row level security;
alter table public.avisos_setoriais enable row level security;

-- preferencias_setor: cliente gere as próprias (guarda como delete+insert,
-- nunca update — ver acções); admin lê todas, para poder enviar avisos.
create policy "Cliente vê as próprias preferências de setor"
  on public.preferencias_setor for select
  using (utilizador_id = auth.uid());

create policy "Cliente cria as próprias preferências de setor"
  on public.preferencias_setor for insert
  with check (utilizador_id = auth.uid());

create policy "Cliente apaga as próprias preferências de setor"
  on public.preferencias_setor for delete
  using (utilizador_id = auth.uid());

create policy "Admin vê todas as preferências de setor"
  on public.preferencias_setor for select
  using (public.is_admin());

-- avisos_setoriais: só o admin lê e escreve.
create policy "Admin gere avisos sectoriais"
  on public.avisos_setoriais for all
  using (public.is_admin())
  with check (public.is_admin());
