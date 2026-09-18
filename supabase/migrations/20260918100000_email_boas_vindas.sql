-- DoLado — Registo do envio do email de boas-vindas

alter table public.casos
  add column email_boas_vindas_enviado_em timestamptz;

comment on column public.casos.email_boas_vindas_enviado_em is 'Data/hora do último envio do email de boas-vindas via Brevo. Nulo enquanto não enviado.';
