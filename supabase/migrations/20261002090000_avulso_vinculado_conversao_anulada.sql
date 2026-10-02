-- DoLado — Avulso vinculado ao pedido e conversão anulada (decisão de 02/10/2026)
--
-- Complementa 20261001235000_creditos_avulso_disponiveis.sql:
--
-- 1) Avulso vinculado: um pedido pago com um Avulso consome o caso DESSA
--    compra (checkout:<sessão>), mesmo que a conta tenha casos da
--    subscrição. consumir_credito_caso(user, origem) passa a ter dois modos:
--      normal   (origem null)  → subscrição primeiro, depois o Avulso mais antigo;
--      vinculado (origem dada) → só aquele Avulso, se estiver disponível.
--    converter_pedido_em_caso(pedido, user, origem) passa a origem ao
--    consumo. O caso aberto com um Avulso fica registado na compra
--    (case_credit_grants.caso_id), para auditoria.
--
-- 2) Conversão anulada: se o caso do Avulso foi usado entre abrir o
--    Checkout de conversão e o pagamento ser confirmado, o webhook anula a
--    conversão (estado 'anulada', com motivo), não aplica a subscrição nem
--    dá casos ou reembolso, e cancela a subscrição no Stripe (1.ª fatura a
--    0 € pelo cupão — nada a devolver). O cliente pode aderir depois como
--    compra normal.

-- ---------------------------------------------------------------------------
-- 1. Colunas
-- ---------------------------------------------------------------------------
alter table public.case_credit_grants
  add column caso_id uuid references public.casos (id) on delete set null;

comment on column public.case_credit_grants.caso_id is 'Compra Avulso consumida: caso aberto com ela (quando conhecido).';

alter table public.conversoes_avulso drop constraint conversoes_avulso_estado_check;
alter table public.conversoes_avulso add constraint conversoes_avulso_estado_check
  check (estado in ('checkout_aberto', 'convertido', 'anulada'));

alter table public.conversoes_avulso
  add column anulada_em timestamptz,
  add column anulada_motivo text,
  add constraint conversoes_avulso_anulada_check
    check ((estado = 'anulada') = (anulada_em is not null));

comment on column public.conversoes_avulso.anulada_motivo is 'Porque é que a conversão não se realizou (ex.: caso do Avulso já utilizado quando o pagamento foi confirmado). A subscrição desse checkout é cancelada no Stripe; não há reembolso nem casos.';

-- ---------------------------------------------------------------------------
-- 2. Consumir: modo normal e modo vinculado
-- ---------------------------------------------------------------------------
-- Devolve null se não gastou nada; 'subscricao'; ou a origem do Avulso gasto.
drop function public.consumir_credito_caso(uuid);
create function public.consumir_credito_caso(p_user_id uuid, p_origem_avulso text default null)
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

  if p_origem_avulso is not null then
    -- Vinculado: só aquele Avulso, da própria conta e ainda disponível.
    select origem into v_origem
      from public.case_credit_grants
     where origem = p_origem_avulso and user_id = p_user_id and estado = 'disponivel'
     for update;
    if v_origem is null then
      return null;
    end if;
  else
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

-- Devolver: o Avulso volta disponível e perde a ligação ao caso.
create or replace function public.devolver_credito_caso(p_user_id uuid, p_consumo text)
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
       set estado = 'disponivel', estado_em = now(), caso_id = null
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
-- 3. Pedido → caso com o Avulso da própria compra
-- ---------------------------------------------------------------------------
drop function public.converter_pedido_em_caso(uuid, uuid);
create function public.converter_pedido_em_caso(p_pedido_id uuid, p_user_id uuid, p_origem_avulso text default null)
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

  -- Pedido pago com um Avulso: gasta esse Avulso. Sem origem: regra normal
  -- (subscrição primeiro). Se algo abaixo falhar, tudo é revertido.
  v_consumo := public.consumir_credito_caso(p_user_id, p_origem_avulso);
  if v_consumo is null then
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
-- 4. Privilégios: só o backend (service_role)
-- ---------------------------------------------------------------------------
revoke execute on function public.consumir_credito_caso(uuid, text) from public, anon, authenticated;
revoke execute on function public.devolver_credito_caso(uuid, text) from public, anon, authenticated;
revoke execute on function public.converter_pedido_em_caso(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.consumir_credito_caso(uuid, text) to service_role;
grant execute on function public.devolver_credito_caso(uuid, text) to service_role;
grant execute on function public.converter_pedido_em_caso(uuid, uuid, text) to service_role;
