-- DoLado — Monitor de Proteção: "Deixar de acompanhar" falhava (05/10/2026).
--
-- Apagar um serviço (contratos_monitorizados) ou um documento
-- (documentos_monitor) dispara as ações referenciais ON DELETE SET NULL das
-- tabelas de prova. Essas ações são um UPDATE na tabela filha, e os triggers
-- de imutabilidade recusavam-no:
--   * associacoes_documento.contrato_id      → "Registo só de inserção"
--   * documentos_tipo_alteracoes.contrato_id → "Registo só de inserção"
--   * servicos_identificadores.documento_id  → "Registo só de inserção"
--   * eventos_servico.contrato_versao_id     → "Um evento do histórico não pode ser alterado"
--   * contratos_versoes.documento_id (versão fechada) → "Uma versão fechada…"
-- Resultado: o DELETE inteiro era revertido e o cliente via "Não foi possível
-- concluir o pedido" — em qualquer serviço com uma decisão de associação
-- registada (todos os documentos lidos desde 04/10/2026), não só no último.
-- A mesma falha atingia a limpeza dos 6 meses (apagar_documento_monitor_expirado,
-- limpar_alertas_desativados).
--
-- Correção: os triggers aceitam, e só dentro de uma ação referencial
-- (pg_trigger_depth() > 1), que as colunas de referência indicadas passem a
-- null. Qualquer outro UPDATE continua recusado, incluindo um UPDATE direto
-- que ponha essas colunas a null.

-- ===========================================================================
-- 1. Só inserção, com exceção para ON DELETE SET NULL
-- ===========================================================================
-- Argumentos do trigger: as colunas com ON DELETE SET NULL.

create or replace function public.monitor_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_coluna text;
begin
  if pg_trigger_depth() > 1 and tg_nargs > 0 then
    foreach v_coluna in array tg_argv loop
      if v_new -> v_coluna = 'null'::jsonb then
        v_old := v_old - v_coluna;
        v_new := v_new - v_coluna;
      end if;
    end loop;
    if v_old = v_new then
      return new;
    end if;
  end if;
  raise exception 'Registo só de inserção (%)', tg_table_name using errcode = '42501';
end $$;

revoke execute on function public.monitor_so_insercao() from public, anon, authenticated;

drop trigger servicos_identificadores_so_insercao on public.servicos_identificadores;
create trigger servicos_identificadores_so_insercao before update on public.servicos_identificadores
  for each row execute function public.monitor_so_insercao('documento_id');

drop trigger associacoes_documento_so_insercao on public.associacoes_documento;
create trigger associacoes_documento_so_insercao before update on public.associacoes_documento
  for each row execute function public.monitor_so_insercao('contrato_id');

drop trigger documentos_tipo_alteracoes_so_insercao on public.documentos_tipo_alteracoes;
create trigger documentos_tipo_alteracoes_so_insercao before update on public.documentos_tipo_alteracoes
  for each row execute function public.monitor_so_insercao('contrato_id');

-- ===========================================================================
-- 2. Eventos do histórico: a versão do contrato apagada passa a null
-- ===========================================================================

create or replace function public.eventos_servico_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ignorar text[] := array['substituido_em', 'achado_id'];
begin
  if pg_trigger_depth() > 1 and new.contrato_versao_id is null then
    v_ignorar := array_append(v_ignorar, 'contrato_versao_id');
  end if;
  if (to_jsonb(new) - v_ignorar) is distinct from (to_jsonb(old) - v_ignorar)
     or (old.substituido_em is not null and new.substituido_em is distinct from old.substituido_em) then
    raise exception 'Um evento do histórico não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.eventos_servico_imutavel() from public, anon, authenticated;

-- ===========================================================================
-- 3. Versões fechadas: o documento de origem apagado passa a null
-- ===========================================================================

create or replace function public.contratos_versoes_fechadas_imutaveis()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.valido_ate is not null then
    if pg_trigger_depth() > 1
       and new.documento_id is null
       and (to_jsonb(new) - 'documento_id' - 'updated_at') = (to_jsonb(old) - 'documento_id' - 'updated_at') then
      return new;
    end if;
    raise exception 'Uma versão fechada do contrato não pode ser alterada' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.contratos_versoes_fechadas_imutaveis() from public, anon, authenticated;
