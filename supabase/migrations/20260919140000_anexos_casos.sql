-- DoLado — Anexos de caso (comprovativos, facturas, etc.)
--
-- Ficheiros carregados pelo admin no backoffice, guardados no Storage e
-- listados na página do caso. Não há upload público — só o admin usa isto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos-casos',
  'anexos-casos',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  nome_ficheiro text not null,
  caminho_storage text not null,
  tipo_mime text,
  tamanho_bytes bigint,
  created_at timestamptz not null default now()
);

comment on table public.anexos is 'Ficheiros anexados a um caso pelo admin no backoffice — guardados no bucket anexos-casos do Supabase Storage.';

create index anexos_caso_id_idx on public.anexos (caso_id);

grant select, insert, update, delete on public.anexos to authenticated, service_role;
grant select on public.anexos to anon;

alter table public.anexos enable row level security;

create policy "Admin gere anexos"
  on public.anexos for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage: só o admin lê/escreve no bucket de anexos.
create policy "Admin gere anexos no storage"
  on storage.objects for all
  using (bucket_id = 'anexos-casos' and public.is_admin())
  with check (bucket_id = 'anexos-casos' and public.is_admin());
