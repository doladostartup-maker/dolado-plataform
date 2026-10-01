-- DoLado — Simulador de Elegibilidade: fim da tabela antiga (01/10/2026)
--
-- O simulador passou a ser público e corre só no browser: não grava nada.
-- casos_elegibilidade_portal fica apenas com os registos da versão antiga,
-- até serem apagados (decisão de Thiago, 01/10/2026):
--   * registos ainda em revisão ('em_revisao') mantêm-se;
--   * os restantes (já decididos/enviados) apagam-se aos 30 dias — agora e
--     todos os dias por pg_cron;
--   * não se guardam agregados: os dados antigos (outras perguntas) não têm
--     utilidade para a medição do novo simulador;
--   * ninguém cria nem altera registos (nem o servidor com service_role);
--   * o cliente deixa de ler o histórico (já não há página no portal).
-- Sem revisões pendentes à data, /backoffice/elegibilidade foi retirado.
-- Quando a tabela ficar vazia (a partir de 31/10/2026), pode ser removida
-- numa migration própria, junto com o job 'limpar-elegibilidade-antiga'.

-- Cliente: deixa de ler. Admin: só lê e apaga (sem criar nem editar).
drop policy "Cliente vê os próprios casos de elegibilidade" on public.casos_elegibilidade_portal;
drop policy "Admin gere todos os casos de elegibilidade" on public.casos_elegibilidade_portal;

create policy "Admin lê os casos de elegibilidade antigos"
  on public.casos_elegibilidade_portal for select
  using (public.is_admin());

create policy "Admin apaga casos de elegibilidade antigos"
  on public.casos_elegibilidade_portal for delete
  using (public.is_admin());

revoke insert, update on public.casos_elegibilidade_portal from anon, authenticated, service_role;

comment on table public.casos_elegibilidade_portal is
  'LEGADO — versão antiga do Simulador de Elegibilidade (até 01/10/2026). Sem novas escritas. Registos decididos apagados aos 30 dias (limpar_casos_elegibilidade_antigos); em revisão mantêm-se.';

-- Limpeza: devolve o número de registos apagados. Só o dono (postgres, que
-- corre o pg_cron) a executa.
create or replace function public.limpar_casos_elegibilidade_antigos()
returns integer
language sql
set search_path = ''
as $$
  with apagados as (
    delete from public.casos_elegibilidade_portal
    where estado_elegibilidade <> 'em_revisao'
      and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from apagados;
$$;

revoke execute on function public.limpar_casos_elegibilidade_antigos() from public, anon, authenticated, service_role;

select public.limpar_casos_elegibilidade_antigos();

select cron.schedule(
  'limpar-elegibilidade-antiga',
  '30 3 * * *',
  $$select public.limpar_casos_elegibilidade_antigos()$$
);
