-- DoLado — Origem de aquisição (?ref=…), 08/10/2026.
--
-- Só atribuição: de onde veio a conta (ex.: 'contabilista_marta'). Nunca dá
-- plano, desconto, casos disponíveis nem permissões, e é independente dos
-- vouchers do Stripe. Fonte de verdade única: utilizadores.acquisition_source
-- (casos, pagamentos e subscrições obtêm-na pelo dono). Nullable: contas
-- existentes e contas sem origem ficam a null.
--
-- Regras:
--   * formato fechado (letras minúsculas, números, "_" e "-"; pelo menos uma
--     letra; até 64 caracteres) — igual a normalizarOrigem() em
--     src/lib/origemAquisicao.ts;
--   * first-touch: gravada uma vez, nunca substituída (trigger, para todos,
--     incluindo service_role e admin);
--   * só pela função origem_aquisicao_registar() (service_role), e só para
--     contas criadas depois da primeira visita, nos últimos 30 dias — uma
--     conta antiga que visite um link nunca fica atribuída;
--   * o cliente não escreve em utilizadores (sem policy de update).

alter table public.utilizadores
  add column if not exists acquisition_source text;

alter table public.utilizadores
  add constraint utilizadores_acquisition_source_formato check (
    acquisition_source is null
    or (acquisition_source ~ '^[a-z0-9][a-z0-9_-]{1,63}$' and acquisition_source ~ '[a-z]')
  );

comment on column public.utilizadores.acquisition_source is
  'Origem de aquisição (?ref=, first-touch). Só atribuição: nunca dá acesso, plano, desconto nem casos. Imutável depois de gravada.';

create index if not exists utilizadores_acquisition_source_idx
  on public.utilizadores (acquisition_source)
  where acquisition_source is not null;

-- ---------------------------------------------------------------------------
-- Imutável depois de gravada
-- ---------------------------------------------------------------------------
create or replace function public.utilizadores_origem_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.acquisition_source is not null
     and new.acquisition_source is distinct from old.acquisition_source then
    raise exception 'acquisition_source já gravada: não pode ser alterada'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger utilizadores_origem_imutavel
  before update of acquisition_source on public.utilizadores
  for each row execute function public.utilizadores_origem_imutavel();

revoke execute on function public.utilizadores_origem_imutavel() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Registo (só servidor)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: corre como dono para gravar a coluna sem policy de update
-- para o cliente; search_path fixo; só a service_role a pode chamar.
-- Devolve true se gravou, false em todos os outros casos (sem erro).
create or replace function public.origem_aquisicao_registar(
  p_user uuid,
  p_origem text,
  p_primeira_visita timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if p_user is null or p_origem is null or p_primeira_visita is null then
    return false;
  end if;
  if not (p_origem ~ '^[a-z0-9][a-z0-9_-]{1,63}$' and p_origem ~ '[a-z]') then
    return false;
  end if;
  -- Visita nos últimos 30 dias e nunca no futuro (5 min de folga de relógio).
  if p_primeira_visita < now() - interval '30 days'
     or p_primeira_visita > now() + interval '5 minutes' then
    return false;
  end if;

  update public.utilizadores
     set acquisition_source = p_origem
   where id = p_user
     and acquisition_source is null
     and role = 'cliente'
     -- A visita aconteceu antes de a conta existir (5 min de folga).
     and created_at >= p_primeira_visita - interval '5 minutes';
  get diagnostics v_n = row_count;
  return v_n = 1;
end;
$$;

revoke execute on function public.origem_aquisicao_registar(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.origem_aquisicao_registar(uuid, text, timestamptz) to service_role;
