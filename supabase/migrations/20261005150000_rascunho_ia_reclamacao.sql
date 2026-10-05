-- DoLado — Primeira sugestão do texto da reclamação pela Claude API.
--
-- Fluxo: o caso é criado (nunca depende da IA) → em segundo plano o
-- servidor gera uma sugestão (casos_rascunhos_ia) → a sugestão entra como
-- rascunho no texto do caso (casos_textos, origem 'ia') → a DoLado revê,
-- edita e marca como revisto → só então pode seguir o fluxo existente de
-- envio ao cliente (links, autorização explícita da versão, envio).
--
-- Nada do fluxo de revisão/autorização/envio muda: as funções texto_* e os
-- triggers de 20261001180000 ficam iguais. Esta migration só acrescenta:
--   1. regras_juridicas — base jurídica controlada pela DoLado (a IA só
--      pode usar regras daqui; nunca pesquisa nem inventa legislação);
--   2. casos_rascunhos_ia — auditoria de cada geração (modelo, versões do
--      prompt/schema, regras enviadas, resposta validada, erros, custo).
--      Sem dados pessoais: o contexto enviado não é guardado (só o hash);
--   3. casos_textos.origem / rascunho_ia_id / revisto_em / revisto_por e um
--      trigger: uma versão de origem 'ia' só sai de rascunho (para o
--      cliente) depois de marcada como revista por uma pessoa — mesmo que o
--      backend tente diretamente (service role);
--   4. texto_aplicar_rascunho_ia() — coloca a sugestão no texto do caso sem
--      nunca destruir texto editado por uma pessoa (pede confirmação e, com
--      ela, preserva o texto anterior como versão substituída);
--   5. texto_marcar_revisto() — revisão humana explícita, presa ao hash do
--      conteúdo revisto.

-- ---------------------------------------------------------------------------
-- 1. Base jurídica controlada pela DoLado
-- ---------------------------------------------------------------------------
create table public.regras_juridicas (
  id uuid primary key default gen_random_uuid(),
  -- Identificador estável enviado à IA e devolvido em legal_basis.rule_id.
  codigo text not null unique check (codigo ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  -- null = aplica-se a qualquer setor / categoria.
  setor text check (setor in ('Telecomunicações', 'Energia', 'Água')),
  categoria text check (char_length(categoria) between 1 and 80),
  subcategoria text check (char_length(subcategoria) between 1 and 120),
  titulo text not null check (char_length(titulo) between 3 and 200),
  diploma text not null check (char_length(diploma) between 3 and 200),
  artigo text check (char_length(artigo) <= 120),
  resumo text not null check (char_length(resumo) between 10 and 4000),
  condicoes_aplicabilidade text check (char_length(condicoes_aplicabilidade) <= 2000),
  fonte_url text check (char_length(fonte_url) <= 500 and fonte_url ~ '^https://'),
  em_vigor_desde date,
  revogada_em date,
  ativa boolean not null default false,
  revista_em date,
  revista_por text check (char_length(revista_por) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (revogada_em is null or em_vigor_desde is null or revogada_em > em_vigor_desde),
  -- Só regras revistas (texto aprovado) podem ser usadas.
  check (not ativa or revista_em is not null)
);

comment on table public.regras_juridicas is
  'Base jurídica controlada pela DoLado. A sugestão do texto pela IA só pode usar regras ativas, em vigor e revistas. Nunca apagadas: desativar.';
comment on column public.regras_juridicas.resumo is 'Texto/resumo jurídico aprovado pela DoLado — é o que a IA recebe.';

create trigger set_updated_at before update on public.regras_juridicas
  for each row execute function public.set_updated_at();

alter table public.regras_juridicas enable row level security;
create policy "Admin lê regras jurídicas" on public.regras_juridicas
  for select to authenticated using (public.is_admin());
create policy "Admin cria regras jurídicas" on public.regras_juridicas
  for insert to authenticated with check (public.is_admin());
create policy "Admin edita regras jurídicas" on public.regras_juridicas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.regras_juridicas from anon, authenticated;
grant select, insert, update on public.regras_juridicas to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Gerações (auditoria)
-- ---------------------------------------------------------------------------
create table public.casos_rascunhos_ia (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  estado text not null default 'a_gerar' check (estado in ('a_gerar', 'gerado', 'falhou')),
  origem text not null check (origem in ('automatico', 'manual')),
  pedido_por uuid references public.utilizadores (id) on delete set null,
  modelo text check (char_length(modelo) <= 80),
  prompt_versao text not null check (char_length(prompt_versao) <= 40),
  schema_versao text not null check (char_length(schema_versao) <= 40),
  contexto_sha256 text check (contexto_sha256 ~ '^[0-9a-f]{64}$'),
  -- Cópia das regras tal como foram enviadas (a regra pode ser revista depois).
  regras_enviadas jsonb not null default '[]'::jsonb check (jsonb_typeof(regras_enviadas) = 'array'),
  regras_usadas text[] not null default '{}',
  -- Resposta estruturada já validada pelo servidor.
  resposta jsonb check (resposta is null or jsonb_typeof(resposta) = 'object'),
  rascunho_sha256 text,
  confianca text check (confianca in ('high', 'medium', 'low')),
  erro text check (char_length(erro) <= 60),
  erro_detalhe text check (char_length(erro_detalhe) <= 500),
  tokens_entrada integer check (tokens_entrada >= 0),
  tokens_saida integer check (tokens_saida >= 0),
  custo_estimado_usd numeric(12, 6) check (custo_estimado_usd >= 0),
  latencia_ms integer,
  request_id text check (char_length(request_id) <= 200),
  created_at timestamptz not null default now(),
  concluido_em timestamptz,
  check ((estado = 'gerado') = (resposta is not null)),
  check (estado <> 'falhou' or erro is not null),
  check (estado = 'a_gerar' or concluido_em is not null)
);

comment on table public.casos_rascunhos_ia is
  'Cada geração da sugestão do texto da reclamação pela IA (auditoria). Só uso interno da DoLado; o cliente não lê. Sem o contexto enviado (só o hash).';
comment on column public.casos_rascunhos_ia.rascunho_sha256 is
  'SHA-256 do texto sugerido (resposta->>draft), calculado pela base de dados: permite saber se o rascunho do caso ainda é a sugestão sem edições.';

create index casos_rascunhos_ia_caso_idx on public.casos_rascunhos_ia (caso_id, created_at desc);
-- No máximo uma geração em curso por caso.
create unique index casos_rascunhos_ia_um_em_curso on public.casos_rascunhos_ia (caso_id) where estado = 'a_gerar';

-- Nasce "a_gerar"; passa uma vez a gerado/falhou; depois é imutável
-- (exceto pedido_por → null, quando a conta é apagada).
create or replace function public.casos_rascunhos_ia_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.resposta is not null then
    new.rascunho_sha256 := encode(sha256(convert_to(coalesce(new.resposta->>'draft', ''), 'UTF8')), 'hex');
  else
    new.rascunho_sha256 := null;
  end if;

  if tg_op = 'INSERT' then
    if new.estado <> 'a_gerar' or new.resposta is not null then
      raise exception 'casos_rascunhos_ia: uma geração nasce "a_gerar"' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.estado <> 'a_gerar' then
    if (to_jsonb(new) - 'pedido_por') is distinct from (to_jsonb(old) - 'pedido_por')
       or (new.pedido_por is distinct from old.pedido_por and new.pedido_por is not null) then
      raise exception 'casos_rascunhos_ia: geração concluída é imutável' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id <> old.id or new.caso_id <> old.caso_id or new.origem <> old.origem
     or new.prompt_versao <> old.prompt_versao or new.schema_versao <> old.schema_versao
     or new.created_at <> old.created_at
     or (new.pedido_por is distinct from old.pedido_por and new.pedido_por is not null) then
    raise exception 'casos_rascunhos_ia: identificação imutável' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_rascunhos_ia_integridade
  before insert or update on public.casos_rascunhos_ia
  for each row execute function public.casos_rascunhos_ia_integridade();

alter table public.casos_rascunhos_ia enable row level security;
create policy "Admin lê gerações da IA" on public.casos_rascunhos_ia
  for select to authenticated using (public.is_admin());
revoke all on public.casos_rascunhos_ia from anon, authenticated;
grant select on public.casos_rascunhos_ia to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Origem da versão do texto e revisão humana
-- ---------------------------------------------------------------------------
alter table public.casos_textos
  add column origem text not null default 'equipa' check (origem in ('equipa', 'ia')),
  add column rascunho_ia_id uuid references public.casos_rascunhos_ia (id),
  add column revisto_em timestamptz,
  add column revisto_por uuid references public.utilizadores (id) on delete set null,
  add constraint casos_textos_origem_ia check ((origem = 'ia') = (rascunho_ia_id is not null)),
  add constraint casos_textos_revisao_so_ia check (origem = 'ia' or revisto_em is null);

comment on column public.casos_textos.origem is
  '''ia'' = a versão nasceu de uma sugestão da IA (casos_rascunhos_ia). Só pode ser enviada ao cliente depois de revisto_em.';
comment on column public.casos_textos.revisto_em is
  'Revisão humana da sugestão da IA (texto_marcar_revisto). Sem ela a versão não sai de rascunho.';

create index casos_textos_rascunho_ia_idx on public.casos_textos (rascunho_ia_id) where rascunho_ia_id is not null;

-- Complementa casos_textos_integridade (que não muda).
create or replace function public.casos_textos_ia_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.revisto_em is not null or new.revisto_por is not null then
      raise exception 'casos_textos: uma sugestão da IA nasce por rever' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.origem <> old.origem then
    raise exception 'casos_textos: origem imutável' using errcode = '42501';
  end if;
  -- A sugestão de um rascunho ainda por rever pode ser trocada por outra
  -- (texto_aplicar_rascunho_ia); fora disso, a ligação não muda.
  if new.rascunho_ia_id is distinct from old.rascunho_ia_id
     and not (old.origem = 'ia' and old.estado = 'rascunho' and old.revisto_em is null and new.revisto_em is null) then
    raise exception 'casos_textos: sugestão de origem imutável' using errcode = '42501';
  end if;
  if old.revisto_em is not null and new.revisto_em is distinct from old.revisto_em then
    raise exception 'casos_textos: revisão já registada' using errcode = '42501';
  end if;
  if old.revisto_em is null and new.revisto_em is not null and old.estado <> 'rascunho' then
    raise exception 'casos_textos: só um rascunho pode ser marcado como revisto' using errcode = '42501';
  end if;
  if new.revisto_por is distinct from old.revisto_por and new.revisto_por is not null and old.revisto_em is not null then
    raise exception 'casos_textos: revisão já registada' using errcode = '42501';
  end if;

  -- A regra central: a sugestão da IA nunca chega ao cliente sem revisão humana.
  if old.estado = 'rascunho' and new.estado = 'aguardando_aprovacao'
     and new.origem = 'ia' and new.revisto_em is null then
    raise exception 'casos_textos: sugestão da IA por rever — não pode ser enviada ao cliente' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_textos_ia_integridade
  before insert or update on public.casos_textos
  for each row execute function public.casos_textos_ia_integridade();

-- ---------------------------------------------------------------------------
-- 4. Funções (só o backend, com service_role)
-- ---------------------------------------------------------------------------

-- Começa uma geração. Devolve null quando não deve correr:
--   * já há uma geração em curso para o caso (há menos de 5 minutos);
--   * automática e o caso já tem texto ou já teve uma geração (idempotente:
--     o webhook pode ser reenviado e o caso é o mesmo).
-- Uma geração "a_gerar" há mais de 5 minutos (processo interrompido) é
-- dada como falhada, para não bloquear novas tentativas.
create or replace function public.rascunho_ia_iniciar(
  p_caso_id uuid,
  p_origem text,
  p_admin uuid,
  p_prompt_versao text,
  p_schema_versao text
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform 1 from public.casos where id = p_caso_id for update;
  if not found then
    raise exception 'caso inexistente' using errcode = 'P0002';
  end if;

  update public.casos_rascunhos_ia
     set estado = 'falhou', erro = 'interrompido', concluido_em = now()
   where caso_id = p_caso_id and estado = 'a_gerar' and created_at < now() - interval '5 minutes';

  if exists (select 1 from public.casos_rascunhos_ia where caso_id = p_caso_id and estado = 'a_gerar') then
    return null;
  end if;
  if p_origem = 'automatico' and (
    exists (select 1 from public.casos_rascunhos_ia where caso_id = p_caso_id)
    or exists (select 1 from public.casos_textos where caso_id = p_caso_id)
  ) then
    return null;
  end if;

  insert into public.casos_rascunhos_ia (caso_id, origem, pedido_por, prompt_versao, schema_versao)
  values (p_caso_id, p_origem, p_admin, p_prompt_versao, p_schema_versao)
  returning id into v_id;
  return v_id;
end $$;

-- Coloca uma sugestão gerada no texto do caso. Nunca destrói texto editado
-- por uma pessoa:
--   * sem texto → versão 1 (origem 'ia', por rever);
--   * rascunho que ainda é uma sugestão sem edições nem revisão → troca pela
--     nova sugestão (a anterior continua em casos_rascunhos_ia);
--   * rascunho editado/revisto, ou alterações pedidas pelo cliente → só com
--     p_substituir = true; a versão atual fica "substituido" (preservada) e
--     a sugestão entra como nova versão;
--   * à espera de aprovação, autorizado ou enviado → bloqueado (a sugestão
--     fica só para consulta; a autorização dada continua presa à versão).
-- Resultados: aplicado | requer_confirmacao | bloqueado | ja_aplicado | invalido.
create or replace function public.texto_aplicar_rascunho_ia(
  p_rascunho_id uuid,
  p_admin uuid,
  p_substituir boolean default false
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.casos_rascunhos_ia;
  v public.casos_textos;
  v_sugestao_atual text;
  v_id uuid;
  v_draft text;
begin
  select * into r from public.casos_rascunhos_ia where id = p_rascunho_id;
  if r.id is null or r.estado <> 'gerado' then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  v_draft := r.resposta->>'draft';
  if v_draft is null or btrim(v_draft) = '' then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  perform 1 from public.casos where id = r.caso_id for update; -- serializa versões do caso
  if exists (select 1 from public.casos_textos where rascunho_ia_id = r.id) then
    return jsonb_build_object('resultado', 'ja_aplicado');
  end if;

  v := public.texto_versao_atual(r.caso_id);

  if v.id is not null and v.estado = 'rascunho' and v.origem = 'ia' and v.revisto_em is null then
    select rascunho_sha256 into v_sugestao_atual from public.casos_rascunhos_ia where id = v.rascunho_ia_id;
    if v.conteudo_sha256 = v_sugestao_atual then
      update public.casos_textos set conteudo = v_draft, rascunho_ia_id = r.id where id = v.id;
      return jsonb_build_object('resultado', 'aplicado', 'texto_id', v.id, 'versao', v.versao);
    end if;
  end if;

  if v.id is not null then
    if v.estado not in ('rascunho', 'alteracoes_solicitadas') then
      return jsonb_build_object('resultado', 'bloqueado', 'estado', v.estado);
    end if;
    if not coalesce(p_substituir, false) then
      return jsonb_build_object('resultado', 'requer_confirmacao', 'estado', v.estado);
    end if;
    update public.casos_textos set estado = 'substituido', substituido_em = now() where id = v.id;
    update public.casos_textos_links set invalidado_em = now()
     where texto_id = v.id and usado_em is null and invalidado_em is null;
  end if;

  insert into public.casos_textos (caso_id, versao, conteudo, conteudo_sha256, criado_por, origem, rascunho_ia_id)
  values (r.caso_id, coalesce(v.versao, 0) + 1, v_draft, '', p_admin, 'ia', r.id)
  returning id into v_id;
  -- Sem evento no histórico do caso (que o cliente vê): a sugestão é
  -- interna. O evento "texto preparado" é registado na revisão humana.
  return jsonb_build_object('resultado', 'aplicado', 'texto_id', v_id, 'versao', coalesce(v.versao, 0) + 1);
end $$;

-- Revisão humana explícita de uma sugestão da IA. Presa ao conteúdo que a
-- pessoa viu (hash): se o texto mudou entretanto, recusa.
-- Resultados: revisto | ja_revisto | conteudo_diferente | invalido.
create or replace function public.texto_marcar_revisto(
  p_texto_id uuid,
  p_conteudo_sha256 text,
  p_admin uuid
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
begin
  select * into v from public.casos_textos where id = p_texto_id for update;
  if v.id is null or v.origem <> 'ia' or p_admin is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if v.revisto_em is not null then
    return jsonb_build_object('resultado', 'ja_revisto', 'revisto_em', v.revisto_em);
  end if;
  if v.estado <> 'rascunho' or (public.texto_versao_atual(v.caso_id)).id <> v.id then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if p_conteudo_sha256 is distinct from v.conteudo_sha256 then
    return jsonb_build_object('resultado', 'conteudo_diferente');
  end if;

  update public.casos_textos set revisto_em = now(), revisto_por = p_admin where id = v.id;
  insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator)
  values (v.caso_id, case when v.versao = 1 then 'texto_preparado' else 'nova_versao' end, v.id, v.versao, 'equipa');
  return jsonb_build_object('resultado', 'revisto');
end $$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'rascunho_ia_iniciar(uuid, text, uuid, text, text)',
    'texto_aplicar_rascunho_ia(uuid, uuid, boolean)',
    'texto_marcar_revisto(uuid, text, uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
