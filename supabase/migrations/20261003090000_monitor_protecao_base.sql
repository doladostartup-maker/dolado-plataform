-- DoLado — Monitor de Proteção, base (fase 1 / PR A)
--
-- Plano: docs/especificacoes/PLANO_MONITOR_FASE1.md (aprovado a 02/10/2026).
--
-- O objeto central da Proteção passa a ser o contrato monitorizado. Esta
-- migration cria o modelo de dados e copia os alertas de fidelização e de
-- promoção existentes. As tabelas antigas continuam a existir (o código em
-- produção ainda as usa) e são removidas numa migration própria depois do
-- deploy do código novo.
--
-- Regras:
--   * O cliente só LÊ os próprios dados. Toda a escrita é feita pelo
--     servidor (service_role), através das funções abaixo, depois de validar
--     sessão, posse e Proteção.
--   * Cada valor tem proveniência (contratos_campos). Uma correção cria uma
--     linha nova; o valor anterior fica "substituido".
--   * Um valor confirmado pelo cliente/admin, ou introduzido por eles, nunca
--     é substituído por uma extração: a extração diferente fica
--     "em_conflito" e o contrato passa a "a_confirmar".
--   * Cada alerta é registado em contratos_alertas_envios antes de ser
--     enviado (único por contrato + regra + data-alvo): nunca sai duas vezes.
--   * Fim da Proteção: contratos e documentos ficam desativados (sem envios)
--     e são apagados 6 meses depois — a mesma regra dos alertas
--     (20261002180000_alertas_desativados_fim_subscricao.sql).

-- ===========================================================================
-- 1. Storage
-- ===========================================================================

-- Formatos aceites pela Claude API (PDF, JPEG, PNG, WebP). HEIC não é lido
-- pela API — o browser converte ou o cliente carrega outro formato.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-monitor',
  'documentos-monitor',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admin lê documentos do monitor no storage"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documentos-monitor' and public.is_admin());

-- ===========================================================================
-- 2. Tabelas
-- ===========================================================================

create table public.contratos_monitorizados (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  setor text not null default 'nao_indicado'
    check (setor in ('telecomunicacoes', 'eletricidade', 'gas', 'agua', 'outro', 'nao_indicado')),
  estado text not null default 'parcial'
    check (estado in ('parcial', 'completo', 'a_confirmar', 'terminado')),
  -- Valores atuais (canónicos). Só alterados por public.monitor_campo_aceitar().
  fornecedor text,
  referencia_contrato text,
  servico text,
  data_inicio date,
  data_fim_fidelizacao date,
  data_fim_promocao date,
  descricao_promocao text,
  mensalidade_cents integer check (mensalidade_cents >= 0),
  vantagem_cents integer check (vantagem_cents >= 0),
  cessacao_operador_cents integer check (cessacao_operador_cents >= 0),
  cessacao_operador_data date,
  cpe text,
  cui text,
  desativado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contratos_monitorizados is
  'Monitor de Proteção: contrato acompanhado pela DoLado. Valores atuais derivados de contratos_campos (proveniência). Só o servidor escreve.';
comment on column public.contratos_monitorizados.desativado_em is
  'Fim da Proteção da conta: sem envios e início dos 6 meses de conservação. null = ativo.';

create index contratos_monitorizados_utilizador_id_idx on public.contratos_monitorizados (utilizador_id);
create index contratos_monitorizados_desativado_em_idx
  on public.contratos_monitorizados (desativado_em) where desativado_em is not null;

create trigger set_updated_at before update on public.contratos_monitorizados
  for each row execute function public.set_updated_at();

create table public.documentos_monitor (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  contrato_id uuid references public.contratos_monitorizados (id) on delete cascade,
  tipo text not null default 'desconhecido' check (tipo in ('fatura', 'contrato', 'desconhecido')),
  -- contratos-promocao: só ficheiros migrados dos alertas de promoção antigos.
  bucket text not null default 'documentos-monitor'
    check (bucket in ('documentos-monitor', 'contratos-promocao')),
  storage_path text not null,
  nome_ficheiro text,
  mime_type text,
  tamanho_bytes integer,
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  estado text not null default 'pendente'
    check (estado in ('pendente', 'processado', 'a_rever', 'ilegivel')),
  desativado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

comment on table public.documentos_monitor is
  'Faturas e contratos carregados para o Monitor de Proteção. O ficheiro vive no bucket privado; o upload é por URL assinada gerada no servidor.';
comment on column public.documentos_monitor.sha256 is
  'Hash do ficheiro: o mesmo documento do mesmo cliente não é processado duas vezes.';

create unique index documentos_monitor_hash_idx
  on public.documentos_monitor (utilizador_id, sha256) where sha256 is not null;
create index documentos_monitor_contrato_id_idx on public.documentos_monitor (contrato_id);
create index documentos_monitor_estado_idx on public.documentos_monitor (estado);
create index documentos_monitor_desativado_em_idx
  on public.documentos_monitor (desativado_em) where desativado_em is not null;

create trigger set_updated_at before update on public.documentos_monitor
  for each row execute function public.set_updated_at();

create table public.extracoes_documento (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_monitor (id) on delete cascade,
  modelo text not null,
  schema_versao text not null,
  prompt_versao text not null,
  estado text not null check (estado in ('sucesso', 'invalida', 'erro')),
  resultado jsonb,
  erro text,
  created_at timestamptz not null default now()
);

comment on table public.extracoes_documento is
  'Resultado estruturado de cada extração (staging). Nunca vai diretamente para os dados canónicos: passa por validação e confirmação. O cliente não lê.';

-- Idempotência: um documento só tem uma extração bem-sucedida por
-- combinação de modelo + schema + prompt. Reprocessar exige mudar uma delas.
create unique index extracoes_documento_sucesso_idx
  on public.extracoes_documento (documento_id, modelo, schema_versao, prompt_versao)
  where estado = 'sucesso';

create table public.contratos_campos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  campo text not null check (campo in (
    'fornecedor', 'referencia_contrato', 'servico', 'data_inicio', 'data_fim_fidelizacao',
    'data_fim_promocao', 'descricao_promocao', 'mensalidade_cents', 'vantagem_cents',
    'cessacao_operador_cents', 'cessacao_operador_data', 'cpe', 'cui'
  )),
  valor jsonb not null,
  origem text not null check (origem in ('cliente', 'contrato', 'fatura', 'admin')),
  documento_id uuid references public.documentos_monitor (id) on delete set null,
  extracao_id uuid references public.extracoes_documento (id) on delete set null,
  pagina integer check (pagina > 0),
  evidencia text check (char_length(evidencia) <= 300),
  confianca text check (confianca in ('high', 'medium', 'low', 'not_found', 'ambiguous')),
  estado text not null default 'proposto'
    check (estado in ('proposto', 'atual', 'substituido', 'rejeitado', 'em_conflito')),
  confirmado_cliente_em timestamptz,
  confirmado_admin_em timestamptz,
  substituido_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.contratos_campos is
  'Proveniência de cada valor de um contrato monitorizado. Linhas nunca reescritas: uma correção cria uma linha nova e a anterior fica substituida.';

create unique index contratos_campos_atual_idx
  on public.contratos_campos (contrato_id, campo) where estado = 'atual';
create index contratos_campos_contrato_id_idx on public.contratos_campos (contrato_id);

create table public.faturas_monitor (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  documento_id uuid not null unique references public.documentos_monitor (id) on delete cascade,
  extracao_id uuid references public.extracoes_documento (id) on delete set null,
  data_emissao date,
  periodo_inicio date,
  periodo_fim date,
  total_cents integer,
  recorrente_cents integer,
  pontual_cents integer,
  descontos_cents integer,
  linhas jsonb not null default '[]'::jsonb check (jsonb_typeof(linhas) = 'array'),
  cessacao_operador_cents integer check (cessacao_operador_cents >= 0),
  data_fim_fidelizacao date,
  created_at timestamptz not null default now(),
  check (periodo_fim is null or periodo_inicio is null or periodo_fim >= periodo_inicio)
);

comment on table public.faturas_monitor is
  'Fatura normalizada (uma por documento) para comparação histórica pelo código. O histórico nunca é reenviado à Claude API.';

create index faturas_monitor_contrato_idx on public.faturas_monitor (contrato_id, periodo_fim);

create table public.achados_monitor (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  fatura_id uuid references public.faturas_monitor (id) on delete cascade,
  tipo text not null check (tipo in (
    'aumento_nao_explicado', 'linha_nova', 'possivel_dupla_faturacao', 'cessacao_divergente'
  )),
  estado text not null default 'detetado'
    check (estado in ('detetado', 'em_revisao', 'confirmado', 'descartado', 'comunicado')),
  evidencia jsonb not null default '{}'::jsonb,
  versao_regra text not null,
  chave_idempotencia text not null unique,
  texto_cliente text,
  comunicado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estado <> 'comunicado' or (texto_cliente is not null and comunicado_em is not null))
);

comment on table public.achados_monitor is
  'Situações detetadas pelas regras (F2/F4). Revisão humana obrigatória antes de comunicar; o cliente só vê as comunicadas.';

create index achados_monitor_estado_idx on public.achados_monitor (estado);
create index achados_monitor_contrato_idx on public.achados_monitor (contrato_id);

create trigger set_updated_at before update on public.achados_monitor
  for each row execute function public.set_updated_at();

create table public.achados_revisoes (
  id uuid primary key default gen_random_uuid(),
  achado_id uuid not null references public.achados_monitor (id) on delete cascade,
  decisao text not null check (decisao in ('confirmar', 'descartar', 'corrigir_dados', 'pedir_informacao')),
  notas text,
  alteracoes jsonb,
  revisor_id uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.achados_revisoes is 'Prova da revisão humana de cada achado. Só inserção.';

create index achados_revisoes_achado_idx on public.achados_revisoes (achado_id);

create table public.contratos_alertas_envios (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  regra text not null check (regra in (
    'fidelizacao_60d', 'fidelizacao_30d', 'fidelizacao_fim',
    'promocao_60d', 'promocao_30d', 'promocao_fim'
  )),
  data_alvo date not null,
  enviado_em timestamptz not null default now(),
  unique (contrato_id, regra, data_alvo)
);

comment on table public.contratos_alertas_envios is
  'Alertas de datas enviados. Registado ANTES do envio (reserva): o mesmo alerta nunca sai duas vezes. Uma data nova (ex.: refidelização) gera alertas novos.';

create table public.uso_api_claude (
  id uuid primary key default gen_random_uuid(),
  funcionalidade text not null,
  documento_id uuid references public.documentos_monitor (id) on delete set null,
  modelo text not null,
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  custo_estimado_usd numeric(12, 6) not null default 0 check (custo_estimado_usd >= 0),
  latencia_ms integer,
  tentativas integer not null default 1,
  estado text not null check (estado in ('sucesso', 'erro')),
  request_id text,
  created_at timestamptz not null default now()
);

comment on table public.uso_api_claude is
  'Custo de cada chamada à Claude API (orçamento do piloto). Sem dados pessoais: sobrevive à eliminação do documento.';

create index uso_api_claude_created_at_idx on public.uso_api_claude (created_at);

-- ===========================================================================
-- 3. Integridade
-- ===========================================================================

-- O dono de cada linha tem de ser o dono do contrato a que pertence.
create or replace function public.monitor_verificar_dono()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_dono uuid;
begin
  if new.contrato_id is null then
    return new;
  end if;
  select utilizador_id into v_dono from public.contratos_monitorizados where id = new.contrato_id;
  if v_dono is distinct from new.utilizador_id then
    raise exception 'Contrato % não pertence ao utilizador %', new.contrato_id, new.utilizador_id
      using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.monitor_verificar_dono() from public, anon, authenticated;

create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.documentos_monitor for each row execute function public.monitor_verificar_dono();
create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.contratos_campos for each row execute function public.monitor_verificar_dono();
create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.faturas_monitor for each row execute function public.monitor_verificar_dono();
create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.achados_monitor for each row execute function public.monitor_verificar_dono();

-- Proveniência: só o estado e as datas de confirmação/substituição mudam.
create or replace function public.contratos_campos_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.contrato_id is distinct from old.contrato_id
     or new.utilizador_id is distinct from old.utilizador_id
     or new.campo is distinct from old.campo
     or new.valor is distinct from old.valor
     or new.origem is distinct from old.origem
     or new.pagina is distinct from old.pagina
     or new.evidencia is distinct from old.evidencia
     or new.confianca is distinct from old.confianca
     or new.created_at is distinct from old.created_at
     or (old.documento_id is not null and new.documento_id is distinct from old.documento_id and new.documento_id is not null)
     or (old.extracao_id is not null and new.extracao_id is distinct from old.extracao_id and new.extracao_id is not null) then
    raise exception 'A proveniência de um campo não pode ser alterada' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.contratos_campos_imutavel() from public, anon, authenticated;

create trigger contratos_campos_imutavel before update on public.contratos_campos
  for each row execute function public.contratos_campos_imutavel();

create or replace function public.achados_revisoes_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Revisões de achados não podem ser alteradas' using errcode = '42501';
end $$;

revoke execute on function public.achados_revisoes_so_insercao() from public, anon, authenticated;

create trigger achados_revisoes_so_insercao before update on public.achados_revisoes
  for each row execute function public.achados_revisoes_so_insercao();

-- ===========================================================================
-- 4. RLS e privilégios — o cliente só lê; toda a escrita é do servidor
-- ===========================================================================

alter table public.contratos_monitorizados enable row level security;
alter table public.documentos_monitor enable row level security;
alter table public.extracoes_documento enable row level security;
alter table public.contratos_campos enable row level security;
alter table public.faturas_monitor enable row level security;
alter table public.achados_monitor enable row level security;
alter table public.achados_revisoes enable row level security;
alter table public.contratos_alertas_envios enable row level security;
alter table public.uso_api_claude enable row level security;

revoke insert, update, delete on
  public.contratos_monitorizados, public.documentos_monitor, public.extracoes_documento,
  public.contratos_campos, public.faturas_monitor, public.achados_monitor,
  public.achados_revisoes, public.contratos_alertas_envios, public.uso_api_claude
  from anon, authenticated;

create policy "Cliente vê os próprios contratos monitorizados"
  on public.contratos_monitorizados for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê todos os contratos monitorizados"
  on public.contratos_monitorizados for select to authenticated
  using (public.is_admin());

create policy "Cliente vê os próprios documentos do monitor"
  on public.documentos_monitor for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê todos os documentos do monitor"
  on public.documentos_monitor for select to authenticated
  using (public.is_admin());

create policy "Admin vê as extrações"
  on public.extracoes_documento for select to authenticated
  using (public.is_admin());

create policy "Cliente vê a proveniência dos próprios contratos"
  on public.contratos_campos for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê a proveniência de todos os contratos"
  on public.contratos_campos for select to authenticated
  using (public.is_admin());

create policy "Cliente vê as próprias faturas do monitor"
  on public.faturas_monitor for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê todas as faturas do monitor"
  on public.faturas_monitor for select to authenticated
  using (public.is_admin());

create policy "Cliente vê os próprios achados comunicados"
  on public.achados_monitor for select to authenticated
  using (utilizador_id = auth.uid() and estado = 'comunicado');
create policy "Admin vê todos os achados"
  on public.achados_monitor for select to authenticated
  using (public.is_admin());

create policy "Admin vê as revisões de achados"
  on public.achados_revisoes for select to authenticated
  using (public.is_admin());

create policy "Admin vê os alertas enviados"
  on public.contratos_alertas_envios for select to authenticated
  using (public.is_admin());

create policy "Admin vê o uso da Claude API"
  on public.uso_api_claude for select to authenticated
  using (public.is_admin());

-- ===========================================================================
-- 5. Campos e estado do contrato (só service_role)
-- ===========================================================================

-- Estado: a_confirmar se houver conflitos; completo se houver dados para
-- todas as verificações do setor; caso contrário parcial. "terminado" só
-- muda por decisão explícita.
create or replace function public.monitor_recalcular_estado(p_contrato uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.contratos_monitorizados;
  v_estado text;
begin
  select * into c from public.contratos_monitorizados where id = p_contrato;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;
  if c.estado = 'terminado' then
    return c.estado;
  end if;

  if exists (select 1 from public.contratos_campos where contrato_id = p_contrato and estado = 'em_conflito') then
    v_estado := 'a_confirmar';
  elsif c.fornecedor is not null and c.mensalidade_cents is not null and c.data_fim_fidelizacao is not null
        and (c.setor <> 'telecomunicacoes' or (c.data_inicio is not null and c.vantagem_cents is not null)) then
    v_estado := 'completo';
  else
    v_estado := 'parcial';
  end if;

  if v_estado is distinct from c.estado then
    update public.contratos_monitorizados set estado = v_estado where id = p_contrato;
  end if;
  return v_estado;
end $$;

-- Torna um valor proposto (ou em conflito) no valor atual: o anterior fica
-- substituido e a coluna canónica do contrato é atualizada.
-- p_por: 'cliente' | 'admin' | null (aceite pelo sistema, sem confirmação humana).
create or replace function public.monitor_campo_aceitar(p_campo_id uuid, p_por text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.contratos_campos;
begin
  if p_por is not null and p_por not in ('cliente', 'admin') then
    raise exception 'Confirmação inválida: %', p_por using errcode = '22023';
  end if;

  select * into f from public.contratos_campos where id = p_campo_id for update;
  if not found then
    raise exception 'Campo inexistente' using errcode = 'P0002';
  end if;
  if f.estado not in ('proposto', 'em_conflito') then
    raise exception 'Só um valor proposto ou em conflito pode ser aceite (estado: %)', f.estado using errcode = '22023';
  end if;

  perform 1 from public.contratos_monitorizados where id = f.contrato_id for update;

  update public.contratos_campos
     set estado = 'substituido', substituido_em = now()
   where contrato_id = f.contrato_id and campo = f.campo and estado = 'atual';

  -- Outros conflitos/propostas para o mesmo campo ficam resolvidos por esta decisão.
  update public.contratos_campos
     set estado = 'rejeitado'
   where contrato_id = f.contrato_id and campo = f.campo
     and estado in ('proposto', 'em_conflito') and id <> f.id;

  update public.contratos_campos
     set estado = 'atual',
         confirmado_cliente_em = case when p_por = 'cliente' then now() else confirmado_cliente_em end,
         confirmado_admin_em = case when p_por = 'admin' then now() else confirmado_admin_em end
   where id = f.id;

  execute format(
    'update public.contratos_monitorizados c
        set %1$I = (jsonb_populate_record(null::public.contratos_monitorizados, jsonb_build_object(%2$L, $1))).%1$I
      where c.id = $2',
    f.campo, f.campo
  ) using f.valor, f.contrato_id;

  perform public.monitor_recalcular_estado(f.contrato_id);
end $$;

create or replace function public.monitor_campo_rejeitar(p_campo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.contratos_campos;
begin
  select * into f from public.contratos_campos where id = p_campo_id for update;
  if not found then
    raise exception 'Campo inexistente' using errcode = 'P0002';
  end if;
  if f.estado not in ('proposto', 'em_conflito') then
    raise exception 'Só um valor proposto ou em conflito pode ser rejeitado (estado: %)', f.estado using errcode = '22023';
  end if;
  update public.contratos_campos set estado = 'rejeitado' where id = f.id;
  perform public.monitor_recalcular_estado(f.contrato_id);
end $$;

-- Regista um valor extraído de um documento.
--   * Igual ao valor atual → nada a fazer (devolve o id do atual).
--   * Valor atual introduzido/confirmado pelo cliente ou admin e diferente →
--     fica "em_conflito" (nunca substitui em silêncio) e o contrato passa a
--     "a_confirmar".
--   * Caso contrário → fica "proposto", à espera de confirmação.
create or replace function public.monitor_campo_propor(
  p_contrato uuid,
  p_campo text,
  p_valor jsonb,
  p_origem text,
  p_documento uuid default null,
  p_extracao uuid default null,
  p_pagina integer default null,
  p_evidencia text default null,
  p_confianca text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid;
  v_atual public.contratos_campos;
  v_estado text := 'proposto';
  v_id uuid;
begin
  if p_origem not in ('contrato', 'fatura') then
    raise exception 'Propostas só vêm de documentos (origem: %)', p_origem using errcode = '22023';
  end if;
  if p_valor is null or jsonb_typeof(p_valor) = 'null' then
    raise exception 'Valor em falta' using errcode = '22023';
  end if;

  select utilizador_id into v_dono from public.contratos_monitorizados where id = p_contrato for update;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;

  select * into v_atual from public.contratos_campos
   where contrato_id = p_contrato and campo = p_campo and estado = 'atual';

  if found and v_atual.valor = p_valor then
    return v_atual.id;
  end if;

  if found and (v_atual.origem in ('cliente', 'admin')
                or v_atual.confirmado_cliente_em is not null
                or v_atual.confirmado_admin_em is not null) then
    v_estado := 'em_conflito';
  end if;

  insert into public.contratos_campos
    (contrato_id, utilizador_id, campo, valor, origem, documento_id, extracao_id, pagina, evidencia, confianca, estado)
  values
    (p_contrato, v_dono, p_campo, p_valor, p_origem, p_documento, p_extracao, p_pagina, p_evidencia, p_confianca, v_estado)
  returning id into v_id;

  perform public.monitor_recalcular_estado(p_contrato);
  return v_id;
end $$;

-- Define diretamente o valor atual (dado introduzido ou corrigido pelo
-- cliente, correção do admin). O valor anterior fica substituido.
create or replace function public.monitor_campo_definir(
  p_contrato uuid,
  p_campo text,
  p_valor jsonb,
  p_origem text,
  p_documento uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid;
  v_id uuid;
begin
  if p_origem not in ('cliente', 'admin') then
    raise exception 'Só o cliente ou o admin definem valores diretamente (origem: %)', p_origem using errcode = '22023';
  end if;
  if p_valor is null or jsonb_typeof(p_valor) = 'null' then
    raise exception 'Valor em falta' using errcode = '22023';
  end if;

  select utilizador_id into v_dono from public.contratos_monitorizados where id = p_contrato;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;

  insert into public.contratos_campos (contrato_id, utilizador_id, campo, valor, origem, documento_id, estado)
  values (p_contrato, v_dono, p_campo, p_valor, p_origem, p_documento, 'proposto')
  returning id into v_id;

  perform public.monitor_campo_aceitar(v_id, p_origem);
  return v_id;
end $$;

revoke execute on function public.monitor_recalcular_estado(uuid) from public, anon, authenticated;
revoke execute on function public.monitor_campo_aceitar(uuid, text) from public, anon, authenticated;
revoke execute on function public.monitor_campo_rejeitar(uuid) from public, anon, authenticated;
revoke execute on function public.monitor_campo_propor(uuid, text, jsonb, text, uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.monitor_campo_definir(uuid, text, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.monitor_recalcular_estado(uuid) to service_role;
grant execute on function public.monitor_campo_aceitar(uuid, text) to service_role;
grant execute on function public.monitor_campo_rejeitar(uuid) to service_role;
grant execute on function public.monitor_campo_propor(uuid, text, jsonb, text, uuid, uuid, integer, text, text) to service_role;
grant execute on function public.monitor_campo_definir(uuid, text, jsonb, text, uuid) to service_role;

-- ===========================================================================
-- 6. Alertas de datas (60 e 30 dias e na data — decisão de 02/10/2026)
-- ===========================================================================

-- Alertas devidos hoje, ainda não enviados. Só contratos ativos de contas
-- com Proteção e com e-mail confirmado (o destinatário é sempre o e-mail
-- da conta). Uma regra por contrato e data: a 30 dias não se envia também
-- o de 60; "fim" no próprio dia (ou no dia seguinte, se o cron falhar),
-- nunca para contratos criados depois da data.
create or replace function public.monitor_alertas_pendentes(p_hoje date)
returns table (
  contrato_id uuid,
  regra text,
  data_alvo date,
  nome text,
  email text,
  fornecedor text,
  descricao_promocao text
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select c.*,
           coalesce(nullif(btrim(u.nome), ''), au.email) as nome_conta,
           au.email as email_conta
      from public.contratos_monitorizados c
      join auth.users au on au.id = c.utilizador_id
      left join public.utilizadores u on u.id = c.utilizador_id
      join public.user_access ua on ua.user_id = c.utilizador_id
     where c.desativado_em is null
       and c.estado <> 'terminado'
       and au.email is not null
       and au.email_confirmed_at is not null
       and au.deleted_at is null
       and (au.banned_until is null or au.banned_until < now())
       and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
  ),
  datas as (
    select b.id, b.nome_conta, b.email_conta, b.fornecedor, b.descricao_promocao, b.created_at,
           'fidelizacao' as tipo, b.data_fim_fidelizacao as data
      from base b where b.data_fim_fidelizacao is not null
    union all
    select b.id, b.nome_conta, b.email_conta, b.fornecedor, b.descricao_promocao, b.created_at,
           'promocao', b.data_fim_promocao
      from base b where b.data_fim_promocao is not null
  ),
  devidos as (
    select d.*,
           d.tipo || case
             when d.data > p_hoje + 30 and d.data <= p_hoje + 60 then '_60d'
             when d.data > p_hoje and d.data <= p_hoje + 30 then '_30d'
             when d.data between p_hoje - 1 and p_hoje and d.created_at::date <= d.data then '_fim'
           end as regra
      from datas d
  )
  select d.id, d.regra, d.data, d.nome_conta, d.email_conta, d.fornecedor,
         case when d.tipo = 'promocao' then d.descricao_promocao end
    from devidos d
   where d.regra is not null
     and not exists (
       select 1 from public.contratos_alertas_envios e
        where e.contrato_id = d.id and e.regra = d.regra and e.data_alvo = d.data
     );
$$;

-- Reserva o envio (antes de enviar). false = já reservado/enviado.
create or replace function public.monitor_reservar_alerta(p_contrato uuid, p_regra text, p_data_alvo date)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with novo as (
    insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo)
    values (p_contrato, p_regra, p_data_alvo)
    on conflict (contrato_id, regra, data_alvo) do nothing
    returning 1
  )
  select exists (select 1 from novo);
$$;

-- Liberta a reserva quando o envio falha (a próxima execução tenta de novo).
create or replace function public.monitor_libertar_alerta(p_contrato uuid, p_regra text, p_data_alvo date)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.contratos_alertas_envios
   where contrato_id = p_contrato and regra = p_regra and data_alvo = p_data_alvo;
$$;

revoke execute on function public.monitor_alertas_pendentes(date) from public, anon, authenticated;
revoke execute on function public.monitor_reservar_alerta(uuid, text, date) from public, anon, authenticated;
revoke execute on function public.monitor_libertar_alerta(uuid, text, date) from public, anon, authenticated;
grant execute on function public.monitor_alertas_pendentes(date) to service_role;
grant execute on function public.monitor_reservar_alerta(uuid, text, date) to service_role;
grant execute on function public.monitor_libertar_alerta(uuid, text, date) to service_role;

-- ===========================================================================
-- 7. Fim da Proteção e conservação (6 meses)
-- ===========================================================================

create or replace function public.alertas_seguir_protecao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes boolean := false;
  v_agora boolean := public.protecao_ativa(new.subscription_plan, new.subscription_status);
begin
  if tg_op = 'UPDATE' then
    v_antes := public.protecao_ativa(old.subscription_plan, old.subscription_status);
  end if;

  if v_antes and not v_agora then
    update public.alertas_fidelizacao_portal set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.alertas_promocao_portal set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.preferencias_setor set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.contratos_monitorizados set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
    update public.documentos_monitor set desativado_em = now()
     where utilizador_id = new.user_id and desativado_em is null;
  elsif v_agora and not v_antes then
    update public.alertas_fidelizacao_portal set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.alertas_promocao_portal set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.preferencias_setor set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.contratos_monitorizados set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
    update public.documentos_monitor set desativado_em = null
     where utilizador_id = new.user_id
       and desativado_em > now() - public.retencao_alertas_desativados();
  end if;

  return null;
end $$;

revoke execute on function public.alertas_seguir_protecao() from public, anon, authenticated;

-- Limpeza diária (pg_cron 'limpar-alertas-desativados'). Os contratos só
-- são apagados quando já não têm documentos: os ficheiros são apagados
-- primeiro do Storage pela Edge Function, com
-- monitor_documentos_expirados() / apagar_documento_monitor_expirado().
create or replace function public.limpar_alertas_desativados()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_limite timestamptz := now() - public.retencao_alertas_desativados();
  v_total integer := 0;
  v_n integer;
begin
  delete from public.alertas_fidelizacao_portal where desativado_em <= v_limite;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.alertas_promocao_portal
   where desativado_em <= v_limite and ficheiro_contrato_caminho is null;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.preferencias_setor where desativado_em <= v_limite;
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  delete from public.contratos_monitorizados c
   where c.desativado_em <= v_limite
     and not exists (select 1 from public.documentos_monitor d where d.contrato_id = c.id);
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;

  return v_total;
end $$;

revoke execute on function public.limpar_alertas_desativados() from public, anon, authenticated, service_role;

create or replace function public.monitor_documentos_expirados()
returns table (id uuid, bucket text, storage_path text)
language sql
stable
set search_path = ''
as $$
  select d.id, d.bucket, d.storage_path
    from public.documentos_monitor d
   where d.desativado_em <= now() - public.retencao_alertas_desativados();
$$;

create or replace function public.apagar_documento_monitor_expirado(p_id uuid)
returns boolean
language sql
set search_path = ''
as $$
  with apagado as (
    delete from public.documentos_monitor
     where id = p_id
       and desativado_em <= now() - public.retencao_alertas_desativados()
    returning 1
  )
  select exists (select 1 from apagado);
$$;

revoke execute on function public.monitor_documentos_expirados() from public, anon, authenticated;
revoke execute on function public.apagar_documento_monitor_expirado(uuid) from public, anon, authenticated;
grant execute on function public.monitor_documentos_expirados() to service_role;
grant execute on function public.apagar_documento_monitor_expirado(uuid) to service_role;

-- ===========================================================================
-- 8. Migração dos alertas existentes
-- ===========================================================================
-- Cada alerta de fidelização passa a contrato "parcial" (setor não
-- indicado: o formulário antigo não perguntava). Um alerta de promoção do
-- mesmo cliente e do mesmo fornecedor junta-se a esse contrato. Os valores
-- foram introduzidos (ou confirmados) pelo cliente; os envios já feitos e
-- a desativação são preservados.

create temporary table _mapa_contratos (
  contrato_id uuid not null,
  utilizador_id uuid not null,
  fornecedor_chave text not null
) on commit drop;

do $$
declare
  a record;
  p record;
  v_contrato uuid;
  v_documento uuid;
  v_extracao uuid;
  v_campo uuid;
begin
  for a in select * from public.alertas_fidelizacao_portal order by created_at loop
    insert into public.contratos_monitorizados (utilizador_id, desativado_em, created_at)
    values (a.utilizador_id, a.desativado_em, a.created_at)
    returning id into v_contrato;

    insert into _mapa_contratos values (v_contrato, a.utilizador_id, lower(btrim(a.operadora)));

    perform public.monitor_campo_definir(v_contrato, 'fornecedor', to_jsonb(btrim(a.operadora)), 'cliente');
    perform public.monitor_campo_definir(v_contrato, 'data_fim_fidelizacao', to_jsonb(a.data_fim_fidelizacao), 'cliente');
    if a.data_inicio_contrato is not null then
      perform public.monitor_campo_definir(v_contrato, 'data_inicio', to_jsonb(a.data_inicio_contrato), 'cliente');
    end if;

    if a.alerta_60d_enviado_em is not null then
      insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo, enviado_em)
      values (v_contrato, 'fidelizacao_60d', a.data_fim_fidelizacao, a.alerta_60d_enviado_em);
    end if;
    if a.alerta_30d_enviado_em is not null then
      insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo, enviado_em)
      values (v_contrato, 'fidelizacao_30d', a.data_fim_fidelizacao, a.alerta_30d_enviado_em);
    end if;
  end loop;

  for p in select * from public.alertas_promocao_portal order by created_at loop
    select m.contrato_id into v_contrato
      from _mapa_contratos m
      join public.contratos_monitorizados c on c.id = m.contrato_id
     where m.utilizador_id = p.utilizador_id
       and m.fornecedor_chave = lower(btrim(p.operadora))
       and c.data_fim_promocao is null
     order by c.created_at
     limit 1;

    if v_contrato is null then
      insert into public.contratos_monitorizados (utilizador_id, desativado_em, created_at)
      values (p.utilizador_id, p.desativado_em, p.created_at)
      returning id into v_contrato;
      insert into _mapa_contratos values (v_contrato, p.utilizador_id, lower(btrim(p.operadora)));
      perform public.monitor_campo_definir(v_contrato, 'fornecedor', to_jsonb(btrim(p.operadora)), 'cliente');
    else
      -- Contrato partilhado: só fica desativado se ambos os alertas estavam.
      update public.contratos_monitorizados
         set desativado_em = case
               when desativado_em is null or p.desativado_em is null then null
               else least(desativado_em, p.desativado_em)
             end
       where id = v_contrato;
    end if;

    v_documento := null;
    if p.ficheiro_contrato_caminho is not null then
      insert into public.documentos_monitor
        (utilizador_id, contrato_id, tipo, bucket, storage_path, nome_ficheiro, estado, desativado_em, created_at)
      values
        (p.utilizador_id, v_contrato, 'contrato', 'contratos-promocao', p.ficheiro_contrato_caminho,
         p.ficheiro_contrato_nome, 'processado', p.desativado_em, p.created_at)
      returning id into v_documento;

      if p.extracao_api_bruta is not null then
        insert into public.extracoes_documento (documento_id, modelo, schema_versao, prompt_versao, estado, resultado, created_at)
        values (v_documento, 'legado', 'legado_promocao', 'legado_promocao', 'sucesso', p.extracao_api_bruta, p.created_at)
        returning id into v_extracao;
      end if;
    end if;

    if p.origem_data = 'api_extraida' then
      -- Data lida do contrato e confirmada pelo cliente antes de gravar.
      v_campo := public.monitor_campo_propor(v_contrato, 'data_fim_promocao', to_jsonb(p.data_fim_promocao),
                                             'contrato', v_documento, v_extracao, null, null, p.extracao_api_confianca);
      perform public.monitor_campo_aceitar(v_campo, 'cliente');
    else
      perform public.monitor_campo_definir(v_contrato, 'data_fim_promocao', to_jsonb(p.data_fim_promocao), 'cliente', v_documento);
    end if;
    perform public.monitor_campo_definir(v_contrato, 'descricao_promocao', to_jsonb(btrim(p.descricao_promocao)), 'cliente');

    -- Os avisos antigos a 30, 7 e 1 dia correspondem todos à janela de 30 dias.
    if coalesce(p.alerta_30d_enviado_em, p.alerta_7d_enviado_em, p.alerta_1d_enviado_em) is not null then
      insert into public.contratos_alertas_envios (contrato_id, regra, data_alvo, enviado_em)
      values (v_contrato, 'promocao_30d', p.data_fim_promocao,
              coalesce(p.alerta_30d_enviado_em, p.alerta_7d_enviado_em, p.alerta_1d_enviado_em))
      on conflict do nothing;
    end if;

    v_contrato := null;
    v_extracao := null;
  end loop;
end $$;

-- Os documentos migrados seguem a desativação do contrato a que ficaram ligados.
update public.documentos_monitor d
   set desativado_em = c.desativado_em
  from public.contratos_monitorizados c
 where d.contrato_id = c.id
   and d.desativado_em is distinct from c.desativado_em;
