-- E-book gratuito "Está a pagar mais do que devia?" e página /guia-facturas
-- (21/10/2026). Captação de e-mail sem conta: o e-mail serve para entregar o
-- guia; a autorização para comunicações comerciais é opcional, separada e
-- nunca condição do download.
--
-- Duas tabelas, separadas de propósito:
--   guias_pedidos — um registo por guia e e-mail (sem duplicados): pedidos
--     repetidos actualizam a data e o contador; a origem da campanha (UTM)
--     é a do primeiro pedido (first-touch). Apagado 12 meses depois do
--     último pedido.
--   consentimentos_comunicacoes_sem_conta — prova da autorização comercial
--     (texto exacto, versão, data/hora e origem), imutável; só a retirada é
--     registada depois. Uma autorização activa por e-mail. Nunca é criada
--     sem a caixa marcada e um pedido sem a caixa nunca retira a que existe.
--     Ainda NÃO há envios comerciais: antes do primeiro é preciso confirmar
--     o endereço (dupla confirmação) e a forma de deixar de receber.
--
-- Acesso: RLS activo, sem policies para o cliente nem para visitantes;
-- o admin lê (is_admin()). Toda a escrita pela função guia_registar_pedido()
-- (só service_role), chamada pela Server Action da página. Nada é criado
-- em auth.users.

-- ---------------------------------------------------------------------------
-- 1. Pedidos do guia
-- ---------------------------------------------------------------------------
create table public.guias_pedidos (
  id uuid primary key default gen_random_uuid(),
  guia text not null check (guia in ('guia_facturas')),
  email text not null check (length(email) between 6 and 254 and email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  idioma text not null default 'pt-PT' check (idioma in ('pt-PT', 'en-GB')),
  origem text not null default 'outro' check (origem in ('instagram', 'facebook', 'meta_ads', 'directo', 'outro')),
  utm_source text check (length(utm_source) <= 150),
  utm_medium text check (length(utm_medium) <= 150),
  utm_campaign text check (length(utm_campaign) <= 150),
  utm_content text check (length(utm_content) <= 150),
  utm_term text check (length(utm_term) <= 150),
  pedidos integer not null default 1 check (pedidos >= 1),
  primeiro_pedido_em timestamptz not null default now(),
  ultimo_pedido_em timestamptz not null default now(),
  -- Reserva/registo do e-mail transaccional com a ligação (no máximo um por 24 h).
  email_enviado_em timestamptz,
  unique (guia, email)
);

comment on table public.guias_pedidos is
  'Pedidos do e-book gratuito (/guia-facturas). Só service_role escreve (guia_registar_pedido); admin lê. Retenção: 12 meses após o último pedido.';

alter table public.guias_pedidos enable row level security;

create policy guias_pedidos_admin_le on public.guias_pedidos
  for select to authenticated using (public.is_admin());

revoke all on public.guias_pedidos from anon, authenticated;
grant select on public.guias_pedidos to authenticated;

create index guias_pedidos_ultimo_idx on public.guias_pedidos (ultimo_pedido_em);

-- ---------------------------------------------------------------------------
-- 2. Autorização para comunicações comerciais, sem conta
-- ---------------------------------------------------------------------------
create table public.consentimentos_comunicacoes_sem_conta (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) between 6 and 254 and email = lower(email)),
  origem text not null check (origem in ('guia_facturas')),
  versao text not null check (length(versao) between 1 and 32),
  texto text not null check (length(texto) between 10 and 1000),
  idioma text not null default 'pt-PT' check (idioma in ('pt-PT', 'en-GB')),
  dado_em timestamptz not null default now(),
  -- Dupla confirmação do endereço (por construir; obrigatória antes de qualquer envio comercial).
  confirmado_em timestamptz,
  retirado_em timestamptz,
  retirado_motivo text check (length(retirado_motivo) <= 300)
);

comment on table public.consentimentos_comunicacoes_sem_conta is
  'Prova da autorização opcional para comunicações comerciais dada sem conta (guia gratuito). Imutável salvo confirmação e retirada. Só admin lê.';

create unique index consentimentos_sem_conta_um_ativo
  on public.consentimentos_comunicacoes_sem_conta (email)
  where retirado_em is null;

alter table public.consentimentos_comunicacoes_sem_conta enable row level security;

create policy consentimentos_sem_conta_admin_le on public.consentimentos_comunicacoes_sem_conta
  for select to authenticated using (public.is_admin());

revoke all on public.consentimentos_comunicacoes_sem_conta from anon, authenticated;
grant select on public.consentimentos_comunicacoes_sem_conta to authenticated;

-- Campos de prova imutáveis (para todos, incluindo a service role). Só se
-- pode registar a confirmação e a retirada, uma vez cada.
create or replace function public.consentimentos_sem_conta_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is distinct from old.email
     or new.origem is distinct from old.origem
     or new.versao is distinct from old.versao
     or new.texto is distinct from old.texto
     or new.idioma is distinct from old.idioma
     or new.dado_em is distinct from old.dado_em then
    raise exception 'consentimento_imutavel' using errcode = 'P0001';
  end if;
  if old.confirmado_em is not null and new.confirmado_em is distinct from old.confirmado_em then
    raise exception 'consentimento_ja_confirmado' using errcode = 'P0001';
  end if;
  if old.retirado_em is not null and (new.retirado_em is distinct from old.retirado_em or new.retirado_motivo is distinct from old.retirado_motivo) then
    raise exception 'consentimento_ja_retirado' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke execute on function public.consentimentos_sem_conta_imutavel() from public, anon, authenticated;

create trigger consentimentos_sem_conta_imutavel
  before update on public.consentimentos_comunicacoes_sem_conta
  for each row execute function public.consentimentos_sem_conta_imutavel();

-- ---------------------------------------------------------------------------
-- 3. Registo atómico do pedido (só service_role)
-- ---------------------------------------------------------------------------
-- Devolve:
--   pedido_id, novo (primeiro pedido deste e-mail para o guia),
--   enviar_email (true = e-mail reservado agora: a aplicação envia e, se
--     falhar, chama guia_libertar_email),
--   consentimento: 'registado' | 'ja_existia' | 'nao_pedido'.
create or replace function public.guia_registar_pedido(
  p_guia text,
  p_email text,
  p_idioma text,
  p_origem text,
  p_utm jsonb,
  p_consentimento_texto text,
  p_consentimento_versao text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid;
  v_novo boolean;
  v_enviar boolean;
  v_consentimento text := 'nao_pedido';
begin
  -- Serializa pedidos simultâneos do mesmo e-mail (duplo clique, reenvio).
  perform pg_advisory_xact_lock(hashtext('guia:' || p_guia || ':' || v_email));

  insert into public.guias_pedidos as g (guia, email, idioma, origem, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
  values (
    p_guia, v_email, coalesce(p_idioma, 'pt-PT'), coalesce(p_origem, 'outro'),
    nullif(p_utm ->> 'utm_source', ''), nullif(p_utm ->> 'utm_medium', ''), nullif(p_utm ->> 'utm_campaign', ''),
    nullif(p_utm ->> 'utm_content', ''), nullif(p_utm ->> 'utm_term', '')
  )
  on conflict (guia, email) do update
    set pedidos = g.pedidos + 1,
        ultimo_pedido_em = now()
  returning g.id, (g.xmax = 0) into v_id, v_novo;

  -- No máximo um e-mail com a ligação por 24 h (a ligação aparece sempre na página).
  update public.guias_pedidos
     set email_enviado_em = now()
   where id = v_id
     and (email_enviado_em is null or email_enviado_em < now() - interval '24 hours')
  returning true into v_enviar;

  if p_consentimento_texto is not null then
    if exists (select 1 from public.consentimentos_comunicacoes_sem_conta where email = v_email and retirado_em is null) then
      v_consentimento := 'ja_existia';
    else
      insert into public.consentimentos_comunicacoes_sem_conta (email, origem, versao, texto, idioma)
      values (v_email, p_guia, p_consentimento_versao, p_consentimento_texto, coalesce(p_idioma, 'pt-PT'));
      v_consentimento := 'registado';
    end if;
  end if;

  return jsonb_build_object(
    'pedido_id', v_id,
    'novo', v_novo,
    'enviar_email', coalesce(v_enviar, false),
    'consentimento', v_consentimento
  );
end $$;

revoke execute on function public.guia_registar_pedido(text, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.guia_registar_pedido(text, text, text, text, jsonb, text, text) to service_role;

-- Falhou o envio pela Brevo: liberta a reserva para um pedido seguinte poder tentar.
create or replace function public.guia_libertar_email(p_pedido uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.guias_pedidos set email_enviado_em = null where id = p_pedido;
$$;

revoke execute on function public.guia_libertar_email(uuid) from public, anon, authenticated;
grant execute on function public.guia_libertar_email(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Métricas (só admin): pedidos por origem e autorizações comerciais
-- ---------------------------------------------------------------------------
create or replace function public.guia_metricas(p_guia text default 'guia_facturas')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'pedidos', count(*),
    'pedidos_repetidos', count(*) filter (where pedidos > 1),
    'por_origem', coalesce((
      select jsonb_object_agg(origem, n) from (
        select origem, count(*) n from public.guias_pedidos where guia = p_guia group by origem
      ) o
    ), '{}'::jsonb),
    'por_campanha', coalesce((
      select jsonb_object_agg(coalesce(utm_campaign, '(sem campanha)'), n) from (
        select utm_campaign, count(*) n from public.guias_pedidos where guia = p_guia group by utm_campaign
      ) c
    ), '{}'::jsonb),
    'autorizacoes_comerciais', (
      select count(*) from public.consentimentos_comunicacoes_sem_conta where origem = p_guia and retirado_em is null
    )
  )
  into v
  from public.guias_pedidos
  where guia = p_guia;
  return v;
end $$;

revoke execute on function public.guia_metricas(text) from public, anon;
grant execute on function public.guia_metricas(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Retenção: pedidos apagados 12 meses depois do último pedido.
-- As autorizações comerciais ficam enquanto activas; depois de retiradas,
-- a prova é conservada 3 anos (prazo a validar com a advogada).
-- ---------------------------------------------------------------------------
create or replace function public.limpar_guias_pedidos()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.guias_pedidos where ultimo_pedido_em < now() - interval '12 months';
  delete from public.consentimentos_comunicacoes_sem_conta where retirado_em < now() - interval '3 years';
$$;

revoke execute on function public.limpar_guias_pedidos() from public, anon, authenticated;
grant execute on function public.limpar_guias_pedidos() to service_role;

select cron.schedule('limpar-guias-pedidos', '50 3 * * *', $$ select public.limpar_guias_pedidos(); $$);
