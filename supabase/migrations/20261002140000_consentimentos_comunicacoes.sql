-- DoLado — Autorização para e-mails com novidades e ofertas (02/10/2026)
--
-- A caixa opcional do formulário "Tratar o meu caso" deixa de prometer
-- alertas (que são da Proteção e nunca eram enviados a partir dela) e passa
-- a pedir, com finalidade clara, autorização para e-mails da DoLado com
-- novidades e ofertas. Texto e versão em src/lib/legal.ts
-- (CONSENTIMENTO_COMUNICACOES_*), gravados pelo servidor — nunca pelo browser.
--
-- A autorização é da conta, não do pedido: os pedidos não pagos são
-- apagados aos 30 dias e o pedido é preenchido antes de haver conta. Quando
-- um pedido com a caixa marcada fica ligado a uma conta (criado com sessão
-- ou reclamado depois do registo), o trigger regista a autorização em
-- consentimentos_comunicacoes, com o texto e a versão aceites.
--
-- Prova: versão, texto, data e origem são imutáveis; a retirada só se
-- regista uma vez (retirado_em). No máximo uma autorização ativa por conta;
-- depois de retirada, só uma nova marcação explícita cria outra.
--
-- Os pedidos/casos anteriores com consentimento_alertas = true aceitaram o
-- texto antigo ("alertas de fim de fidelização e de mudanças no setor") e
-- NÃO valem como autorização para e-mails comerciais — não são migrados.

-- ---------------------------------------------------------------------------
-- 1. Pedido: versão e texto aceites (preenchidos pelo servidor)
-- ---------------------------------------------------------------------------
alter table public.pedidos_caso
  add column consentimento_comunicacoes_versao text,
  add column consentimento_comunicacoes_texto text,
  add constraint pedidos_caso_consentimento_comunicacoes_check
    check ((consentimento_comunicacoes_versao is null) = (consentimento_comunicacoes_texto is null));

comment on column public.pedidos_caso.consentimento_alertas is 'Caixa opcional do formulário. Desde 02/10/2026: autorização para e-mails com novidades e ofertas (versão/texto nas colunas consentimento_comunicacoes_*). Antes: texto antigo de alertas, sem valor para e-mails comerciais.';

-- ---------------------------------------------------------------------------
-- 2. Autorizações da conta
-- ---------------------------------------------------------------------------
create table public.consentimentos_comunicacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  versao text not null,
  texto text not null,
  origem text not null check (origem in ('tratar_caso')),
  pedido_id uuid references public.pedidos_caso (id) on delete set null,
  aceite_em timestamptz not null,
  retirado_em timestamptz,
  retirado_origem text check (retirado_origem in ('portal', 'pedido_titular', 'link_email')),
  created_at timestamptz not null default now(),
  check ((retirado_em is null) = (retirado_origem is null))
);

comment on table public.consentimentos_comunicacoes is 'Autorizações para e-mails da DoLado com novidades e ofertas (prova: versão, texto e data). Só contas com uma linha sem retirado_em podem receber estes e-mails; cada e-mail tem de permitir retirar a autorização.';

create unique index consentimentos_comunicacoes_ativo_idx
  on public.consentimentos_comunicacoes (user_id)
  where retirado_em is null;

-- Campos de prova imutáveis; a retirada só se regista uma vez.
create or replace function public.consentimentos_comunicacoes_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.versao is distinct from old.versao
     or new.texto is distinct from old.texto
     or new.origem is distinct from old.origem
     or new.aceite_em is distinct from old.aceite_em
     or new.created_at is distinct from old.created_at then
    raise exception 'consentimentos_comunicacoes: campos de prova imutáveis';
  end if;
  if old.retirado_em is not null and (new.retirado_em is distinct from old.retirado_em
                                      or new.retirado_origem is distinct from old.retirado_origem) then
    raise exception 'consentimentos_comunicacoes: a retirada já está registada';
  end if;
  return new;
end $$;

create trigger consentimentos_comunicacoes_imutavel
  before update on public.consentimentos_comunicacoes
  for each row execute function public.consentimentos_comunicacoes_imutavel();

alter table public.consentimentos_comunicacoes enable row level security;

create policy "Cliente vê as próprias autorizações de comunicações" on public.consentimentos_comunicacoes
  for select to authenticated using (user_id = auth.uid());

create policy "Admin lê autorizações de comunicações" on public.consentimentos_comunicacoes
  for select to authenticated using (public.is_admin());

-- Só o backend (service_role) escreve: registo pelo trigger, retirada pela
-- Server Action do portal depois de validar a sessão.
revoke all on public.consentimentos_comunicacoes from anon, authenticated;
grant select on public.consentimentos_comunicacoes to authenticated;
grant all on public.consentimentos_comunicacoes to service_role;

revoke execute on function public.consentimentos_comunicacoes_imutavel() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Pedido com a caixa marcada e ligado a uma conta → autorização da conta
-- ---------------------------------------------------------------------------
create or replace function public.registar_consentimento_comunicacoes_do_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is not null
     and new.consentimento_alertas
     and new.consentimento_comunicacoes_versao is not null then
    insert into public.consentimentos_comunicacoes (user_id, versao, texto, origem, pedido_id, aceite_em)
    values (new.user_id, new.consentimento_comunicacoes_versao, new.consentimento_comunicacoes_texto,
            'tratar_caso', new.id, coalesce(new.consentimento_alertas_em, now()))
    on conflict (user_id) where retirado_em is null do nothing; -- já tem uma ativa
  end if;
  return new;
end $$;

create trigger pedidos_caso_consentimento_comunicacoes
  after insert or update of user_id, consentimento_alertas, consentimento_comunicacoes_versao
  on public.pedidos_caso
  for each row execute function public.registar_consentimento_comunicacoes_do_pedido();

revoke execute on function public.registar_consentimento_comunicacoes_do_pedido() from public, anon, authenticated;
