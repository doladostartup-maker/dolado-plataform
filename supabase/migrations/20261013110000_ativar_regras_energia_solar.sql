-- DoLado — ativação das 17 regras de Energia Solar / Autoconsumo (13/10/2026)
--
-- Regras criadas inativas em 20261013100000_energia_solar_autoconsumo.sql.
-- Revistas e aprovadas por Thiago Pereira a 13/10/2026 (pedido expresso).
-- Pontos ainda a confirmar com a advogada: docs/legal/implementacao-energia-solar-2026-10-13.md, secção 5.
--
-- Só muda ativa/revista_em/revista_por (não altera o conteúdo — o trigger
-- regras_juridicas_revisao_ao_alterar não retira a revisão). Falha se faltar
-- alguma das 17 regras.

do $$
declare
  v_codigos text[] := array[
    'GAR_EMPREITADA_3', 'GAR_ENTREGA_INSTALACAO_11', 'GAR_RECUSA_PAGAMENTO_15_7', 'GAR_COMERCIAL_43', 'GAR_PRODUTOR_DIRETO_40',
    'CONS_REPARACAO_DANOS_12', 'CRED_COLIGADO_18', 'DIST_FORA_ESTAB_FORMA_9', 'DIST_ACESSORIOS_16',
    'UPAC_CONTROLO_PREVIO_11_81', 'UPAC_CERTIFICADO_EXPLORACAO_81A', 'UPAC_INSTALADOR_84', 'UPAC_EQUIPAMENTOS_CERTIFICADOS_96', 'UPAC_DEVERES_AUTOCONSUMIDOR_88',
    'CAER_AMBITO_FORMA_2_4', 'CAER_INFORMACAO_5_6', 'CAER_EMPRESA_DGEG_3'];
  v_n int;
begin
  update public.regras_juridicas
     set ativa = true, revista_em = '2026-10-13', revista_por = 'Thiago Pereira'
   where codigo = any (v_codigos);
  get diagnostics v_n = row_count;
  if v_n <> 17 then
    raise exception 'Esperadas 17 regras de Energia Solar / Autoconsumo, encontradas %', v_n;
  end if;
end $$;
