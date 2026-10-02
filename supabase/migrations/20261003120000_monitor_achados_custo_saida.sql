-- DoLado — Monitor de Proteção: achados da F2 e custo de saída (PR D)
--
-- O custo de saída (F4, telecomunicações) usa a mesma regra da Calculadora
-- de Cancelamento pública (src/lib/calculadoraCancelamento/regras.ts) e
-- precisa de três dados do contrato que ainda não existiam: o tipo de
-- fidelização, se houve nova instalação (só na refidelização) e se há
-- equipamento subsidiado. Ficam como os restantes campos: com proveniência
-- em contratos_campos e só escritos pelo servidor.
--
-- Os achados (achados_monitor / achados_revisoes) já existem desde
-- 20261003090000; são criados pelo servidor e revistos pelo admin antes de
-- qualquer comunicação ao cliente.

alter table public.contratos_monitorizados
  add column tipo_fidelizacao text check (tipo_fidelizacao in ('primeira', 'refidelizacao')),
  add column nova_instalacao text check (nova_instalacao in ('sim', 'nao')),
  add column equipamento_subsidiado text check (equipamento_subsidiado in ('sim', 'nao'));

alter table public.contratos_campos drop constraint contratos_campos_campo_check;
alter table public.contratos_campos add constraint contratos_campos_campo_check check (campo in (
  'fornecedor', 'referencia_contrato', 'servico', 'data_inicio', 'data_fim_fidelizacao',
  'data_fim_promocao', 'descricao_promocao', 'mensalidade_cents', 'vantagem_cents',
  'cessacao_operador_cents', 'cessacao_operador_data', 'cpe', 'cui',
  'tipo_fidelizacao', 'nova_instalacao', 'equipamento_subsidiado'
));

-- Valores destes três campos (o check das colunas só atua na coluna
-- canónica; aqui impede-se a entrada de um valor inválido na proveniência).
alter table public.contratos_campos add constraint contratos_campos_valor_opcoes_check check (
  campo not in ('tipo_fidelizacao', 'nova_instalacao', 'equipamento_subsidiado')
  or (campo = 'tipo_fidelizacao' and valor in ('"primeira"'::jsonb, '"refidelizacao"'::jsonb))
  or (campo in ('nova_instalacao', 'equipamento_subsidiado') and valor in ('"sim"'::jsonb, '"nao"'::jsonb))
);

create index achados_monitor_por_rever_idx
  on public.achados_monitor (created_at) where estado in ('detetado', 'em_revisao');
