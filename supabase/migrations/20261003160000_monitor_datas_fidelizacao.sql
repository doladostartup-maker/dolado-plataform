-- Monitor de Proteção — datas da fidelização (03/10/2026).
--
-- A data de assinatura de um contrato não é necessariamente o início do
-- contrato nem da fidelização: muitos contratos de telecomunicações começam
-- na data de instalação/ativação. Até aqui havia só "data_inicio", e a
-- leitura automática chegou a gravar a data de assinatura nesse campo.
--
-- Campos novos (com proveniência em contratos_campos, como os restantes):
--   * data_assinatura            — data de assinatura/adesão;
--   * data_ativacao              — data de instalação/ativação (início do contrato);
--   * duracao_fidelizacao_meses  — duração da fidelização em meses;
--   * inicio_na_ativacao         — 'sim' se o documento disser que o contrato
--                                  começa na instalação/ativação.
-- data_inicio passa a ser o início da fidelização quando indicado de forma
-- explícita. O início considerado é data_inicio, ou, na falta dele,
-- data_ativacao; a data de assinatura nunca é usada como início.
--
-- Fim calculado: com início + duração e sem fim indicado (documento, cliente
-- ou DoLado), o servidor calcula data_fim_fidelizacao e regista-a com origem
-- "calculado". Um fim indicado prevalece sempre e nunca é substituído por um
-- cálculo; um fim calculado acompanha as alterações do início e da duração.

alter table public.contratos_monitorizados
  add column data_assinatura date,
  add column data_ativacao date,
  add column duracao_fidelizacao_meses integer check (duracao_fidelizacao_meses between 1 and 60),
  add column inicio_na_ativacao text check (inicio_na_ativacao in ('sim', 'nao'));

comment on column public.contratos_monitorizados.data_inicio is
  'Início da fidelização, quando indicado de forma explícita. Nunca a data de assinatura.';
comment on column public.contratos_monitorizados.data_assinatura is
  'Data de assinatura/adesão. Não é usada como início do contrato nem da fidelização.';
comment on column public.contratos_monitorizados.data_ativacao is
  'Data de instalação/ativação (início do contrato). Início da fidelização na falta de data_inicio.';
comment on column public.contratos_monitorizados.inicio_na_ativacao is
  'sim = o documento diz que o contrato começa na instalação/ativação.';

alter table public.contratos_campos drop constraint contratos_campos_campo_check;
alter table public.contratos_campos add constraint contratos_campos_campo_check check (campo in (
  'fornecedor', 'referencia_contrato', 'servico', 'data_inicio', 'data_fim_fidelizacao',
  'data_fim_promocao', 'descricao_promocao', 'mensalidade_cents', 'vantagem_cents',
  'cessacao_operador_cents', 'cessacao_operador_data', 'cpe', 'cui',
  'tipo_fidelizacao', 'nova_instalacao', 'equipamento_subsidiado',
  'data_assinatura', 'data_ativacao', 'duracao_fidelizacao_meses', 'inicio_na_ativacao'
));

alter table public.contratos_campos drop constraint contratos_campos_valor_opcoes_check;
alter table public.contratos_campos add constraint contratos_campos_valor_opcoes_check check (
  (campo not in ('tipo_fidelizacao', 'nova_instalacao', 'equipamento_subsidiado', 'inicio_na_ativacao', 'duracao_fidelizacao_meses'))
  or (campo = 'tipo_fidelizacao' and valor in ('"primeira"'::jsonb, '"refidelizacao"'::jsonb))
  or (campo in ('nova_instalacao', 'equipamento_subsidiado', 'inicio_na_ativacao') and valor in ('"sim"'::jsonb, '"nao"'::jsonb))
  or (campo = 'duracao_fidelizacao_meses' and jsonb_typeof(valor) = 'number'
      and (valor #>> '{}')::numeric = trunc((valor #>> '{}')::numeric)
      and (valor #>> '{}')::numeric between 1 and 60)
);

-- Origem "calculado": só o fim da fidelização, só escrito por
-- monitor_fim_fidelizacao_calcular().
alter table public.contratos_campos drop constraint contratos_campos_origem_check;
alter table public.contratos_campos add constraint contratos_campos_origem_check
  check (origem in ('cliente', 'contrato', 'fatura', 'admin', 'calculado'));
alter table public.contratos_campos add constraint contratos_campos_calculado_check
  check (origem <> 'calculado' or campo = 'data_fim_fidelizacao');

-- ===========================================================================
-- Fim da fidelização calculado (início + duração)
-- ===========================================================================
create or replace function public.monitor_fim_fidelizacao_calcular(p_contrato uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contratos_monitorizados;
  v_atual public.contratos_campos;
  v_inicio date;
  v_fim date;
begin
  select * into c from public.contratos_monitorizados where id = p_contrato;
  if not found then
    return;
  end if;

  select * into v_atual from public.contratos_campos
   where contrato_id = p_contrato and campo = 'data_fim_fidelizacao' and estado = 'atual';

  -- Um fim indicado (documento, cliente, DoLado) prevalece sempre.
  if v_atual.id is not null and v_atual.origem <> 'calculado' then
    return;
  end if;

  v_inicio := coalesce(c.data_inicio, c.data_ativacao);
  if v_inicio is not null and c.duracao_fidelizacao_meses is not null then
    -- Postgres limita o dia ao fim do mês (31/01 + 1 mês = 28/02), como
    -- somarMeses() em src/lib/calculadoraCancelamento/regras.ts.
    v_fim := (v_inicio + make_interval(months => c.duracao_fidelizacao_meses))::date;
  end if;

  if v_atual.id is not null and v_fim is not null and v_atual.valor = to_jsonb(v_fim::text) then
    return;
  end if;
  if v_atual.id is null and v_fim is null then
    return;
  end if;

  if v_atual.id is not null then
    update public.contratos_campos set estado = 'substituido', substituido_em = now() where id = v_atual.id;
  end if;

  if v_fim is null then
    update public.contratos_monitorizados set data_fim_fidelizacao = null where id = p_contrato;
    return;
  end if;

  insert into public.contratos_campos (contrato_id, utilizador_id, campo, valor, origem, estado)
  values (p_contrato, c.utilizador_id, 'data_fim_fidelizacao', to_jsonb(v_fim::text), 'calculado', 'atual');
  update public.contratos_monitorizados set data_fim_fidelizacao = v_fim where id = p_contrato;
end $$;

revoke execute on function public.monitor_fim_fidelizacao_calcular(uuid) from public, anon, authenticated;
grant execute on function public.monitor_fim_fidelizacao_calcular(uuid) to service_role;

-- Estado do contrato: recalcula primeiro o fim da fidelização; o início
-- considerado é data_inicio ou data_ativacao.
create or replace function public.monitor_recalcular_estado(p_contrato uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contratos_monitorizados;
  v_estado text;
begin
  perform public.monitor_fim_fidelizacao_calcular(p_contrato);

  select * into c from public.contratos_monitorizados where id = p_contrato;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;
  if c.estado = 'terminado' then
    return c.estado;
  end if;

  if exists (select 1 from public.contratos_campos where contrato_id = p_contrato and estado = 'em_conflito') then
    v_estado := 'a_confirmar';
  elsif c.fornecedor is not null and c.mensalidade_cents is not null and c.data_fim_fidelizacao is not null
        and (c.setor <> 'telecomunicacoes'
             or (coalesce(c.data_inicio, c.data_ativacao) is not null and c.vantagem_cents is not null)) then
    v_estado := 'completo';
  else
    v_estado := 'parcial';
  end if;

  if v_estado is distinct from c.estado then
    update public.contratos_monitorizados set estado = v_estado where id = p_contrato;
  end if;
  return v_estado;
end $$;

revoke execute on function public.monitor_recalcular_estado(uuid) from public, anon, authenticated;
grant execute on function public.monitor_recalcular_estado(uuid) to service_role;
