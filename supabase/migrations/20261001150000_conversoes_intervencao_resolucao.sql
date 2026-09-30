-- DoLado — Backoffice: resolver conversões Avulso com intervenção manual
--
-- Um reembolso de conversão que falha (ou é recusado pelo Stripe) fica com
-- requer_intervencao = true. O admin resolve-o no Stripe e regista aqui o
-- que foi feito. Só as colunas de resolução são alteráveis pelo admin —
-- montantes, estado da conversão e dados do Stripe continuam a ser escritos
-- apenas pelo backend (service_role).

alter table public.conversoes_avulso
  add column intervencao_resolvida_em timestamptz,
  add column intervencao_resolvida_por uuid references public.utilizadores (id) on delete set null,
  add column intervencao_nota text;

comment on column public.conversoes_avulso.intervencao_nota is 'O que o admin fez para resolver a intervenção (ex.: reembolso criado manualmente no Stripe).';

create index conversoes_avulso_intervencao_idx on public.conversoes_avulso (requer_intervencao)
  where requer_intervencao;

create policy "Admin resolve intervenções de conversão" on public.conversoes_avulso
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Privilégio por coluna: mesmo o admin só altera a resolução.
grant update (requer_intervencao, intervencao_resolvida_em, intervencao_resolvida_por, intervencao_nota, updated_at)
  on public.conversoes_avulso to authenticated;
