-- DoLado — Auditoria de segurança de 30/09/2026: elegibilidade e faturas
--
-- Problema: as policies "Cliente cria…" só validavam utilizador_id. Chamando
-- a API diretamente, um cliente podia criar linhas próprias já com
-- estado_final (a decisão que, pelas regras de uso de IA, só a regra
-- determinística do servidor ou o Thiago podem tomar), com uma sugestão da
-- IA forjada, ou com uma comparação de fatura "concluída" com valores e
-- análise inventados.
--
-- Correção: as Server Actions do portal passaram a gravar estas linhas com
-- a service role, depois de validar a sessão (dono = user.id da sessão).
-- O cliente deixa de poder criar linhas diretamente; continua a ler as
-- próprias (policies "Cliente vê…", inalteradas). O admin continua a gerir
-- tudo pela policy "Admin gere…".

drop policy "Cliente cria os próprios casos de elegibilidade" on public.casos_elegibilidade_portal;
drop policy "Cliente cria as próprias comparações de fatura" on public.comparacoes_fatura_portal;
