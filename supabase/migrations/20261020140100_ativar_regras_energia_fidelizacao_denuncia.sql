-- DoLado — activação das 2 regras de Electricidade: indemnização da fidelização e denúncia (20/10/2026)
--
-- Regras criadas inactivas em 20261020140000_energia_fidelizacao_denuncia.sql.
-- Revistas e aprovadas por Thiago Pereira a 20/10/2026 (pedido expresso).
-- Nota: o texto foi confrontado com o PDF da ERSE do RRC (publicação de
-- 2023). O Regulamento n.º 8/2026, que alterou o RRC, tem por objecto a
-- adaptação à mobilidade eléctrica; o seu texto não foi lido — confirmar na
-- próxima revisão que não alterou os artigos 19.º e 81.º.
--
-- Só muda ativa/revista_em/revista_por (não altera o conteúdo — o trigger
-- regras_juridicas_revisao_ao_alterar não retira a revisão). Falha se faltar
-- alguma das 2 regras.

do $$
declare
  v_codigos text[] := array['ENE_FIDELIZACAO_INDEMNIZACAO_19', 'ENE_DENUNCIA_SEM_ENCARGOS_81'];
  v_n int;
begin
  update public.regras_juridicas
     set ativa = true, revista_em = '2026-10-20', revista_por = 'Thiago Pereira'
   where codigo = any (v_codigos);
  get diagnostics v_n = row_count;
  if v_n <> 2 then
    raise exception 'Esperadas 2 regras de Electricidade (fidelização/denúncia), encontradas %', v_n;
  end if;
end $$;
