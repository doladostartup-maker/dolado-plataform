-- DoLado — Receção das respostas pelo Resend em vez da Brevo (06/10/2026).
--
-- A versão Brevo de 20261006100000_acompanhamento_pos_envio.sql já está na
-- base de dados de produção. A receção pela Brevo exige um plano demasiado
-- caro: a DoLado passa a receber pelo Resend (só receção; os envios
-- continuam na Brevo). Esta migration leva o schema da versão Brevo à
-- versão Resend, sem apagar dados:
--   * comunicações recebidas: provider 'resend', provider_message_id (email_id
--     do Resend; deduplicação por caso), responder_para (Reply-To), estado do
--     processamento depois do registo (recebida → processada | falhou);
--   * registo técnico: provider_message_id e resultado 'quarentena';
--   * quarentena (comunicacoes_nao_associadas): e-mails sem caso, nunca
--     descartados nem associados por adivinhação; apagados aos 90 dias;
--   * análise automática pela IA: nunca para spam provável e no máximo 5
--     por caso em 24 horas.
-- O endpoint da Brevo nunca esteve em produção: não há comunicações com
-- provider 'brevo' (a migration falha, sem alterar nada, se houver).

-- ---------------------------------------------------------------------------
-- 1. Comunicações recebidas
-- ---------------------------------------------------------------------------
alter table public.casos_comunicacoes_recebidas
  drop constraint casos_comunicacoes_recebidas_provider_check,
  drop constraint casos_comunicacoes_recebidas_check,
  add column provider_message_id text check (char_length(provider_message_id) <= 200),
  add column responder_para jsonb not null default '[]'::jsonb check (jsonb_typeof(responder_para) = 'array'),
  add column estado_processamento text not null default 'recebida' check (estado_processamento in ('recebida', 'processada', 'falhou')),
  add column erro_processamento text check (char_length(erro_processamento) <= 200);

-- Registos manuais já existentes não têm processamento por fazer.
update public.casos_comunicacoes_recebidas set estado_processamento = 'processada' where origem = 'manual';

alter table public.casos_comunicacoes_recebidas
  add constraint casos_comunicacoes_recebidas_provider_check check (provider in ('resend')),
  add constraint casos_comunicacoes_recebidas_check check (origem <> 'email' or (provider is not null and provider_message_id is not null));

comment on column public.casos_comunicacoes_recebidas.provider_message_id is 'Resend: id do e-mail recebido (email_id). provider_event_id guarda o id do evento do webhook (svix-id).';
comment on table public.casos_comunicacoes_recebidas is
  'Comunicações recebidas da empresa (ou de terceiros) num caso: e-mail para o endereço do caso (Resend, receção) ou registo manual. Conteúdo original imutável (prova); só a análise humana é registada depois.';

drop index public.casos_comunicacoes_evento_idx;
-- O mesmo e-mail (reenviado pelo webhook, com o mesmo ou outro evento) dá um
-- só registo por caso.
create unique index casos_comunicacoes_mensagem_idx on public.casos_comunicacoes_recebidas (provider, provider_message_id, caso_id)
  where provider_message_id is not null;

create or replace function public.casos_comunicacoes_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  mutaveis text[] := array['estado_analise', 'classificacao', 'analisada_em', 'analisada_por', 'anexos_processados_em', 'registado_por',
    'estado_processamento', 'erro_processamento'];
  k text;
  n jsonb := to_jsonb(new);
  o jsonb := to_jsonb(old);
begin
  for k in select jsonb_object_keys(n) loop
    if n->k is distinct from o->k and not (k = any (mutaveis)) then
      raise exception 'casos_comunicacoes_recebidas: conteúdo original imutável (%)', k using errcode = '42501';
    end if;
  end loop;
  if old.estado_analise <> 'por_analisar' and (
       new.estado_analise is distinct from old.estado_analise or new.classificacao is distinct from old.classificacao
       or new.analisada_em is distinct from old.analisada_em
       or (new.analisada_por is distinct from old.analisada_por and new.analisada_por is not null)) then
    raise exception 'casos_comunicacoes_recebidas: análise já registada' using errcode = '42501';
  end if;
  if old.estado_processamento = 'processada' and new.estado_processamento <> 'processada' then
    raise exception 'casos_comunicacoes_recebidas: já processada' using errcode = '42501';
  end if;
  if old.anexos_processados_em is not null and new.anexos_processados_em is distinct from old.anexos_processados_em then
    raise exception 'casos_comunicacoes_recebidas: anexos já processados' using errcode = '42501';
  end if;
  if new.registado_por is distinct from old.registado_por and new.registado_por is not null then
    raise exception 'casos_comunicacoes_recebidas: registo imutável' using errcode = '42501';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Registo técnico do webhook
-- ---------------------------------------------------------------------------
alter table public.comunicacoes_inbound_registos
  drop constraint comunicacoes_inbound_registos_provider_check,
  drop constraint comunicacoes_inbound_registos_resultado_check,
  add column provider_message_id text check (char_length(provider_message_id) <= 200);
alter table public.comunicacoes_inbound_registos
  add constraint comunicacoes_inbound_registos_provider_check check (provider in ('resend')),
  add constraint comunicacoes_inbound_registos_resultado_check check (resultado in ('aceite', 'duplicado', 'rejeitado', 'quarentena', 'erro'));
comment on table public.comunicacoes_inbound_registos is
  'Cada evento do webhook de receção: aceite, duplicado, rejeitado, em quarentena (motivo) ou erro. Sem endereços, assuntos nem conteúdo. Apagado aos 90 dias.';

-- ---------------------------------------------------------------------------
-- 3. Quarentena e limpeza aos 90 dias (o pg_cron "limpar-registos-inbound"
--    já existe e chama esta função)
-- ---------------------------------------------------------------------------
-- E-mails recebidos em respostas.dolado.pt que não correspondem a nenhum
-- caso (endereço inexistente, sem endereço de caso, caso apagado): nunca
-- descartados nem associados a um caso por adivinhação. Só o necessário
-- para a DoLado perceber o que chegou (sem o corpo nem anexos, que ficam no
-- Resend); apagados aos 90 dias. Só o admin lê.
create table public.comunicacoes_nao_associadas (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('resend')),
  provider_message_id text not null check (char_length(provider_message_id) <= 200),
  destinatarios text[] not null default '{}',
  remetente text check (char_length(remetente) <= 400),
  assunto text check (char_length(assunto) <= 1000),
  recebida_em timestamptz,
  motivo text not null check (motivo in ('sem_endereco_de_caso', 'endereco_inexistente', 'endereco_desativado', 'caso_inexistente')),
  created_at timestamptz not null default now(),
  revista_em timestamptz,
  revista_por uuid references public.utilizadores (id) on delete set null,
  unique (provider, provider_message_id)
);
comment on table public.comunicacoes_nao_associadas is
  'Quarentena: e-mails recebidos que não puderam ser associados a um caso. Sem corpo nem anexos; apagados aos 90 dias.';
create index comunicacoes_nao_associadas_por_rever_idx on public.comunicacoes_nao_associadas (created_at) where revista_em is null;

create or replace function public.comunicacoes_nao_associadas_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'revista_em' - 'revista_por') is distinct from (to_jsonb(old) - 'revista_em' - 'revista_por')
     or (old.revista_em is not null and new.revista_em is distinct from old.revista_em) then
    raise exception 'comunicacoes_nao_associadas: só a revisão é registada' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger comunicacoes_nao_associadas_integridade before update on public.comunicacoes_nao_associadas
  for each row execute function public.comunicacoes_nao_associadas_integridade();

create or replace function public.limpar_comunicacoes_inbound_registos()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  n int;
  m int;
begin
  delete from public.comunicacoes_inbound_registos where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  delete from public.comunicacoes_nao_associadas where created_at < now() - interval '90 days';
  get diagnostics m = row_count;
  return n + m;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Funções do fluxo
-- ---------------------------------------------------------------------------
-- Regista uma comunicação recebida (e-mail ou registo manual). Atómica e
-- idempotente: o mesmo e-mail (provider + provider_message_id) ou o mesmo
-- Message-ID no mesmo caso dão um só registo lógico.
-- A chegada de uma mensagem só faz "A aguardar resposta da empresa" →
-- "Resposta em análise"; nunca "respondido" nem "resolvido". Noutros estados
-- fica registada para análise, sem mudar o estado.
create or replace function public.comunicacao_registar_recebida(p_caso_id uuid, p_dados jsonb, p_admin uuid default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c record;
  v_id uuid;
  v_origem text := p_dados->>'origem';
  v_event text := nullif(p_dados->>'provider_message_id', '');
  v_msg text := nullif(p_dados->>'message_id', '');
  v_spam boolean := coalesce((p_dados->>'suspeita_spam')::boolean, false);
  v_transita boolean;
  v_ator text := case when v_origem = 'manual' then 'equipa' else 'sistema' end;
begin
  if v_origem not in ('email', 'manual') or (v_origem = 'manual' and p_admin is null) then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select id, status into c from public.casos where id = p_caso_id for update;
  if c.id is null then
    return jsonb_build_object('resultado', 'caso_inexistente');
  end if;

  select id into v_id from public.casos_comunicacoes_recebidas
   where (v_event is not null and provider = p_dados->>'provider' and provider_message_id = v_event and caso_id = p_caso_id)
      or (v_msg is not null and caso_id = p_caso_id and message_id = v_msg)
   limit 1;
  if v_id is not null then
    return jsonb_build_object('resultado', 'duplicada', 'comunicacao_id', v_id);
  end if;

  v_transita := c.status = 'Aguardando operador' and not v_spam;

  insert into public.casos_comunicacoes_recebidas (
    caso_id, origem, canal, provider, provider_message_id, provider_event_id, message_id, in_reply_to, referencias,
    remetente_email, remetente_nome, destinatario, para, cc, responder_para, assunto, corpo_texto, corpo_html, corpo_apresentacao,
    truncado, cabecalhos, data_mensagem, spam_score, automatica, suspeita_spam, tamanho_bytes, registado_por,
    estado_caso_na_rececao, transitou, anexos_processados_em, estado_processamento)
  values (
    p_caso_id, v_origem, coalesce(p_dados->>'canal', 'email'), nullif(p_dados->>'provider', ''), v_event,
    nullif(p_dados->>'provider_event_id', ''), v_msg,
    nullif(p_dados->>'in_reply_to', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_dados->'referencias', '[]'::jsonb)) x), '{}'),
    nullif(p_dados->>'remetente_email', ''), nullif(p_dados->>'remetente_nome', ''), nullif(p_dados->>'destinatario', ''),
    coalesce(p_dados->'para', '[]'::jsonb), coalesce(p_dados->'cc', '[]'::jsonb), coalesce(p_dados->'responder_para', '[]'::jsonb),
    nullif(p_dados->>'assunto', ''),
    nullif(p_dados->>'corpo_texto', ''), nullif(p_dados->>'corpo_html', ''), nullif(p_dados->>'corpo_apresentacao', ''),
    coalesce((p_dados->>'truncado')::boolean, false), coalesce(p_dados->'cabecalhos', '{}'::jsonb),
    nullif(p_dados->>'data_mensagem', '')::timestamptz, nullif(p_dados->>'spam_score', '')::numeric,
    coalesce((p_dados->>'automatica')::boolean, false), v_spam, nullif(p_dados->>'tamanho_bytes', '')::int,
    case when v_origem = 'manual' then p_admin end,
    c.status, v_transita,
    case when coalesce((p_dados->>'sem_anexos')::boolean, false) then now() end,
    case when v_origem = 'manual' then 'processada' else 'recebida' end)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- Corrida com um pedido igual: o outro registou.
    select id into v_id from public.casos_comunicacoes_recebidas
     where (v_event is not null and provider = p_dados->>'provider' and provider_message_id = v_event and caso_id = p_caso_id)
        or (v_msg is not null and caso_id = p_caso_id and message_id = v_msg)
     limit 1;
    return jsonb_build_object('resultado', 'duplicada', 'comunicacao_id', v_id);
  end if;

  insert into public.casos_eventos (caso_id, tipo, ator, comunicacao_id, visivel_cliente)
  values (p_caso_id, 'comunicacao_recebida', v_ator, v_id, v_transita);

  if v_transita then
    perform public.caso__ator(v_ator, p_admin);
    update public.casos set status = 'Resposta em análise' where id = p_caso_id;
    insert into public.casos_eventos (caso_id, tipo, ator, comunicacao_id) values (p_caso_id, 'em_analise_dolado', 'sistema', v_id);
  end if;

  return jsonb_build_object('resultado', 'registada', 'comunicacao_id', v_id, 'transitou', v_transita,
    'estado', case when v_transita then 'Resposta em análise' else c.status end);
end $$;

-- Início de uma análise pela IA (null = já há uma em curso / automática já feita).
create or replace function public.analise_ia_iniciar(
  p_comunicacao_id uuid,
  p_origem text,
  p_admin uuid,
  p_prompt_versao text,
  p_schema_versao text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  com record;
  v_id uuid;
begin
  select id, caso_id, suspeita_spam into com from public.casos_comunicacoes_recebidas where id = p_comunicacao_id for update;
  if com.id is null then
    raise exception 'comunicação inexistente' using errcode = 'P0002';
  end if;
  update public.casos_analises_ia
     set estado = 'falhou', erro = 'interrompido', concluido_em = now()
   where comunicacao_id = p_comunicacao_id and estado = 'a_gerar' and created_at < now() - interval '5 minutes';
  if exists (select 1 from public.casos_analises_ia where comunicacao_id = p_comunicacao_id and estado = 'a_gerar') then
    return null;
  end if;
  if p_origem = 'automatico' and exists (select 1 from public.casos_analises_ia where comunicacao_id = p_comunicacao_id) then
    return null;
  end if;
  -- Custo controlado: nunca análise automática de spam provável, e no máximo
  -- 5 análises automáticas por caso em 24 horas (o resto fica para o pedido
  -- manual da DoLado).
  if p_origem = 'automatico' and (com.suspeita_spam or (
    select count(*) from public.casos_analises_ia
     where caso_id = com.caso_id and origem = 'automatico' and created_at > now() - interval '24 hours') >= 5) then
    return null;
  end if;
  insert into public.casos_analises_ia (caso_id, comunicacao_id, origem, pedido_por, prompt_versao, schema_versao)
  values (com.caso_id, p_comunicacao_id, p_origem, p_admin, p_prompt_versao, p_schema_versao)
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.limpar_comunicacoes_inbound_registos() from public, anon, authenticated;
grant execute on function public.limpar_comunicacoes_inbound_registos() to service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS da quarentena (só o admin lê; só o servidor escreve)
-- ---------------------------------------------------------------------------
alter table public.comunicacoes_nao_associadas enable row level security;
create policy "Admin lê e-mails não associados" on public.comunicacoes_nao_associadas for select to authenticated using (public.is_admin());
revoke all on public.comunicacoes_nao_associadas from anon, authenticated;
grant select on public.comunicacoes_nao_associadas to authenticated;
