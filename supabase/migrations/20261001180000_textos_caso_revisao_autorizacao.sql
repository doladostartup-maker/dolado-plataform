-- DoLado — Texto preparado para envio: versões, revisão pelo cliente,
-- pedido de alterações, autorização explícita e registo do envio.
--
-- Fluxo: a DoLado prepara o texto (versão) → envia ao cliente para revisão
-- (e-mail com dois links seguros) → o cliente autoriza ou pede alterações
-- numa página da DoLado (POST explícito; abrir o link nunca muda nada) →
-- a DoLado regista o envio ao terceiro, só se a versão atual estiver
-- autorizada.
--
-- O estado do texto NÃO vive em casos.status (que o admin edita livremente
-- no formulário): é o estado da versão atual, em casos_textos, e só muda
-- pelas funções abaixo. Garantias na própria base de dados (triggers),
-- válidas mesmo para a service role:
--   * conteúdo imutável depois de sair de rascunho (nova alteração = nova
--     versão); hash SHA-256 do conteúdo calculado pela base de dados;
--   * uma versão só fica "autorizado" se existir uma autorização para ESSA
--     versão com o MESMO hash; só fica "enviado" se existir o registo de envio;
--   * autorizações, pedidos de alteração, envios e eventos são só de
--     inserção (sem UPDATE);
--   * o envio só é aceite para a versão mais recente, autorizada, com o hash
--     autorizado.
-- O admin só tem SELECT nestas tabelas: não consegue criar nem editar
-- autorizações. Não há função para "marcar como aprovado".
--
-- Links seguros: só o hash SHA-256 do token é guardado; cada link tem caso,
-- versão, destinatário, finalidade, validade, uso e invalidação.

-- ---------------------------------------------------------------------------
-- 1. Versões do texto
-- ---------------------------------------------------------------------------
create table public.casos_textos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  versao int not null check (versao > 0),
  conteudo text not null check (char_length(conteudo) between 1 and 50000),
  conteudo_sha256 text not null,
  estado text not null default 'rascunho'
    check (estado in ('rascunho', 'aguardando_aprovacao', 'alteracoes_solicitadas', 'autorizado', 'enviado', 'substituido')),
  criado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  enviado_para_revisao_em timestamptz,
  autorizado_em timestamptz,
  alteracoes_solicitadas_em timestamptz,
  enviado_em timestamptz,
  substituido_em timestamptz,
  unique (caso_id, versao)
);

comment on table public.casos_textos is 'Versões do texto preparado pela DoLado para envio ao terceiro. Nunca apagadas nem reescritas depois de mostradas ao cliente.';
comment on column public.casos_textos.conteudo_sha256 is 'SHA-256 (hex) do conteúdo, calculado pela base de dados. A autorização e o envio ficam presos a este valor.';

create index casos_textos_caso_idx on public.casos_textos (caso_id, versao desc);

-- ---------------------------------------------------------------------------
-- 2. Links seguros (só o hash do token)
-- ---------------------------------------------------------------------------
create table public.casos_textos_links (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  texto_id uuid not null references public.casos_textos (id) on delete cascade,
  utilizador_id uuid references public.utilizadores (id) on delete set null,
  email text not null,
  finalidade text not null check (finalidade in ('rever_autorizar', 'pedir_alteracoes')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  invalidado_em timestamptz,
  check (expira_em > created_at)
);

comment on table public.casos_textos_links is 'Links dos e-mails de revisão. Guarda só o SHA-256 do token (o token puro só existe no e-mail).';
create index casos_textos_links_texto_idx on public.casos_textos_links (texto_id);

-- ---------------------------------------------------------------------------
-- 3. Autorizações, pedidos de alteração, envios, eventos (só inserção)
-- ---------------------------------------------------------------------------
create table public.casos_textos_autorizacoes (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  texto_id uuid not null unique references public.casos_textos (id) on delete cascade,
  conteudo_sha256 text not null,
  utilizador_id uuid references public.utilizadores (id) on delete set null,
  email text,
  link_id uuid references public.casos_textos_links (id) on delete set null,
  metodo text not null check (metodo in ('link_seguro', 'portal')),
  autorizado_em timestamptz not null,
  created_at timestamptz not null default now()
);
comment on table public.casos_textos_autorizacoes is 'Autorização explícita do cliente para enviar UMA versão (texto_id + hash). Só criada pelas funções de autorização.';

create table public.casos_textos_pedidos_alteracao (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  texto_id uuid not null references public.casos_textos (id) on delete cascade,
  mensagem text not null check (char_length(mensagem) between 1 and 5000),
  utilizador_id uuid references public.utilizadores (id) on delete set null,
  email text,
  link_id uuid references public.casos_textos_links (id) on delete set null,
  metodo text not null check (metodo in ('link_seguro', 'portal')),
  created_at timestamptz not null default now()
);
create index casos_textos_pedidos_texto_idx on public.casos_textos_pedidos_alteracao (texto_id);

create table public.casos_textos_envios (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  texto_id uuid not null unique references public.casos_textos (id) on delete cascade,
  autorizacao_id uuid not null references public.casos_textos_autorizacoes (id),
  conteudo_sha256 text not null,
  destinatario text not null check (char_length(destinatario) between 1 and 300),
  canal text not null check (canal in ('livro_reclamacoes_eletronico', 'email', 'carta', 'formulario_operador', 'outro')),
  resultado text check (char_length(resultado) <= 1000),
  enviado_por uuid references public.utilizadores (id) on delete set null,
  enviado_em timestamptz not null,
  created_at timestamptz not null default now()
);
comment on table public.casos_textos_envios is 'Envio ao terceiro de uma versão autorizada. O conteúdo enviado é a versão (imutável) com este hash.';

create table public.casos_eventos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  tipo text not null check (tipo in (
    'texto_preparado', 'nova_versao', 'texto_enviado_revisao', 'links_reemitidos',
    'alteracoes_pedidas', 'texto_autorizado', 'comunicacao_enviada')),
  texto_id uuid references public.casos_textos (id) on delete set null,
  versao int,
  ator text not null check (ator in ('cliente', 'equipa', 'sistema')),
  created_at timestamptz not null default now()
);
comment on table public.casos_eventos is 'Histórico do caso (timeline). Só inserção.';
create index casos_eventos_caso_idx on public.casos_eventos (caso_id, created_at);

-- ---------------------------------------------------------------------------
-- 4. Triggers de integridade
-- ---------------------------------------------------------------------------
create or replace function public.casos_textos_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.conteudo_sha256 := encode(sha256(convert_to(new.conteudo, 'UTF8')), 'hex');

  if tg_op = 'INSERT' then
    if new.estado <> 'rascunho' then
      raise exception 'casos_textos: uma versão nasce em rascunho' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.caso_id <> old.caso_id or new.versao <> old.versao or new.created_at <> old.created_at
     or new.criado_por is distinct from old.criado_por and new.criado_por is not null then
    raise exception 'casos_textos: identificação imutável' using errcode = '42501';
  end if;
  if new.conteudo is distinct from old.conteudo and old.estado <> 'rascunho' then
    raise exception 'casos_textos: conteúdo mostrado ao cliente não pode ser alterado — crie uma nova versão' using errcode = '42501';
  end if;

  if new.estado <> old.estado then
    if not (
      (old.estado = 'rascunho' and new.estado in ('aguardando_aprovacao', 'substituido'))
      or (old.estado = 'aguardando_aprovacao' and new.estado in ('autorizado', 'alteracoes_solicitadas', 'substituido'))
      or (old.estado = 'alteracoes_solicitadas' and new.estado = 'substituido')
      or (old.estado = 'autorizado' and new.estado in ('enviado', 'substituido'))
    ) then
      raise exception 'casos_textos: transição % → % não permitida', old.estado, new.estado using errcode = '42501';
    end if;
  end if;

  -- "autorizado" só com autorização desta versão e deste conteúdo.
  if new.estado in ('autorizado', 'enviado') and not exists (
    select 1 from public.casos_textos_autorizacoes a
     where a.texto_id = new.id and a.conteudo_sha256 = new.conteudo_sha256
  ) then
    raise exception 'casos_textos: sem autorização do cliente para esta versão' using errcode = '42501';
  end if;
  if new.estado = 'enviado' and not exists (
    select 1 from public.casos_textos_envios e where e.texto_id = new.id
  ) then
    raise exception 'casos_textos: sem registo de envio' using errcode = '42501';
  end if;

  new.atualizado_em := now();
  return new;
end $$;

create trigger casos_textos_integridade
  before insert or update on public.casos_textos
  for each row execute function public.casos_textos_integridade();

-- Só inserção. Exceção: referências apagadas noutras tabelas (conta,
-- link, versão — on delete set null) podem passar a null; nada mais muda.
create or replace function public.casos_textos_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  k text;
  n jsonb := to_jsonb(new);
  o jsonb := to_jsonb(old);
begin
  for k in select jsonb_object_keys(n) loop
    if n->k is distinct from o->k
       and not (k = any (array['utilizador_id', 'link_id', 'enviado_por', 'texto_id']) and n->k = 'null'::jsonb) then
      raise exception '%: registo só de inserção', tg_table_name using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

create trigger casos_textos_autorizacoes_so_insercao before update on public.casos_textos_autorizacoes
  for each row execute function public.casos_textos_so_insercao();
create trigger casos_textos_pedidos_so_insercao before update on public.casos_textos_pedidos_alteracao
  for each row execute function public.casos_textos_so_insercao();
create trigger casos_textos_envios_so_insercao before update on public.casos_textos_envios
  for each row execute function public.casos_textos_so_insercao();
create trigger casos_eventos_so_insercao before update on public.casos_eventos
  for each row execute function public.casos_textos_so_insercao();

-- Autorização: só para a versão mais recente, à espera de aprovação, com o
-- hash atual.
create or replace function public.casos_textos_autorizacao_valida()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
begin
  select * into v from public.casos_textos where id = new.texto_id;
  if v.id is null or v.caso_id <> new.caso_id or v.estado <> 'aguardando_aprovacao'
     or v.conteudo_sha256 <> new.conteudo_sha256
     or exists (select 1 from public.casos_textos o where o.caso_id = v.caso_id and o.versao > v.versao) then
    raise exception 'casos_textos_autorizacoes: versão não está à espera de aprovação' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_textos_autorizacao_valida before insert on public.casos_textos_autorizacoes
  for each row execute function public.casos_textos_autorizacao_valida();

-- Envio: só a versão mais recente, autorizada, com o conteúdo autorizado.
create or replace function public.casos_textos_envio_valido()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  a public.casos_textos_autorizacoes;
begin
  select * into v from public.casos_textos where id = new.texto_id;
  select * into a from public.casos_textos_autorizacoes where id = new.autorizacao_id;
  if v.id is null or v.estado <> 'autorizado' or v.caso_id <> new.caso_id
     or a.id is null or a.texto_id <> v.id
     or a.conteudo_sha256 <> v.conteudo_sha256 or new.conteudo_sha256 <> v.conteudo_sha256
     or exists (select 1 from public.casos_textos o where o.caso_id = v.caso_id and o.versao > v.versao)
     or exists (select 1 from public.casos_textos_pedidos_alteracao p where p.texto_id = v.id) then
    raise exception 'casos_textos_envios: envio sem autorização válida' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_textos_envio_valido before insert on public.casos_textos_envios
  for each row execute function public.casos_textos_envio_valido();

-- Links: só usado_em / invalidado_em podem ser preenchidos (uma vez).
create or replace function public.casos_textos_links_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.caso_id <> old.caso_id or new.texto_id <> old.texto_id
     or new.finalidade <> old.finalidade or new.token_hash <> old.token_hash
     or new.expira_em <> old.expira_em or new.created_at <> old.created_at or new.email <> old.email
     or (old.usado_em is not null and new.usado_em is distinct from old.usado_em)
     or (old.invalidado_em is not null and new.invalidado_em is distinct from old.invalidado_em) then
    raise exception 'casos_textos_links: só uso/invalidação podem ser registados' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_textos_links_integridade before update on public.casos_textos_links
  for each row execute function public.casos_textos_links_integridade();

-- ---------------------------------------------------------------------------
-- 5. Funções do fluxo (só o backend, com service_role)
-- ---------------------------------------------------------------------------

-- Versão mais recente do caso.
create or replace function public.texto_versao_atual(p_caso_id uuid)
returns public.casos_textos
language sql
stable
set search_path = ''
as $$
  select * from public.casos_textos where caso_id = p_caso_id order by versao desc limit 1;
$$;

-- Guarda o texto. Se a versão atual for rascunho, atualiza-a; senão cria uma
-- versão nova (a anterior por enviar fica "substituido" e os links dela
-- deixam de valer — uma versão antiga nunca mais pode ser autorizada).
create or replace function public.texto_guardar(p_caso_id uuid, p_conteudo text, p_admin uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  v_id uuid;
begin
  perform 1 from public.casos where id = p_caso_id for update; -- serializa versões do caso
  if not found then
    raise exception 'caso inexistente' using errcode = 'P0002';
  end if;
  v := public.texto_versao_atual(p_caso_id);

  if v.id is not null and v.estado = 'rascunho' then
    update public.casos_textos set conteudo = p_conteudo where id = v.id;
    return v.id;
  end if;

  if v.id is not null and v.estado in ('aguardando_aprovacao', 'alteracoes_solicitadas', 'autorizado') then
    update public.casos_textos set estado = 'substituido', substituido_em = now() where id = v.id;
    update public.casos_textos_links set invalidado_em = now()
     where texto_id = v.id and usado_em is null and invalidado_em is null;
  end if;

  insert into public.casos_textos (caso_id, versao, conteudo, conteudo_sha256, criado_por)
  values (p_caso_id, coalesce(v.versao, 0) + 1, p_conteudo, '', p_admin)
  returning id into v_id;

  insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator)
  values (p_caso_id, case when v.id is null then 'texto_preparado' else 'nova_versao' end, v_id, coalesce(v.versao, 0) + 1, 'equipa');
  return v_id;
end $$;

-- Emite (ou reemite) os dois links de uma versão e põe-na à espera de
-- aprovação. Links anteriores desta versão deixam de valer. Devolve o
-- e-mail do caso (destinatário).
create or replace function public.texto_emitir_links(
  p_texto_id uuid,
  p_hash_rever text,
  p_hash_alterar text,
  p_expira_em timestamptz,
  p_ator text default 'equipa'
) returns text
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  c record;
begin
  select * into v from public.casos_textos where id = p_texto_id for update;
  if v.id is null then
    raise exception 'versão inexistente' using errcode = 'P0002';
  end if;
  if (public.texto_versao_atual(v.caso_id)).id <> v.id or v.estado not in ('rascunho', 'aguardando_aprovacao') then
    raise exception 'esta versão já não pode ser enviada para revisão' using errcode = '42501';
  end if;
  select id, email, utilizador_id into c from public.casos where id = v.caso_id;
  if c.email is null or c.email = '' then
    raise exception 'caso sem e-mail' using errcode = '22023';
  end if;

  update public.casos_textos_links set invalidado_em = now()
   where texto_id = v.id and usado_em is null and invalidado_em is null;
  insert into public.casos_textos_links (caso_id, texto_id, utilizador_id, email, finalidade, token_hash, expira_em) values
    (v.caso_id, v.id, c.utilizador_id, c.email, 'rever_autorizar', p_hash_rever, p_expira_em),
    (v.caso_id, v.id, c.utilizador_id, c.email, 'pedir_alteracoes', p_hash_alterar, p_expira_em);

  if v.estado = 'rascunho' then
    update public.casos_textos set estado = 'aguardando_aprovacao', enviado_para_revisao_em = now() where id = v.id;
    insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator) values (v.caso_id, 'texto_enviado_revisao', v.id, v.versao, 'equipa');
  else
    insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator)
    values (v.caso_id, 'links_reemitidos', v.id, v.versao, case when p_ator = 'cliente' then 'cliente' else 'equipa' end);
  end if;
  return c.email;
end $$;

-- Situação de uma versão para o cliente (usada pelas páginas e pelas ações).
create or replace function public.texto__situacao(v public.casos_textos)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when v.id is null then 'invalido'
    when v.estado in ('autorizado', 'enviado') then 'ja_autorizado'
    when v.estado = 'alteracoes_solicitadas' then 'alteracoes_pedidas'
    when v.estado = 'substituido' or (public.texto_versao_atual(v.caso_id)).id <> v.id then 'versao_antiga'
    when v.estado = 'aguardando_aprovacao' then 'valido'
    else 'invalido'
  end;
$$;

-- Leitura do link (GET das páginas públicas). NÃO escreve nada: abrir o
-- link — por uma pessoa ou por um scanner — não autoriza, não pede
-- alterações e não consome o link. Só devolve o conteúdo quando a ação ainda
-- é possível; nunca devolve e-mail, nome nem ids internos.
create or replace function public.texto_consultar_link(p_hash text, p_em timestamptz default now())
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  l public.casos_textos_links;
  v public.casos_textos;
  c record;
  s text;
begin
  select * into l from public.casos_textos_links where token_hash = p_hash;
  if l.id is null then
    return jsonb_build_object('situacao', 'invalido');
  end if;
  select * into v from public.casos_textos where id = l.texto_id;
  select empresa, sector into c from public.casos where id = l.caso_id;
  s := public.texto__situacao(v);
  if s = 'valido' and (l.usado_em is not null or l.invalidado_em is not null) then
    s := 'link_substituido';
  elsif s = 'valido' and l.expira_em <= p_em then
    s := 'expirado';
  end if;
  return jsonb_build_object(
    'situacao', s,
    'finalidade', l.finalidade,
    'versao', v.versao,
    'empresa', c.empresa,
    'sector', c.sector,
    'autorizado_em', v.autorizado_em,
    'conteudo', case when s = 'valido' then v.conteudo end
  );
end $$;

-- Núcleo da autorização. Bloqueia a versão (FOR UPDATE): dois cliques ou
-- dois separadores ao mesmo tempo resultam numa única autorização.
create or replace function public.texto__autorizar(
  p_texto_id uuid, p_link_id uuid, p_metodo text, p_em timestamptz
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  c record;
  s text;
begin
  select * into v from public.casos_textos where id = p_texto_id for update;
  s := public.texto__situacao(v);
  if s = 'ja_autorizado' then
    return jsonb_build_object('resultado', 'ja_autorizado', 'autorizado_em', v.autorizado_em);
  elsif s <> 'valido' then
    return jsonb_build_object('resultado', s);
  end if;
  select email, utilizador_id into c from public.casos where id = v.caso_id;

  insert into public.casos_textos_autorizacoes (caso_id, texto_id, conteudo_sha256, utilizador_id, email, link_id, metodo, autorizado_em)
  values (v.caso_id, v.id, v.conteudo_sha256, c.utilizador_id, c.email, p_link_id, p_metodo, p_em);
  update public.casos_textos set estado = 'autorizado', autorizado_em = p_em where id = v.id;
  update public.casos_textos_links set usado_em = p_em where id = p_link_id and usado_em is null;
  update public.casos_textos_links set invalidado_em = p_em
   where texto_id = v.id and usado_em is null and invalidado_em is null;
  insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator) values (v.caso_id, 'texto_autorizado', v.id, v.versao, 'cliente');
  return jsonb_build_object('resultado', 'autorizado', 'autorizado_em', p_em);
end $$;

create or replace function public.texto__pedir_alteracoes(
  p_texto_id uuid, p_link_id uuid, p_metodo text, p_mensagem text, p_em timestamptz
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  c record;
  s text;
  m text := btrim(coalesce(p_mensagem, ''));
begin
  if char_length(m) = 0 or char_length(m) > 5000 then
    return jsonb_build_object('resultado', 'mensagem_invalida');
  end if;
  select * into v from public.casos_textos where id = p_texto_id for update;
  s := public.texto__situacao(v);
  if s <> 'valido' then
    return jsonb_build_object('resultado', s, 'autorizado_em', v.autorizado_em);
  end if;
  select email, utilizador_id into c from public.casos where id = v.caso_id;

  insert into public.casos_textos_pedidos_alteracao (caso_id, texto_id, mensagem, utilizador_id, email, link_id, metodo, created_at)
  values (v.caso_id, v.id, m, c.utilizador_id, c.email, p_link_id, p_metodo, p_em);
  update public.casos_textos set estado = 'alteracoes_solicitadas', alteracoes_solicitadas_em = p_em where id = v.id;
  update public.casos_textos_links set usado_em = p_em where id = p_link_id and usado_em is null;
  update public.casos_textos_links set invalidado_em = p_em
   where texto_id = v.id and usado_em is null and invalidado_em is null;
  insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator) values (v.caso_id, 'alteracoes_pedidas', v.id, v.versao, 'cliente');
  return jsonb_build_object('resultado', 'pedido_registado', 'versao', v.versao);
end $$;

-- Link: valida finalidade, uso e validade antes do núcleo. A situação da
-- versão (já autorizada, alterações pedidas, versão antiga) tem prioridade,
-- para o cliente ver uma mensagem útil em vez de um erro.
create or replace function public.texto__validar_link(p_hash text, p_finalidade text, p_em timestamptz)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  l public.casos_textos_links;
  v public.casos_textos;
  s text;
begin
  select * into l from public.casos_textos_links where token_hash = p_hash for update;
  if l.id is null or l.finalidade <> p_finalidade then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select * into v from public.casos_textos where id = l.texto_id;
  s := public.texto__situacao(v);
  if s <> 'valido' then
    return jsonb_build_object('resultado', s, 'autorizado_em', v.autorizado_em, 'link_id', l.id, 'texto_id', l.texto_id);
  end if;
  if l.usado_em is not null or l.invalidado_em is not null then
    return jsonb_build_object('resultado', 'link_substituido');
  end if;
  if l.expira_em <= p_em then
    return jsonb_build_object('resultado', 'expirado');
  end if;
  return jsonb_build_object('resultado', 'ok', 'link_id', l.id, 'texto_id', l.texto_id);
end $$;

create or replace function public.texto_autorizar_por_link(p_hash text, p_em timestamptz default now())
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r jsonb := public.texto__validar_link(p_hash, 'rever_autorizar', p_em);
begin
  if r->>'resultado' <> 'ok' then
    return r - 'link_id' - 'texto_id';
  end if;
  return public.texto__autorizar((r->>'texto_id')::uuid, (r->>'link_id')::uuid, 'link_seguro', p_em);
end $$;

create or replace function public.texto_pedir_alteracoes_por_link(p_hash text, p_mensagem text, p_em timestamptz default now())
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r jsonb := public.texto__validar_link(p_hash, 'pedir_alteracoes', p_em);
begin
  if r->>'resultado' <> 'ok' then
    return r - 'link_id' - 'texto_id';
  end if;
  return public.texto__pedir_alteracoes((r->>'texto_id')::uuid, (r->>'link_id')::uuid, 'link_seguro', p_mensagem, p_em);
end $$;

-- Portal: o cliente autenticado só age sobre a versão atual dos PRÓPRIOS casos.
create or replace function public.texto__do_cliente(p_texto_id uuid, p_utilizador uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.casos_textos t join public.casos c on c.id = t.caso_id
     where t.id = p_texto_id and c.utilizador_id = p_utilizador and p_utilizador is not null
  );
$$;

create or replace function public.texto_autorizar_no_portal(p_texto_id uuid, p_utilizador uuid, p_em timestamptz default now())
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if not public.texto__do_cliente(p_texto_id, p_utilizador) then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  return public.texto__autorizar(p_texto_id, null, 'portal', p_em);
end $$;

create or replace function public.texto_pedir_alteracoes_no_portal(p_texto_id uuid, p_utilizador uuid, p_mensagem text, p_em timestamptz default now())
returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if not public.texto__do_cliente(p_texto_id, p_utilizador) then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  return public.texto__pedir_alteracoes(p_texto_id, null, 'portal', p_mensagem, p_em);
end $$;

-- Pedido de novo link (página de link expirado). Só para a versão atual à
-- espera de aprovação, e no máximo uma vez a cada 10 minutos por versão.
-- Devolve o e-mail do caso para o servidor enviar os links — nunca é
-- mostrado na página.
create or replace function public.texto_reemitir_por_link(
  p_hash_antigo text, p_hash_rever text, p_hash_alterar text, p_expira_em timestamptz
) returns text
language plpgsql
set search_path = ''
as $$
declare
  l public.casos_textos_links;
  v public.casos_textos;
begin
  select * into l from public.casos_textos_links where token_hash = p_hash_antigo;
  if l.id is null then
    return null;
  end if;
  select * into v from public.casos_textos where id = l.texto_id for update;
  if public.texto__situacao(v) <> 'valido' then
    return null;
  end if;
  if exists (select 1 from public.casos_textos_links where texto_id = v.id and created_at > now() - interval '10 minutes') then
    return null;
  end if;
  return public.texto_emitir_links(v.id, p_hash_rever, p_hash_alterar, p_expira_em, 'cliente');
end $$;

-- Registo do envio ao terceiro — a ÚNICA forma de marcar uma comunicação
-- como enviada. Recusa se a versão não for a atual, não estiver autorizada,
-- tiver pedido de alterações, ou se o conteúdo visto pela equipa (hash) não
-- for o autorizado.
create or replace function public.texto_registar_envio(
  p_texto_id uuid,
  p_conteudo_sha256 text,
  p_destinatario text,
  p_canal text,
  p_resultado text,
  p_admin uuid,
  p_em timestamptz default now()
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  a public.casos_textos_autorizacoes;
begin
  select * into v from public.casos_textos where id = p_texto_id for update;
  if v.id is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if v.estado = 'enviado' then
    return jsonb_build_object('resultado', 'ja_enviado', 'enviado_em', v.enviado_em);
  end if;
  if (public.texto_versao_atual(v.caso_id)).id <> v.id then
    return jsonb_build_object('resultado', 'versao_antiga');
  end if;
  select * into a from public.casos_textos_autorizacoes where texto_id = v.id;
  if v.estado <> 'autorizado' or a.id is null or a.conteudo_sha256 <> v.conteudo_sha256 then
    return jsonb_build_object('resultado', 'nao_autorizado');
  end if;
  if p_conteudo_sha256 is distinct from v.conteudo_sha256 then
    return jsonb_build_object('resultado', 'conteudo_diferente');
  end if;

  insert into public.casos_textos_envios (caso_id, texto_id, autorizacao_id, conteudo_sha256, destinatario, canal, resultado, enviado_por, enviado_em)
  values (v.caso_id, v.id, a.id, v.conteudo_sha256, btrim(p_destinatario), p_canal, nullif(btrim(coalesce(p_resultado, '')), ''), p_admin, p_em);
  update public.casos_textos set estado = 'enviado', enviado_em = p_em where id = v.id;
  insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator) values (v.caso_id, 'comunicacao_enviada', v.id, v.versao, 'equipa');

  -- O caso passa a aguardar a resposta do operador (base do prazo legal).
  update public.casos
     set data_envio_reclamacao = coalesce(data_envio_reclamacao, (p_em at time zone 'Europe/Lisbon')::date),
         status = case when status in ('Novo', 'Em investigação') then 'Aguardando operador' else status end
   where id = v.caso_id;
  return jsonb_build_object('resultado', 'enviado', 'enviado_em', p_em);
end $$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'texto_versao_atual(uuid)',
    'texto_guardar(uuid, text, uuid)',
    'texto_emitir_links(uuid, text, text, timestamptz, text)',
    'texto__situacao(public.casos_textos)',
    'texto_consultar_link(text, timestamptz)',
    'texto__autorizar(uuid, uuid, text, timestamptz)',
    'texto__pedir_alteracoes(uuid, uuid, text, text, timestamptz)',
    'texto__validar_link(text, text, timestamptz)',
    'texto_autorizar_por_link(text, timestamptz)',
    'texto_pedir_alteracoes_por_link(text, text, timestamptz)',
    'texto__do_cliente(uuid, uuid)',
    'texto_autorizar_no_portal(uuid, uuid, timestamptz)',
    'texto_pedir_alteracoes_no_portal(uuid, uuid, text, timestamptz)',
    'texto_reemitir_por_link(text, text, text, timestamptz)',
    'texto_registar_envio(uuid, text, text, text, text, uuid, timestamptz)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. RLS: o cliente lê o que é seu (nunca rascunhos); o admin lê tudo; só o
--    backend escreve, pelas funções acima.
-- ---------------------------------------------------------------------------
alter table public.casos_textos enable row level security;
alter table public.casos_textos_links enable row level security;
alter table public.casos_textos_autorizacoes enable row level security;
alter table public.casos_textos_pedidos_alteracao enable row level security;
alter table public.casos_textos_envios enable row level security;
alter table public.casos_eventos enable row level security;

create policy "Cliente vê os textos dos próprios casos (sem rascunhos)" on public.casos_textos
  for select to authenticated using (
    estado <> 'rascunho'
    and exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid())
  );
create policy "Admin lê textos" on public.casos_textos for select to authenticated using (public.is_admin());

create policy "Admin lê links (só hashes)" on public.casos_textos_links for select to authenticated using (public.is_admin());

create policy "Cliente vê as próprias autorizações" on public.casos_textos_autorizacoes
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê autorizações" on public.casos_textos_autorizacoes for select to authenticated using (public.is_admin());

create policy "Cliente vê os próprios pedidos de alteração" on public.casos_textos_pedidos_alteracao
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê pedidos de alteração" on public.casos_textos_pedidos_alteracao for select to authenticated using (public.is_admin());

create policy "Cliente vê os envios dos próprios casos" on public.casos_textos_envios
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê envios" on public.casos_textos_envios for select to authenticated using (public.is_admin());

create policy "Cliente vê o histórico dos próprios casos" on public.casos_eventos
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê o histórico" on public.casos_eventos for select to authenticated using (public.is_admin());

revoke all on public.casos_textos, public.casos_textos_links, public.casos_textos_autorizacoes,
  public.casos_textos_pedidos_alteracao, public.casos_textos_envios, public.casos_eventos from anon, authenticated;
grant select on public.casos_textos, public.casos_textos_links, public.casos_textos_autorizacoes,
  public.casos_textos_pedidos_alteracao, public.casos_textos_envios, public.casos_eventos to authenticated;
