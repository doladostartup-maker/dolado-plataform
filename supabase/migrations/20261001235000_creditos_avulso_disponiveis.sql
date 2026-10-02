-- DoLado — Casos disponíveis Avulso separados dos da subscrição
--
-- Problema corrigido: congelar_creditos_caso() protegia do congelamento um
-- caso por cada compra Avulso de sempre (count de case_credit_grants
-- 'checkout:%'), incluindo Avulsos já usados. Um cliente que tivesse usado
-- um Avulso e depois acumulado casos no Caso + Proteção ficava, no fim da
-- subscrição, com casos da subscrição utilizáveis sem subscrição e sem
-- prazo.
--
-- Modelo novo (decisão de 01/10/2026):
--   user_access.case_credits   total de casos utilizáveis (inalterado)
--   user_access.avulso_credits parte desse total que vem de Avulsos ainda
--                              por usar; 0 <= avulso_credits <= case_credits
--   case_credit_grants.estado  por compra Avulso ('checkout:%'):
--                              disponivel | consumido | convertido | reembolsado
--                              (null nas origens da subscrição)
--
-- Regras:
--   * Gastar um caso consome primeiro um caso da subscrição; só sem casos
--     da subscrição gasta um Avulso (o mais antigo). consumir_credito_caso()
--     é a única função que gasta casos e devolve o que gastou, para
--     devolver_credito_caso() repor exatamente o mesmo tipo.
--   * O fim do Caso + Proteção congela case_credits - avulso_credits — o
--     histórico de compras deixa de entrar na conta.
--   * Um Avulso convertido numa subscrição ou reembolsado sai do saldo
--     (retirar_credito_avulso); um Avulso já usado não volta a dar nada.
--   * Um pagamento Avulso reembolsado nunca mais dá crédito.
--
-- A regra do limite de 4 (conceder/restaurar) não muda.

-- ---------------------------------------------------------------------------
-- 1. Colunas
-- ---------------------------------------------------------------------------
alter table public.user_access
  add column avulso_credits int not null default 0;

comment on column public.user_access.avulso_credits is 'Parte de case_credits que vem de compras Avulso ainda por usar (case_credit_grants.estado = disponivel). Não congela no fim do Caso + Proteção.';

alter table public.case_credit_grants
  add column estado text check (estado in ('disponivel', 'consumido', 'convertido', 'reembolsado')),
  add column estado_em timestamptz;

comment on column public.case_credit_grants.estado is 'Só compras Avulso (checkout:%): disponivel (conta em avulso_credits), consumido (caso aberto), convertido (1.ª mensalidade de uma subscrição) ou reembolsado. Null nas origens da subscrição.';

-- ---------------------------------------------------------------------------
-- 2. Backfill conservador
-- ---------------------------------------------------------------------------
-- Até aqui, gastar um caso era só case_credits - 1, sem registo do tipo.
-- Só se atribui um estado quando os dados o provam:
--   a) consumido: há um pedido convertido pago por ESTE checkout Avulso
--      (pedidos_caso.checkout_session_id = sessão da compra);
--   b) conta sem casos disponíveis (case_credits = 0): todos os Avulsos
--      restantes foram usados;
--   c) conta que só teve Avulsos (sem outras origens, sem congelamentos,
--      sem conversões nem reembolsos) e case_credits = Avulsos por atribuir:
--      todos estão por usar.
-- Qualquer outra conta com Avulsos por atribuir é ambígua: a migration
-- aborta e lista-as, para serem resolvidas à mão antes de voltar a correr.
-- (Em 01/10/2026 a produção não tinha nenhuma compra Avulso.)
update public.case_credit_grants g
   set estado = 'consumido', estado_em = p.convertido_em
  from public.pedidos_caso p
 where g.origem = 'checkout:' || p.checkout_session_id
   and p.estado = 'convertido'
   and p.user_id = g.user_id;

do $$
declare
  v record;
  v_ambiguas text[] := '{}';
begin
  for v in
    select a.user_id, a.case_credits,
           (select count(*) from public.case_credit_grants g
             where g.user_id = a.user_id and g.origem like 'checkout:%' and g.estado is null) as por_atribuir,
           (select count(*) from public.case_credit_grants g
             where g.user_id = a.user_id and g.origem not like 'checkout:%') as outras_origens,
           exists (select 1 from public.case_credit_freezes f where f.user_id = a.user_id) as teve_congelamento,
           exists (
             select 1 from public.case_credit_grants g
               join public.stripe_payments sp on 'checkout:' || sp.stripe_session_id = g.origem
               left join public.conversoes_avulso c on c.stripe_payment_id = sp.id and c.estado = 'convertido'
              where g.user_id = a.user_id and g.estado is null
                and (sp.estado = 'reembolsado' or c.id is not null)
           ) as convertido_ou_reembolsado
      from public.user_access a
  loop
    continue when v.por_atribuir = 0;

    if v.case_credits = 0 then
      update public.case_credit_grants
         set estado = 'consumido', estado_em = now()
       where user_id = v.user_id and origem like 'checkout:%' and estado is null;
    elsif v.outras_origens = 0 and not v.teve_congelamento and not v.convertido_ou_reembolsado
          and v.case_credits = v.por_atribuir then
      update public.case_credit_grants
         set estado = 'disponivel', estado_em = now()
       where user_id = v.user_id and origem like 'checkout:%' and estado is null;
    else
      v_ambiguas := v_ambiguas || v.user_id::text;
    end if;
  end loop;

  if cardinality(v_ambiguas) > 0 then
    raise exception 'Backfill de avulso_credits: contas ambíguas (resolver à mão antes de aplicar): %',
      array_to_string(v_ambiguas, ', ');
  end if;

  -- Compras Avulso sem conta em user_access (não deviam existir): disponível
  -- não, porque não há saldo onde contar — ficam como consumidas.
  update public.case_credit_grants
     set estado = 'consumido', estado_em = now()
   where origem like 'checkout:%' and estado is null;
end $$;

update public.user_access a
   set avulso_credits = (
     select count(*) from public.case_credit_grants g
      where g.user_id = a.user_id and g.estado = 'disponivel'
   );

alter table public.user_access
  add constraint user_access_avulso_credits_check
  check (avulso_credits >= 0 and avulso_credits <= case_credits);

alter table public.case_credit_grants
  add constraint case_credit_grants_estado_avulso_check
  check ((origem like 'checkout:%') = (estado is not null));

create index case_credit_grants_avulso_disponivel_idx
  on public.case_credit_grants (user_id, concedido_em)
  where estado = 'disponivel';

-- ---------------------------------------------------------------------------
-- 3. Pagamento reembolsado é final
-- ---------------------------------------------------------------------------
-- Um upsert posterior do mesmo checkout (webhook reenviado, /criar-conta)
-- nunca volta a pôr um pagamento reembolsado como "concluido" — senão
-- voltava a ser elegível para crédito ou conversão.
create or replace function public.stripe_payments_reembolsado_final()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado = 'reembolsado' then
    new.estado := 'reembolsado';
  end if;
  return new;
end $$;

create trigger stripe_payments_reembolsado_final
  before update of estado on public.stripe_payments
  for each row execute function public.stripe_payments_reembolsado_final();

revoke execute on function public.stripe_payments_reembolsado_final() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Conceder
-- ---------------------------------------------------------------------------
-- Avulso (checkout:%): +1 em case_credits e em avulso_credits, sem limite;
-- recusado se o pagamento já foi reembolsado. Subscrição: regra anterior.
create or replace function public.conceder_credito_caso(
  p_user_id uuid,
  p_origem text,
  p_maximo int default null
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_avulso boolean := p_origem like 'checkout:%';
  v_inserido int;
begin
  if v_avulso and exists (
    select 1 from public.stripe_payments
     where stripe_session_id = substr(p_origem, length('checkout:') + 1)
       and estado = 'reembolsado'
  ) then
    return false; -- reembolsado: nunca dá crédito
  end if;

  insert into public.case_credit_grants (origem, user_id, quantidade, estado, estado_em)
  values (p_origem, p_user_id, 1,
          case when v_avulso then 'disponivel' end,
          case when v_avulso then now() end)
  on conflict (origem) do nothing;
  get diagnostics v_inserido = row_count;
  if v_inserido = 0 then
    return false; -- já creditado
  end if;

  if v_avulso then
    update public.user_access
       set case_credits = case_credits + 1,
           avulso_credits = avulso_credits + 1,
           updated_at = now()
     where user_id = p_user_id;
  else
    update public.user_access
       set case_credits = case
             when p_maximo is null then case_credits + 1
             else greatest(case_credits, least(case_credits + 1, p_maximo))
           end,
           updated_at = now()
     where user_id = p_user_id;
  end if;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Consumir (única função que gasta casos) e devolver
-- ---------------------------------------------------------------------------
-- Devolve null se não houver casos disponíveis; 'subscricao' se gastou um
-- caso da subscrição; ou a origem ('checkout:<sessão>') do Avulso gasto.
-- Atómica: a linha da conta fica bloqueada até ao fim da transação.
drop function public.consumir_credito_caso(uuid);
create function public.consumir_credito_caso(p_user_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total int;
  v_avulso int;
  v_origem text;
begin
  select case_credits, avulso_credits into v_total, v_avulso
    from public.user_access
   where user_id = p_user_id
   for update;
  if not found or v_total <= 0 then
    return null;
  end if;

  if v_total - v_avulso > 0 then
    update public.user_access
       set case_credits = case_credits - 1, updated_at = now()
     where user_id = p_user_id;
    return 'subscricao';
  end if;

  select origem into v_origem
    from public.case_credit_grants
   where user_id = p_user_id and estado = 'disponivel'
   order by concedido_em, origem
   limit 1
   for update;
  if v_origem is null then
    raise exception 'avulso_credits sem compra Avulso disponível';
  end if;

  update public.case_credit_grants
     set estado = 'consumido', estado_em = now()
   where origem = v_origem;
  update public.user_access
     set case_credits = case_credits - 1,
         avulso_credits = avulso_credits - 1,
         updated_at = now()
   where user_id = p_user_id;
  return v_origem;
end $$;

-- Repõe exatamente o que consumir_credito_caso gastou (o valor que devolveu),
-- quando a criação do caso falha depois de o consumir.
drop function public.devolver_credito_caso(uuid);
create function public.devolver_credito_caso(p_user_id uuid, p_consumo text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_consumo = 'subscricao' then
    update public.user_access
       set case_credits = case_credits + 1, updated_at = now()
     where user_id = p_user_id;
  elsif p_consumo like 'checkout:%' then
    perform 1 from public.user_access where user_id = p_user_id for update;
    update public.case_credit_grants
       set estado = 'disponivel', estado_em = now()
     where origem = p_consumo and user_id = p_user_id and estado = 'consumido';
    if found then
      update public.user_access
         set case_credits = case_credits + 1,
             avulso_credits = avulso_credits + 1,
             updated_at = now()
       where user_id = p_user_id;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Retirar um Avulso disponível (conversão ou reembolso)
-- ---------------------------------------------------------------------------
-- Devolve 'retirado' se o Avulso estava disponível e saiu do saldo; o estado
-- atual ('consumido', 'convertido', 'reembolsado') se já não estava — sem
-- mexer em nada, nunca abaixo de zero; 'sem_credito' se a compra nunca deu
-- crédito. Idempotente.
create or replace function public.retirar_credito_avulso(p_origem text, p_motivo text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid;
  v_estado text;
begin
  if p_motivo not in ('convertido', 'reembolsado') or p_origem not like 'checkout:%' then
    raise exception 'retirar_credito_avulso: argumentos inválidos';
  end if;

  select user_id into v_user from public.case_credit_grants where origem = p_origem;
  if not found then
    return 'sem_credito';
  end if;
  -- Mesma ordem de bloqueio que consumir_credito_caso: conta, depois compra.
  perform 1 from public.user_access where user_id = v_user for update;
  select estado into v_estado from public.case_credit_grants where origem = p_origem for update;
  if v_estado <> 'disponivel' then
    return v_estado;
  end if;

  update public.case_credit_grants
     set estado = p_motivo, estado_em = now()
   where origem = p_origem;
  update public.user_access
     set case_credits = case_credits - 1,
         avulso_credits = avulso_credits - 1,
         updated_at = now()
   where user_id = v_user;
  return 'retirado';
end $$;

-- ---------------------------------------------------------------------------
-- 7. Congelar: só os casos da subscrição
-- ---------------------------------------------------------------------------
create or replace function public.congelar_creditos_caso(
  p_subscription_id text,
  p_em timestamptz,
  p_dias int default 90
) returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_conta record;
  v_quantidade int;
  v_total int := 0;
begin
  for v_conta in
    select user_id, case_credits, avulso_credits from public.user_access
     where stripe_subscription_id = p_subscription_id
     for update
  loop
    if exists (
      select 1 from public.case_credit_freezes
       where stripe_subscription_id = p_subscription_id
         and user_id = v_conta.user_id
         and restaurado_em is null
    ) then
      continue; -- já congelado
    end if;

    -- Os Avulsos ainda por usar ficam; tudo o resto é da subscrição.
    v_quantidade := v_conta.case_credits - v_conta.avulso_credits;

    -- Grava mesmo com 0: marca o fim desta subscrição como tratado.
    insert into public.case_credit_freezes (user_id, stripe_subscription_id, quantidade, congelado_em, expira_em)
    values (v_conta.user_id, p_subscription_id, v_quantidade, p_em, p_em + make_interval(days => p_dias));

    update public.user_access
       set case_credits = case_credits - v_quantidade, updated_at = now()
     where user_id = v_conta.user_id;
    v_total := v_total + v_quantidade;
  end loop;
  return v_total;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Pedido → caso: gasta pelo consumir_credito_caso
-- ---------------------------------------------------------------------------
create or replace function public.converter_pedido_em_caso(p_pedido_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pedido public.pedidos_caso%rowtype;
  v_email text;
  v_caso uuid;
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

  -- Mesma regra de consumo que o portal (subscrição primeiro). Se algo
  -- abaixo falhar, a transação inteira é revertida, incluindo o consumo.
  if public.consumir_credito_caso(p_user_id) is null then
    return null;
  end if;

  select email into v_email from public.utilizadores where id = p_user_id;

  insert into public.casos (
    utilizador_id, nome, email, telefone, sector, empresa, problema_tipo, descricao,
    momento_cliente, origem, autorizacao, consentimento_tratamento_em,
    consentimento_alertas, consentimento_alertas_em, status
  ) values (
    p_user_id, v_pedido.nome, v_email, v_pedido.telefone, v_pedido.sector, v_pedido.empresa,
    v_pedido.problema_tipo, v_pedido.descricao, v_pedido.momento_cliente, v_pedido.origem,
    v_pedido.autorizacao, v_pedido.pedido_confirmado_em,
    v_pedido.consentimento_alertas, v_pedido.consentimento_alertas_em, 'Novo'
  ) returning id into v_caso;

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
-- 9. Privilégios: só o backend (service_role)
-- ---------------------------------------------------------------------------
revoke execute on function public.consumir_credito_caso(uuid) from public, anon, authenticated;
revoke execute on function public.devolver_credito_caso(uuid, text) from public, anon, authenticated;
revoke execute on function public.retirar_credito_avulso(text, text) from public, anon, authenticated;
grant execute on function public.consumir_credito_caso(uuid) to service_role;
grant execute on function public.devolver_credito_caso(uuid, text) to service_role;
grant execute on function public.retirar_credito_avulso(text, text) to service_role;
