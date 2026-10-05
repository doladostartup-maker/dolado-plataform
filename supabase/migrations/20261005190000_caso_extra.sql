-- DoLado — Caso Extra para subscritores (decisão de 05/10/2026)
--
-- Um subscritor do Caso + Proteção que já usou o caso incluído no ciclo pode
-- comprar um Caso Extra (11,99 € em vez de 14,99 €). É uma compra única: não
-- muda o plano, a subscrição nem o Customer Stripe; só acrescenta o direito
-- de tratar mais 1 caso.
--
-- Modelo (reaproveita a via das compras únicas, sem estados novos):
--   case_credit_grants  'checkout:<sessão>' com produto = 'caso_extra'
--                       (as compras Avulso passam a ter produto = 'avulso').
--                       Mesmo ciclo de vida do Avulso: disponivel →
--                       consumido (caso_id) | reembolsado. Nunca convertido:
--                       a conversão Avulso → subscrição só considera
--                       pagamentos com plano 'avulso'.
--   user_access.avulso_credits  passa a contar TODAS as compras únicas por
--                       usar (Avulso + Caso Extra). Por isso, sem mudar
--                       nenhuma função de consumo:
--                         * consumo normal: subscrição primeiro, depois a
--                           compra única mais antiga (Avulso ou Caso Extra);
--                         * pedido pago com um Caso Extra: gasta esse Caso
--                           Extra (modo vinculado, como o Avulso);
--                         * fim do Caso + Proteção: o Caso Extra por usar
--                           não congela nem desaparece (congelar só leva
--                           case_credits - avulso_credits).
--   stripe_payments.plano     'caso_extra'
--   consentimentos_compra.tipo_compra  'caso_extra' (plano 'avulso': mesmo
--                       produto jurídico — tratamento de 1 caso, pagamento único)
--   pedidos_caso.plano_escolhido       'caso_extra'
--   casos.origem_credito  origem comercial de cada caso novo:
--                       'subscricao' | 'avulso' | 'caso_extra'.
--
-- Correção do limite de 4 (conceder e restaurar): o limite passa a aplicar-se
-- só aos casos da subscrição (case_credits - avulso_credits). Antes, compras
-- únicas por usar contavam para o limite e podiam impedir o caso mensal (ex.:
-- 3 casos da subscrição + 1 Caso Extra = 4 → a renovação não dava nada). Uma
-- compra paga nunca impede nem substitui o caso mensal.

-- ---------------------------------------------------------------------------
-- 1. Produto de cada compra única
-- ---------------------------------------------------------------------------
alter table public.case_credit_grants
  add column produto text check (produto in ('avulso', 'caso_extra'));

update public.case_credit_grants set produto = 'avulso' where origem like 'checkout:%';

alter table public.case_credit_grants
  add constraint case_credit_grants_produto_compra_check
  check ((origem like 'checkout:%') = (produto is not null));

comment on column public.case_credit_grants.produto is 'Só compras únicas (checkout:%): avulso (preço normal, sem subscrição) ou caso_extra (benefício de subscritor do Caso + Proteção). Null nos casos da subscrição (invoice:%, migracao:%).';
comment on column public.case_credit_grants.estado is 'Só compras únicas (checkout:% — Avulso ou Caso Extra): disponivel (conta em avulso_credits), consumido (caso aberto, ver caso_id), convertido (1.ª mensalidade de uma subscrição — só Avulso) ou reembolsado. Null nos casos da subscrição.';
comment on column public.user_access.avulso_credits is 'Parte de case_credits que vem de compras únicas ainda por usar (Avulso ou Caso Extra; case_credit_grants.estado = disponivel). Não congela no fim do Caso + Proteção nem conta para o limite de 4.';

-- ---------------------------------------------------------------------------
-- 2. Novos valores nos registos de compra
-- ---------------------------------------------------------------------------
alter table public.stripe_payments drop constraint stripe_payments_plano_check;
alter table public.stripe_payments add constraint stripe_payments_plano_check
  check (plano in ('avulso', 'assinatura', 'caso_extra'));

alter table public.consentimentos_compra drop constraint consentimentos_compra_tipo_compra_check;
alter table public.consentimentos_compra add constraint consentimentos_compra_tipo_compra_check
  check (tipo_compra in ('avulso', 'subscricao', 'conversao_avulso', 'caso_extra'));

alter table public.pedidos_caso drop constraint pedidos_caso_plano_escolhido_check;
alter table public.pedidos_caso add constraint pedidos_caso_plano_escolhido_check
  check (plano_escolhido in ('avulso', 'caso_protecao', 'caso_extra'));

-- ---------------------------------------------------------------------------
-- 3. Origem comercial do caso (backoffice)
-- ---------------------------------------------------------------------------
-- Escrita só pelo servidor (o cliente não cria nem altera casos: não há
-- policy de INSERT/UPDATE para o cliente). Casos anteriores sem compra
-- única ligada ficam a null ("sem registo").
alter table public.casos
  add column origem_credito text check (origem_credito in ('subscricao', 'avulso', 'caso_extra'));

comment on column public.casos.origem_credito is 'Caso disponível gasto para abrir este caso: subscricao (caso incluído no Caso + Proteção), avulso ou caso_extra. Null: caso criado pelo admin ou antes de 05/10/2026 sem compra única ligada.';

update public.casos c
   set origem_credito = g.produto
  from public.case_credit_grants g
 where g.caso_id = c.id and g.produto is not null;

-- ---------------------------------------------------------------------------
-- 4. Conceder: produto da compra única e limite só nos casos da subscrição
-- ---------------------------------------------------------------------------
drop function public.conceder_credito_caso(uuid, text, int);
create function public.conceder_credito_caso(
  p_user_id uuid,
  p_origem text,
  p_maximo int default null,
  p_produto text default null
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_compra boolean := p_origem like 'checkout:%';
  v_produto text := case when p_origem like 'checkout:%' then coalesce(p_produto, 'avulso') end;
  v_inserido int;
begin
  if v_compra and v_produto not in ('avulso', 'caso_extra') then
    raise exception 'conceder_credito_caso: produto inválido';
  end if;

  if v_compra and exists (
    select 1 from public.stripe_payments
     where stripe_session_id = substr(p_origem, length('checkout:') + 1)
       and estado = 'reembolsado'
  ) then
    return false; -- reembolsado: nunca dá crédito
  end if;

  insert into public.case_credit_grants (origem, user_id, quantidade, estado, estado_em, produto)
  values (p_origem, p_user_id, 1,
          case when v_compra then 'disponivel' end,
          case when v_compra then now() end,
          v_produto)
  on conflict (origem) do nothing;
  get diagnostics v_inserido = row_count;
  if v_inserido = 0 then
    return false; -- já creditado
  end if;

  if v_compra then
    update public.user_access
       set case_credits = case_credits + 1,
           avulso_credits = avulso_credits + 1,
           updated_at = now()
     where user_id = p_user_id;
  else
    -- Caso da subscrição: o limite conta só os casos da subscrição.
    update public.user_access
       set case_credits = avulso_credits + case
             when p_maximo is null then (case_credits - avulso_credits) + 1
             else greatest(case_credits - avulso_credits,
                           least(case_credits - avulso_credits + 1, p_maximo))
           end,
           updated_at = now()
     where user_id = p_user_id;
  end if;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Restaurar: limite só nos casos da subscrição
-- ---------------------------------------------------------------------------
create or replace function public.restaurar_creditos_caso(
  p_subscription_id text,
  p_em timestamptz,
  p_maximo int
) returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta record;
  v_soma int;
  v_subscricao int;
  v_novo int;
  v_total int := 0;
begin
  for v_conta in
    select user_id, case_credits, avulso_credits from public.user_access
     where stripe_subscription_id = p_subscription_id
       and subscription_plan = 'caso_protecao'
       and subscription_status in ('active', 'trialing', 'past_due')
     for update
  loop
    select coalesce(sum(quantidade), 0) into v_soma from public.case_credit_freezes
     where user_id = v_conta.user_id and restaurado_em is null and expira_em > p_em;

    update public.case_credit_freezes
       set restaurado_em = p_em
     where user_id = v_conta.user_id and restaurado_em is null and expira_em > p_em;
    if not found then
      continue;
    end if;

    v_subscricao := v_conta.case_credits - v_conta.avulso_credits;
    v_novo := greatest(v_subscricao, least(v_subscricao + v_soma, p_maximo));
    update public.user_access
       set case_credits = v_conta.avulso_credits + v_novo, updated_at = now()
     where user_id = v_conta.user_id;
    v_total := v_total + (v_novo - v_subscricao);
  end loop;
  return v_total;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Pedido → caso: regista a origem comercial do caso
-- ---------------------------------------------------------------------------
-- Igual a 20261002090000 (modo vinculado), mais casos.origem_credito.
create or replace function public.converter_pedido_em_caso(p_pedido_id uuid, p_user_id uuid, p_origem_avulso text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pedido public.pedidos_caso%rowtype;
  v_email text;
  v_caso uuid;
  v_consumo text;
  v_origem_credito text;
begin
  select * into v_pedido from public.pedidos_caso where id = p_pedido_id for update;
  if not found or v_pedido.user_id is distinct from p_user_id then
    return null;
  end if;
  if v_pedido.estado = 'convertido' then
    return v_pedido.caso_id;
  end if;
  if v_pedido.estado = 'cancelado' then
    return null;
  end if;

  -- Pedido pago com uma compra única (Avulso ou Caso Extra): gasta essa
  -- compra. Sem origem: regra normal (subscrição primeiro). Se algo abaixo
  -- falhar, tudo é revertido.
  v_consumo := public.consumir_credito_caso(p_user_id, p_origem_avulso);
  if v_consumo is null then
    return null;
  end if;

  if v_consumo = 'subscricao' then
    v_origem_credito := 'subscricao';
  else
    select produto into v_origem_credito from public.case_credit_grants where origem = v_consumo;
  end if;

  select email into v_email from public.utilizadores where id = p_user_id;

  insert into public.casos (
    utilizador_id, nome, email, telefone, sector, empresa, problema_tipo, descricao,
    momento_cliente, origem, autorizacao, consentimento_tratamento_em,
    consentimento_alertas, consentimento_alertas_em, status, origem_credito
  ) values (
    p_user_id, v_pedido.nome, v_email, v_pedido.telefone, v_pedido.sector, v_pedido.empresa,
    v_pedido.problema_tipo, v_pedido.descricao, v_pedido.momento_cliente, v_pedido.origem,
    v_pedido.autorizacao, v_pedido.pedido_confirmado_em,
    v_pedido.consentimento_alertas, v_pedido.consentimento_alertas_em, 'Novo', v_origem_credito
  ) returning id into v_caso;

  if v_consumo like 'checkout:%' then
    update public.case_credit_grants set caso_id = v_caso where origem = v_consumo;
  end if;

  if v_pedido.anexo_caminho is not null then
    insert into public.anexos (caso_id, nome_ficheiro, caminho_storage, tipo_mime, tamanho_bytes)
    values (v_caso, coalesce(v_pedido.anexo_nome, v_pedido.anexo_caminho), v_pedido.anexo_caminho,
            v_pedido.anexo_tipo, v_pedido.anexo_tamanho);
  end if;

  update public.pedidos_caso
     set estado = 'convertido', caso_id = v_caso, convertido_em = now()
   where id = p_pedido_id;

  return v_caso;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Privilégios: só o backend (service_role)
-- ---------------------------------------------------------------------------
revoke execute on function public.conceder_credito_caso(uuid, text, int, text) from public, anon, authenticated;
revoke execute on function public.restaurar_creditos_caso(text, timestamptz, int) from public, anon, authenticated;
revoke execute on function public.converter_pedido_em_caso(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.conceder_credito_caso(uuid, text, int, text) to service_role;
grant execute on function public.restaurar_creditos_caso(text, timestamptz, int) to service_role;
grant execute on function public.converter_pedido_em_caso(uuid, uuid, text) to service_role;
