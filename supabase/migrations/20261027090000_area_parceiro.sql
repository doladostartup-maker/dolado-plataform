-- DoLado — Programa de Parceiros: área do parceiro (21/10/2026)
--
-- Decisão de Thiago (21/10/2026): o Parceiro de Indicação passa a ter uma área
-- própria em portal.dolado.pt (/portal/parceiro), com a mesma conta de sempre
-- (Supabase Auth). Valores e prazos das comissões não mudam; o Avulso continua
-- sem comissão.
--
-- Regras:
--   - o acesso é dado só pelo admin, a uma conta de cliente com o e-mail
--     confirmado (parceiro_area_conceder); retirar = revogado_em (nada apagado);
--   - uma conta só pode estar ligada a um parceiro de cada vez;
--   - o parceiro só vê números agregados e os próprios pagamentos, por uma
--     única função (parceiro_area_resumo, SECURITY DEFINER com auth.uid()):
--     nunca linhas por cliente, datas de compras, nomes, e-mails nem casos;
--   - a conta com acesso nunca pode ser atribuída a esse parceiro
--     (auto-indicação), e uma conta já indicada por ele não recebe o acesso.

-- ---------------------------------------------------------------------------
-- 1. Acessos à área do parceiro
-- ---------------------------------------------------------------------------
create table public.parceiros_area_acessos (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  concedido_por uuid references public.utilizadores (id) on delete set null,
  concedido_em timestamptz not null default now(),
  revogado_em timestamptz,
  revogado_por uuid references public.utilizadores (id) on delete set null,
  revogado_motivo text check (revogado_motivo is null or char_length(revogado_motivo) <= 500),
  created_at timestamptz not null default now(),
  check ((revogado_em is null) = (revogado_por is null))
);

comment on table public.parceiros_area_acessos is
  'Contas com acesso à área do parceiro (/portal/parceiro). Dado e retirado só pelo admin; retirar = revogado_em (nunca apagado). A conta lê só as próprias linhas.';

-- Uma conta, um parceiro activo de cada vez.
create unique index parceiros_area_acessos_conta_ativa
  on public.parceiros_area_acessos (user_id) where revogado_em is null;
create index parceiros_area_acessos_parceiro_idx on public.parceiros_area_acessos (parceiro_id);

create trigger parceiros_historico after insert or update on public.parceiros_area_acessos
  for each row execute function public.parceiros_registar_historico();

-- Só a revogação (uma vez) pode ser gravada depois de criado. Apagar só em
-- cascata (conta apagada).
create or replace function public.parceiros_area_acessos_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'parceiros_area_acessos: retirar o acesso em vez de apagar' using errcode = '42501';
  end if;
  if old.revogado_em is not null
     or new.parceiro_id is distinct from old.parceiro_id
     or new.user_id is distinct from old.user_id
     or new.concedido_por is distinct from old.concedido_por
     or new.concedido_em is distinct from old.concedido_em
     or new.created_at is distinct from old.created_at then
    raise exception 'parceiros_area_acessos: só a revogação pode ser gravada' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger parceiros_area_acessos_imutavel before update or delete on public.parceiros_area_acessos
  for each row execute function public.parceiros_area_acessos_imutavel();

alter table public.parceiros_area_acessos enable row level security;

-- A conta só lê as próprias linhas (para mostrar a entrada "Área de parceiro").
create policy "parceiros_area_acessos: conta lê as próprias"
  on public.parceiros_area_acessos for select to authenticated
  using (user_id = (select auth.uid()));
create policy "parceiros_area_acessos: admin lê"
  on public.parceiros_area_acessos for select to authenticated
  using (public.is_admin());

revoke all on public.parceiros_area_acessos from anon, authenticated;
grant select (id, parceiro_id, user_id, concedido_em, revogado_em) on public.parceiros_area_acessos to authenticated;
grant select, insert, update on public.parceiros_area_acessos to service_role;

-- ---------------------------------------------------------------------------
-- 2. Dar e retirar o acesso (admin, pelo servidor)
-- ---------------------------------------------------------------------------
-- concedido | ja_tem | sem_conta | email_por_confirmar | conta_admin |
-- outro_parceiro | indicada_pelo_parceiro | parceiro_inativo
create or replace function public.parceiro_area_conceder(p_parceiro uuid, p_email text, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parceiro public.parceiros%rowtype;
  v_user uuid;
  v_confirmado timestamptz;
  v_atual uuid;
begin
  select * into v_parceiro from public.parceiros where id = p_parceiro;
  if not found or not v_parceiro.indicacao or v_parceiro.estado <> 'ativo' then
    return 'parceiro_inativo';
  end if;

  select u.id, u.email_confirmed_at into v_user, v_confirmado
    from auth.users u
   where lower(u.email) = lower(btrim(coalesce(p_email, '')))
   limit 1;
  if v_user is null then return 'sem_conta'; end if;
  if v_confirmado is null then return 'email_por_confirmar'; end if;
  if exists (select 1 from public.utilizadores where id = v_user and role = 'admin') then
    return 'conta_admin';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('area_parceiro:' || v_user::text, 0));

  select parceiro_id into v_atual
    from public.parceiros_area_acessos
   where user_id = v_user and revogado_em is null;
  if v_atual = p_parceiro then return 'ja_tem'; end if;
  if v_atual is not null then return 'outro_parceiro'; end if;

  -- Uma conta indicada por este parceiro não pode passar a ser a dele.
  if exists (select 1 from public.parceiros_atribuicoes where user_id = v_user and parceiro_id = p_parceiro) then
    return 'indicada_pelo_parceiro';
  end if;

  insert into public.parceiros_area_acessos (parceiro_id, user_id, concedido_por)
  values (p_parceiro, v_user, p_admin);
  return 'concedido';
end $$;

create or replace function public.parceiro_area_revogar(p_acesso uuid, p_motivo text, p_admin uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parceiros_area_acessos
     set revogado_em = now(),
         revogado_por = p_admin,
         revogado_motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   where id = p_acesso and revogado_em is null;
  return found;
end $$;

revoke execute on function public.parceiro_area_conceder(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.parceiro_area_revogar(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.parceiro_area_conceder(uuid, text, uuid) to service_role;
grant execute on function public.parceiro_area_revogar(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Resumo da área do parceiro (a única leitura do parceiro)
-- ---------------------------------------------------------------------------
-- null = a conta da sessão não tem acesso activo (ou o parceiro está em
-- negociação). Só agregados: contas associadas, conversões por produto,
-- comissões por estado (contagem e soma), oportunidades por fase, condições
-- em vigor e os pagamentos feitos ao próprio parceiro.
create or replace function public.parceiro_area_resumo()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_parceiro public.parceiros%rowtype;
  v_condicao public.parceiros_condicoes%rowtype;
begin
  if v_user is null then
    return null;
  end if;

  select p.* into v_parceiro
    from public.parceiros_area_acessos a
    join public.parceiros p on p.id = a.parceiro_id
   where a.user_id = v_user and a.revogado_em is null
     and p.indicacao and p.estado in ('ativo', 'suspenso', 'encerrado');
  if not found then
    return null;
  end if;

  select * into v_condicao
    from public.parceiros_condicoes
   where id = public.parceiros_condicao_atual(v_parceiro.id);

  return jsonb_build_object(
    'parceiro', jsonb_build_object(
      'nome', v_parceiro.nome,
      'estado', v_parceiro.estado,
      'data_inicio', v_parceiro.data_inicio
    ),
    -- Códigos só enquanto a parceria está activa (suspensa/encerrada: não atribuem).
    'codigos', coalesce((
      select jsonb_agg(c.codigo order by c.criado_em)
        from public.parceiros_codigos c
       where c.parceiro_id = v_parceiro.id and c.ativo and v_parceiro.estado = 'ativo'
    ), '[]'::jsonb),
    'condicoes', case when v_condicao.id is null then null else jsonb_build_object(
      'comissao_protecao_cents', v_condicao.comissao_protecao_cents,
      'comissao_caso_protecao_cents', v_condicao.comissao_caso_protecao_cents,
      'mensalidades_necessarias', v_condicao.mensalidades_necessarias,
      'minimo_pagamento_cents', v_condicao.minimo_pagamento_cents
    ) end,
    'contas_associadas', (
      select count(*) from public.parceiros_atribuicoes a where a.parceiro_id = v_parceiro.id
    ),
    -- Conversão = primeira mensalidade paga (> 0 €) da primeira subscrição.
    'conversoes', jsonb_build_object(
      'protecao', (select count(*) from public.parceiros_comissoes c
                    where c.parceiro_id = v_parceiro.id and c.tipo = 'b2c'
                      and c.produto = 'protecao' and c.estado <> 'revertida'),
      'caso_protecao', (select count(*) from public.parceiros_comissoes c
                         where c.parceiro_id = v_parceiro.id and c.tipo = 'b2c'
                           and c.produto = 'caso_protecao' and c.estado <> 'revertida')
    ),
    'comissoes', (
      select jsonb_object_agg(e.grupo, jsonb_build_object('quantidade', coalesce(x.quantidade, 0), 'valor_cents', coalesce(x.valor_cents, 0)))
        from (values ('pendente'), ('em_verificacao'), ('elegivel'), ('aprovada'), ('paga'), ('anulada')) e (grupo)
        left join (
          select case c.estado
                   when 'em_validacao' then 'em_verificacao'
                   when 'cancelada' then 'anulada'
                   when 'revertida' then 'anulada'
                   else c.estado
                 end as grupo,
                 count(*) as quantidade,
                 sum(c.valor_cents) as valor_cents
            from public.parceiros_comissoes c
           where c.parceiro_id = v_parceiro.id
           group by 1
        ) x on x.grupo = e.grupo
    ),
    'oportunidades', jsonb_build_object(
      'em_curso', (select count(*) from public.parceiros_oportunidades o
                    where o.parceiro_id = v_parceiro.id and o.estado not in ('ganha', 'perdida')),
      'ganhas', (select count(*) from public.parceiros_oportunidades o
                  where o.parceiro_id = v_parceiro.id and o.estado = 'ganha'),
      'perdidas', (select count(*) from public.parceiros_oportunidades o
                    where o.parceiro_id = v_parceiro.id and o.estado = 'perdida')
    ),
    'pagamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'pago_em', g.pago_em,
               'referencia', g.referencia,
               'total_cents', g.total_cents,
               'iva_cents', g.iva_cents,
               'total_transferido_cents', g.total_transferido_cents,
               'documento_parceiro', g.documento_parceiro,
               'comissoes', (select count(*) from public.parceiros_comissoes c where c.pagamento_id = g.id)
             ) order by g.pago_em desc, g.created_at desc)
        from public.parceiros_pagamentos g
       where g.parceiro_id = v_parceiro.id
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.parceiro_area_resumo() from public, anon;
grant execute on function public.parceiro_area_resumo() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Auto-indicação: a conta com acesso nunca é atribuída a esse parceiro
-- ---------------------------------------------------------------------------
create or replace function public.parceiro_atribuir(
  p_user uuid,
  p_visita uuid,
  p_codigo text,
  p_janela_dias int default 30
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_visitado timestamptz;
  v_parceiro public.parceiros%rowtype;
begin
  if (p_visita is null) = (p_codigo is null) then
    raise exception 'parceiro_atribuir: indicar a visita ou o código (só um)';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atribuicao:' || p_user::text, 0));

  if exists (select 1 from public.indicacoes where referred_user_id = p_user)
     or exists (select 1 from public.parceiros_atribuicoes where user_id = p_user) then
    return 'ja_atribuida';
  end if;

  if p_visita is not null then
    select v.codigo, v.criado_em into v_codigo, v_visitado
      from public.parceiros_visitas v where v.id = p_visita;
    if not found then return 'visita_invalida'; end if;
    if v_visitado < now() - make_interval(days => p_janela_dias) then return 'expirada'; end if;
  else
    v_codigo := upper(regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g'));
  end if;

  select p.* into v_parceiro
    from public.parceiros_codigos c
    join public.parceiros p on p.id = c.parceiro_id
   where c.codigo = v_codigo and c.ativo and p.estado = 'ativo' and p.indicacao;
  if not found then return 'codigo_invalido'; end if;

  -- Conta do próprio parceiro: a indicada em parceiros.user_id ou qualquer
  -- conta que tenha (ou tenha tido) acesso à área desse parceiro.
  if v_parceiro.user_id = p_user
     or exists (select 1 from public.parceiros_area_acessos a
                 where a.parceiro_id = v_parceiro.id and a.user_id = p_user) then
    return 'auto_indicacao';
  end if;
  if public.indicacao_conta_ja_cliente(p_user) then return 'ja_cliente'; end if;

  insert into public.parceiros_atribuicoes (parceiro_id, user_id, codigo, via, visita_id, visitado_em)
  values (v_parceiro.id, p_user, v_codigo,
          case when p_visita is null then 'codigo' else 'ligacao' end,
          p_visita, v_visitado);
  return 'atribuida';
end $$;

revoke execute on function public.parceiro_atribuir(uuid, uuid, text, int) from public, anon, authenticated;
grant execute on function public.parceiro_atribuir(uuid, uuid, text, int) to service_role;
