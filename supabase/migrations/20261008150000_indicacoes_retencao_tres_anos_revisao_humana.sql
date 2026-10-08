-- Conservação do programa de indicação: limite interno de 3 anos após fecho.
-- Correspondência de Customer Stripe é um sinal para revisão humana, não
-- fundamento de rejeição automática da recompensa.

create or replace function public.indicacao_confirmar_compra(
  p_referred uuid,
  p_session text,
  p_produto text,
  p_valor_centimos int,
  p_desconto_centimos int,
  p_com_desconto_indicacao boolean,
  p_customer text,
  p_subscription text,
  p_payment_intent text,
  p_suspeita text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ind public.indicacoes%rowtype;
  v_customer_referrer text;
  v_motivo text;
  v_suspeita text;
  v_estado_recompensa text;
  v_recompensa uuid;
begin
  select * into v_ind from public.indicacoes where referred_user_id = p_referred for update;
  if not found then
    return jsonb_build_object('resultado', 'sem_indicacao');
  end if;

  if v_ind.compra_session_id is not null then
    select id into v_recompensa from public.indicacoes_recompensas where indicacao_id = v_ind.id;
    return jsonb_build_object(
      'resultado', case when v_ind.compra_session_id = p_session then 'ja_registada' else 'nao_primeira_compra' end,
      'recompensa_id', v_recompensa,
      'referrer_user_id', v_ind.referrer_user_id
    );
  end if;

  select stripe_customer_id into v_customer_referrer
    from public.user_access where user_id = v_ind.referrer_user_id;

  v_motivo := case
    when public.indicacao_conta_ja_cliente(p_referred, p_session) then 'nao_primeira_compra'
    when coalesce(p_valor_centimos, 0) <= 0 then 'compra_sem_pagamento'
    else null
  end;
  v_suspeita := case
    when p_customer is not null and p_customer = v_customer_referrer then 'mesmo_cliente_stripe'
    else p_suspeita
  end;

  update public.indicacoes
     set estado = case when v_motivo is null then 'compra_confirmada' else 'rejeitada' end,
         compra_session_id = p_session,
         compra_produto = p_produto,
         compra_valor_centimos = p_valor_centimos,
         compra_desconto_centimos = p_desconto_centimos,
         compra_com_desconto_indicacao = p_com_desconto_indicacao,
         stripe_customer_id = p_customer,
         stripe_subscription_id = p_subscription,
         stripe_payment_intent_id = p_payment_intent,
         compra_confirmada_em = now(),
         motivo = v_motivo,
         decidido_em = now()
   where id = v_ind.id;

  if v_motivo is not null then
    return jsonb_build_object('resultado', 'rejeitada_' || v_motivo, 'referrer_user_id', v_ind.referrer_user_id);
  end if;

  v_estado_recompensa := case when v_suspeita is null then 'disponivel' else 'em_revisao' end;
  insert into public.indicacoes_recompensas (user_id, indicacao_id, estado, motivo, disponivel_desde, expira_em)
  values (
    v_ind.referrer_user_id, v_ind.id, v_estado_recompensa, v_suspeita,
    case when v_suspeita is null then now() end,
    case when v_suspeita is null then now() + interval '12 months' end
  )
  returning id into v_recompensa;

  return jsonb_build_object(
    'resultado', 'recompensa_' || v_estado_recompensa,
    'recompensa_id', v_recompensa,
    'referrer_user_id', v_ind.referrer_user_id
  );
end $$;

create or replace function public.indicacoes_limpar_dados(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_visitas int;
  n_indicacoes int;
begin
  delete from public.indicacoes_visitas
   where criado_em < p_agora - interval '30 days';
  get diagnostics n_visitas = row_count;

  delete from public.indicacoes i
   where i.estado in ('compra_confirmada', 'rejeitada', 'revertida')
     and not i.retencao_bloqueada
     and not exists (
       select 1
         from public.indicacoes_recompensas r
        where r.indicacao_id = i.id
          and r.estado in ('em_revisao', 'disponivel', 'reservada')
     )
     and coalesce(
       (
         select greatest(
           coalesce(i.decidido_em, '-infinity'::timestamptz),
           coalesce(r.usada_em, '-infinity'::timestamptz),
           coalesce(r.anulada_em, '-infinity'::timestamptz),
           coalesce(r.expirada_em, '-infinity'::timestamptz)
         )
           from public.indicacoes_recompensas r
          where r.indicacao_id = i.id
       ),
       i.decidido_em
     ) < p_agora - interval '3 years';
  get diagnostics n_indicacoes = row_count;

  return jsonb_build_object('visitas_eliminadas', n_visitas, 'indicacoes_eliminadas', n_indicacoes);
end $$;
