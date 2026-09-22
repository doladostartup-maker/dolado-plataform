-- DoLado — Registo da primeira resposta pessoal ao cliente

alter table public.casos
  add column primeira_resposta_em timestamptz;

comment on column public.casos.primeira_resposta_em is 'Data/hora em que o Thiago respondeu pessoalmente ao cliente pela primeira vez. Nulo enquanto não respondido — usado para medir o cumprimento do prazo de 24 horas úteis.';
