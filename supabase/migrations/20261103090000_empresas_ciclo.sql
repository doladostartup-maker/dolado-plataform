-- DoLado Empresas — Fase 5: activação e ciclo de pagamento manual
-- (23/10/2026)
--
-- Pagamento por transferência, confirmado no backoffice; vence no aniversário
-- da activação (dia 31 → último dia do mês, sempre contado a partir da data
-- de activação, sem deriva). Tudo só para a service_role; as funções do
-- admin verificam o papel lá dentro.
--
--   aprovada ──empresa_activar (com vaga D4)──▶ ativa   (sem vaga → lista_espera)
--   ativa ──período por pagar no vencimento──▶ pagamento_em_atraso (aviso)
--   pagamento_em_atraso ──7 dias──▶ suspensa (consulta e exportação)
--   suspensa ──30 dias──▶ cancelada (falta de pagamento; sem acesso;
--                          eliminação prevista em 90 dias — Fase 9)
--   ativa ──cancelamento pedido──▶ (fim do período) cancelada (consulta 30
--          dias) ──▶ encerrada (eliminação prevista em 90 dias)
--   pagamento_em_atraso/suspensa ──pagamento confirmado──▶ ativa
--
-- empresa_ciclo_diario() corre no pg_cron (sem HTTP nem segredos) e é
-- idempotente: cada transição depende do estado e das datas. Os e-mails
-- ficam em empresa_avisos (um por organização, período e tipo) e saem pela
-- rota /api/internal/empresas-avisos (segredo do Vault), com reserva antes
-- do envio. Sem o segredo, a rota responde 401 e os avisos esperam (os que
-- passarem de 3 dias deixam de sair).
--
-- Tipo A (aditiva): colunas novas nulas, tabela e funções novas; nada
-- existente muda. Os dois jobs não têm efeito antes do deploy (o do ciclo só
-- mexe em organizações activadas, que ainda não existem; o dos avisos recebe
-- 404/401).

-- ===========================================================================
-- 1. Colunas novas
-- ===========================================================================
alter table public.organizacoes
  -- Dia de referência do ciclo (data de activação em Lisboa).
  add column ciclo_ancora date,
  -- Cancelamento pedido pelo cliente: activa até ao fim do período pago.
  add column cancelamento_pedido_em timestamptz,
  add column motivo_cancelamento text
    check (motivo_cancelamento is null or motivo_cancelamento in ('falta_pagamento', 'pedido_cliente', 'admin')),
  -- Data a partir da qual os documentos operacionais podem ser eliminados (Fase 9).
  add column eliminacao_prevista_em date;

comment on column public.organizacoes.ciclo_ancora is
  'Data de activação em Lisboa: o período n vai de ancora + (n-1) meses a ancora + n meses (o Postgres ajusta o dia 31 ao último dia do mês).';

alter table public.empresa_periodos
  add column numero integer check (numero >= 1);

create unique index empresa_periodos_numero on public.empresa_periodos (organizacao_id, numero) where numero is not null;

-- O cliente (membro com aal2) lê as colunas novas da própria organização.
grant select (ciclo_ancora, cancelamento_pedido_em, motivo_cancelamento, eliminacao_prevista_em)
  on public.organizacoes to authenticated;

-- ===========================================================================
-- 2. Avisos por e-mail (um por organização, período e tipo)
-- ===========================================================================
create table public.empresa_avisos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  periodo_id uuid references public.empresa_periodos (id) on delete cascade,
  tipo text not null check (tipo in (
    'ativada', 'a_vencer', 'pagamento_confirmado', 'atraso', 'suspensa', 'reativada',
    'cancelada_falta_pagamento', 'cancelamento_agendado', 'cancelamento_retirado', 'cancelada_pedido',
    'cancelada_admin', 'encerrada')),
  criado_em timestamptz not null default now(),
  -- Reserva: tentativas sobe antes de cada envio; enviado_em depois do envio.
  tentativas integer not null default 0 check (tentativas between 0 and 10),
  enviado_em timestamptz,
  ignorado_em timestamptz
);

comment on table public.empresa_avisos is
  'DoLado Empresas: e-mails do ciclo de pagamento, um por organização, período e tipo. Escrita só pela service_role; só o admin lê.';

create unique index empresa_avisos_unico
  on public.empresa_avisos (organizacao_id, coalesce(periodo_id, '00000000-0000-0000-0000-000000000000'::uuid), tipo);
create index empresa_avisos_pendentes on public.empresa_avisos (criado_em) where enviado_em is null and ignorado_em is null;

alter table public.empresa_avisos enable row level security;
create policy "empresa_avisos: admin lê" on public.empresa_avisos for select to authenticated using (public.is_admin());
revoke all on public.empresa_avisos from anon, authenticated;
grant select on public.empresa_avisos to authenticated;
grant select, insert, update on public.empresa_avisos to service_role;

create or replace function public.empresa_aviso_registar(p_org uuid, p_periodo uuid, p_tipo text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.empresa_avisos (organizacao_id, periodo_id, tipo) values (p_org, p_periodo, p_tipo)
  on conflict do nothing;
$$;

revoke execute on function public.empresa_aviso_registar(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.empresa_aviso_registar(uuid, uuid, text) to service_role;

-- ===========================================================================
-- 3. Datas
-- ===========================================================================
create or replace function public.empresa_hoje()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Europe/Lisbon')::date $$;

-- Fim do período n (= início do período n+1).
create or replace function public.empresa_fim_periodo(p_ancora date, p_numero integer)
returns date
language sql
immutable
set search_path = ''
as $$ select (p_ancora + make_interval(months => p_numero))::date $$;

-- Meia-noite de Lisboa de uma data (para os prazos guardados como timestamptz).
create or replace function public.empresa_inicio_do_dia(p_dia date)
returns timestamptz
language sql
stable
set search_path = ''
as $$ select (p_dia::timestamp at time zone 'Europe/Lisbon') $$;

revoke execute on function public.empresa_hoje() from public, anon;
revoke execute on function public.empresa_fim_periodo(date, integer) from public, anon;
revoke execute on function public.empresa_inicio_do_dia(date) from public, anon;
grant execute on function public.empresa_hoje() to authenticated, service_role;
grant execute on function public.empresa_fim_periodo(date, integer) to authenticated, service_role;
grant execute on function public.empresa_inicio_do_dia(date) to authenticated, service_role;

-- Prazos do ciclo (D2), num só sítio.
create or replace function public.empresa_prazos()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'aviso_vencimento_dias', 7,   -- período seguinte criado (e avisado) 7 dias antes de vencer
    'suspensao_dias', 7,          -- em atraso há 7 dias → suspensa
    'cancelamento_dias', 30,      -- suspensa há 30 dias → cancelada
    'consulta_dias', 30,          -- cancelamento: 30 dias só de consulta e exportação
    'eliminacao_dias', 90         -- eliminação dos documentos operacionais em até 90 dias
  )
$$;

revoke execute on function public.empresa_prazos() from public, anon;
grant execute on function public.empresa_prazos() to authenticated, service_role;

-- ===========================================================================
-- 4. Activação (com vaga D4)
-- ===========================================================================
-- ativa | lista_espera | sem_permissao | estado_invalido | referencia_em_falta
create or replace function public.empresa_activar(p_org uuid, p_admin uuid, p_referencia text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizacoes%rowtype;
  v_ocupadas integer;
  v_ja_activadas integer;
  v_hoje date := public.empresa_hoje();
  v_periodo uuid;
begin
  if not public.empresa_e_admin(p_admin) then return 'sem_permissao'; end if;
  if coalesce(btrim(p_referencia), '') = '' or char_length(p_referencia) > 100 then return 'referencia_em_falta'; end if;

  -- O mesmo lock da aprovação: duas activações em simultâneo não passam as vagas.
  perform pg_advisory_xact_lock(hashtextextended('empresa_vagas', 0));
  select * into v_org from public.organizacoes where id = p_org for update;
  if v_org.id is null or v_org.estado <> 'aprovada' then return 'estado_invalido'; end if;

  perform set_config('dolado.alterado_por', p_admin::text, true);
  select count(*) into v_ocupadas from public.organizacoes
   where estado in ('ativa', 'pagamento_em_atraso', 'suspensa');
  if v_ocupadas >= public.empresa_vagas_piloto() then
    perform set_config('dolado.motivo', 'Sem vaga na activação: lista de espera', true);
    update public.organizacoes set estado = 'lista_espera' where id = p_org;
    perform set_config('dolado.motivo', '', true);
    return 'lista_espera';
  end if;

  -- Cinco primeiras empresas activadas: preço garantido durante 6 meses.
  select count(*) into v_ja_activadas from public.organizacoes where activada_em is not null;

  perform set_config('dolado.motivo', 'Activada: primeira mensalidade confirmada', true);
  update public.organizacoes
     set estado = 'ativa',
         activada_em = now(),
         ciclo_ancora = v_hoje,
         revisao_obrigatoria_ate = now() + interval '30 days',
         preco_garantido_ate = case when v_ja_activadas < public.empresa_vagas_piloto() then now() + interval '6 months' end,
         cancelamento_pedido_em = null,
         motivo_cancelamento = null,
         acesso_consulta_ate = null,
         eliminacao_prevista_em = null
   where id = p_org;
  perform set_config('dolado.motivo', '', true);
  perform set_config('dolado.alterado_por', '', true);

  insert into public.empresa_periodos (organizacao_id, numero, inicio, fim, valor_cents, estado_pagamento,
                                       referencia_factura, pago_em, confirmado_por)
  values (p_org, 1, v_hoje, public.empresa_fim_periodo(v_hoje, 1), v_org.preco_mensal_cents, 'pago',
          btrim(p_referencia), now(), p_admin)
  returning id into v_periodo;
  perform public.empresa_aviso_registar(p_org, v_periodo, 'ativada');
  return 'ativa';
end $$;

revoke execute on function public.empresa_activar(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.empresa_activar(uuid, uuid, text) to service_role;

-- ===========================================================================
-- 5. Pagamento confirmado
-- ===========================================================================
-- {resultado: pago | ja_pago | sem_permissao | periodo_invalido | referencia_em_falta, estado}
create or replace function public.empresa_confirmar_pagamento(p_periodo uuid, p_admin uuid, p_referencia text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.empresa_periodos%rowtype;
  v_estado text;
begin
  if not public.empresa_e_admin(p_admin) then return jsonb_build_object('resultado', 'sem_permissao'); end if;
  if coalesce(btrim(p_referencia), '') = '' or char_length(p_referencia) > 100 then
    return jsonb_build_object('resultado', 'referencia_em_falta');
  end if;

  select * into v_p from public.empresa_periodos where id = p_periodo for update;
  if v_p.id is null or v_p.estado_pagamento = 'anulado' then return jsonb_build_object('resultado', 'periodo_invalido'); end if;
  select estado into v_estado from public.organizacoes where id = v_p.organizacao_id for update;
  if v_p.estado_pagamento = 'pago' then return jsonb_build_object('resultado', 'ja_pago', 'estado', v_estado); end if;

  update public.empresa_periodos
     set estado_pagamento = 'pago', pago_em = now(), confirmado_por = p_admin, referencia_factura = btrim(p_referencia)
   where id = p_periodo;
  perform public.empresa_aviso_registar(v_p.organizacao_id, p_periodo, 'pagamento_confirmado');

  -- Regularizado (nenhum período vencido por pagar): volta a activa.
  if v_estado in ('pagamento_em_atraso', 'suspensa')
     and not exists (select 1 from public.empresa_periodos
                      where organizacao_id = v_p.organizacao_id and estado_pagamento = 'por_pagar'
                        and inicio <= public.empresa_hoje()) then
    perform set_config('dolado.alterado_por', p_admin::text, true);
    perform set_config('dolado.motivo', 'Pagamento confirmado', true);
    update public.organizacoes set estado = 'ativa' where id = v_p.organizacao_id;
    perform set_config('dolado.alterado_por', '', true);
    perform set_config('dolado.motivo', '', true);
    v_estado := 'ativa';
  end if;
  return jsonb_build_object('resultado', 'pago', 'estado', v_estado);
end $$;

revoke execute on function public.empresa_confirmar_pagamento(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.empresa_confirmar_pagamento(uuid, uuid, text) to service_role;

-- ===========================================================================
-- 6. Ciclo diário (idempotente)
-- ===========================================================================
-- Devolve as contagens do que fez. p_hoje só para os testes.
create or replace function public.empresa_ciclo_diario(p_hoje date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hoje date := coalesce(p_hoje, public.empresa_hoje());
  v_prazos jsonb := public.empresa_prazos();
  v_aviso integer := (v_prazos ->> 'aviso_vencimento_dias')::integer;
  v_susp integer := (v_prazos ->> 'suspensao_dias')::integer;
  v_canc integer := (v_prazos ->> 'cancelamento_dias')::integer;
  v_cons integer := (v_prazos ->> 'consulta_dias')::integer;
  v_elim integer := (v_prazos ->> 'eliminacao_dias')::integer;
  o record;
  v_ultimo public.empresa_periodos%rowtype;
  v_vencido public.empresa_periodos%rowtype;
  v_novo uuid;
  r_periodos integer := 0;
  r_atraso integer := 0;
  r_suspensas integer := 0;
  r_canceladas integer := 0;
  r_encerradas integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('empresa_ciclo_diario', 0));
  perform set_config('dolado.alterado_por', '', true);

  for o in
    select id, estado, ciclo_ancora, preco_mensal_cents, cancelamento_pedido_em, acesso_consulta_ate
      from public.organizacoes
     where estado in ('ativa', 'pagamento_em_atraso', 'suspensa', 'cancelada')
       and ciclo_ancora is not null
     order by id
     for update
  loop
    -- a) Cancelamento pedido: no fim do período pago, cancelada com 30 dias de consulta.
    if o.estado = 'ativa' and o.cancelamento_pedido_em is not null then
      select * into v_ultimo from public.empresa_periodos
       where organizacao_id = o.id and estado_pagamento = 'pago' order by numero desc limit 1;
      if v_ultimo.id is not null and v_hoje >= v_ultimo.fim then
        update public.empresa_periodos set estado_pagamento = 'anulado'
         where organizacao_id = o.id and estado_pagamento = 'por_pagar';
        perform set_config('dolado.motivo', 'Cancelamento pedido pelo cliente: fim do período pago', true);
        update public.organizacoes
           set estado = 'cancelada', motivo_cancelamento = 'pedido_cliente',
               acesso_consulta_ate = public.empresa_inicio_do_dia(v_ultimo.fim + v_cons)
         where id = o.id;
        perform public.empresa_aviso_registar(o.id, v_ultimo.id, 'cancelada_pedido');
        r_canceladas := r_canceladas + 1;
      end if;
      continue;
    end if;

    -- b) Activa: cria o período seguinte 7 dias antes do fim do último (um por pagar de cada vez).
    if o.estado = 'ativa' then
      loop
        select * into v_ultimo from public.empresa_periodos
         where organizacao_id = o.id and numero is not null order by numero desc limit 1;
        exit when v_ultimo.id is null
               or v_ultimo.estado_pagamento = 'por_pagar'
               or v_hoje < v_ultimo.fim - v_aviso;
        insert into public.empresa_periodos (organizacao_id, numero, inicio, fim, valor_cents)
        values (o.id, v_ultimo.numero + 1, v_ultimo.fim, public.empresa_fim_periodo(o.ciclo_ancora, v_ultimo.numero + 1),
                o.preco_mensal_cents)
        returning id into v_novo;
        perform public.empresa_aviso_registar(o.id, v_novo, 'a_vencer');
        r_periodos := r_periodos + 1;
      end loop;
    end if;

    -- Período vencido mais antigo por pagar.
    select * into v_vencido from public.empresa_periodos
     where organizacao_id = o.id and estado_pagamento = 'por_pagar' and inicio <= v_hoje
     order by inicio limit 1;

    -- c) Vencido sem pagamento: em atraso.
    if o.estado = 'ativa' and v_vencido.id is not null then
      perform set_config('dolado.motivo', 'Mensalidade vencida sem pagamento confirmado', true);
      update public.organizacoes set estado = 'pagamento_em_atraso' where id = o.id;
      perform public.empresa_aviso_registar(o.id, v_vencido.id, 'atraso');
      o.estado := 'pagamento_em_atraso';
      r_atraso := r_atraso + 1;
    end if;

    -- d) Em atraso há 7 dias: suspensa (consulta e exportação).
    if o.estado = 'pagamento_em_atraso' and v_vencido.id is not null and v_hoje >= v_vencido.inicio + v_susp then
      perform set_config('dolado.motivo', 'Em atraso há ' || v_susp || ' dias', true);
      update public.organizacoes set estado = 'suspensa' where id = o.id;
      perform public.empresa_aviso_registar(o.id, v_vencido.id, 'suspensa');
      o.estado := 'suspensa';
      r_suspensas := r_suspensas + 1;
    end if;

    -- e) Suspensa há 30 dias: cancelada por falta de pagamento (sem acesso).
    if o.estado = 'suspensa' and v_vencido.id is not null and v_hoje >= v_vencido.inicio + v_susp + v_canc then
      update public.empresa_periodos set estado_pagamento = 'anulado'
       where organizacao_id = o.id and estado_pagamento = 'por_pagar';
      perform set_config('dolado.motivo', 'Suspensa há ' || v_canc || ' dias: cancelada por falta de pagamento', true);
      update public.organizacoes
         set estado = 'cancelada', motivo_cancelamento = 'falta_pagamento', acesso_consulta_ate = null,
             eliminacao_prevista_em = v_hoje + v_elim
       where id = o.id;
      perform public.empresa_aviso_registar(o.id, v_vencido.id, 'cancelada_falta_pagamento');
      r_canceladas := r_canceladas + 1;
      continue;
    end if;

    -- f) Cancelada com consulta: no fim da consulta, encerrada.
    if o.estado = 'cancelada' and o.acesso_consulta_ate is not null
       and public.empresa_inicio_do_dia(v_hoje) >= o.acesso_consulta_ate then
      perform set_config('dolado.motivo', 'Fim do período de consulta', true);
      update public.organizacoes set estado = 'encerrada', eliminacao_prevista_em = v_hoje + v_elim where id = o.id;
      perform public.empresa_aviso_registar(o.id, null, 'encerrada');
      r_encerradas := r_encerradas + 1;
    end if;
  end loop;
  perform set_config('dolado.motivo', '', true);

  return jsonb_build_object('hoje', v_hoje, 'periodos_criados', r_periodos, 'em_atraso', r_atraso,
                            'suspensas', r_suspensas, 'canceladas', r_canceladas, 'encerradas', r_encerradas);
end $$;

revoke execute on function public.empresa_ciclo_diario(date) from public, anon, authenticated;
grant execute on function public.empresa_ciclo_diario(date) to service_role;

-- ===========================================================================
-- 7. Cancelamento pelo cliente (fim do período pago) e retirada
-- ===========================================================================
-- {resultado: agendado | ja_agendado | estado_invalido | sem_organizacao, termina_em}
create or replace function public.empresa_pedir_cancelamento(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_estado text;
  v_pedido timestamptz;
  v_ultimo public.empresa_periodos%rowtype;
begin
  select o.id, o.estado, o.cancelamento_pedido_em into v_org, v_estado, v_pedido
    from public.organizacoes_membros m join public.organizacoes o on o.id = m.organizacao_id
   where m.utilizador_id = p_user and m.removido_em is null
   for update of o;
  if v_org is null then return jsonb_build_object('resultado', 'sem_organizacao'); end if;
  if v_estado <> 'ativa' then return jsonb_build_object('resultado', 'estado_invalido'); end if;

  -- Um período seguinte ainda não vencido deixa de ser devido.
  update public.empresa_periodos set estado_pagamento = 'anulado'
   where organizacao_id = v_org and estado_pagamento = 'por_pagar' and inicio > public.empresa_hoje();
  select * into v_ultimo from public.empresa_periodos
   where organizacao_id = v_org and estado_pagamento = 'pago' order by numero desc limit 1;

  if v_pedido is not null then
    return jsonb_build_object('resultado', 'ja_agendado', 'termina_em', v_ultimo.fim);
  end if;
  update public.organizacoes set cancelamento_pedido_em = now() where id = v_org;
  insert into public.organizacoes_historico (organizacao_id, estado_antes, estado_depois, alterado_por, motivo)
  values (v_org, v_estado, v_estado, p_user, 'Cancelamento pedido pelo cliente (fim do período pago)');
  perform public.empresa_aviso_registar(v_org, v_ultimo.id, 'cancelamento_agendado');
  return jsonb_build_object('resultado', 'agendado', 'termina_em', v_ultimo.fim);
end $$;

revoke execute on function public.empresa_pedir_cancelamento(uuid) from public, anon, authenticated;
grant execute on function public.empresa_pedir_cancelamento(uuid) to service_role;

-- retirado | sem_pedido | estado_invalido | sem_organizacao
create or replace function public.empresa_retirar_cancelamento(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_estado text;
  v_pedido timestamptz;
  v_ultimo uuid;
begin
  select o.id, o.estado, o.cancelamento_pedido_em into v_org, v_estado, v_pedido
    from public.organizacoes_membros m join public.organizacoes o on o.id = m.organizacao_id
   where m.utilizador_id = p_user and m.removido_em is null
   for update of o;
  if v_org is null then return 'sem_organizacao'; end if;
  if v_estado <> 'ativa' then return 'estado_invalido'; end if;
  if v_pedido is null then return 'sem_pedido'; end if;

  update public.organizacoes set cancelamento_pedido_em = null where id = v_org;
  insert into public.organizacoes_historico (organizacao_id, estado_antes, estado_depois, alterado_por, motivo)
  values (v_org, v_estado, v_estado, p_user, 'Cancelamento retirado pelo cliente');
  select id into v_ultimo from public.empresa_periodos
   where organizacao_id = v_org and estado_pagamento = 'pago' order by numero desc limit 1;
  perform public.empresa_aviso_registar(v_org, v_ultimo, 'cancelamento_retirado');
  return 'retirado';
end $$;

revoke execute on function public.empresa_retirar_cancelamento(uuid) from public, anon, authenticated;
grant execute on function public.empresa_retirar_cancelamento(uuid) to service_role;

-- ===========================================================================
-- 8. Acções do admin: suspender, reactivar, cancelar (com motivo)
-- ===========================================================================
-- suspensa | ativa | cancelada | sem_permissao | motivo_em_falta | estado_invalido | pagamento_em_falta
create or replace function public.empresa_admin_transicao(p_org uuid, p_admin uuid, p_acao text, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_hoje date := public.empresa_hoje();
  v_periodo uuid;
begin
  if not public.empresa_e_admin(p_admin) then return 'sem_permissao'; end if;
  if coalesce(btrim(p_motivo), '') = '' or char_length(p_motivo) > 500 then return 'motivo_em_falta'; end if;
  select estado into v_estado from public.organizacoes where id = p_org for update;
  select id into v_periodo from public.empresa_periodos where organizacao_id = p_org order by numero desc nulls last limit 1;

  perform set_config('dolado.alterado_por', p_admin::text, true);
  perform set_config('dolado.motivo', btrim(p_motivo), true);
  if p_acao = 'suspender' and v_estado in ('ativa', 'pagamento_em_atraso') then
    update public.organizacoes set estado = 'suspensa' where id = p_org;
    perform public.empresa_aviso_registar(p_org, v_periodo, 'suspensa');
    return 'suspensa';
  elsif p_acao = 'reativar' and v_estado in ('suspensa', 'pagamento_em_atraso') then
    if exists (select 1 from public.empresa_periodos
                where organizacao_id = p_org and estado_pagamento = 'por_pagar' and inicio <= v_hoje) then
      return 'pagamento_em_falta';
    end if;
    update public.organizacoes set estado = 'ativa' where id = p_org;
    perform public.empresa_aviso_registar(p_org, v_periodo, 'reativada');
    return 'ativa';
  elsif p_acao = 'cancelar' and v_estado in ('ativa', 'pagamento_em_atraso', 'suspensa') then
    update public.empresa_periodos set estado_pagamento = 'anulado'
     where organizacao_id = p_org and estado_pagamento = 'por_pagar';
    update public.organizacoes
       set estado = 'cancelada', motivo_cancelamento = 'admin',
           acesso_consulta_ate = public.empresa_inicio_do_dia(v_hoje + (public.empresa_prazos() ->> 'consulta_dias')::integer)
     where id = p_org;
    perform public.empresa_aviso_registar(p_org, v_periodo, 'cancelada_admin');
    return 'cancelada';
  end if;
  return 'estado_invalido';
end $$;

revoke execute on function public.empresa_admin_transicao(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.empresa_admin_transicao(uuid, uuid, text, text) to service_role;

-- ===========================================================================
-- 9. Agendamentos
-- ===========================================================================
-- Ciclo: todos os dias às 05:30 UTC (06:30 em Lisboa no verão), só SQL.
select cron.schedule('empresas-ciclo-diario', '30 5 * * *', $$ select public.empresa_ciclo_diario(); $$);

-- Avisos por e-mail: de hora a hora, pela rota interna do portal com o
-- segredo do Vault 'empresas_avisos_cron_secret' (= EMPRESAS_AVISOS_CRON_SECRET
-- na Clever Cloud). Sem o segredo: 401, nada sai.
select
  cron.schedule(
    'empresas-avisos',
    '45 * * * *',
    $$
    select
      net.http_post(
        url := 'https://portal.dolado.pt/api/internal/empresas-avisos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'empresas_avisos_cron_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $$
  );
