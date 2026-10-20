-- DoLado — Programa de Parceiros: aviso de primeiro contacto (art. 14.º RGPD)
--
-- Quando um parceiro indica o contacto de uma pessoa de uma empresa
-- (parceiros_oportunidades.contacto), a DoLado informa essa pessoa, no
-- primeiro contacto, de onde vieram os dados e de como se pode opor
-- (Política de Privacidade 2026-10-20, secções 3 e 8). O backoffice envia o
-- aviso pela Brevo ("Avisar primeiro contacto") e grava aqui a prova: a quem,
-- quando, por quem, versão e texto exacto enviados.
--
-- Só inserção (prova), só o admin lê, ninguém escreve pela API — a escrita é
-- da Server Action (service role) depois de a Brevo aceitar o envio.

create table public.parceiros_oportunidades_avisos (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.parceiros_oportunidades (id) on delete restrict,
  destinatario_email text not null
    check (destinatario_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(destinatario_email) <= 254),
  aviso_versao text not null check (char_length(aviso_versao) between 1 and 40),
  assunto text not null check (char_length(assunto) between 1 and 300),
  texto text not null check (char_length(texto) between 1 and 10000),
  enviado_por uuid references public.utilizadores (id) on delete set null,
  enviado_em timestamptz not null default now()
);

comment on table public.parceiros_oportunidades_avisos is
  'Prova do aviso do art. 14.º RGPD enviado no primeiro contacto a uma pessoa indicada por um parceiro (oportunidades B2B). Só inserção.';

create index parceiros_oportunidades_avisos_idx on public.parceiros_oportunidades_avisos (oportunidade_id, enviado_em);

create trigger parceiros_avisos_so_insercao before update or delete on public.parceiros_oportunidades_avisos
  for each row execute function public.parceiros_historico_so_insercao();

alter table public.parceiros_oportunidades_avisos enable row level security;
revoke all on public.parceiros_oportunidades_avisos from anon, authenticated;
grant select on public.parceiros_oportunidades_avisos to authenticated;
create policy "Admin lê parceiros_oportunidades_avisos" on public.parceiros_oportunidades_avisos
  for select to authenticated using (public.is_admin());
