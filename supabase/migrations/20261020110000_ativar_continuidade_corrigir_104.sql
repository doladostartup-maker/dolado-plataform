-- DoLado — activação das 4 regras da continuidade de serviço e correcção da
-- ENE_QUALIDADE_COMPENSACAO_104 (20/10/2026)
--
-- Regras criadas inactivas em 20261020100000_energia_continuidade_servico.sql.
-- Revistas e aprovadas por Thiago Pereira a 20/10/2026 (pedido expresso).
-- Auditoria: docs/legal/auditoria-interrupcoes-electricidade-2026-10-20.md.
--
-- 1. Activação: só muda ativa/revista_em/revista_por (o conteúdo não muda).
--    Falha se faltar alguma das 4.
-- 2. ENE_QUALIDADE_COMPENSACAO_104 (regra só de produção, criada no
--    backoffice): título e condições passam a dizer que é da qualidade de
--    serviço COMERCIAL e que as interrupções seguem o artigo 106.º. A nova
--    data de revisão vai na mesma alteração, para o trigger
--    regras_juridicas_revisao_ao_alterar não a desactivar. Numa base sem as
--    regras de Energia de produção (stack local, CI) não há nada a corrigir;
--    em produção, falha se a regra não ficar revista e activa.

do $$
declare
  v_codigos text[] := array['ENE_CONTINUIDADE_PADROES_24', 'ENE_CONTINUIDADE_PAGAMENTO_106', 'ENE_CONTINUIDADE_RESP_CIVIL_10', 'ENE_ASSISTENCIA_AVARIA_83'];
  v_n int;
begin
  update public.regras_juridicas
     set ativa = true, revista_em = '2026-10-20', revista_por = 'Thiago Pereira'
   where codigo = any (v_codigos);
  get diagnostics v_n = row_count;
  if v_n <> 4 then
    raise exception 'Esperadas 4 regras da continuidade de serviço, encontradas %', v_n;
  end if;
end $$;

do $$
declare
  v_n int;
begin
  update public.regras_juridicas
     set titulo = 'Compensações de qualidade de serviço comercial devem ser creditadas sem pedido',
         subcategoria = 'Compensação automática — serviço comercial',
         condicoes_aplicabilidade = 'Confirmar que ocorreu um incumprimento individual de qualidade de serviço comercial que dê direito a compensação (por exemplo, na resposta a reclamações, na activação ou desactivação do fornecimento, nas visitas combinadas, na assistência técnica após avaria ou no restabelecimento) e a data do facto ou do conhecimento pelo comercializador. Não aplicar às compensações por incumprimento dos padrões individuais de continuidade de serviço (interrupções do fornecimento), que seguem o artigo 106.º e prazos próprios (ver ENE_CONTINUIDADE_PAGAMENTO_106).',
         revista_em = '2026-10-20',
         revista_por = 'Thiago Pereira'
   where codigo = 'ENE_QUALIDADE_COMPENSACAO_104';
  get diagnostics v_n = row_count;

  if v_n = 0 then
    -- Sem a regra: só é aceitável numa base sem as regras de Energia de produção.
    if exists (select 1 from public.regras_juridicas where codigo in ('ENE_RECLAMACAO_PRAZO_60', 'ENE_RECLAMACAO_COMPENSACAO_61')) then
      raise exception 'ENE_QUALIDADE_COMPENSACAO_104 em falta numa base com as regras de Energia de produção';
    end if;
    raise notice 'ENE_QUALIDADE_COMPENSACAO_104 não existe nesta base (sem regras de Energia de produção): nada a corrigir.';
  elsif not exists (select 1 from public.regras_juridicas where codigo = 'ENE_QUALIDADE_COMPENSACAO_104' and ativa and revista_em = '2026-10-20') then
    raise exception 'ENE_QUALIDADE_COMPENSACAO_104 não ficou revista e activa';
  end if;
end $$;
