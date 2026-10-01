-- DoLado — Pedido de caso antes do pagamento (decisão de 01/10/2026)
--
-- Novo fluxo comercial: o cliente descreve o caso, cria/entra na conta,
-- escolhe a modalidade e paga. Até o pagamento estar confirmado (webhook
-- Stripe), o que preencheu é um PEDIDO, não um caso:
--
--   pedidos_caso.estado   rascunho → aguarda_pagamento → convertido
--                         (ou cancelado / apagado ao expirar)
--
-- Um pedido nunca está em `casos`: não aparece nas filas do backoffice, não
-- dispara o trigger notificar_novo_caso (e-mail "Recebemos o seu pedido"),
-- não gasta casos disponíveis e não dá acesso a nada do portal. Só
-- converter_pedido_em_caso() cria o caso — chamada pelo servidor (webhook
-- depois do pagamento confirmado, ou "usar um caso disponível"), com
-- service_role, e sempre a gastar 1 caso disponível na mesma transação.
--
-- Além disso, o cliente deixa de poder criar casos diretamente pela API em
-- qualquer situação: a policy "Cliente cria os próprios casos" (que ainda
-- deixava contas sem user_access — registo livre / antigo piloto — abrir
-- casos sem pagar) é removida. Casos novos só por:
--   * converter_pedido_em_caso() / Server Action do portal (service_role,
--     depois de gastar um caso disponível);
--   * o admin, pela policy "Admin gere todos os casos".

-- ---------------------------------------------------------------------------
-- 1. Tabela de pedidos
-- ---------------------------------------------------------------------------
create table public.pedidos_caso (
  id uuid primary key default gen_random_uuid(),
  -- Conta dona do pedido. null enquanto o pedido só está ligado ao browser
  -- que o preencheu (cookie httpOnly; aqui só o hash SHA-256 do token).
  user_id uuid references public.utilizadores (id) on delete cascade,
  token_hash text unique,
  estado text not null default 'rascunho'
    check (estado in ('rascunho', 'aguarda_pagamento', 'convertido', 'cancelado')),

  -- O que o cliente preencheu (mesmos campos do formulário guiado).
  nome text not null,
  telefone text,
  sector text not null,
  empresa text not null,
  problema_tipo text not null,
  descricao text,
  momento_cliente text not null,
  origem text,
  autorizacao boolean not null check (autorizacao),
  pedido_confirmado_em timestamptz not null,
  consentimento_alertas boolean not null default false,
  consentimento_alertas_em timestamptz,
  anexo_caminho text check (anexo_caminho is null or (anexo_caminho like 'pendentes/%' and anexo_caminho not like '%..%')),
  anexo_nome text,
  anexo_tipo text,
  anexo_tamanho bigint,

  -- Checkout em curso (o último aberto para este pedido).
  plano_escolhido text check (plano_escolhido in ('avulso', 'caso_protecao')),
  checkout_session_id text,

  -- Resultado da conversão.
  caso_id uuid unique references public.casos (id) on delete set null,
  convertido_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '30 days',

  constraint pedidos_caso_convertido_coerente check (
    (estado = 'convertido') = (convertido_em is not null)
  )
);

comment on table public.pedidos_caso is
  'Pedido de caso preenchido antes do pagamento. Não é um caso: só converter_pedido_em_caso() (servidor, depois do pagamento confirmado) cria a linha em casos.';
comment on column public.pedidos_caso.token_hash is
  'SHA-256 (hex) do token do cookie httpOnly do browser que preencheu o pedido. O token nunca é guardado.';
comment on column public.pedidos_caso.expira_em is
  'Pedidos não convertidos são apagados depois desta data (job pg_cron limpar-pedidos-caso-expirados).';

create index pedidos_caso_user_idx on public.pedidos_caso (user_id);
create index pedidos_caso_checkout_idx on public.pedidos_caso (checkout_session_id);

create trigger set_updated_at before update on public.pedidos_caso
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS: o cliente só lê os próprios pedidos; o admin lê todos. Toda a
--    escrita é feita pelo servidor (service_role) — estado, plano, sessão de
--    checkout e caso nunca são escritos pelo browser.
-- ---------------------------------------------------------------------------
alter table public.pedidos_caso enable row level security;

create policy "Cliente lê os próprios pedidos" on public.pedidos_caso
  for select to authenticated using (user_id = auth.uid());

create policy "Admin lê pedidos" on public.pedidos_caso
  for select to authenticated using (public.is_admin());

revoke all on public.pedidos_caso from anon, authenticated;
-- Permissão por coluna: o cliente nunca lê o hash do token do browser nem a
-- sessão de checkout.
grant select (
  id, user_id, estado, nome, telefone, sector, empresa, problema_tipo, descricao,
  momento_cliente, anexo_nome, plano_escolhido, caso_id, convertido_em,
  created_at, updated_at, expira_em
) on public.pedidos_caso to authenticated;
grant all on public.pedidos_caso to service_role;

-- ---------------------------------------------------------------------------
-- 3. Conversão pedido → caso (atómica e idempotente)
-- ---------------------------------------------------------------------------
-- Devolve o id do caso (o já existente, se o pedido já tinha sido
-- convertido) ou null se não converteu:
--   * pedido inexistente, cancelado ou de outra conta;
--   * a conta não tem nenhum caso disponível (nada é gasto nem criado).
-- Gasta 1 caso disponível, cria o caso (status 'Novo' — dispara o e-mail
-- "Recebemos o seu pedido" pelo trigger notificar_novo_caso), liga o anexo e
-- marca o pedido como convertido — tudo na mesma transação.
create or replace function public.converter_pedido_em_caso(p_pedido_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pedido public.pedidos_caso%rowtype;
  v_email text;
  v_caso uuid;
  v_gastou int;
begin
  select * into v_pedido from public.pedidos_caso where id = p_pedido_id for update;
  if not found or v_pedido.user_id is distinct from p_user_id then
    return null;
  end if;
  if v_pedido.estado = 'convertido' then
    return v_pedido.caso_id;
  end if;
  if v_pedido.estado = 'cancelado' then
    return null;
  end if;

  update public.user_access
     set case_credits = case_credits - 1, updated_at = now()
   where user_id = p_user_id and case_credits > 0;
  get diagnostics v_gastou = row_count;
  if v_gastou = 0 then
    return null;
  end if;

  select email into v_email from public.utilizadores where id = p_user_id;

  insert into public.casos (
    utilizador_id, nome, email, telefone, sector, empresa, problema_tipo, descricao,
    momento_cliente, origem, autorizacao, consentimento_tratamento_em,
    consentimento_alertas, consentimento_alertas_em, status
  ) values (
    p_user_id, v_pedido.nome, v_email, v_pedido.telefone, v_pedido.sector, v_pedido.empresa,
    v_pedido.problema_tipo, v_pedido.descricao, v_pedido.momento_cliente, v_pedido.origem,
    v_pedido.autorizacao, v_pedido.pedido_confirmado_em,
    v_pedido.consentimento_alertas, v_pedido.consentimento_alertas_em, 'Novo'
  ) returning id into v_caso;

  if v_pedido.anexo_caminho is not null then
    insert into public.anexos (caso_id, nome_ficheiro, caminho_storage, tipo_mime, tamanho_bytes)
    values (v_caso, coalesce(v_pedido.anexo_nome, v_pedido.anexo_caminho), v_pedido.anexo_caminho,
            v_pedido.anexo_tipo, v_pedido.anexo_tamanho);
  end if;

  update public.pedidos_caso
     set estado = 'convertido', caso_id = v_caso, convertido_em = now()
   where id = p_pedido_id;

  return v_caso;
end $$;

revoke execute on function public.converter_pedido_em_caso(uuid, uuid) from public, anon, authenticated;
grant execute on function public.converter_pedido_em_caso(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Casos: o cliente deixa de criar casos diretamente pela API
-- ---------------------------------------------------------------------------
drop policy "Cliente cria os próprios casos" on public.casos;

-- Contas sem linha em user_access (registo livre / antigo piloto) também
-- passam a precisar de um caso disponível: criar conta não dá direito ao
-- tratamento de um caso.

-- ---------------------------------------------------------------------------
-- 5. consentimentos_compra: nova origem "tratar_caso" (checkout do pedido)
-- ---------------------------------------------------------------------------
alter table public.consentimentos_compra drop constraint consentimentos_compra_origem_check;
alter table public.consentimentos_compra add constraint consentimentos_compra_origem_check
  check (origem in ('landing', 'portal', 'novo_caso', 'repetir_pagamento', 'tratar_caso'));

-- ---------------------------------------------------------------------------
-- 6. Limpeza diária dos pedidos não convertidos e expirados (RGPD)
-- ---------------------------------------------------------------------------
-- Os pedidos em 'aguarda_pagamento' com um pagamento ainda pendente (ex.:
-- SEPA) têm a validade prolongada pelo servidor ao abrir o checkout.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'limpar-pedidos-caso-expirados',
      '30 3 * * *',
      $cron$delete from public.pedidos_caso where estado <> 'convertido' and expira_em < now()$cron$
    );
  end if;
end $$;
