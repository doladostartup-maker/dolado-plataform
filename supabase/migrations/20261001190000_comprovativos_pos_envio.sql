-- DoLado — Pós-envio: comprovativo de submissão e histórico.
--
-- O texto efetivamente enviado JÁ está preservado: casos_textos_envios
-- aponta para a versão (casos_textos, imutável depois de mostrada ao
-- cliente) e guarda o hash do conteúdo enviado. Esta migration não cria
-- snapshot novo — só o comprovativo e eventos.
--
-- Comprovativo de submissão: hoje é obtido à mão pela equipa ao submeter
-- (PDF do Livro de Reclamações, ou só o número da reclamação). Por isso é
-- associado pela equipa, de forma controlada:
--   * casos_comprovativos: um registo por associação, com tipo
--     (ficheiro | identificador | sem_comprovativo | erro_obtencao);
--   * corrigir = novo registo que substitui o anterior (substitui_id /
--     substituido_em) — nada é apagado nem reescrito;
--   * ficheiros no bucket privado comprovativos-casos: o admin só lê; quem
--     grava é o servidor (service role) depois de requireAdmin. Ninguém apaga
--     pela API. O cliente nunca acede ao storage: o servidor confirma a posse
--     pelo RLS e devolve uma URL assinada de curta duração.
--   * o cliente lê os próprios registos, mas não o caminho no storage nem a
--     nota interna (permissões por coluna).
-- O dossiê final (casos.dossie_url) continua independente.

-- ---------------------------------------------------------------------------
-- 1. Bucket privado
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovativos-casos', 'comprovativos-casos', false, 20971520,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Só leitura para o admin (o upload é feito pelo servidor com service role).
create policy "Admin lê comprovativos no storage"
  on storage.objects for select to authenticated
  using (bucket_id = 'comprovativos-casos' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Comprovativos
-- ---------------------------------------------------------------------------
create table public.casos_comprovativos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  envio_id uuid references public.casos_textos_envios (id) on delete set null,
  texto_id uuid references public.casos_textos (id) on delete set null,
  tipo text not null check (tipo in ('ficheiro', 'identificador', 'sem_comprovativo', 'erro_obtencao')),
  nome text check (char_length(nome) <= 200),
  storage_path text,
  tipo_mime text,
  tamanho_bytes bigint,
  ficheiro_sha256 text,
  identificador_externo text check (char_length(identificador_externo) <= 200),
  nota text check (char_length(nota) <= 1000),
  origem text not null default 'equipa' check (origem in ('equipa')),
  criado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  substitui_id uuid references public.casos_comprovativos (id) on delete set null,
  substituido_em timestamptz,
  check (tipo <> 'ficheiro' or (storage_path is not null and nome is not null)),
  check (tipo <> 'identificador' or identificador_externo is not null)
);

comment on table public.casos_comprovativos is 'Comprovativo de submissão da reclamação (ficheiro privado e/ou identificador externo). Correções criam um registo novo; o anterior fica marcado como substituído.';
comment on column public.casos_comprovativos.envio_id is 'Envio (casos_textos_envios) a que o comprovativo pertence. Null em casos antigos, enviados antes do fluxo de texto — sem inventar a relação.';

create index casos_comprovativos_caso_idx on public.casos_comprovativos (caso_id);
-- Um comprovativo em vigor por envio (ou por caso, nos casos antigos).
create unique index casos_comprovativos_ativo_idx on public.casos_comprovativos
  (caso_id, coalesce(envio_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where substituido_em is null;

-- Só substituido_em pode ser preenchido (uma vez); referências apagadas
-- podem passar a null. Nada mais muda.
create or replace function public.casos_comprovativos_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  k text;
  n jsonb := to_jsonb(new);
  o jsonb := to_jsonb(old);
begin
  for k in select jsonb_object_keys(n) loop
    if n->k is distinct from o->k
       and not (k = 'substituido_em' and o->k = 'null'::jsonb)
       and not (k = any (array['envio_id', 'texto_id', 'criado_por', 'substitui_id']) and n->k = 'null'::jsonb) then
      raise exception 'casos_comprovativos: registo só de inserção (corrija com um novo registo)' using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

create trigger casos_comprovativos_integridade before update on public.casos_comprovativos
  for each row execute function public.casos_comprovativos_integridade();

-- ---------------------------------------------------------------------------
-- 3. Eventos novos no histórico
-- ---------------------------------------------------------------------------
alter table public.casos_eventos drop constraint casos_eventos_tipo_check;
alter table public.casos_eventos add constraint casos_eventos_tipo_check check (tipo in (
  'texto_preparado', 'nova_versao', 'texto_enviado_revisao', 'links_reemitidos',
  'alteracoes_pedidas', 'texto_autorizado', 'comunicacao_enviada',
  'comprovativo_disponivel', 'dossie_disponivel'));

-- Dossiê final disponível: quando dossie_url passa a estar preenchido. A
-- equipa grava o caso com a própria sessão (sem permissão de escrita em
-- casos_eventos), por isso a função corre como dona da tabela —
-- SECURITY DEFINER justificado, search_path fixo, só insere este evento.
create or replace function public.casos_evento_dossie()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(btrim(new.dossie_url), '') <> ''
     and (tg_op = 'INSERT' or coalesce(btrim(old.dossie_url), '') = '') then
    insert into public.casos_eventos (caso_id, tipo, ator) values (new.id, 'dossie_disponivel', 'equipa');
  end if;
  return new;
end $$;

revoke execute on function public.casos_evento_dossie() from public, anon, authenticated;

create trigger casos_evento_dossie after insert or update of dossie_url on public.casos
  for each row execute function public.casos_evento_dossie();

-- ---------------------------------------------------------------------------
-- 4. Registo do comprovativo (só o backend, depois de requireAdmin)
-- ---------------------------------------------------------------------------
create or replace function public.comprovativo_registar(
  p_caso_id uuid,
  p_envio_id uuid,
  p_tipo text,
  p_nome text,
  p_storage_path text,
  p_tipo_mime text,
  p_tamanho_bytes bigint,
  p_ficheiro_sha256 text,
  p_identificador_externo text,
  p_nota text,
  p_admin uuid
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  e public.casos_textos_envios;
  anterior uuid;
  novo uuid;
begin
  perform 1 from public.casos where id = p_caso_id for update;
  if not found then
    raise exception 'caso inexistente' using errcode = 'P0002';
  end if;
  if p_envio_id is not null then
    select * into e from public.casos_textos_envios where id = p_envio_id;
    if e.id is null or e.caso_id <> p_caso_id then
      raise exception 'envio não pertence ao caso' using errcode = '42501';
    end if;
  end if;

  select id into anterior from public.casos_comprovativos
   where caso_id = p_caso_id and envio_id is not distinct from p_envio_id and substituido_em is null;
  if anterior is not null then
    update public.casos_comprovativos set substituido_em = now() where id = anterior;
  end if;

  insert into public.casos_comprovativos (caso_id, envio_id, texto_id, tipo, nome, storage_path, tipo_mime, tamanho_bytes,
    ficheiro_sha256, identificador_externo, nota, criado_por, substitui_id)
  values (p_caso_id, p_envio_id, e.texto_id, p_tipo, nullif(btrim(coalesce(p_nome, '')), ''), p_storage_path, p_tipo_mime, p_tamanho_bytes,
    p_ficheiro_sha256, nullif(btrim(coalesce(p_identificador_externo, '')), ''), nullif(btrim(coalesce(p_nota, '')), ''), p_admin, anterior)
  returning id into novo;

  -- Evento só quando passa a haver comprovativo para o cliente consultar
  -- (uma correção de um comprovativo já disponível não repete o evento).
  if p_tipo in ('ficheiro', 'identificador') and not exists (
    select 1 from public.casos_comprovativos
     where id = anterior and tipo in ('ficheiro', 'identificador')
  ) then
    insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator)
    values (p_caso_id, 'comprovativo_disponivel', e.texto_id,
            (select versao from public.casos_textos where id = e.texto_id), 'equipa');
  end if;
  return novo;
end $$;

revoke execute on function public.comprovativo_registar(uuid, uuid, text, text, text, text, bigint, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.comprovativo_registar(uuid, uuid, text, text, text, text, bigint, text, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS e permissões por coluna
-- ---------------------------------------------------------------------------
alter table public.casos_comprovativos enable row level security;

create policy "Cliente vê os comprovativos dos próprios casos" on public.casos_comprovativos
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê comprovativos" on public.casos_comprovativos
  for select to authenticated using (public.is_admin());

revoke all on public.casos_comprovativos from anon, authenticated;
-- Sem storage_path, ficheiro_sha256, nota nem criado_por para a API: o
-- caminho no storage e a nota interna ficam só no servidor.
grant select (id, caso_id, envio_id, texto_id, tipo, nome, tipo_mime, tamanho_bytes,
  identificador_externo, origem, created_at, substitui_id, substituido_em)
  on public.casos_comprovativos to authenticated;
