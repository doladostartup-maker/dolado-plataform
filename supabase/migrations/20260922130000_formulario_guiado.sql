-- DoLado — Campos do formulário guiado de 5 passos (substitui o formulário
-- clássico na landing; o clássico continua disponível em /pedido-classico).

alter table public.casos
  add column if not exists empresa text,
  add column if not exists problema_tipo text,
  add column if not exists momento_cliente text,
  add column if not exists origem text,
  add column if not exists consentimento_tratamento_em timestamptz,
  add column if not exists consentimento_alertas boolean not null default false,
  add column if not exists consentimento_alertas_em timestamptz;

comment on column public.casos.empresa is 'Nome da empresa visada, indicado livremente pelo cliente (distinto de empresa_parceira, que é o parceiro B2B2C, ex. Remax).';
comment on column public.casos.problema_tipo is 'Categoria geral do problema escolhida no formulário guiado (Aumento de mensalidade, Cobrança indevida, etc.) — distinto de tipo_problema, que é específico do sector no formulário clássico.';
comment on column public.casos.momento_cliente is 'Se o cliente já reclamou junto da empresa antes de nos contactar, e com que resultado.';
comment on column public.casos.origem is 'Caminho de entrada no formulário guiado (/, /remax, /sem-resposta, ou valor de ?origem=).';
comment on column public.casos.consentimento_tratamento_em is 'Data/hora em que o cliente aceitou o tratamento de dados no formulário guiado.';
comment on column public.casos.consentimento_alertas is 'Se o cliente aceitou receber alertas de fim de fidelização e mudanças no sector — opcional, falso por omissão.';
comment on column public.casos.consentimento_alertas_em is 'Data/hora em que o consentimento de alertas foi dado, se aplicável.';
