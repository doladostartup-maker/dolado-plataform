-- Compras pagas sem conta, associação segura a uma conta existente e
-- subscrições duplicadas por rever (03/10/2026).
--
-- Contexto: o preçário de dolado.pt não vê a sessão de portal.dolado.pt
-- (cookies host-only). Uma pessoa com conta podia comprar pelo preçário
-- público, o Stripe criava um Customer novo e a compra ficava sem conta
-- (/criar-conta não cria uma segunda conta com o mesmo e-mail). A compra
-- passa a decidir-se em portal.dolado.pt/comprar; para as compras que já
-- ficaram (ou ainda fiquem) sem conta:
--
-- 1. compras_sem_conta — registada pelo webhook quando o pagamento é
--    confirmado sem conta ligada; lembretes ao cliente a 1 e 3 dias, cada
--    marco reservado uma única vez (reservar_lembrete_compra).
-- 2. associacoes_compra — prova de cada associação de uma compra a uma
--    conta existente, feita só por reclamar_compra_sem_conta(): sessão
--    autenticada (validada no servidor), e-mail da conta confirmado e igual
--    ao do Checkout, pagamento confirmado, compra sem conta e nunca
--    reclamada, e os IDs Stripe da compra iguais aos gravados. Nunca por
--    e-mail sozinho. Só inserção.
-- 3. subscricoes_duplicadas — nova subscrição de uma conta que já tem outra
--    ativa: não se juntam, não se cancela nem se reembolsa nada
--    automaticamente; fica "por_rever" e o admin é avisado.

-- ---------------------------------------------------------------------------
-- 1. Compras pagas sem conta
-- ---------------------------------------------------------------------------
create table public.compras_sem_conta (
  stripe_session_id text primary key references public.stripe_payments (stripe_session_id) on delete cascade,
  email text not null,
  plano text not null check (plano in ('avulso', 'protecao', 'caso_protecao')),
  confirmado_em timestamptz not null default now(),
  lembrete_1d_em timestamptz,
  lembrete_3d_em timestamptz,
  resolvido_em timestamptz,
  resolucao text check (resolucao in ('conta_criada', 'associada', 'duplicado_por_rever')),
  check ((resolvido_em is null) = (resolucao is null))
);

comment on table public.compras_sem_conta is 'Compra paga pelo preçário público sem conta associada. Lembretes a 1 e 3 dias até a compra ficar ligada a uma conta.';

-- ---------------------------------------------------------------------------
-- 2. Associações de compras a contas existentes (prova, só inserção)
-- ---------------------------------------------------------------------------
create table public.associacoes_compra (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique references public.stripe_payments (stripe_session_id) on delete restrict,
  user_id uuid not null references public.utilizadores (id) on delete cascade,
  email_checkout text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  resultado text not null check (resultado in ('associada', 'duplicado_por_rever')),
  subscricao_existente_id text,
  criado_em timestamptz not null default now(),
  check ((resultado = 'duplicado_por_rever') = (subscricao_existente_id is not null))
);

comment on table public.associacoes_compra is 'Prova da associação de uma compra sem conta a uma conta existente (uma por compra). Só inserção.';

create or replace function public.associacoes_compra_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'associacoes_compra: registo de prova não pode ser alterado' using errcode = '42501';
end $$;

create trigger associacoes_compra_so_insercao
  before update on public.associacoes_compra
  for each row execute function public.associacoes_compra_so_insercao();

-- ---------------------------------------------------------------------------
-- 3. Subscrições duplicadas por rever
-- ---------------------------------------------------------------------------
create table public.subscricoes_duplicadas (
  nova_subscription_id text primary key,
  user_id uuid references public.utilizadores (id) on delete set null,
  subscricao_existente_id text not null,
  stripe_session_id text,
  origem text not null check (origem in ('associacao', 'checkout', 'fatura')),
  estado text not null default 'por_rever' check (estado in ('por_rever', 'resolvida')),
  detetado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  nota_resolucao text,
  check (nova_subscription_id <> subscricao_existente_id),
  check ((estado = 'resolvida') = (resolvido_em is not null and nota_resolucao is not null))
);

comment on table public.subscricoes_duplicadas is 'Segunda subscrição de uma conta que já tem outra ativa. Nada é juntado, cancelado ou reembolsado automaticamente: decisão manual do admin.';

-- ---------------------------------------------------------------------------
-- Funções (só service_role)
-- ---------------------------------------------------------------------------

-- Há uma conta (não apagada) com este e-mail? Só para /criar-conta decidir
-- entre criar conta e pedir login — nunca para associar compras.
create or replace function public.conta_existe_com_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
     where lower(u.email) = lower(trim(p_email))
       and u.deleted_at is null
  );
$$;

-- Webhook: compra paga sem conta. true só na primeira vez (aviso ao admin
-- uma única vez, mesmo com reenvios do Stripe).
create or replace function public.registar_compra_sem_conta(p_session_id text, p_email text, p_plano text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.compras_sem_conta (stripe_session_id, email, plano)
  values (p_session_id, p_email, p_plano)
  on conflict (stripe_session_id) do nothing;
  return found;
end $$;

-- Associação de uma compra sem conta a uma conta existente. Atómica (lock
-- na linha do pagamento) e idempotente. Valida tudo na base de dados, além
-- das validações do servidor:
--   - pagamento registado e confirmado ('concluido');
--   - compra ainda sem conta e nunca reclamada (ou reclamada por esta conta:
--     devolve o mesmo resultado, sem efeitos);
--   - e-mail da conta confirmado e igual ao e-mail do Checkout;
--   - Customer e subscrição Stripe iguais aos gravados pelo webhook.
-- p_subscricao_existente: subscrição ativa que a conta já tem (decidido pelo
-- servidor) — a compra não é aplicada e fica "duplicado_por_rever".
-- Devolve: associada | ja_associada | duplicado_por_rever | ja_em_revisao |
-- outra_conta | sem_pagamento | pagamento_nao_confirmado |
-- email_nao_confirmado | email_diferente | dados_diferentes.
create or replace function public.reclamar_compra_sem_conta(
  p_session_id text,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_subscricao_existente text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pag record;
  v_assoc record;
  v_conta record;
begin
  select id, user_id, email, estado, stripe_customer_id, stripe_subscription_id
    into v_pag
    from public.stripe_payments
   where stripe_session_id = p_session_id
   for update;
  if not found then
    return 'sem_pagamento';
  end if;

  select user_id, resultado into v_assoc
    from public.associacoes_compra
   where stripe_session_id = p_session_id;
  if found then
    if v_assoc.user_id <> p_user_id then
      return 'outra_conta';
    end if;
    return case v_assoc.resultado when 'associada' then 'ja_associada' else 'ja_em_revisao' end;
  end if;

  if v_pag.user_id is not null then
    return case when v_pag.user_id = p_user_id then 'ja_associada' else 'outra_conta' end;
  end if;

  if v_pag.estado <> 'concluido' then
    return 'pagamento_nao_confirmado';
  end if;

  select email, email_confirmed_at into v_conta
    from auth.users
   where id = p_user_id and deleted_at is null;
  if not found or v_conta.email_confirmed_at is null then
    return 'email_nao_confirmado';
  end if;
  if lower(trim(v_conta.email)) <> lower(trim(v_pag.email)) then
    return 'email_diferente';
  end if;

  if v_pag.stripe_customer_id is distinct from p_customer_id
     or v_pag.stripe_subscription_id is distinct from p_subscription_id then
    return 'dados_diferentes';
  end if;

  if p_subscricao_existente is not null and p_subscription_id is not null then
    insert into public.associacoes_compra
      (stripe_session_id, user_id, email_checkout, stripe_customer_id, stripe_subscription_id, resultado, subscricao_existente_id)
    values
      (p_session_id, p_user_id, v_pag.email, p_customer_id, p_subscription_id, 'duplicado_por_rever', p_subscricao_existente);
    insert into public.subscricoes_duplicadas
      (nova_subscription_id, user_id, subscricao_existente_id, stripe_session_id, origem)
    values
      (p_subscription_id, p_user_id, p_subscricao_existente, p_session_id, 'associacao')
    on conflict (nova_subscription_id) do nothing;
    update public.compras_sem_conta
       set resolvido_em = now(), resolucao = 'duplicado_por_rever'
     where stripe_session_id = p_session_id and resolvido_em is null;
    return 'duplicado_por_rever';
  end if;

  insert into public.associacoes_compra
    (stripe_session_id, user_id, email_checkout, stripe_customer_id, stripe_subscription_id, resultado)
  values
    (p_session_id, p_user_id, v_pag.email, p_customer_id, p_subscription_id, 'associada');
  -- Antes de ligar o pagamento: o trigger abaixo marcaria "conta_criada".
  update public.compras_sem_conta
     set resolvido_em = now(), resolucao = 'associada'
   where stripe_session_id = p_session_id and resolvido_em is null;
  update public.stripe_payments set user_id = p_user_id where id = v_pag.id;
  update public.consentimentos_compra
     set user_id = p_user_id
   where checkout_session_id = p_session_id and user_id is null;
  return 'associada';
end $$;

-- Lembretes por enviar agora. Um único marco por compra: passados 3 dias só
-- o último lembrete (o de 1 dia deixa de fazer sentido).
create or replace function public.compras_sem_conta_pendentes(p_agora timestamptz default now())
returns table (stripe_session_id text, email text, plano text, confirmado_em timestamptz, marco text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.stripe_session_id, c.email, c.plano, c.confirmado_em,
         case when p_agora >= c.confirmado_em + interval '3 days' then '3d' else '1d' end
    from public.compras_sem_conta c
    join public.stripe_payments p on p.stripe_session_id = c.stripe_session_id
   where c.resolvido_em is null
     and p.user_id is null
     and p.estado = 'concluido'
     and not exists (select 1 from public.associacoes_compra a where a.stripe_session_id = c.stripe_session_id)
     and (
       (p_agora >= c.confirmado_em + interval '3 days' and c.lembrete_3d_em is null)
       or (p_agora >= c.confirmado_em + interval '1 day'
           and p_agora < c.confirmado_em + interval '3 days'
           and c.lembrete_1d_em is null)
     );
$$;

-- Reserva um marco antes de enviar: true só uma vez por compra e marco, e
-- só enquanto a compra continua sem conta.
create or replace function public.reservar_lembrete_compra(p_session_id text, p_marco text, p_agora timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_marco not in ('1d', '3d') then
    raise exception 'reservar_lembrete_compra: marco inválido' using errcode = '22023';
  end if;
  update public.compras_sem_conta c
     set lembrete_1d_em = case when p_marco = '1d' then p_agora else c.lembrete_1d_em end,
         lembrete_3d_em = case when p_marco = '3d' then p_agora else c.lembrete_3d_em end
   where c.stripe_session_id = p_session_id
     and c.resolvido_em is null
     and ((p_marco = '1d' and c.lembrete_1d_em is null and c.lembrete_3d_em is null)
          or (p_marco = '3d' and c.lembrete_3d_em is null))
     and exists (
       select 1 from public.stripe_payments p
        where p.stripe_session_id = c.stripe_session_id and p.user_id is null
     )
     and not exists (select 1 from public.associacoes_compra a where a.stripe_session_id = c.stripe_session_id);
  return found;
end $$;

-- Compra ligada a uma conta por /criar-conta (ou outro caminho): deixa de
-- haver lembretes. A associação marca "associada" antes de ligar.
create or replace function public.compras_sem_conta_resolver_ao_ligar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is null and new.user_id is not null then
    update public.compras_sem_conta
       set resolvido_em = now(), resolucao = 'conta_criada'
     where stripe_session_id = new.stripe_session_id and resolvido_em is null;
  end if;
  return new;
end $$;

create trigger stripe_payments_resolver_compra_sem_conta
  after update of user_id on public.stripe_payments
  for each row execute function public.compras_sem_conta_resolver_ao_ligar();

revoke execute on function public.conta_existe_com_email(text) from public, anon, authenticated;
revoke execute on function public.registar_compra_sem_conta(text, text, text) from public, anon, authenticated;
revoke execute on function public.reclamar_compra_sem_conta(text, uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.compras_sem_conta_pendentes(timestamptz) from public, anon, authenticated;
revoke execute on function public.reservar_lembrete_compra(text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.compras_sem_conta_resolver_ao_ligar() from public, anon, authenticated;
revoke execute on function public.associacoes_compra_so_insercao() from public, anon, authenticated;
grant execute on function public.conta_existe_com_email(text) to service_role;
grant execute on function public.registar_compra_sem_conta(text, text, text) to service_role;
grant execute on function public.reclamar_compra_sem_conta(text, uuid, text, text, text) to service_role;
grant execute on function public.compras_sem_conta_pendentes(timestamptz) to service_role;
grant execute on function public.reservar_lembrete_compra(text, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: só o admin lê; só o servidor (service_role) escreve.
-- ---------------------------------------------------------------------------
alter table public.compras_sem_conta enable row level security;
alter table public.associacoes_compra enable row level security;
alter table public.subscricoes_duplicadas enable row level security;

create policy "Admin lê compras sem conta" on public.compras_sem_conta
  for select to authenticated using (public.is_admin());
create policy "Admin lê associações de compras" on public.associacoes_compra
  for select to authenticated using (public.is_admin());
create policy "Admin lê subscrições duplicadas" on public.subscricoes_duplicadas
  for select to authenticated using (public.is_admin());

revoke all on public.compras_sem_conta from anon, authenticated;
revoke all on public.associacoes_compra from anon, authenticated;
revoke all on public.subscricoes_duplicadas from anon, authenticated;
grant select on public.compras_sem_conta to authenticated;
grant select on public.associacoes_compra to authenticated;
grant select on public.subscricoes_duplicadas to authenticated;

-- O admin regista a resolução manual (o que fez no Stripe), só nestas colunas.
create policy "Admin resolve subscrições duplicadas" on public.subscricoes_duplicadas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant update (estado, resolvido_em, nota_resolucao) on public.subscricoes_duplicadas to authenticated;

-- ---------------------------------------------------------------------------
-- Lembretes: de hora a hora, pela rota interna do portal (segredo no Vault,
-- 'lembretes_compra_cron_secret', igual a LEMBRETES_COMPRA_CRON_SECRET na
-- Clever Cloud). Sem o segredo configurado a rota responde 401 e nada é
-- enviado.
-- ---------------------------------------------------------------------------
select
  cron.schedule(
    'lembretes-compra-sem-conta',
    '15 * * * *',
    $$
    select
      net.http_post(
        url := 'https://portal.dolado.pt/api/internal/lembretes-compra',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'lembretes_compra_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $$
  );
