-- DoLado — Apagar os pedidos do alerta público de fidelização (02/10/2026)
--
-- O formulário "Subscrever o alerta, grátis" de /por-que-assinar foi
-- removido: gravava em alertas_fidelizacao, mas nenhuma rotina enviava
-- estes avisos (o cron só processa alertas_fidelizacao_portal, da
-- Proteção). Os pedidos guardados deixam de ter finalidade e são apagados
-- (decisão de Thiago, 02/10/2026). A tabela fica, sem escritas pela
-- aplicação; a sua remoção é uma decisão à parte.

delete from public.alertas_fidelizacao;

comment on table public.alertas_fidelizacao is 'LEGADO desde 02/10/2026 — o formulário público foi removido e os pedidos apagados. Sem escritas pela aplicação.';
