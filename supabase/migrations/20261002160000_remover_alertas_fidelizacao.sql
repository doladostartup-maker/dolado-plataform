-- DoLado — Remover a tabela alertas_fidelizacao (02/10/2026)
--
-- Tabela do alerta público de fim de fidelização (formulário de
-- /por-que-assinar), retirado a 02/10/2026: nenhuma rotina enviava estes
-- avisos, os pedidos foram apagados (20261002120000) e a aplicação deixou de
-- escrever nela. Sem chaves estrangeiras, views, funções nem jobs que a
-- usem. Os alertas de fidelização da Proteção vivem em
-- alertas_fidelizacao_portal e não são tocados.

drop table public.alertas_fidelizacao;
