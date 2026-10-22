-- Diagnóstico gratuito sem registo (22/10/2026).
--
-- O visitante carrega uma factura ou um contrato sem criar conta e recebe um
-- diagnóstico só com factos lidos do documento e cálculos feitos em código
-- (decisão de Thiago, 22/10/2026: sem "pontos de atenção" nem inconsistências
-- sugeridas pela IA — regra 2 do "Uso de IA"). Desligado por omissão
-- (DIAGNOSTICO_GRATUITO_ATIVO=1); só se liga depois da avaliação da leitura
-- com o Haiku 5.5 e da nova versão da Política de Privacidade.
--
-- 1. diagnosticos_gratuitos: um registo por documento carregado. A sessão
--    anónima é um cookie funcional (dolado_diagnostico, httpOnly) com o id e
--    um segredo; aqui só fica o SHA-256 do segredo. Sem e-mail, nome, IP nem
--    fingerprint. RLS ativo sem policies: só a service role lê e escreve
--    (servidor); o admin lê as métricas por diagnostico_metricas().
-- 2. Ficheiros no bucket privado documentos-monitor, em diagnosticos/<uuid>:
--    é o único bucket cujas URL assinadas a camada de minimização aceita
--    enviar à Claude API (documentoParaIA). monitor_ficheiros_orfaos() passa
--    a ignorar os ficheiros de diagnósticos ainda válidos e apaga os outros.
-- 3. Conservação: o documento, a leitura e o segredo da sessão são apagados
--    ao fim de 7 dias (30 depois de associado a uma conta); o registo fica
--    só com contagens e origem (sem conteúdo) e é apagado aos 13 meses.
-- 4. uso_api_claude.diagnostico_id: custo de cada leitura gratuita.

create table public.diagnosticos_gratuitos (
  id uuid primary key default gen_random_uuid(),
  -- Identificador aleatório do browser (o mesmo cookie pode carregar vários
  -- documentos): agrupa documentos por sessão, nunca identifica uma pessoa.
  sessao_id uuid not null,
  -- SHA-256 do segredo do cookie (o mesmo para os documentos da sessão).
  token_hash text check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  estado text not null default 'a_carregar'
    check (estado in ('a_carregar', 'a_analisar', 'concluido', 'falhou')),
  motivo_falha text
    check (motivo_falha in ('ficheiro_invalido', 'nao_suportado', 'ilegivel', 'indisponivel', 'orcamento')),
  storage_path text unique check (storage_path is null or storage_path like 'diagnosticos/%'),
  mime_type text,
  tamanho_bytes integer check (tamanho_bytes is null or tamanho_bytes > 0),
  sha256 text,
  tipo_documento text check (tipo_documento in ('fatura', 'contrato', 'outro')),
  setor text check (setor in ('telecomunicacoes', 'eletricidade', 'gas', 'agua', 'outro', 'nao_indicado')),
  -- Diagnóstico mostrado (factos lidos + cálculos em código). Sem NIF nem
  -- nome do titular (pseudonimizados antes de gravar).
  resultado jsonb,
  modelo text,
  -- Origem (só atribuição, valores normalizados no servidor).
  canal text not null default 'direto'
    check (canal in ('google', 'instagram', 'facebook', 'direto', 'referencia', 'campanha', 'parceiro', 'outro')),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  pagina_entrada text check (char_length(pagina_entrada) <= 200),
  dispositivo text check (dispositivo in ('movel', 'computador')),
  -- Conversão (cada marco gravado uma vez pelo servidor).
  carregado_em timestamptz,
  analisado_em timestamptz,
  visualizado_em timestamptz,
  protecao_clicada_em timestamptz,
  guardar_clicado_em timestamptz,
  conta_id uuid references auth.users (id) on delete set null,
  associado_em timestamptz,
  documento_monitor_id uuid references public.documentos_monitor (id) on delete set null,
  expira_em timestamptz not null default now() + interval '7 days',
  dados_apagados_em timestamptz,
  created_at timestamptz not null default now()
);

create index diagnosticos_gratuitos_created_idx on public.diagnosticos_gratuitos (created_at);
create index diagnosticos_gratuitos_conta_idx on public.diagnosticos_gratuitos (conta_id) where conta_id is not null;
create index diagnosticos_gratuitos_sessao_idx on public.diagnosticos_gratuitos (sessao_id);

alter table public.diagnosticos_gratuitos enable row level security;
revoke all on table public.diagnosticos_gratuitos from anon, authenticated;

comment on table public.diagnosticos_gratuitos is
  'Diagnóstico gratuito sem registo. Só service role; documento e leitura apagados aos 7 dias (30 se associado), registo aos 13 meses.';

alter table public.uso_api_claude
  add column diagnostico_id uuid references public.diagnosticos_gratuitos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Reserva de um diagnóstico: limite diário global (abuso e custo), atómico.
-- ---------------------------------------------------------------------------
create or replace function public.diagnostico_reservar(
  p_sessao uuid,
  p_token_hash text,
  p_storage_path text,
  p_mime text,
  p_tamanho integer,
  p_limite_diario integer,
  p_canal text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_pagina_entrada text,
  p_dispositivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_hoje integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('diagnostico_reservar', 0));
  select count(*) into v_hoje
    from public.diagnosticos_gratuitos
   where created_at >= date_trunc('day', now() at time zone 'Europe/Lisbon') at time zone 'Europe/Lisbon';
  if v_hoje >= greatest(p_limite_diario, 0) then
    return null;
  end if;

  insert into public.diagnosticos_gratuitos (
    sessao_id, token_hash, storage_path, mime_type, tamanho_bytes,
    canal, utm_source, utm_medium, utm_campaign, pagina_entrada, dispositivo
  ) values (
    p_sessao, p_token_hash, p_storage_path, p_mime, p_tamanho,
    coalesce(p_canal, 'direto'), p_utm_source, p_utm_medium, p_utm_campaign, p_pagina_entrada, p_dispositivo
  )
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.diagnostico_reservar(uuid, text, text, text, integer, integer, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.diagnostico_reservar(uuid, text, text, text, integer, integer, text, text, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Associação a uma conta: os diagnósticos concluídos e ainda válidos da
-- sessão, só com o segredo do cookie (mesmo browser), nunca os de outra conta.
-- ---------------------------------------------------------------------------
create or replace function public.diagnostico_associar(p_sessao uuid, p_token_hash text, p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.diagnosticos_gratuitos
     set conta_id = p_user,
         associado_em = coalesce(associado_em, now()),
         expira_em = greatest(expira_em, now() + interval '30 days')
   where sessao_id = p_sessao
     and token_hash = p_token_hash
     and estado = 'concluido'
     and dados_apagados_em is null
     and expira_em > now()
     and (conta_id is null or conta_id = p_user);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function public.diagnostico_associar(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.diagnostico_associar(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Conservação (pg_cron diário).
-- ---------------------------------------------------------------------------
create or replace function public.diagnosticos_expirar()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expirados integer;
  v_apagados integer;
begin
  -- O ficheiro deixa de ser referenciado e é apagado pela Edge Function
  -- verificar-monitor-datas (monitor_ficheiros_orfaos).
  update public.diagnosticos_gratuitos
     set token_hash = null, storage_path = null, sha256 = null, resultado = null,
         dados_apagados_em = now()
   where expira_em <= now() and dados_apagados_em is null;
  get diagnostics v_expirados = row_count;

  delete from public.diagnosticos_gratuitos where created_at < now() - interval '13 months';
  get diagnostics v_apagados = row_count;

  return jsonb_build_object('expirados', v_expirados, 'apagados', v_apagados);
end $$;

revoke execute on function public.diagnosticos_expirar() from public, anon, authenticated;
grant execute on function public.diagnosticos_expirar() to service_role;

select cron.schedule('diagnosticos-expirar', '55 3 * * *', $$ select public.diagnosticos_expirar(); $$);

-- Ficheiros órfãos do bucket do Monitor: os de um diagnóstico ainda válido
-- não são órfãos (o documento ainda não está em documentos_monitor).
create or replace function public.monitor_ficheiros_orfaos()
returns table (storage_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'documentos-monitor'
     and o.created_at < now() - interval '24 hours'
     and not exists (
       select 1 from public.documentos_monitor d
        where d.bucket = 'documentos-monitor' and d.storage_path = o.name
     )
     and not exists (
       select 1 from public.diagnosticos_gratuitos g
        where g.storage_path = o.name and g.expira_em > now()
     )
   limit 500;
$$;
revoke execute on function public.monitor_ficheiros_orfaos() from public, anon, authenticated;
grant execute on function public.monitor_ficheiros_orfaos() to service_role;
