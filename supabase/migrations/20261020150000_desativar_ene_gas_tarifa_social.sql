-- DoLado — desactivar ENE_GAS_TARIFA_SOCIAL_AUTO_6 (20/10/2026)
--
-- Auditoria docs/legal/auditoria-energia-facturacao-contratacao-2026-10-20.md,
-- J4 (P2), por decisão de Thiago a 20/10/2026: a regra é sobre a tarifa
-- social do gás natural (DL 101/2011), mas está no sector Energia — chegava a
-- casos de electricidade e nunca a casos de Gás. Duplica GAS_TARIFA_SOCIAL_DL101
-- (sector Gás, carga 4).
--
-- Só muda `ativa` (ligar/desligar não retira a revisão — trigger
-- regras_juridicas_revisao_ao_alterar). A regra não é apagada.
--
-- A regra só existe em produção (carregada antes do histórico de migrations):
-- numa base local sem ela, a migration não faz nada.

do $$
declare
  v_n int;
begin
  update public.regras_juridicas
     set ativa = false
   where codigo = 'ENE_GAS_TARIFA_SOCIAL_AUTO_6';
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise notice 'ENE_GAS_TARIFA_SOCIAL_AUTO_6 não existe nesta base de dados (normal fora de produção).';
  end if;
end $$;
