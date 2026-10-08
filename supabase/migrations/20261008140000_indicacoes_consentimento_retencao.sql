-- Consentimento e conservação do programa de indicação.
-- Visitas: máximo 30 dias, igual à janela do cookie e de atribuição.
-- Relação, primeira compra, recompensas e histórico: enquanto ativos/em revisão
-- e até 3 anos após o último estado final da relação ou recompensa, como
-- limite interno de minimização (não é prazo legal geral).

alter table public.indicacoes
  add column retencao_bloqueada boolean not null default false;

create index indicacoes_visitas_retencao_idx
  on public.indicacoes_visitas (criado_em);
create index indicacoes_retencao_idx
  on public.indicacoes (decidido_em)
  where estado in ('compra_confirmada', 'rejeitada', 'revertida') and retencao_bloqueada = false;

comment on column public.indicacoes.retencao_bloqueada is
  'Bloqueia a eliminação automática da indicação enquanto existir litígio, reclamação ou outra necessidade de conservação documentada. Alterar apenas por operação administrativa autorizada.';

comment on table public.indicacoes_codigos is
  'Código pseudonimizado associado à conta de quem indica. O código, quando ligado a user_id ou a outras informações identificativas, é dado pessoal.';

comment on table public.indicacoes_visitas is
  'Visita por link de indicação: código pseudonimizado e data/hora, sem endereço IP neste fluxo. O identificador é dado pessoal quando ligado a uma conta ou código de uma conta.';

-- Preserva a imutabilidade do histórico perante alterações diretas, mas permite
-- a eliminação em cascata quando a relação/recompensa completa o prazo de conservação.
create or replace function public.indicacoes_historico_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'indicacoes_recompensas_historico: registo de auditoria não pode ser alterado' using errcode = '42501';
end $$;

create or replace function public.indicacoes_limpar_dados(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_visitas int;
  n_indicacoes int;
begin
  -- O cookie e a janela de atribuição expiram aos 30 dias. A indicação conserva
  -- o código e a hora de visita; a FK da visita passa a null.
  delete from public.indicacoes_visitas
   where criado_em < p_agora - interval '30 days';
  get diagnostics n_visitas = row_count;

  -- Não apagar atribuições por decidir nem recompensas ativas/em revisão.
  -- A indicação, as recompensas e o histórico são eliminados em cascata quando
  -- o estado final já ultrapassou três anos e não existe bloqueio de retenção.
  delete from public.indicacoes i
   where i.estado in ('compra_confirmada', 'rejeitada', 'revertida')
     and not i.retencao_bloqueada
     and not exists (
       select 1
         from public.indicacoes_recompensas r
        where r.indicacao_id = i.id
          and r.estado in ('em_revisao', 'disponivel', 'reservada')
     )
     and coalesce(
       (
         select greatest(
           coalesce(i.decidido_em, '-infinity'::timestamptz),
           coalesce(r.usada_em, '-infinity'::timestamptz),
           coalesce(r.anulada_em, '-infinity'::timestamptz),
           coalesce(r.expirada_em, '-infinity'::timestamptz)
         )
           from public.indicacoes_recompensas r
          where r.indicacao_id = i.id
       ),
       i.decidido_em
     ) < p_agora - interval '3 years';
  get diagnostics n_indicacoes = row_count;

  return jsonb_build_object('visitas_eliminadas', n_visitas, 'indicacoes_eliminadas', n_indicacoes);
end $$;

revoke execute on function public.indicacoes_limpar_dados(timestamptz) from public, anon, authenticated;
grant execute on function public.indicacoes_limpar_dados(timestamptz) to service_role;

select cron.schedule(
  'indicacoes-limpar-dados-expirados',
  '25 4 * * *',
  $$select public.indicacoes_limpar_dados()$$
);
