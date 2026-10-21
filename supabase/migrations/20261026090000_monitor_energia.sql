-- DoLado — Monitor de Protecção: electricidade e gás natural (21/10/2026).
--
-- As facturas de electricidade e gás passam a ter, além das linhas, os dados
-- normalizados de cada fornecimento (src/lib/monitor/energia.ts, leitura
-- fatura_v4): potência, termo fixo, consumos e preços por período horário,
-- leituras reais/estimadas, acertos, impostos, descontos e serviços
-- adicionais. A comparação continua a ser feita pelo código
-- (comparacaoEnergia.ts, regra energia_v1) e o resultado continua a ser
-- gravado em eventos_servico; as situações "atencao" geram achados para
-- revisão humana, como nas telecomunicações.
--
-- Sem dados novos de identificação: o CPE/CUI fica só como pseudónimo HMAC
-- (como o NIF), nunca em claro.
--
-- Aplicar com `supabase db push --linked` ANTES do merge que faz o deploy:
-- o código novo grava faturas_monitor.energia e eventos com os tipos novos.

-- ===========================================================================
-- 1. Fornecimentos de energia na factura
-- ===========================================================================

alter table public.faturas_monitor
  add column energia jsonb not null default '[]'::jsonb
    check (jsonb_typeof(energia) = 'array' and jsonb_array_length(energia) <= 4);

comment on column public.faturas_monitor.energia is
  'Electricidade e gás: um elemento por fornecimento (tipo, pseudónimo do CPE/CUI, período, dias, potência, termo fixo, consumos e preços por período horário em µ€/kWh, leituras, acertos, impostos, descontos, serviços adicionais, total). [] nos outros sectores e nas facturas lidas antes da fatura_v4. Valores OBSERVADOS, nunca condições contratuais.';

-- ===========================================================================
-- 2. Tipos de eventos e de achados
-- ===========================================================================

alter table public.eventos_servico drop constraint eventos_servico_tipo_check;
alter table public.eventos_servico add constraint eventos_servico_tipo_check check (tipo in (
  'sem_alteracao_relevante', 'mensalidade_conforme', 'mensalidade_alterada', 'mensalidade_mantida',
  'diferenca_preco_contrato', 'promocao_aplicada', 'promocao_em_falta', 'promocao_alterada',
  'promocao_terminada', 'consumo_adicional', 'servico_extra', 'cobranca_recorrente_nova',
  'cobranca_pontual', 'credito_aplicado', 'alteracao_impostos', 'alteracao_periodo',
  'servico_alterado', 'diferenca_nao_explicada', 'possivel_duplicado', 'fidelizacao_diferente',
  'servico_errado', 'dados_insuficientes', 'primeira_fatura', 'desconhecido',
  'contrato_adicionado', 'alerta_enviado',
  -- electricidade e gás (energia_v1)
  'energia_variacao', 'energia_preco_alterado', 'energia_preco_indexado', 'energia_termo_fixo_alterado',
  'energia_potencia_alterada', 'energia_tarifario_alterado', 'energia_consumo_superior',
  'energia_leitura_estimada', 'energia_acerto', 'energia_servico_adicional', 'energia_dados_insuficientes'
));

alter table public.achados_monitor drop constraint achados_monitor_tipo_check;
alter table public.achados_monitor add constraint achados_monitor_tipo_check check (tipo in (
  'aumento_nao_explicado', 'linha_nova', 'possivel_dupla_faturacao', 'cessacao_divergente',
  'mensalidade_alterada', 'diferenca_preco_contrato', 'promocao_em_falta', 'promocao_alterada',
  'cobranca_recorrente_nova', 'possivel_duplicado', 'fidelizacao_diferente', 'diferenca_nao_explicada',
  -- electricidade e gás (energia_v1)
  'energia_preco_alterado', 'energia_termo_fixo_alterado', 'energia_potencia_alterada',
  'energia_tarifario_alterado', 'energia_acerto_relevante', 'energia_servico_adicional'
));
