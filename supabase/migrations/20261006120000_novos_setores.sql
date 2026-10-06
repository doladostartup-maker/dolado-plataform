-- DoLado — novos setores: Gás, Compras & Reembolsos, Ginásios (06/10/2026)
--
-- Os setores dos casos vivem em SETORES (src/lib/pedidoCaso.ts).
-- casos.sector e pedidos_caso.sector são texto sem `check` (validados no
-- servidor), por isso não mudam. Só três tabelas limitam o setor a uma lista
-- fechada e passam a aceitar os novos valores:
--   - preferencias_setor / avisos_setoriais (Aviso Sectorial);
--   - regras_juridicas (base jurídica da sugestão do texto pela IA).
-- Valores existentes mantêm-se; nenhum dado é alterado.
-- casos_elegibilidade_portal (legado, sem escritas) fica como está.

do $$
declare
  r record;
begin
  -- Retira os `check` antigos do setor, seja qual for o nome com que foram
  -- criados (inline → <tabela>_setor_check), para não ficarem a recusar os
  -- valores novos ao lado do `check` novo.
  for r in
    select c.conrelid::regclass as tabela, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.preferencias_setor'::regclass, 'public.avisos_setoriais'::regclass, 'public.regras_juridicas'::regclass)
      and pg_get_constraintdef(c.oid) like '%setor%'
      and pg_get_constraintdef(c.oid) like '%Telecomunicações%'
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
  end loop;
end
$$;

alter table public.preferencias_setor
  add constraint preferencias_setor_setor_check
  check (setor in ('Telecomunicações', 'Energia', 'Gás', 'Água', 'Compras & Reembolsos', 'Ginásios'));

alter table public.avisos_setoriais
  add constraint avisos_setoriais_setor_check
  check (setor in ('Telecomunicações', 'Energia', 'Gás', 'Água', 'Compras & Reembolsos', 'Ginásios'));

-- null = regra para qualquer setor (como antes).
alter table public.regras_juridicas
  add constraint regras_juridicas_setor_check
  check (setor in ('Telecomunicações', 'Energia', 'Gás', 'Água', 'Compras & Reembolsos', 'Ginásios'));
