-- DoLado Empresas — Fase 6A: Monitor empresarial (instalações, carregamento
-- com quota, limites e resultado do processamento) (23/10/2026)
--
-- O Monitor continua a ser o dos particulares (documentos_monitor,
-- contratos_monitorizados, mesmo pipeline); o que é só das empresas fica em
-- empresa_documentos (instalação e quota) e nestas funções, todas só para a
-- service_role — o servidor valida a sessão (requireEmpresa) antes, e a base
-- de dados volta a validar a organização, o estado e os limites.
--
--   empresa_criar_instalacao()      limite de instalações do plano
--   empresa_registar_documento()    documento + instalação + reserva de quota,
--                                   numa só transacção (D6)
--   empresa_pode_criar_servico()    limite de serviços do plano
--   empresa_documento_resultado()   quota consumida (resultado útil) ou
--                                   libertada (erro, repetido, ilegível, fora
--                                   do âmbito)
--
-- Quota (D6): 15 facturas por mês com resultado; contam as reservadas e as
-- consumidas do período em curso; contratos e configuração inicial não
-- contam; excepções do admin somam-se. Um documento já aceite nunca é
-- recusado depois (uma nova tentativa pode passar o limite).
--
-- Tipo A (aditiva): só funções novas. Nada muda para os particulares.

-- ===========================================================================
-- 1. Acesso e período em curso
-- ===========================================================================
-- Organização activa (ou em atraso) do utilizador; null sem acesso total.
create or replace function public.empresa_organizacao_ativa(p_user uuid)
returns public.organizacoes
language sql
stable
security definer
set search_path = ''
as $$
  select o.*
    from public.organizacoes_membros m
    join public.organizacoes o on o.id = m.organizacao_id
   where m.utilizador_id = p_user and m.removido_em is null
     and o.estado in ('ativa', 'pagamento_em_atraso')
$$;

revoke execute on function public.empresa_organizacao_ativa(uuid) from public, anon, authenticated;
grant execute on function public.empresa_organizacao_ativa(uuid) to service_role;

-- Período (mensalidade) que contém o dia de hoje; null se não houver.
create or replace function public.empresa_periodo_atual(p_org uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.empresa_periodos
   where organizacao_id = p_org and inicio <= public.empresa_hoje() and fim > public.empresa_hoje()
     and estado_pagamento <> 'anulado'
   order by inicio desc limit 1
$$;

revoke execute on function public.empresa_periodo_atual(uuid) from public, anon, authenticated;
grant execute on function public.empresa_periodo_atual(uuid) to service_role;

-- Quota do período em curso: {limite, usadas, disponiveis}.
create or replace function public.empresa_quota(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_periodo uuid := public.empresa_periodo_atual(p_org);
  v_limite integer;
  v_usadas integer;
begin
  select limite_facturas_mes into v_limite from public.organizacoes where id = p_org;
  v_limite := coalesce(v_limite, 0) + coalesce((
    select sum(facturas_adicionais) from public.empresa_quota_excecoes
     where organizacao_id = p_org and periodo_id = v_periodo), 0);
  select count(*) into v_usadas from public.empresa_documentos
   where organizacao_id = p_org and periodo_id = v_periodo and estado_quota in ('reservada', 'consumida');
  return jsonb_build_object('periodo_id', v_periodo, 'limite', v_limite, 'usadas', v_usadas,
                            'disponiveis', greatest(v_limite - v_usadas, 0));
end $$;

revoke execute on function public.empresa_quota(uuid) from public, anon, authenticated;
grant execute on function public.empresa_quota(uuid) to service_role;

-- ===========================================================================
-- 2. Instalações
-- ===========================================================================
-- {resultado: criada | sem_acesso | limite | nome_invalido | nome_repetido, id}
create or replace function public.empresa_criar_instalacao(p_user uuid, p_nome text, p_morada text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizacoes;
  v_id uuid;
begin
  v_org := public.empresa_organizacao_ativa(p_user);
  if v_org.id is null then return jsonb_build_object('resultado', 'sem_acesso'); end if;
  if coalesce(btrim(p_nome), '') = '' or char_length(btrim(p_nome)) > 120 then
    return jsonb_build_object('resultado', 'nome_invalido');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('empresa_instalacoes:' || v_org.id::text, 0));
  if (select count(*) from public.instalacoes where organizacao_id = v_org.id and desativada_em is null) >= v_org.limite_instalacoes then
    return jsonb_build_object('resultado', 'limite');
  end if;
  if exists (select 1 from public.instalacoes where organizacao_id = v_org.id and desativada_em is null
              and lower(btrim(nome)) = lower(btrim(p_nome))) then
    return jsonb_build_object('resultado', 'nome_repetido');
  end if;
  insert into public.instalacoes (organizacao_id, nome, morada)
  values (v_org.id, btrim(p_nome), nullif(btrim(coalesce(p_morada, '')), ''))
  returning id into v_id;
  return jsonb_build_object('resultado', 'criada', 'id', v_id);
end $$;

revoke execute on function public.empresa_criar_instalacao(uuid, text, text) from public, anon, authenticated;
grant execute on function public.empresa_criar_instalacao(uuid, text, text) to service_role;

-- ===========================================================================
-- 3. Carregamento: documento + instalação + quota
-- ===========================================================================
-- Configuração inicial (contrato e facturas históricas, D6): só durante a
-- revisão obrigatória (30 dias desde a activação) e até 3 facturas por
-- serviço permitido pelo plano (limite_servicos × 3).
--
-- {resultado: registado | sem_acesso | instalacao_invalida | quota_esgotada |
--  configuracao_terminada | configuracao_esgotada | caminho_invalido, documento_id}
create or replace function public.empresa_registar_documento(
  p_user uuid,
  p_instalacao uuid,
  p_tipo text,
  p_configuracao_inicial boolean,
  p_storage_path text,
  p_nome_ficheiro text,
  p_mime text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org public.organizacoes;
  v_quota jsonb;
  v_doc uuid;
  v_tipo text := case when p_tipo = 'contrato' then 'contrato' else 'fatura' end;
  v_estado_quota text;
begin
  v_org := public.empresa_organizacao_ativa(p_user);
  if v_org.id is null then return jsonb_build_object('resultado', 'sem_acesso'); end if;
  if p_storage_path is null or p_storage_path !~ ('^' || p_user::text || '/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$') then
    return jsonb_build_object('resultado', 'caminho_invalido');
  end if;
  if not exists (select 1 from public.instalacoes
                  where id = p_instalacao and organizacao_id = v_org.id and desativada_em is null) then
    return jsonb_build_object('resultado', 'instalacao_invalida');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('empresa_quota:' || v_org.id::text, 0));
  if v_tipo = 'contrato' then
    v_estado_quota := 'nao_conta';
  elsif coalesce(p_configuracao_inicial, false) then
    if v_org.revisao_obrigatoria_ate is null or now() > v_org.revisao_obrigatoria_ate then
      return jsonb_build_object('resultado', 'configuracao_terminada');
    end if;
    if (select count(*) from public.empresa_documentos d
          join public.documentos_monitor m on m.id = d.documento_id
         where d.organizacao_id = v_org.id and d.configuracao_inicial and m.tipo = 'fatura')
       >= v_org.limite_servicos * 3 then
      return jsonb_build_object('resultado', 'configuracao_esgotada');
    end if;
    v_estado_quota := 'nao_conta';
  else
    v_quota := public.empresa_quota(v_org.id);
    if (v_quota ->> 'disponiveis')::integer <= 0 then
      return jsonb_build_object('resultado', 'quota_esgotada');
    end if;
    v_estado_quota := 'reservada';
  end if;

  insert into public.documentos_monitor (utilizador_id, contrato_id, tipo, storage_path, nome_ficheiro, mime_type,
                                         etapa, etapa_atualizada_em)
  values (p_user, null, v_tipo, p_storage_path, left(p_nome_ficheiro, 200),
          case p_mime when 'application/pdf' then 'application/pdf' when 'image/jpeg' then 'image/jpeg'
                      when 'image/png' then 'image/png' when 'image/webp' then 'image/webp' end,
          'recebido', now())
  returning id into v_doc;

  insert into public.empresa_documentos (documento_id, organizacao_id, instalacao_id, configuracao_inicial,
                                         periodo_id, estado_quota)
  values (v_doc, v_org.id, p_instalacao, coalesce(p_configuracao_inicial, false) and v_tipo = 'fatura',
          case when v_estado_quota = 'reservada' then (v_quota ->> 'periodo_id')::uuid end, v_estado_quota);

  return jsonb_build_object('resultado', 'registado', 'documento_id', v_doc);
end $$;

revoke execute on function public.empresa_registar_documento(uuid, uuid, text, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.empresa_registar_documento(uuid, uuid, text, boolean, text, text, text) to service_role;

-- ===========================================================================
-- 4. Limite de serviços (o pipeline pergunta antes de criar um serviço novo)
-- ===========================================================================
create or replace function public.empresa_pode_criar_servico(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select count(c.id) < o.limite_servicos
      from public.organizacoes_membros m
      join public.organizacoes o on o.id = m.organizacao_id
      left join public.contratos_monitorizados c
        on c.utilizador_id = m.utilizador_id and c.desativado_em is null and c.estado <> 'terminado'
     where m.utilizador_id = p_user and m.removido_em is null
     group by o.limite_servicos
  ), false)
$$;

revoke execute on function public.empresa_pode_criar_servico(uuid) from public, anon, authenticated;
grant execute on function public.empresa_pode_criar_servico(uuid) to service_role;

-- ===========================================================================
-- 5. Resultado do processamento → quota
-- ===========================================================================
-- consumida: factura registada com total e período (resultado útil).
-- libertada: erro técnico, repetida, ilegível, fora do âmbito, sem resultado.
-- Contratos e configuração inicial (nao_conta) nunca mudam.
create or replace function public.empresa_documento_resultado(p_documento uuid, p_resultado text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
begin
  if p_resultado not in ('consumida', 'libertada') then raise exception 'empresa_documento_resultado: resultado inválido'; end if;
  select estado_quota into v_estado from public.empresa_documentos where documento_id = p_documento for update;
  if v_estado is null then return null; end if;
  if v_estado = 'nao_conta' then return v_estado; end if;
  update public.empresa_documentos set estado_quota = p_resultado where documento_id = p_documento;
  return p_resultado;
end $$;

revoke execute on function public.empresa_documento_resultado(uuid, text) from public, anon, authenticated;
grant execute on function public.empresa_documento_resultado(uuid, text) to service_role;

-- ===========================================================================
-- 6. Excepções à quota (admin, D6)
-- ===========================================================================
-- concedida | sem_permissao | invalida
create or replace function public.empresa_conceder_excecao(p_org uuid, p_admin uuid, p_facturas integer, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_periodo uuid := public.empresa_periodo_atual(p_org);
begin
  if not public.empresa_e_admin(p_admin) then return 'sem_permissao'; end if;
  if v_periodo is null or coalesce(p_facturas, 0) <= 0 or p_facturas > 50
     or coalesce(btrim(p_motivo), '') = '' or char_length(p_motivo) > 500 then
    return 'invalida';
  end if;
  insert into public.empresa_quota_excecoes (organizacao_id, periodo_id, facturas_adicionais, motivo, concedida_por)
  values (p_org, v_periodo, p_facturas, btrim(p_motivo), p_admin);
  return 'concedida';
end $$;

revoke execute on function public.empresa_conceder_excecao(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.empresa_conceder_excecao(uuid, uuid, integer, text) to service_role;

-- ===========================================================================
-- 7. Quota vista pela própria conta (portal, sessão aal2)
-- ===========================================================================
-- O portal lê com a sessão do cliente, nunca com a service role. As
-- excepções são só do admin (RLS); aqui chega apenas o total.
create or replace function public.empresa_quota_sessao()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not public.sessao_aal2() then return null; end if;
  select m.organizacao_id into v_org from public.organizacoes_membros m
   where m.utilizador_id = (select auth.uid()) and m.removido_em is null;
  if v_org is null then return null; end if;
  return public.empresa_quota(v_org) - 'periodo_id';
end $$;

revoke execute on function public.empresa_quota_sessao() from public, anon;
grant execute on function public.empresa_quota_sessao() to authenticated;
