-- DoLado — Consentimento do cliente (Fase 3)

alter table public.casos
  add column autorizacao boolean not null default false;

comment on column public.casos.autorizacao is 'Consentimento do cliente para tratamento da reclamação, recolhido no formulário de abertura de caso.';
