-- DoLado — Origem de aquisição: retirada do consentimento (08/10/2026).
--
-- Decisão jurídica de 08/10/2026 (docs/legal/decisoes-juridicas-e-ropa-2026-10-08.md):
-- a origem (?ref=) só é guardada com consentimento de estatística e é apagada
-- da conta quando esse consentimento é recusado/retirado.
--
-- Regras:
--   * a origem continua imutável: nunca passa de um valor para outro valor,
--     para ninguém (incluindo service_role e admin);
--   * a única exceção é passar a null, e só pela função
--     origem_aquisicao_retirar() (marca local da transação);
--   * depois de apagada, origem_aquisicao_registar() só volta a gravar uma
--     visita anterior à criação da conta (regra que já existia) — na prática,
--     uma conta já existente não volta a ser atribuída por um ?ref= novo;
--   * nada vem da metadata da Stripe (já não é enviada).

create or replace function public.utilizadores_origem_imutavel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.acquisition_source is not null
     and new.acquisition_source is distinct from old.acquisition_source
     and not (new.acquisition_source is null
              and coalesce(current_setting('dolado.origem_retirada', true), '') = '1') then
    raise exception 'acquisition_source já gravada: não pode ser alterada'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- SECURITY DEFINER: grava a coluna sem policy de update para o cliente;
-- search_path fixo; só a service_role a chama. Idempotente; devolve true se
-- havia uma origem e foi apagada.
create or replace function public.origem_aquisicao_retirar(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if p_user is null then
    return false;
  end if;
  perform set_config('dolado.origem_retirada', '1', true);
  update public.utilizadores
     set acquisition_source = null
   where id = p_user
     and acquisition_source is not null;
  get diagnostics v_n = row_count;
  perform set_config('dolado.origem_retirada', '', true);
  return v_n = 1;
end;
$$;

revoke execute on function public.origem_aquisicao_retirar(uuid) from public, anon, authenticated;
grant execute on function public.origem_aquisicao_retirar(uuid) to service_role;

comment on column public.utilizadores.acquisition_source is
  'Origem de aquisição (?ref=, first-touch), gravada só com consentimento de estatística. Só atribuição: nunca dá acesso, plano, desconto nem casos. Nunca muda para outro valor; só é apagada por origem_aquisicao_retirar() (retirada do consentimento). Não é enviada à Stripe.';
