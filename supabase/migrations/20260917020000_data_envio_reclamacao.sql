-- DoLado — Data de envio da reclamação formal (backoffice)

alter table public.casos
  add column data_envio_reclamacao date;

comment on column public.casos.data_envio_reclamacao is 'Data em que a reclamação formal foi enviada ao operador — base para o prazo de 15 dias úteis de resposta. Opcional: nem todos os casos têm reclamação formal enviada ainda.';
