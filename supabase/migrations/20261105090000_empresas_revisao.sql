-- DoLado Empresas — Fase 6B: revisão humana dos documentos (D3) (24/10/2026)
--
-- Cada documento de empresa fica marcado como "revisão necessária" com os
-- motivos (calculados no servidor depois do registo — src/lib/empresas/
-- revisao.ts): primeiros 30 dias desde a activação (D3), confiança baixa em
-- campos usados, associação decidida pela empresa, diferença potencial
-- detectada, sector ou fornecedor novo para a organização, total diferente
-- da soma das linhas, primeira factura de um serviço, análise manual.
-- Enquanto não houver revisão registada, o resultado é provisório para a
-- empresa. Cada revisão grava os minutos e o tipo de erro (custo e qualidade
-- do piloto) em empresa_revisoes (só inserção).
--
-- Tipo A (aditiva): colunas novas com valor por omissão e funções novas.

alter table public.empresa_documentos
  add column revisao_necessaria boolean not null default false,
  add column revisao_motivos text[] not null default '{}',
  add column revisto_em timestamptz;

comment on column public.empresa_documentos.revisao_motivos is
  'Porque o documento precisa de revisão humana (D3). Valores: periodo_inicial, confianca_baixa, associacao_cliente, diferenca_potencial, sector_novo, fornecedor_novo, total_soma_linhas, primeira_fatura_servico, analise_manual.';

create index empresa_documentos_revisao_idx on public.empresa_documentos (created_at)
  where revisao_necessaria and revisto_em is null;

-- O membro (aal2) lê a marcação para mostrar «Em verificação pela DoLado».
-- (empresa_documentos já tem SELECT para authenticated; as colunas novas
-- entram nesse privilégio de tabela.)

-- ===========================================================================
-- 1. Marcar (servidor, depois do processamento)
-- ===========================================================================
create or replace function public.empresa_marcar_revisao(p_documento uuid, p_motivos text[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivos text[] := coalesce(p_motivos, '{}');
begin
  if exists (select 1 from unnest(v_motivos) m
              where m not in ('periodo_inicial', 'confianca_baixa', 'associacao_cliente', 'diferenca_potencial',
                              'sector_novo', 'fornecedor_novo', 'total_soma_linhas', 'primeira_fatura_servico',
                              'analise_manual')) then
    raise exception 'empresa_marcar_revisao: motivo desconhecido';
  end if;
  update public.empresa_documentos
     set revisao_necessaria = cardinality(v_motivos) > 0,
         revisao_motivos = v_motivos
   where documento_id = p_documento and revisto_em is null;
  return found;
end $$;

revoke execute on function public.empresa_marcar_revisao(uuid, text[]) from public, anon, authenticated;
grant execute on function public.empresa_marcar_revisao(uuid, text[]) to service_role;

-- ===========================================================================
-- 2. Registar a revisão (admin)
-- ===========================================================================
-- registada | sem_permissao | sem_documento | invalida
create or replace function public.empresa_registar_revisao(
  p_documento uuid,
  p_admin uuid,
  p_minutos integer,
  p_resultado text,
  p_tipo_erro text,
  p_nota text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not public.empresa_e_admin(p_admin) then return 'sem_permissao'; end if;
  if p_minutos is null or p_minutos < 0 or p_minutos > 600
     or p_resultado not in ('confirmado', 'corrigido', 'descartado')
     or (p_resultado = 'corrigido' and p_tipo_erro is null) then
    return 'invalida';
  end if;
  select organizacao_id into v_org from public.empresa_documentos where documento_id = p_documento for update;
  if v_org is null then return 'sem_documento'; end if;

  insert into public.empresa_revisoes (organizacao_id, alvo_tipo, alvo_id, revisor, minutos, resultado, tipo_erro, nota)
  values (v_org, 'documento', p_documento, p_admin, p_minutos, p_resultado, p_tipo_erro,
          nullif(left(btrim(coalesce(p_nota, '')), 1000), ''));
  update public.empresa_documentos set revisto_em = now() where documento_id = p_documento;
  return 'registada';
end $$;

revoke execute on function public.empresa_registar_revisao(uuid, uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.empresa_registar_revisao(uuid, uuid, integer, text, text, text) to service_role;
