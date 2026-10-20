-- DoLado — activação das 2 regras de danos do Código Civil (20/10/2026)
--
-- Regras criadas inactivas em 20261020120000_energia_danos_responsabilidade_civil.sql.
-- Revistas e aprovadas por Thiago Pereira a 20/10/2026 (pedido expresso).
-- Pontos ainda a confirmar com a advogada: docs/legal/auditoria-interrupcoes-electricidade-2026-10-20.md, secção C.
--
-- Só muda ativa/revista_em/revista_por (o conteúdo não muda). Falha se faltar
-- alguma das 2.

do $$
declare
  v_codigos text[] := array['ENE_DANOS_INSTALACAO_CC_509', 'ENE_DANOS_CULPA_CC_798'];
  v_n int;
begin
  update public.regras_juridicas
     set ativa = true, revista_em = '2026-10-20', revista_por = 'Thiago Pereira'
   where codigo = any (v_codigos);
  get diagnostics v_n = row_count;
  if v_n <> 2 then
    raise exception 'Esperadas 2 regras de danos do Código Civil, encontradas %', v_n;
  end if;
end $$;
