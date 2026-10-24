-- DoLado Empresas — Fase 8: alertas e resumo mensal.
--
-- Tipo A (aditiva): uma coluna nula, uma tabela e uma função de leitura por
-- tipo de aviso, todas novas. NADA dos particulares muda: a Edge Function
-- verificar-monitor-datas, monitor_alertas_pendentes() e as tabelas do resumo
-- mensal da Protecção ficam como estão. As contas de empresa nunca têm
-- conta_tem_protecao(), por isso nunca estiveram (nem estão) na lista dos
-- particulares; os avisos delas saem pela rota interna das empresas
-- (/api/internal/empresas-avisos, pg_cron "empresas-avisos", de hora a hora).
--
-- Só organizações com empresa_tem_acesso = 'total' (activa ou pagamento em
-- atraso) recebem alertas e resumos; em consulta (suspensa, cancelada) só os
-- avisos do estado da conta (Fase 5).

-- ===========================================================================
-- 1. Pré-aviso de denúncia do contrato (dias), escrito pela empresa
-- ===========================================================================
alter table public.contratos_monitorizados
  add column preaviso_dias integer check (preaviso_dias is null or preaviso_dias between 1 and 365);

comment on column public.contratos_monitorizados.preaviso_dias is
  'DoLado Empresas: pré-aviso de denúncia indicado pela empresa (dias). O primeiro aviso do fim da fidelização sai a max(60, pré-aviso + 30) dias. Nulo nos particulares.';

-- Gravado só pelo servidor, para um serviço da própria conta de empresa.
create or replace function public.empresa_definir_preaviso(p_user uuid, p_contrato uuid, p_dias integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_dias is not null and (p_dias < 1 or p_dias > 365) then
    return 'invalido';
  end if;
  if not exists (select 1 from public.utilizadores where id = p_user and tipo_conta = 'empresa') then
    return 'sem_acesso';
  end if;
  update public.contratos_monitorizados
     set preaviso_dias = p_dias
   where id = p_contrato and utilizador_id = p_user and desativado_em is null;
  return case when found then 'guardado' else 'nao_encontrado' end;
end $$;

revoke execute on function public.empresa_definir_preaviso(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.empresa_definir_preaviso(uuid, uuid, integer) to service_role;

-- ===========================================================================
-- 2. Organizações que recebem alertas: acesso total, membro com e-mail
--    confirmado e conta de empresa. Só para as funções abaixo.
-- ===========================================================================
create or replace function public.empresa_destinos_alertas()
returns table (organizacao_id uuid, utilizador_id uuid, nome_organizacao text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, m.utilizador_id, o.nome
    from public.organizacoes o
    join public.organizacoes_membros m on m.organizacao_id = o.id and m.removido_em is null
    join public.utilizadores u on u.id = m.utilizador_id and u.tipo_conta = 'empresa'
    join auth.users au on au.id = m.utilizador_id
   where o.estado in ('ativa', 'pagamento_em_atraso')
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now());
$$;

revoke execute on function public.empresa_destinos_alertas() from public, anon, authenticated;
grant execute on function public.empresa_destinos_alertas() to service_role;

-- ===========================================================================
-- 3. Alertas de prazo das empresas (mesmas regras e mesma reserva
--    — contratos_alertas_envios / monitor_reservar_alerta — que os
--    particulares; o primeiro aviso da fidelização respeita o pré-aviso).
--    A regra "_60d" é o primeiro aviso (a 60 dias ou a pré-aviso + 30).
-- ===========================================================================
create or replace function public.empresa_alertas_pendentes(p_hoje date)
returns table (
  organizacao_id uuid,
  contrato_id uuid,
  regra text,
  data_alvo date,
  fornecedor text,
  setor text,
  instalacao text,
  descricao_promocao text,
  preaviso_dias integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select d.organizacao_id, c.*
      from public.empresa_destinos_alertas() d
      join public.contratos_monitorizados c on c.utilizador_id = d.utilizador_id
     where c.desativado_em is null
       and c.estado <> 'terminado'
  ),
  datas as (
    select b.organizacao_id, b.id, b.fornecedor, b.setor, b.instalacao_id, b.descricao_promocao, b.created_at, b.preaviso_dias,
           'fidelizacao' as tipo, b.data_fim_fidelizacao as data,
           greatest(60, coalesce(b.preaviso_dias, 0) + 30) as primeiro
      from base b where b.data_fim_fidelizacao is not null
    union all
    select b.organizacao_id, b.id, b.fornecedor, b.setor, b.instalacao_id, b.descricao_promocao, b.created_at, b.preaviso_dias,
           'promocao', b.data_fim_promocao, 60
      from base b where b.data_fim_promocao is not null
  ),
  devidos as (
    select d.*,
           d.tipo || case
             when d.data > p_hoje + 30 and d.data <= p_hoje + d.primeiro then '_60d'
             when d.data > p_hoje and d.data <= p_hoje + 30 then '_30d'
             when d.data between p_hoje - 1 and p_hoje and d.created_at::date <= d.data then '_fim'
           end as regra
      from datas d
  )
  select d.organizacao_id, d.id, d.regra, d.data, d.fornecedor, d.setor, i.nome,
         case when d.tipo = 'promocao' then d.descricao_promocao end, d.preaviso_dias
    from devidos d
    left join public.instalacoes i on i.id = d.instalacao_id
   where d.regra is not null
     and not exists (
       select 1 from public.contratos_alertas_envios e
        where e.contrato_id = d.id and e.regra = d.regra and e.data_alvo = d.data
     );
$$;

revoke execute on function public.empresa_alertas_pendentes(date) from public, anon, authenticated;
grant execute on function public.empresa_alertas_pendentes(date) to service_role;

-- ===========================================================================
-- 4. Factura esperada em falta: serviço com pelo menos 2 facturas e sem
--    factura nova depois de 1,5 × o intervalo habitual (média entre a
--    primeira e a última emissão). Um lembrete por serviço e por mês.
--    Intervalos fora de 20–400 dias, e serviços sem factura há mais de um
--    ano, não dão lembrete.
-- ===========================================================================
create table public.empresa_alertas_envios (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  tipo text not null check (tipo in ('factura_em_falta')),
  -- Mês do lembrete (AAAA-MM, Lisboa): um por serviço e por mês.
  referencia text not null check (referencia ~ '^[0-9]{4}-[0-9]{2}$'),
  estado text not null default 'reservado' check (estado in ('reservado', 'enviado')),
  reservado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (contrato_id, tipo, referencia),
  check ((estado = 'enviado') = (enviado_em is not null))
);

comment on table public.empresa_alertas_envios is
  'DoLado Empresas: lembretes de factura em falta (reserva antes do envio; nunca em duplicado). Escrita só pela service_role.';

create index empresa_alertas_envios_org_idx on public.empresa_alertas_envios (organizacao_id, enviado_em);

alter table public.empresa_alertas_envios enable row level security;
revoke all on public.empresa_alertas_envios from anon, authenticated;
grant select on public.empresa_alertas_envios to authenticated;
create policy "empresa_alertas_envios: membro lê (aal2)" on public.empresa_alertas_envios
  for select to authenticated
  using (public.e_membro_organizacao(organizacao_id) and (select public.sessao_aal2()));
create policy "empresa_alertas_envios: admin lê" on public.empresa_alertas_envios
  for select to authenticated using (public.is_admin());

create or replace function public.empresa_facturas_em_falta(p_hoje date)
returns table (
  organizacao_id uuid,
  contrato_id uuid,
  fornecedor text,
  setor text,
  instalacao text,
  ultima_emissao date,
  esperada_ate date,
  referencia text
)
language sql
stable
security definer
set search_path = ''
as $$
  with facturas as (
    select d.organizacao_id, f.contrato_id,
           coalesce(f.data_emissao, f.periodo_fim, f.periodo_inicio) as emissao
      from public.empresa_destinos_alertas() d
      join public.faturas_monitor f on f.utilizador_id = d.utilizador_id
     where coalesce(f.data_emissao, f.periodo_fim, f.periodo_inicio) is not null
  ),
  porservico as (
    select organizacao_id, contrato_id, count(*) as n, min(emissao) as primeira, max(emissao) as ultima
      from facturas group by organizacao_id, contrato_id
  ),
  intervalos as (
    select p.*, (p.ultima - p.primeira)::numeric / (p.n - 1) as intervalo
      from porservico p where p.n >= 2
  )
  select i.organizacao_id, i.contrato_id, c.fornecedor, c.setor, ins.nome, i.ultima,
         (i.ultima + ceil(i.intervalo * 1.5)::integer) as esperada_ate,
         to_char(p_hoje, 'YYYY-MM')
    from intervalos i
    join public.contratos_monitorizados c on c.id = i.contrato_id
    left join public.instalacoes ins on ins.id = c.instalacao_id
   where c.desativado_em is null
     and c.estado <> 'terminado'
     and i.intervalo between 20 and 400
     and p_hoje > i.ultima + ceil(i.intervalo * 1.5)::integer
     and i.ultima >= p_hoje - 365
     and not exists (
       select 1 from public.empresa_alertas_envios e
        where e.contrato_id = i.contrato_id and e.tipo = 'factura_em_falta' and e.referencia = to_char(p_hoje, 'YYYY-MM')
     );
$$;

-- Reserva antes do envio: devolve o id ou null (já reservado/enviado, ou a
-- organização já não tem acesso total — verificado de novo aqui).
create or replace function public.empresa_alerta_reservar(p_organizacao uuid, p_contrato uuid, p_tipo text, p_referencia text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.empresa_destinos_alertas() d
      join public.contratos_monitorizados c on c.utilizador_id = d.utilizador_id
     where d.organizacao_id = p_organizacao and c.id = p_contrato
  ) then
    return null;
  end if;
  insert into public.empresa_alertas_envios (organizacao_id, contrato_id, tipo, referencia)
  values (p_organizacao, p_contrato, p_tipo, p_referencia)
  on conflict (contrato_id, tipo, referencia) do nothing
  returning id into v_id;
  return v_id;
end $$;

-- Conclui (enviado) ou liberta (falhou: a execução seguinte tenta de novo).
create or replace function public.empresa_alerta_concluir(p_id uuid, p_enviado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_enviado then
    update public.empresa_alertas_envios set estado = 'enviado', enviado_em = now() where id = p_id and estado = 'reservado';
  else
    delete from public.empresa_alertas_envios where id = p_id and estado = 'reservado';
  end if;
end $$;

revoke execute on function public.empresa_facturas_em_falta(date) from public, anon, authenticated;
revoke execute on function public.empresa_alerta_reservar(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.empresa_alerta_concluir(uuid, boolean) from public, anon, authenticated;
grant execute on function public.empresa_facturas_em_falta(date) to service_role;
grant execute on function public.empresa_alerta_reservar(uuid, uuid, text, text) to service_role;
grant execute on function public.empresa_alerta_concluir(uuid, boolean) to service_role;

-- ===========================================================================
-- 5. Resumo mensal empresarial (modelo resumo_empresa_v1): uma linha por
--    organização e mês, imutável depois de enviada (fotografia do que o
--    e-mail mostrou). Tabela própria: o resumo dos particulares
--    (protecao_resumos_mensais) e as métricas dele ficam como estão.
--    Recebe quem tem acesso total agora e teve um período pago que cobre
--    parte do mês de referência.
-- ===========================================================================
create table public.empresa_resumos_mensais (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  mes_referencia date not null check (extract(day from mes_referencia) = 1),
  estado text not null default 'reservado' check (estado in ('reservado', 'enviado', 'falhou')),
  tentativas integer not null default 1 check (tentativas between 1 and 3),
  conteudo jsonb,
  modelo_versao text,
  erro_codigo text,
  reservado_em timestamptz not null default now(),
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacao_id, mes_referencia),
  check ((estado = 'enviado') = (enviado_em is not null)),
  check (estado <> 'enviado' or (conteudo is not null and modelo_versao is not null))
);

comment on table public.empresa_resumos_mensais is
  'DoLado Empresas: resumo mensal por organização (fotografia do que foi enviado). Escrita só pela service_role (empresa_resumo_*).';

create trigger set_updated_at before update on public.empresa_resumos_mensais
  for each row execute function public.set_updated_at();
create trigger empresa_resumos_mensais_enviado_imutavel before update on public.empresa_resumos_mensais
  for each row execute function public.protecao_resumo_enviado_imutavel();

alter table public.empresa_resumos_mensais enable row level security;
revoke all on public.empresa_resumos_mensais from anon, authenticated;
grant select on public.empresa_resumos_mensais to authenticated;
create policy "empresa_resumos_mensais: membro lê os enviados (aal2)" on public.empresa_resumos_mensais
  for select to authenticated
  using (estado = 'enviado' and public.e_membro_organizacao(organizacao_id) and (select public.sessao_aal2()));
create policy "empresa_resumos_mensais: admin lê" on public.empresa_resumos_mensais
  for select to authenticated using (public.is_admin());

create or replace function public.empresa_resumo_elegivel(p_organizacao uuid, p_mes date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.empresa_destinos_alertas() d where d.organizacao_id = p_organizacao)
     and exists (
       select 1 from public.empresa_periodos p
        where p.organizacao_id = p_organizacao
          and p.estado_pagamento = 'pago'
          and p.inicio <= (date_trunc('month', p_mes) + interval '1 month - 1 day')::date
          and p.fim >= date_trunc('month', p_mes)::date
     );
$$;

create or replace function public.empresa_resumo_destinatarios(p_mes date)
returns table (organizacao_id uuid, utilizador_id uuid, nome_organizacao text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.organizacao_id, d.utilizador_id, d.nome_organizacao
    from public.empresa_destinos_alertas() d
   where public.empresa_resumo_elegivel(d.organizacao_id, p_mes)
     and not exists (
       select 1 from public.empresa_resumos_mensais r
        where r.organizacao_id = d.organizacao_id and r.mes_referencia = date_trunc('month', p_mes)::date
          and (r.estado <> 'falhou' or r.tentativas >= 3)
     );
$$;

create or replace function public.empresa_resumo_reservar(p_organizacao uuid, p_mes date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := date_trunc('month', p_mes)::date;
  v_id uuid;
begin
  if not public.empresa_resumo_elegivel(p_organizacao, v_mes) then
    return null;
  end if;
  insert into public.empresa_resumos_mensais as r (organizacao_id, mes_referencia)
  values (p_organizacao, v_mes)
  on conflict (organizacao_id, mes_referencia) do update
     set estado = 'reservado', tentativas = r.tentativas + 1, erro_codigo = null, reservado_em = now()
   where r.estado = 'falhou' and r.tentativas < 3
  returning r.id into v_id;
  return v_id;
end $$;

-- p_repetir = false esgota as tentativas (envio de resultado incerto).
create or replace function public.empresa_resumo_concluir(
  p_id uuid,
  p_enviado boolean,
  p_conteudo jsonb default null,
  p_modelo_versao text default null,
  p_erro text default null,
  p_repetir boolean default true
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_enviado then
    update public.empresa_resumos_mensais
       set estado = 'enviado', conteudo = p_conteudo, modelo_versao = p_modelo_versao, erro_codigo = null, enviado_em = now()
     where id = p_id and estado = 'reservado';
  else
    update public.empresa_resumos_mensais
       set estado = 'falhou', erro_codigo = left(coalesce(p_erro, 'erro'), 64),
           tentativas = case when p_repetir then tentativas else 3 end
     where id = p_id and estado = 'reservado';
  end if;
  return found;
end $$;

revoke execute on function public.empresa_resumo_elegivel(uuid, date) from public, anon, authenticated;
revoke execute on function public.empresa_resumo_destinatarios(date) from public, anon, authenticated;
revoke execute on function public.empresa_resumo_reservar(uuid, date) from public, anon, authenticated;
revoke execute on function public.empresa_resumo_concluir(uuid, boolean, jsonb, text, text, boolean) from public, anon, authenticated;
grant execute on function public.empresa_resumo_elegivel(uuid, date) to service_role;
grant execute on function public.empresa_resumo_destinatarios(date) to service_role;
grant execute on function public.empresa_resumo_reservar(uuid, date) to service_role;
grant execute on function public.empresa_resumo_concluir(uuid, boolean, jsonb, text, text, boolean) to service_role;
