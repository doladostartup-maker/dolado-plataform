-- Programa de indicação (07/10/2026): "20% para si. 20% para quem indicar."
--
-- Regras comerciais (src/lib/indicacoes/regras.ts tem o espelho em código):
--   - Quem chega por um link de indicação válido (30 dias) recebe 20% na
--     primeira compra, só no Avulso e na Proteção (1.ª mensalidade). Uma
--     primeira compra paga do Caso + Proteção (sem desconto) continua a
--     recompensar quem indicou. Sem conta, não há desconto de indicação.
--   - Quem indicou recebe 1 desconto de 20% quando a primeira compra do
--     indicado é confirmada e paga (valor > 0). Sem dinheiro nem saldo: só a
--     quantidade de descontos. Acumulam em quantidade, nunca em percentagem:
--     cada cobrança consome no máximo 1 desconto. Válido 12 meses a partir de
--     ficar disponível; expira automaticamente (job diário, auditado).
--   - Caso + Proteção não é elegível para o desconto de aquisição de 20%.
--     Contudo, uma recompensa de indicação já ganha pelo cliente pode ser
--     utilizada numa renovação mensal futura do Caso + Proteção. O Caso Extra
--     continua excluído.
--
-- Dados:
--   1. indicacoes_codigos     — 1 código opaco e estável por conta.
--   2. indicacoes_visitas     — visita por um link (sem IP, sem dados pessoais).
--   3. indicacoes             — quem indicou, quem foi indicado (1 por conta
--                               indicada), primeira compra e decisão.
--   4. indicacoes_recompensas — 1 desconto por indicação válida:
--                               em_revisao | disponivel | reservada | usada | anulada | expirada.
--   5. indicacoes_recompensas_historico — cada mudança de estado (só inserção).
--
-- Toda a escrita é do servidor (service_role) pelas funções indicacao_*: o
-- cliente só lê o próprio código e os próprios descontos (sem dados de
-- terceiros). A atribuição e a recompensa nunca dependem de dados do browser.

-- ---------------------------------------------------------------------------
-- 1. Códigos
-- ---------------------------------------------------------------------------
create table public.indicacoes_codigos (
  user_id uuid primary key references public.utilizadores (id) on delete cascade,
  -- 8 caracteres sem 0/O/1/I; gerado no servidor com crypto.randomBytes.
  codigo text not null unique check (codigo ~ '^[A-HJ-NP-Z2-9]{8}$'),
  criado_em timestamptz not null default now()
);

comment on table public.indicacoes_codigos is 'Código de indicação de cada conta (opaco, sem dados pessoais nem IDs internos). Estável: nunca muda.';

create or replace function public.indicacoes_codigos_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'indicacoes_codigos: o código de indicação não pode ser alterado' using errcode = '42501';
end $$;

create trigger indicacoes_codigos_imutavel
  before update on public.indicacoes_codigos
  for each row execute function public.indicacoes_codigos_imutavel();

-- ---------------------------------------------------------------------------
-- 2. Visitas
-- ---------------------------------------------------------------------------
create table public.indicacoes_visitas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null references public.indicacoes_codigos (codigo) on delete cascade,
  criado_em timestamptz not null default now()
);

comment on table public.indicacoes_visitas is 'Visita por um link de indicação. O id fica num cookie do browser (30 dias) e é a única prova da visita aceite na atribuição.';
create index indicacoes_visitas_codigo_idx on public.indicacoes_visitas (codigo, criado_em);

-- ---------------------------------------------------------------------------
-- 3. Indicações
-- ---------------------------------------------------------------------------
create table public.indicacoes (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.utilizadores (id) on delete cascade,
  -- Uma conta só pode ser indicada uma vez, por uma única pessoa, e nunca muda.
  referred_user_id uuid not null unique references public.utilizadores (id) on delete cascade,
  codigo text not null,
  visita_id uuid references public.indicacoes_visitas (id) on delete set null,
  visitado_em timestamptz not null,
  atribuido_em timestamptz not null default now(),
  -- registada: conta atribuída, ainda sem compra confirmada.
  -- compra_confirmada: primeira compra paga e confirmada (recompensa criada).
  -- rejeitada: primeira compra que não dá recompensa (motivo).
  -- revertida: reembolso integral ou disputa da primeira compra.
  estado text not null default 'registada'
    check (estado in ('registada', 'compra_confirmada', 'rejeitada', 'revertida')),
  -- Uma primeira compra só pertence a um recomendador.
  compra_session_id text unique,
  compra_produto text check (compra_produto in ('avulso', 'protecao', 'caso_protecao')),
  compra_valor_centimos int,
  compra_desconto_centimos int,
  compra_com_desconto_indicacao boolean,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  compra_confirmada_em timestamptz,
  motivo text,
  decidido_em timestamptz,
  check (referrer_user_id <> referred_user_id),
  check ((estado = 'registada') = (compra_session_id is null))
);

comment on table public.indicacoes is 'Indicação de uma conta por outra (link). Atribuída só pelo servidor; a primeira compra e a decisão são gravadas pelo webhook Stripe.';
create index indicacoes_referrer_idx on public.indicacoes (referrer_user_id);
create index indicacoes_payment_intent_idx on public.indicacoes (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index indicacoes_subscription_idx on public.indicacoes (stripe_subscription_id) where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Recompensas (descontos de 20% de quem indicou)
-- ---------------------------------------------------------------------------
create table public.indicacoes_recompensas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  indicacao_id uuid not null unique references public.indicacoes (id) on delete cascade,
  percentagem int not null default 20 check (percentagem = 20),
  estado text not null check (estado in ('em_revisao', 'disponivel', 'reservada', 'usada', 'anulada', 'expirada')),
  -- Validade: 12 meses a partir de ficar disponível (em revisão: só depois de aprovado).
  disponivel_desde timestamptz,
  expira_em timestamptz,
  -- Reserva: checkout:<sessão> (expira com a sessão) ou subscricao:<id>
  -- (desconto já posto na subscrição, à espera da próxima fatura).
  reserva_origem text,
  reservada_em timestamptz,
  reserva_expira_em timestamptz,
  -- Cobrança em que foi usado: checkout:<sessão> ou invoice:<id>.
  usada_origem text unique,
  usada_em timestamptz,
  usada_desconto_centimos int,
  anulada_em timestamptz,
  expirada_em timestamptz,
  motivo text,
  criado_em timestamptz not null default now(),
  check ((disponivel_desde is null) = (expira_em is null)),
  check (estado = 'em_revisao' or estado = 'anulada' or expira_em is not null),
  check ((estado = 'expirada') = (expirada_em is not null)),
  check ((estado = 'reservada') = (reserva_origem is not null and reservada_em is not null)),
  check ((estado = 'usada') = (usada_origem is not null and usada_em is not null)),
  check ((estado = 'anulada') = (anulada_em is not null))
);

comment on table public.indicacoes_recompensas is 'Um desconto de 20% por indicação válida. Cada cobrança usa no máximo um (usada_origem e reserva ativa únicas).';
create index indicacoes_recompensas_user_idx on public.indicacoes_recompensas (user_id, estado, criado_em);
-- Uma cobrança em curso nunca leva dois descontos.
create unique index indicacoes_recompensas_reserva_unica
  on public.indicacoes_recompensas (reserva_origem) where estado = 'reservada';

-- ---------------------------------------------------------------------------
-- 5. Histórico dos descontos (auditoria; só inserção, escrito por trigger)
-- ---------------------------------------------------------------------------
create table public.indicacoes_recompensas_historico (
  id bigint generated always as identity primary key,
  recompensa_id uuid not null references public.indicacoes_recompensas (id) on delete cascade,
  estado_anterior text,
  estado_novo text not null,
  motivo text,
  origem text,
  em timestamptz not null default now()
);

comment on table public.indicacoes_recompensas_historico is 'Cada mudança de estado de um desconto de indicação (criação, reserva, uso, anulação, expiração). Só inserção.';
create index indicacoes_recompensas_historico_idx on public.indicacoes_recompensas_historico (recompensa_id, em);

create or replace function public.indicacoes_recompensas_registar_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.indicacoes_recompensas_historico (recompensa_id, estado_anterior, estado_novo, motivo, origem)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.estado end,
      new.estado,
      new.motivo,
      coalesce(new.usada_origem, new.reserva_origem)
    );
  end if;
  return new;
end $$;

create trigger indicacoes_recompensas_historico
  after insert or update on public.indicacoes_recompensas
  for each row execute function public.indicacoes_recompensas_registar_historico();

create or replace function public.indicacoes_historico_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'indicacoes_recompensas_historico: registo de auditoria não pode ser alterado' using errcode = '42501';
end $$;

create trigger indicacoes_historico_so_insercao
  before update or delete on public.indicacoes_recompensas_historico
  for each row when (pg_trigger_depth() = 0)
  execute function public.indicacoes_historico_so_insercao();

-- ---------------------------------------------------------------------------
-- Funções (só service_role, exceto as métricas: admin)
-- ---------------------------------------------------------------------------

-- A conta já é cliente (compra confirmada, caso pago ou subscrição)? Uma
-- conta já cliente não é "nova" e não pode ser atribuída.
create or replace function public.indicacao_conta_ja_cliente(p_user uuid, p_exceto_session text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.stripe_payments p
            where p.user_id = p_user
              and p.estado in ('concluido', 'reembolsado', 'assinatura_cancelada')
              and p.stripe_session_id is distinct from p_exceto_session
         )
      or (p_exceto_session is null and exists (select 1 from public.case_credit_grants g where g.user_id = p_user))
      or (p_exceto_session is null and exists (
           select 1 from public.user_access a where a.user_id = p_user and a.stripe_subscription_id is not null
         ));
$$;

-- Atribuição: a conta p_referred chegou pela visita p_visita (cookie). Só a
-- primeira atribuição válida conta e nunca muda. Devolve: atribuida |
-- ja_atribuida | visita_invalida | expirada | auto_indicacao | ja_cliente.
create or replace function public.indicacao_atribuir(p_referred uuid, p_visita uuid, p_janela_dias int default 30)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visita record;
begin
  if exists (select 1 from public.indicacoes where referred_user_id = p_referred) then
    return 'ja_atribuida';
  end if;

  select v.id, v.codigo, v.criado_em, c.user_id as referrer
    into v_visita
    from public.indicacoes_visitas v
    join public.indicacoes_codigos c on c.codigo = v.codigo
   where v.id = p_visita;
  if not found then return 'visita_invalida'; end if;
  if v_visita.criado_em < now() - make_interval(days => p_janela_dias) then return 'expirada'; end if;
  if v_visita.referrer = p_referred then return 'auto_indicacao'; end if;
  if public.indicacao_conta_ja_cliente(p_referred) then return 'ja_cliente'; end if;

  insert into public.indicacoes (referrer_user_id, referred_user_id, codigo, visita_id, visitado_em)
  values (v_visita.referrer, p_referred, v_visita.codigo, v_visita.id, v_visita.criado_em)
  on conflict (referred_user_id) do nothing;
  if not found then return 'ja_atribuida'; end if;
  return 'atribuida';
end $$;

-- Primeira compra confirmada (webhook, depois de o pagamento estar gravado
-- como "concluido"). Atómica e idempotente. Decide se dá recompensa:
--   - só a primeira compra confirmada da conta indicada (nunca outra);
--   - só com valor pago > 0 (cupões de 100% não recompensam);
--   - nunca com o mesmo Customer Stripe de quem indicou (auto-indicação);
--   - p_suspeita (ex.: mesmo cartão) → recompensa "em_revisao" (decisão do admin).
-- Devolve jsonb { resultado, recompensa_id, referrer_user_id }.
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

  select stripe_customer_id into v_customer_referrer from public.user_access where user_id = v_ind.referrer_user_id;

  v_motivo := case
    when public.indicacao_conta_ja_cliente(p_referred, p_session) then 'nao_primeira_compra'
    when coalesce(p_valor_centimos, 0) <= 0 then 'compra_sem_pagamento'
    when p_customer is not null and p_customer = v_customer_referrer then 'mesmo_cliente_stripe'
    else null
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

  v_estado_recompensa := case when p_suspeita is null then 'disponivel' else 'em_revisao' end;
  insert into public.indicacoes_recompensas (user_id, indicacao_id, estado, motivo, disponivel_desde, expira_em)
  values (
    v_ind.referrer_user_id, v_ind.id, v_estado_recompensa, p_suspeita,
    case when p_suspeita is null then now() end,
    case when p_suspeita is null then now() + interval '12 months' end
  )
  returning id into v_recompensa;

  return jsonb_build_object(
    'resultado', 'recompensa_' || v_estado_recompensa,
    'recompensa_id', v_recompensa,
    'referrer_user_id', v_ind.referrer_user_id
  );
end $$;

-- Reserva 1 desconto para uma cobrança (checkout:<sessão-ou-token> ou
-- subscricao:<id>). Idempotente por origem. Uma reserva de checkout
-- expirada volta a estar disponível. Devolve o id ou null (sem descontos).
create or replace function public.indicacao_reservar_recompensa(p_user uuid, p_origem text, p_expira timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.indicacoes_recompensas
   where user_id = p_user and estado = 'reservada' and reserva_origem = p_origem;
  if found then return v_id; end if;

  select id into v_id from public.indicacoes_recompensas
   where user_id = p_user
     and (estado = 'disponivel' or (estado = 'reservada' and reserva_expira_em < now()))
     and expira_em > now()
   order by expira_em, criado_em, id
   limit 1
   for update skip locked;
  if not found then return null; end if;

  update public.indicacoes_recompensas
     set estado = 'reservada', reserva_origem = p_origem, reservada_em = now(), reserva_expira_em = p_expira
   where id = v_id;
  return v_id;
end $$;

-- Troca a origem de uma reserva (token provisório → checkout:<sessão>
-- criada) e/ou o prazo (null = sem prazo: pagamento assíncrono em curso).
create or replace function public.indicacao_atualizar_reserva(p_id uuid, p_origem text, p_expira timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.indicacoes_recompensas
     set reserva_origem = p_origem, reserva_expira_em = p_expira
   where id = p_id and estado = 'reservada';
  return found;
end $$;

-- Desconto usado numa cobrança paga. Idempotente por cobrança; uma cobrança
-- nunca usa dois descontos (usada_origem única). Devolve: usada | ja_usada |
-- usada_noutra | anulada | em_revisao | inexistente | cobranca_ja_com_desconto.
create or replace function public.indicacao_usar_recompensa(
  p_id uuid,
  p_user uuid,
  p_usada_origem text,
  p_desconto_centimos int
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.indicacoes_recompensas%rowtype;
begin
  select * into v from public.indicacoes_recompensas where id = p_id and user_id = p_user for update;
  if not found then return 'inexistente'; end if;
  if v.estado = 'usada' then
    return case when v.usada_origem = p_usada_origem then 'ja_usada' else 'usada_noutra' end;
  end if;
  if v.estado in ('anulada', 'em_revisao', 'expirada') then return v.estado; end if;
  -- Um desconto reservado antes de expirar é honrado (a cobrança já o levou).
  if v.estado = 'disponivel' and v.expira_em <= now() then return 'expirada'; end if;
  if exists (select 1 from public.indicacoes_recompensas where usada_origem = p_usada_origem) then
    return 'cobranca_ja_com_desconto';
  end if;

  update public.indicacoes_recompensas
     set estado = 'usada',
         usada_origem = p_usada_origem,
         usada_em = now(),
         usada_desconto_centimos = p_desconto_centimos,
         reserva_origem = null,
         reservada_em = null,
         reserva_expira_em = null
   where id = p_id;
  return 'usada';
end $$;

-- Liberta a reserva de uma origem (checkout falhado, subscrição terminada):
-- o desconto volta a estar disponível. Devolve quantos libertou (0 ou 1).
create or replace function public.indicacao_libertar_reserva(p_origem text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.indicacoes_recompensas
     set estado = 'disponivel', reserva_origem = null, reservada_em = null, reserva_expira_em = null
   where estado = 'reservada' and reserva_origem = p_origem;
  get diagnostics n = row_count;
  return n;
end $$;

-- Reembolso integral ou disputa da primeira compra: a indicação fica
-- revertida e o desconto, se ainda não foi usado, é anulado. Um desconto já
-- usado não é tocado (fica para decisão manual). Idempotente.
-- Devolve jsonb { resultado, reserva_origem, referrer_user_id }.
create or replace function public.indicacao_reverter_compra(p_session text, p_payment_intent text, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ind public.indicacoes%rowtype;
  v_rec public.indicacoes_recompensas%rowtype;
begin
  select * into v_ind from public.indicacoes
   where (p_session is not null and compra_session_id = p_session)
      or (p_payment_intent is not null and stripe_payment_intent_id = p_payment_intent)
   limit 1
   for update;
  if not found then return jsonb_build_object('resultado', 'sem_indicacao'); end if;
  if v_ind.estado = 'revertida' then return jsonb_build_object('resultado', 'ja_revertida'); end if;
  if v_ind.estado <> 'compra_confirmada' then return jsonb_build_object('resultado', 'sem_recompensa'); end if;

  update public.indicacoes set estado = 'revertida', motivo = p_motivo, decidido_em = now() where id = v_ind.id;

  select * into v_rec from public.indicacoes_recompensas where indicacao_id = v_ind.id for update;
  if not found then return jsonb_build_object('resultado', 'revertida_sem_recompensa'); end if;
  if v_rec.estado = 'usada' then
    return jsonb_build_object('resultado', 'revertida_recompensa_ja_usada', 'referrer_user_id', v_rec.user_id);
  end if;
  if v_rec.estado in ('anulada', 'expirada') then return jsonb_build_object('resultado', 'revertida'); end if;

  update public.indicacoes_recompensas
     set estado = 'anulada', anulada_em = now(), motivo = p_motivo,
         reserva_origem = null, reservada_em = null, reserva_expira_em = null
   where id = v_rec.id;
  return jsonb_build_object(
    'resultado', 'revertida',
    'reserva_origem', v_rec.reserva_origem,
    'referrer_user_id', v_rec.user_id
  );
end $$;

-- Decisão do admin sobre um desconto em revisão (possível auto-indicação).
create or replace function public.indicacao_rever_recompensa(p_id uuid, p_aprovar boolean, p_motivo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ind uuid;
begin
  update public.indicacoes_recompensas
     set estado = case when p_aprovar then 'disponivel' else 'anulada' end,
         anulada_em = case when p_aprovar then null else now() end,
         disponivel_desde = case when p_aprovar then now() end,
         expira_em = case when p_aprovar then now() + interval '12 months' end,
         motivo = coalesce(nullif(trim(p_motivo), ''), motivo)
   where id = p_id and estado = 'em_revisao'
  returning indicacao_id into v_ind;
  if not found then return false; end if;
  if not p_aprovar then
    update public.indicacoes set estado = 'rejeitada', motivo = coalesce(nullif(trim(p_motivo), ''), 'rejeitada_na_revisao'), decidido_em = now()
     where id = v_ind;
  end if;
  return true;
end $$;

-- Validade de 12 meses: expira os descontos por usar (e as reservas de
-- checkout já caducadas). Uma reserva ativa (checkout aberto ou desconto à
-- espera da próxima mensalidade) é honrada. Auditado no histórico. Diário
-- (pg_cron indicacoes-expirar-recompensas). Devolve quantos expirou.
create or replace function public.indicacoes_expirar_recompensas(p_agora timestamptz default now())
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.indicacoes_recompensas
     set estado = 'expirada', expirada_em = p_agora, motivo = 'validade_12_meses',
         reserva_origem = null, reservada_em = null, reserva_expira_em = null
   where expira_em <= p_agora
     and (estado = 'disponivel'
          or (estado = 'reservada' and reserva_expira_em is not null and reserva_expira_em < p_agora));
  get diagnostics n = row_count;
  return n;
end $$;

select cron.schedule(
  'indicacoes-expirar-recompensas',
  '15 4 * * *',
  $$select public.indicacoes_expirar_recompensas()$$
);

-- Métricas para o backoffice (só admin). A receita vem dos pagamentos por
-- Checkout (stripe_payments): as renovações mensais não estão lá, por isso o
-- "LTV" é uma aproximação comparável entre indicados e não indicados.
create or replace function public.indicacoes_metricas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'indicacoes_metricas: só admin' using errcode = '42501';
  end if;

  with pagos as (
    select p.user_id, sum(coalesce(p.valor_total_centimos, 0))::bigint as valor
      from public.stripe_payments p
     where p.user_id is not null and p.estado in ('concluido', 'assinatura_cancelada')
     group by p.user_id
  ),
  indicados as (select referred_user_id as user_id from public.indicacoes where estado in ('compra_confirmada', 'revertida', 'rejeitada'))
  select jsonb_build_object(
    'visitas', (select count(*) from public.indicacoes_visitas),
    'atribuicoes', (select count(*) from public.indicacoes),
    'compras', (select count(*) from public.indicacoes where estado = 'compra_confirmada'),
    'compras_rejeitadas', (select count(*) from public.indicacoes where estado = 'rejeitada'),
    'compras_revertidas', (select count(*) from public.indicacoes where estado = 'revertida'),
    'compras_por_produto', coalesce((select jsonb_object_agg(compra_produto, n) from (
        select compra_produto, count(*) as n from public.indicacoes where estado = 'compra_confirmada' group by compra_produto) x), '{}'::jsonb),
    'receita_primeira_compra_centimos', (select coalesce(sum(compra_valor_centimos), 0) from public.indicacoes where estado = 'compra_confirmada'),
    'desconto_novos_clientes_centimos', (select coalesce(sum(compra_desconto_centimos), 0) from public.indicacoes where estado = 'compra_confirmada' and compra_com_desconto_indicacao),
    'recompensas_emitidas', (select count(*) from public.indicacoes_recompensas where estado not in ('anulada', 'em_revisao')),
    'recompensas_disponiveis', (select count(*) from public.indicacoes_recompensas where estado in ('disponivel', 'reservada')),
    'recompensas_usadas', (select count(*) from public.indicacoes_recompensas where estado = 'usada'),
    'recompensas_em_revisao', (select count(*) from public.indicacoes_recompensas where estado = 'em_revisao'),
    'recompensas_anuladas', (select count(*) from public.indicacoes_recompensas where estado = 'anulada'),
    'recompensas_expiradas', (select count(*) from public.indicacoes_recompensas where estado = 'expirada'),
    'desconto_recompensas_centimos', (select coalesce(sum(usada_desconto_centimos), 0) from public.indicacoes_recompensas where estado = 'usada'),
    'valor_medio_indicados_centimos', (select coalesce(round(avg(valor)), 0) from pagos where user_id in (select user_id from indicados)),
    'clientes_indicados', (select count(*) from pagos where user_id in (select user_id from indicados)),
    'valor_medio_nao_indicados_centimos', (select coalesce(round(avg(valor)), 0) from pagos where user_id not in (select user_id from indicados)),
    'clientes_nao_indicados', (select count(*) from pagos where user_id not in (select user_id from indicados))
  ) into r;
  return r;
end $$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke execute on function public.indicacoes_codigos_imutavel() from public, anon, authenticated;
revoke execute on function public.indicacao_conta_ja_cliente(uuid, text) from public, anon, authenticated;
revoke execute on function public.indicacao_atribuir(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.indicacao_confirmar_compra(uuid, text, text, int, int, boolean, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.indicacao_reservar_recompensa(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.indicacao_atualizar_reserva(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.indicacao_usar_recompensa(uuid, uuid, text, int) from public, anon, authenticated;
revoke execute on function public.indicacao_libertar_reserva(text) from public, anon, authenticated;
revoke execute on function public.indicacao_reverter_compra(text, text, text) from public, anon, authenticated;
revoke execute on function public.indicacao_rever_recompensa(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.indicacoes_metricas() from public, anon;
revoke execute on function public.indicacoes_expirar_recompensas(timestamptz) from public, anon, authenticated;
revoke execute on function public.indicacoes_recompensas_registar_historico() from public, anon, authenticated;
revoke execute on function public.indicacoes_historico_so_insercao() from public, anon, authenticated;
grant execute on function public.indicacoes_expirar_recompensas(timestamptz) to service_role;
grant execute on function public.indicacao_conta_ja_cliente(uuid, text) to service_role;
grant execute on function public.indicacao_atribuir(uuid, uuid, int) to service_role;
grant execute on function public.indicacao_confirmar_compra(uuid, text, text, int, int, boolean, text, text, text, text) to service_role;
grant execute on function public.indicacao_reservar_recompensa(uuid, text, timestamptz) to service_role;
grant execute on function public.indicacao_atualizar_reserva(uuid, text, timestamptz) to service_role;
grant execute on function public.indicacao_usar_recompensa(uuid, uuid, text, int) to service_role;
grant execute on function public.indicacao_libertar_reserva(text) to service_role;
grant execute on function public.indicacao_reverter_compra(text, text, text) to service_role;
grant execute on function public.indicacao_rever_recompensa(uuid, boolean, text) to service_role;
grant execute on function public.indicacoes_metricas() to authenticated, service_role;

alter table public.indicacoes_codigos enable row level security;
alter table public.indicacoes_visitas enable row level security;
alter table public.indicacoes enable row level security;
alter table public.indicacoes_recompensas enable row level security;
alter table public.indicacoes_recompensas_historico enable row level security;
create policy "Admin lê o histórico dos descontos de indicação" on public.indicacoes_recompensas_historico
  for select using (public.is_admin());

create policy "Cliente lê o próprio código de indicação" on public.indicacoes_codigos
  for select using (user_id = auth.uid());
create policy "Admin lê os códigos de indicação" on public.indicacoes_codigos
  for select using (public.is_admin());
create policy "Admin lê as visitas por indicação" on public.indicacoes_visitas
  for select using (public.is_admin());
create policy "Admin lê as indicações" on public.indicacoes
  for select using (public.is_admin());
create policy "Cliente lê os próprios descontos de indicação" on public.indicacoes_recompensas
  for select using (user_id = auth.uid());
create policy "Admin lê os descontos de indicação" on public.indicacoes_recompensas
  for select using (public.is_admin());

-- Sem escrita para anon/authenticated: tudo pelo servidor (service_role).
revoke all on public.indicacoes_codigos from anon, authenticated;
revoke all on public.indicacoes_visitas from anon, authenticated;
revoke all on public.indicacoes from anon, authenticated;
revoke all on public.indicacoes_recompensas from anon, authenticated;
revoke all on public.indicacoes_recompensas_historico from anon, authenticated;
grant select on public.indicacoes_recompensas_historico to authenticated;
grant select on public.indicacoes_codigos to authenticated;
grant select on public.indicacoes_visitas to authenticated;
grant select on public.indicacoes to authenticated;
-- O cliente lê só o estado e as datas dos próprios descontos (nunca a
-- indicação nem as origens Stripe).
grant select (id, user_id, percentagem, estado, criado_em, usada_em, disponivel_desde, expira_em, expirada_em) on public.indicacoes_recompensas to authenticated;
