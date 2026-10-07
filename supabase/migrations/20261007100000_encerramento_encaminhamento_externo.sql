-- DoLado — Encerramento do caso com encaminhamento externo e dossiê do caso.
--
-- Quando a DoLado já fez tudo o que o serviço prevê e o problema continua sem
-- solução, o caso é encerrado do lado da DoLado — sem ser "Resolvido":
--
--   … → Resposta em análise / A aguardar resposta / … → encerramento interno
--   (equipa, com motivo) → dossiê do caso em PDF → o cliente vê no portal
--   "Encerrado na DoLado", descarrega o dossiê e consulta a informação pública
--   sobre as entidades oficiais de Resolução Alternativa de Litígios (RAL).
--
-- Estado novo (casos.status): 'Encerrado com encaminhamento externo'.
--   * terminal: só sai por caso_corrigir_estado() (correção auditada);
--   * diferente de 'Encerrado sem resolução' (encerramento sem dossiê nem
--     orientação externa, ex.: o cliente desistiu), que se mantém.
--
-- A DoLado não representa o cliente perante centros de arbitragem, não
-- apresenta pedidos em nome dele nem determina a entidade competente: o
-- dossiê é um arquivo factual do caso, não uma peça jurídica.
--
-- Nada é apagado nem reescrito: textos enviados, comprovativos, comunicações
-- recebidas e histórico ficam como estão. O encerramento:
--   * regista quem e quando (casos_encerramentos, só inserção) e muda o estado
--     (casos_estados_historico, como sempre);
--   * dá por terminados os passos em aberto da DoLado (texto por enviar →
--     'substituido', pedido de informação aberto → 'cancelado');
--   * impede novas ações operacionais nesse caso (trigger), mesmo à service
--     role. Mensagens que ainda cheguem da empresa continuam a ser guardadas
--     (prova), sem mudar o estado.
--
-- Dossiê (casos_dossies, só inserção; ficheiros no bucket privado
-- dossies-casos): cada geração é uma versão nova, com o hash SHA-256 do PDF.
-- O PDF reflete só o que existe no sistema na data da geração. O cliente lê
-- os registos dos próprios casos (sem o caminho no storage) e descarrega pelo
-- servidor (/api/dossies/[id]: sessão → RLS → URL assinada de curta duração).

-- ---------------------------------------------------------------------------
-- 1. Estado e transições
-- ---------------------------------------------------------------------------
alter table public.casos drop constraint casos_status_check;
alter table public.casos add constraint casos_status_check check (status in (
  'Novo',
  'Em investigação',
  'Aguardando operador',
  'Resposta em análise',
  'Aguardando cliente',
  'Aguardando decisão cliente',
  'Resolvido',
  'Bloqueado',
  'Encerrado sem resolução',
  'Encerrado com encaminhamento externo'
));

-- Matriz igual à anterior + entradas no estado novo (a partir de qualquer
-- estado em que a DoLado já tenha trabalhado; nunca de 'Novo' nem de
-- 'Resolvido'). Sem saídas: o estado é terminal.
create or replace function public.caso_transicao_permitida(p_de text, p_para text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_de = p_para or (p_de, p_para) in (
    ('Novo', 'Em investigação'), ('Novo', 'Aguardando cliente'), ('Novo', 'Aguardando operador'),
    ('Novo', 'Encerrado sem resolução'), ('Novo', 'Bloqueado'),

    ('Em investigação', 'Aguardando cliente'), ('Em investigação', 'Aguardando operador'),
    ('Em investigação', 'Encerrado sem resolução'), ('Em investigação', 'Bloqueado'),

    ('Aguardando operador', 'Resposta em análise'), ('Aguardando operador', 'Em investigação'),
    ('Aguardando operador', 'Encerrado sem resolução'), ('Aguardando operador', 'Bloqueado'),

    ('Resposta em análise', 'Aguardando operador'), ('Resposta em análise', 'Em investigação'),
    ('Resposta em análise', 'Aguardando cliente'), ('Resposta em análise', 'Aguardando decisão cliente'),
    ('Resposta em análise', 'Bloqueado'), ('Resposta em análise', 'Encerrado sem resolução'),

    ('Aguardando cliente', 'Resposta em análise'), ('Aguardando cliente', 'Em investigação'),
    ('Aguardando cliente', 'Aguardando operador'), ('Aguardando cliente', 'Encerrado sem resolução'),

    ('Aguardando decisão cliente', 'Resolvido'), ('Aguardando decisão cliente', 'Resposta em análise'),
    ('Aguardando decisão cliente', 'Encerrado sem resolução'),

    ('Bloqueado', 'Em investigação'), ('Bloqueado', 'Resposta em análise'), ('Bloqueado', 'Aguardando operador'),
    ('Bloqueado', 'Aguardando decisão cliente'), ('Bloqueado', 'Encerrado sem resolução'),

    -- Encerramento com encaminhamento externo
    ('Em investigação', 'Encerrado com encaminhamento externo'),
    ('Aguardando operador', 'Encerrado com encaminhamento externo'),
    ('Resposta em análise', 'Encerrado com encaminhamento externo'),
    ('Aguardando cliente', 'Encerrado com encaminhamento externo'),
    ('Aguardando decisão cliente', 'Encerrado com encaminhamento externo'),
    ('Bloqueado', 'Encerrado com encaminhamento externo'),
    ('Encerrado sem resolução', 'Encerrado com encaminhamento externo')
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Cronologia: evento novo
-- ---------------------------------------------------------------------------
alter table public.casos_eventos drop constraint casos_eventos_tipo_check;
alter table public.casos_eventos add constraint casos_eventos_tipo_check check (tipo in (
  'texto_preparado', 'nova_versao', 'texto_enviado_revisao', 'links_reemitidos',
  'alteracoes_pedidas', 'texto_autorizado', 'comunicacao_enviada',
  'comprovativo_disponivel', 'dossie_disponivel',
  'aguarda_resposta_empresa', 'comunicacao_recebida', 'em_analise_dolado', 'analise_concluida',
  'mensagem_sem_acao', 'solucao_apresentada', 'cliente_confirmou_resolucao', 'cliente_rejeitou_resolucao',
  'pedido_informacao_cliente', 'informacao_cliente_enviada', 'encaminhamento_registado',
  'caso_encerrado', 'estado_corrigido',
  -- encerramento com encaminhamento externo
  'dossie_gerado'));

-- ---------------------------------------------------------------------------
-- 3. Registo do encerramento (só inserção)
-- ---------------------------------------------------------------------------
create table public.casos_encerramentos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  modo text not null default 'encaminhamento_externo' check (modo in ('encaminhamento_externo')),
  estado_anterior text not null,
  -- Motivo interno (porque é que o serviço da DoLado terminou). Não vai para o
  -- cliente nem para o dossiê.
  motivo text not null check (char_length(motivo) between 5 and 1000),
  encerrado_por uuid references public.utilizadores (id) on delete set null,
  encerrado_em timestamptz not null default now()
);
comment on table public.casos_encerramentos is
  'Encerramento do caso pela DoLado (quem, quando, estado anterior, motivo interno). Só inserção. Uma correção posterior do estado não apaga o registo.';
create index casos_encerramentos_caso_idx on public.casos_encerramentos (caso_id, encerrado_em);

create or replace function public.casos_encerramentos_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id or new.caso_id <> old.caso_id or new.modo <> old.modo or new.estado_anterior <> old.estado_anterior
     or new.motivo <> old.motivo or new.encerrado_em <> old.encerrado_em
     or (new.encerrado_por is distinct from old.encerrado_por and new.encerrado_por is not null) then
    raise exception 'casos_encerramentos: registo só de inserção' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_encerramentos_so_insercao before update on public.casos_encerramentos
  for each row execute function public.casos_encerramentos_so_insercao();

-- ---------------------------------------------------------------------------
-- 4. Dossiê do caso (só inserção) e bucket privado
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dossies-casos', 'dossies-casos', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Só leitura para o admin (o upload é feito pelo servidor com service role).
create policy "Admin lê dossiês no storage"
  on storage.objects for select to authenticated
  using (bucket_id = 'dossies-casos' and public.is_admin());

create table public.casos_dossies (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  encerramento_id uuid references public.casos_encerramentos (id) on delete set null,
  versao int not null check (versao >= 1),
  modelo_versao text not null check (char_length(modelo_versao) between 1 and 40),
  nome text not null check (char_length(nome) between 5 and 200),
  storage_path text not null check (char_length(storage_path) between 5 and 500),
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  ficheiro_sha256 text not null check (ficheiro_sha256 ~ '^[0-9a-f]{64}$'),
  gerado_por uuid references public.utilizadores (id) on delete set null,
  gerado_em timestamptz not null default now(),
  unique (caso_id, versao)
);
comment on table public.casos_dossies is
  'Dossiê do caso em PDF (arquivo factual e cronológico do caso), gerado no encerramento com encaminhamento externo. Cada geração é uma versão nova; nada é reescrito.';
comment on column public.casos_dossies.modelo_versao is 'Versão do modelo do dossiê (src/lib/dossie/modelo.ts, DOSSIE_MODELO_VERSAO).';

create or replace function public.casos_dossies_so_insercao()
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
       and not (k = any (array['encerramento_id', 'gerado_por']) and n->k = 'null'::jsonb) then
      raise exception 'casos_dossies: registo só de inserção' using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

create trigger casos_dossies_so_insercao before update on public.casos_dossies
  for each row execute function public.casos_dossies_so_insercao();

-- ---------------------------------------------------------------------------
-- 5. Sem ações operacionais depois do encerramento
-- ---------------------------------------------------------------------------
-- Recusa novas versões do texto, autorizações, envios, pedidos ao cliente,
-- decisões de análise e gerações/análises pela IA num caso encerrado com
-- encaminhamento externo — mesmo à service role. Para retomar o caso, a
-- equipa usa "Corrigir estado" (auditado) e só depois volta a agir.
create or replace function public.caso_bloquear_apos_encerramento()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_caso uuid;
begin
  if tg_table_name = 'casos_analises_ia' then
    select caso_id into v_caso from public.casos_comunicacoes_recebidas where id = new.comunicacao_id;
  else
    v_caso := new.caso_id;
  end if;
  if exists (select 1 from public.casos where id = v_caso and status = 'Encerrado com encaminhamento externo') then
    raise exception '%: caso encerrado na DoLado — sem novas ações (corrija o estado para retomar)', tg_table_name using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_textos_bloquear_encerrado before insert on public.casos_textos
  for each row execute function public.caso_bloquear_apos_encerramento();
create trigger casos_textos_autorizacoes_bloquear_encerrado before insert on public.casos_textos_autorizacoes
  for each row execute function public.caso_bloquear_apos_encerramento();
create trigger casos_textos_envios_bloquear_encerrado before insert on public.casos_textos_envios
  for each row execute function public.caso_bloquear_apos_encerramento();
create trigger casos_pedidos_cliente_bloquear_encerrado before insert on public.casos_pedidos_cliente
  for each row execute function public.caso_bloquear_apos_encerramento();
create trigger casos_analises_bloquear_encerrado before insert on public.casos_analises
  for each row execute function public.caso_bloquear_apos_encerramento();
create trigger casos_rascunhos_ia_bloquear_encerrado before insert on public.casos_rascunhos_ia
  for each row execute function public.caso_bloquear_apos_encerramento();
create trigger casos_analises_ia_bloquear_encerrado before insert on public.casos_analises_ia
  for each row execute function public.caso_bloquear_apos_encerramento();

-- ---------------------------------------------------------------------------
-- 6. Funções (só o backend, com service_role, depois de requireAdmin)
-- ---------------------------------------------------------------------------

-- Encerra o caso com encaminhamento externo. Atómica e idempotente (um caso
-- já encerrado devolve 'ja_encerrado' com o registo existente).
create or replace function public.caso_encerrar_encaminhamento_externo(p_caso_id uuid, p_motivo text, p_admin uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c record;
  m text := btrim(coalesce(p_motivo, ''));
  v_id uuid;
begin
  if p_admin is null or char_length(m) < 5 or char_length(m) > 1000 then
    return jsonb_build_object('resultado', 'motivo_invalido');
  end if;
  select id, status into c from public.casos where id = p_caso_id for update;
  if c.id is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if c.status = 'Encerrado com encaminhamento externo' then
    select id into v_id from public.casos_encerramentos where caso_id = p_caso_id order by encerrado_em desc limit 1;
    return jsonb_build_object('resultado', 'ja_encerrado', 'encerramento_id', v_id);
  end if;
  if not public.caso_transicao_permitida(c.status, 'Encerrado com encaminhamento externo') then
    return jsonb_build_object('resultado', 'transicao_invalida', 'estado', c.status);
  end if;
  -- Uma comunicação por analisar pode mudar o desfecho: analisar primeiro.
  if exists (select 1 from public.casos_comunicacoes_recebidas where caso_id = p_caso_id and estado_analise = 'por_analisar') then
    return jsonb_build_object('resultado', 'comunicacoes_por_analisar');
  end if;

  -- Passos em aberto da DoLado deixam de estar em curso (nada é apagado).
  update public.casos_textos set estado = 'substituido', substituido_em = now()
   where caso_id = p_caso_id and estado in ('rascunho', 'aguardando_aprovacao', 'alteracoes_solicitadas', 'autorizado');
  update public.casos_pedidos_cliente set estado = 'cancelado' where caso_id = p_caso_id and estado = 'aberto';

  insert into public.casos_encerramentos (caso_id, estado_anterior, motivo, encerrado_por)
  values (p_caso_id, c.status, m, p_admin)
  returning id into v_id;

  perform public.caso__ator('equipa', p_admin);
  update public.casos set status = 'Encerrado com encaminhamento externo' where id = p_caso_id;
  insert into public.casos_eventos (caso_id, tipo, ator, dados)
  values (p_caso_id, 'caso_encerrado', 'equipa', jsonb_build_object('modo', 'encaminhamento_externo'));

  return jsonb_build_object('resultado', 'ok', 'encerramento_id', v_id, 'estado_anterior', c.status);
end $$;

-- Regista uma versão do dossiê já gravada no storage. Só num caso encerrado
-- com encaminhamento externo; a versão é a seguinte do caso.
create or replace function public.dossie_registar(
  p_caso_id uuid,
  p_storage_path text,
  p_nome text,
  p_tamanho_bytes bigint,
  p_ficheiro_sha256 text,
  p_modelo_versao text,
  p_admin uuid
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c record;
  v_versao int;
  v_id uuid;
  v_enc uuid;
begin
  if p_admin is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select id, status into c from public.casos where id = p_caso_id for update;
  if c.id is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if c.status <> 'Encerrado com encaminhamento externo' then
    return jsonb_build_object('resultado', 'estado_invalido', 'estado', c.status);
  end if;
  select id into v_enc from public.casos_encerramentos where caso_id = p_caso_id order by encerrado_em desc limit 1;
  select coalesce(max(versao), 0) + 1 into v_versao from public.casos_dossies where caso_id = p_caso_id;

  insert into public.casos_dossies (caso_id, encerramento_id, versao, modelo_versao, nome, storage_path, tamanho_bytes, ficheiro_sha256, gerado_por)
  values (p_caso_id, v_enc, v_versao, p_modelo_versao, p_nome, p_storage_path, p_tamanho_bytes, p_ficheiro_sha256, p_admin)
  returning id into v_id;

  insert into public.casos_eventos (caso_id, tipo, ator, dados)
  values (p_caso_id, 'dossie_gerado', 'equipa', jsonb_build_object('versao', v_versao));

  return jsonb_build_object('resultado', 'ok', 'dossie_id', v_id, 'versao', v_versao);
end $$;

revoke execute on function public.caso_encerrar_encaminhamento_externo(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.caso_encerrar_encaminhamento_externo(uuid, text, uuid) to service_role;
revoke execute on function public.dossie_registar(uuid, text, text, bigint, text, text, uuid) from public, anon, authenticated;
grant execute on function public.dossie_registar(uuid, text, text, bigint, text, text, uuid) to service_role;
revoke execute on function public.caso_bloquear_apos_encerramento() from public, anon, authenticated;
revoke execute on function public.casos_encerramentos_so_insercao() from public, anon, authenticated;
revoke execute on function public.casos_dossies_so_insercao() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS e permissões
-- ---------------------------------------------------------------------------
alter table public.casos_encerramentos enable row level security;
create policy "Admin lê encerramentos" on public.casos_encerramentos
  for select to authenticated using (public.is_admin());
revoke all on public.casos_encerramentos from anon, authenticated;
grant select on public.casos_encerramentos to authenticated;

alter table public.casos_dossies enable row level security;
create policy "Cliente vê os dossiês dos próprios casos" on public.casos_dossies
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê dossiês" on public.casos_dossies
  for select to authenticated using (public.is_admin());
revoke all on public.casos_dossies from anon, authenticated;
-- Sem storage_path nem gerado_por para a API: o caminho no storage fica só
-- no servidor.
grant select (id, caso_id, versao, nome, tamanho_bytes, gerado_em) on public.casos_dossies to authenticated;
