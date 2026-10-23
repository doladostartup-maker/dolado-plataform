-- DoLado Empresas — Fase 4: registo, MFA, recuperação e aprovação
-- (23/10/2026)
--
-- Tudo só para a service_role (o servidor valida a sessão ou o admin antes):
--   - empresa_registar(): marca a conta nova como empresa e cria a
--     organização (email_por_confirmar) e a pertença, numa só transacção;
--   - empresa_sincronizar_estado(): email_por_confirmar → mfa_por_configurar
--     (e-mail confirmado) → a_aguardar_aprovacao (dois factores TOTP
--     verificados), lido de auth.users e auth.mfa_factors;
--   - empresa_aprovar() / empresa_rejeitar(): decisão do admin; sem vaga
--     (D4: 5 organizações activas, em atraso ou suspensas) → lista_espera;
--   - empresa_mfa_reposicao(): recuperação assistida — apaga os factores e
--     as sessões da conta e regista no histórico;
--   - empresa_retirar_identidade_google(): uma conta de empresa nunca entra
--     pelo Google (a ligação manual de identidades está desligada na
--     Supabase, por isso a retirada é feita aqui, no servidor);
--   - empresa_pedidos_recuperacao: pedidos de recuperação assistida.
--
-- Tipo A (aditiva): nenhuma função ou tabela existente muda. Ordem:
-- migration → merge.

-- ===========================================================================
-- 1. Ajudantes
-- ===========================================================================
-- NIPC/NIF português: 9 dígitos com dígito de controlo (módulo 11).
create or replace function public.nif_valido(p_nif text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_soma integer := 0;
  v_resto integer;
  v_controlo integer;
begin
  if p_nif is null or p_nif !~ '^[0-9]{9}$' then return false; end if;
  for i in 1..8 loop
    v_soma := v_soma + substr(p_nif, i, 1)::integer * (10 - i);
  end loop;
  v_resto := v_soma % 11;
  v_controlo := case when v_resto < 2 then 0 else 11 - v_resto end;
  return v_controlo = substr(p_nif, 9, 1)::integer;
end $$;

revoke execute on function public.nif_valido(text) from public, anon;
grant execute on function public.nif_valido(text) to authenticated, service_role;

-- Vagas do piloto (D4): organizações que contam.
create or replace function public.empresa_vagas_piloto()
returns integer
language sql
immutable
set search_path = ''
as $$ select 5 $$;

revoke execute on function public.empresa_vagas_piloto() from public, anon, authenticated;
grant execute on function public.empresa_vagas_piloto() to service_role;

create or replace function public.empresa_e_admin(p_admin uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.utilizadores where id = p_admin and role = 'admin');
$$;

revoke execute on function public.empresa_e_admin(uuid) from public, anon, authenticated;
grant execute on function public.empresa_e_admin(uuid) to service_role;

-- ===========================================================================
-- 2. Registo
-- ===========================================================================
-- registada | nif_invalido | tipo_invalido | nif_em_uso | resultados de
-- empresa_marcar_conta (ja_empresa, sem_conta, conta_admin, conta_antiga,
-- com_historico). Nada fica gravado quando não devolve 'registada'.
create or replace function public.empresa_registar(
  p_user uuid,
  p_nome text,
  p_tipo_entidade text,
  p_nif text,
  p_responsavel text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marcar text;
  v_org uuid;
begin
  if not public.nif_valido(p_nif) then return 'nif_invalido'; end if;
  if p_tipo_entidade = 'sociedade' then
    if left(p_nif, 1) not in ('5', '6', '9') then return 'nif_invalido'; end if;
  elsif p_tipo_entidade in ('empresario_nome_individual', 'profissional_independente') then
    if left(p_nif, 1) not in ('1', '2', '3') then return 'nif_invalido'; end if;
  else
    return 'tipo_invalido';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('empresa_registar:' || p_nif, 0));
  if exists (select 1 from public.organizacoes
              where nif = p_nif and estado not in ('rejeitada', 'cancelada', 'encerrada')) then
    return 'nif_em_uso';
  end if;

  v_marcar := public.empresa_marcar_conta(p_user);
  if v_marcar <> 'marcada' then return v_marcar; end if;

  perform set_config('dolado.alterado_por', p_user::text, true);
  perform set_config('dolado.motivo', 'Registo', true);
  insert into public.organizacoes (nome, tipo_entidade, nif, responsavel_nome, estado)
  values (btrim(p_nome), p_tipo_entidade, p_nif, nullif(btrim(coalesce(p_responsavel, '')), ''), 'email_por_confirmar')
  returning id into v_org;
  insert into public.organizacoes_membros (organizacao_id, utilizador_id) values (v_org, p_user);
  perform set_config('dolado.alterado_por', '', true);
  perform set_config('dolado.motivo', '', true);
  return 'registada';
end $$;

revoke execute on function public.empresa_registar(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.empresa_registar(uuid, text, text, text, text) to service_role;

-- ===========================================================================
-- 3. Estado da conta antes da aprovação
-- ===========================================================================
-- Devolve {organizacao_id, estado, passou_a_aguardar} (null sem organização).
-- passou_a_aguardar = true só na chamada que fez a transição (e-mails uma vez).
create or replace function public.empresa_sincronizar_estado(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_estado text;
  v_confirmado boolean;
  v_factores integer;
  v_passou boolean := false;
begin
  select o.id, o.estado into v_org, v_estado
    from public.organizacoes_membros m
    join public.organizacoes o on o.id = m.organizacao_id
   where m.utilizador_id = p_user and m.removido_em is null
   for update of o;
  if v_org is null then return null; end if;

  select u.email_confirmed_at is not null into v_confirmado from auth.users u where u.id = p_user;
  select count(*) into v_factores
    from auth.mfa_factors f
   where f.user_id = p_user and f.factor_type = 'totp' and f.status = 'verified';

  perform set_config('dolado.alterado_por', p_user::text, true);
  if v_estado = 'email_por_confirmar' and coalesce(v_confirmado, false) then
    perform set_config('dolado.motivo', 'E-mail confirmado', true);
    update public.organizacoes set estado = 'mfa_por_configurar' where id = v_org;
    v_estado := 'mfa_por_configurar';
  end if;
  if v_estado = 'mfa_por_configurar' and v_factores >= 2 then
    perform set_config('dolado.motivo', 'Dois factores TOTP verificados', true);
    update public.organizacoes set estado = 'a_aguardar_aprovacao' where id = v_org;
    v_estado := 'a_aguardar_aprovacao';
    v_passou := true;
  end if;
  perform set_config('dolado.alterado_por', '', true);
  perform set_config('dolado.motivo', '', true);

  return jsonb_build_object('organizacao_id', v_org, 'estado', v_estado, 'passou_a_aguardar', v_passou);
end $$;

revoke execute on function public.empresa_sincronizar_estado(uuid) from public, anon, authenticated;
grant execute on function public.empresa_sincronizar_estado(uuid) to service_role;

-- ===========================================================================
-- 4. Decisão do admin
-- ===========================================================================
-- aprovada | lista_espera | sem_permissao | estado_invalido
create or replace function public.empresa_aprovar(p_org uuid, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_ocupadas integer;
  v_novo text;
begin
  if not public.empresa_e_admin(p_admin) then return 'sem_permissao'; end if;
  -- Uma decisão de vaga de cada vez (a activação da Fase 5 usa o mesmo lock).
  perform pg_advisory_xact_lock(hashtextextended('empresa_vagas', 0));

  select estado into v_estado from public.organizacoes where id = p_org for update;
  if v_estado is null or v_estado not in ('a_aguardar_aprovacao', 'lista_espera') then
    return 'estado_invalido';
  end if;

  select count(*) into v_ocupadas from public.organizacoes
   where estado in ('ativa', 'pagamento_em_atraso', 'suspensa');
  v_novo := case when v_ocupadas >= public.empresa_vagas_piloto() then 'lista_espera' else 'aprovada' end;

  if v_novo <> v_estado then
    perform set_config('dolado.alterado_por', p_admin::text, true);
    perform set_config('dolado.motivo', case when v_novo = 'aprovada' then 'Aprovada' else 'Sem vaga: lista de espera' end, true);
    update public.organizacoes set estado = v_novo where id = p_org;
    perform set_config('dolado.alterado_por', '', true);
    perform set_config('dolado.motivo', '', true);
  end if;
  return v_novo;
end $$;

revoke execute on function public.empresa_aprovar(uuid, uuid) from public, anon, authenticated;
grant execute on function public.empresa_aprovar(uuid, uuid) to service_role;

-- rejeitada | sem_permissao | estado_invalido | motivo_em_falta
create or replace function public.empresa_rejeitar(p_org uuid, p_admin uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado text;
begin
  if not public.empresa_e_admin(p_admin) then return 'sem_permissao'; end if;
  if coalesce(btrim(p_motivo), '') = '' or char_length(p_motivo) > 500 then return 'motivo_em_falta'; end if;

  select estado into v_estado from public.organizacoes where id = p_org for update;
  if v_estado is null
     or v_estado not in ('email_por_confirmar', 'mfa_por_configurar', 'a_aguardar_aprovacao', 'lista_espera', 'aprovada') then
    return 'estado_invalido';
  end if;

  perform set_config('dolado.alterado_por', p_admin::text, true);
  perform set_config('dolado.motivo', btrim(p_motivo), true);
  update public.organizacoes set estado = 'rejeitada' where id = p_org;
  perform set_config('dolado.alterado_por', '', true);
  perform set_config('dolado.motivo', '', true);
  return 'rejeitada';
end $$;

revoke execute on function public.empresa_rejeitar(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.empresa_rejeitar(uuid, uuid, text) to service_role;

-- ===========================================================================
-- 5. Recuperação assistida do MFA
-- ===========================================================================
create table public.empresa_pedidos_recuperacao (
  id uuid primary key default gen_random_uuid(),
  -- E-mail e NIPC/NIF escritos no pedido (formulário sem sessão).
  email text not null check (char_length(email) between 3 and 320),
  nif text check (nif is null or nif ~ '^[0-9]{9}$'),
  mensagem text check (mensagem is null or char_length(mensagem) <= 1000),
  -- Organização encontrada pelo servidor (e-mail de uma conta de empresa);
  -- null quando não corresponde a nenhuma — o pedido fica na mesma.
  organizacao_id uuid references public.organizacoes (id) on delete cascade,
  estado text not null default 'pendente' check (estado in ('pendente', 'reposto', 'recusado')),
  resolvido_por uuid references public.utilizadores (id) on delete set null,
  resolvido_em timestamptz,
  -- Como foi feita a validação reforçada (telefone oficial, morada fiscal…).
  nota text check (nota is null or char_length(nota) <= 1000),
  created_at timestamptz not null default now(),
  check ((estado = 'pendente') = (resolvido_em is null))
);

comment on table public.empresa_pedidos_recuperacao is
  'DoLado Empresas: pedidos de recuperação assistida do MFA (perda dos dois factores). Escrita só pela service_role; só o admin lê.';

create index empresa_pedidos_recuperacao_estado_idx on public.empresa_pedidos_recuperacao (estado, created_at);

alter table public.empresa_pedidos_recuperacao enable row level security;
create policy "empresa_pedidos_recuperacao: admin lê" on public.empresa_pedidos_recuperacao
  for select to authenticated using (public.is_admin());
revoke all on public.empresa_pedidos_recuperacao from anon, authenticated;
grant select on public.empresa_pedidos_recuperacao to authenticated;
grant select, insert, update on public.empresa_pedidos_recuperacao to service_role;

-- Repõe o MFA da conta da organização: apaga os factores e as sessões
-- (as sessões abertas deixam de renovar; o token de acesso actual expira
-- sozinho) e regista no histórico da organização, sem mudar o estado.
-- Devolve o número de factores apagados, ou null sem permissão/organização.
create or replace function public.empresa_mfa_reposicao(p_org uuid, p_admin uuid, p_motivo text, p_pedido uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_estado text;
  v_factores integer;
begin
  if not public.empresa_e_admin(p_admin) then return null; end if;
  if coalesce(btrim(p_motivo), '') = '' or char_length(p_motivo) > 450 then return null; end if;

  select m.utilizador_id, o.estado into v_user, v_estado
    from public.organizacoes o
    join public.organizacoes_membros m on m.organizacao_id = o.id and m.removido_em is null
   where o.id = p_org;
  if v_user is null then return null; end if;

  delete from auth.mfa_factors where user_id = v_user;
  get diagnostics v_factores = row_count;
  delete from auth.sessions where user_id = v_user;

  insert into public.organizacoes_historico (organizacao_id, estado_antes, estado_depois, alterado_por, motivo)
  values (p_org, v_estado, v_estado, p_admin, 'Reposição do MFA: ' || btrim(p_motivo));

  if p_pedido is not null then
    update public.empresa_pedidos_recuperacao
       set estado = 'reposto', resolvido_por = p_admin, resolvido_em = now(), nota = btrim(p_motivo)
     where id = p_pedido and estado = 'pendente';
  end if;
  return v_factores;
end $$;

revoke execute on function public.empresa_mfa_reposicao(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.empresa_mfa_reposicao(uuid, uuid, text, uuid) to service_role;

-- ===========================================================================
-- 6. Google nunca numa conta de empresa
-- ===========================================================================
-- A Supabase liga automaticamente uma identidade Google com o mesmo e-mail.
-- Numa conta de empresa, retira-a (só se a conta mantiver outra identidade).
-- Devolve o número de identidades retiradas.
create or replace function public.empresa_retirar_identidade_google(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not exists (select 1 from public.utilizadores where id = p_user and tipo_conta = 'empresa') then
    return 0;
  end if;
  if not exists (select 1 from auth.identities where user_id = p_user and provider <> 'google') then
    return 0;
  end if;
  delete from auth.identities where user_id = p_user and provider = 'google';
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function public.empresa_retirar_identidade_google(uuid) from public, anon, authenticated;
grant execute on function public.empresa_retirar_identidade_google(uuid) to service_role;
