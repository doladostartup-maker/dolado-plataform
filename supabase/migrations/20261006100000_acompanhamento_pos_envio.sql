-- DoLado — Acompanhamento depois do envio: respostas da empresa, análise,
-- próximo passo e ciclo até ao desfecho.
--
-- Princípio: a DoLado não termina o trabalho quando envia a reclamação;
-- acompanha o problema até existir um desfecho.
--
--   Reclamação enviada → A aguardar resposta da empresa → comunicação
--   recebida (e-mail para o endereço único do caso, ou registo manual) →
--   Resposta em análise pela DoLado → decisão humana:
--     A. solução apresentada  → Aguardando decisão cliente → cliente confirma
--        (Resolvido) ou não (de volta à análise);
--     B. preparar nova resposta → Em investigação → fluxo de texto de sempre
--        (versão, revisão, autorização explícita, envio) → A aguardar resposta;
--     C. pedir informação ao cliente → Aguardando cliente → cliente responde →
--        análise;
--     D. encaminhar (regulador, arbitragem, julgado de paz, …, encerramento);
--     E. mensagem sem ação → volta a A aguardar resposta.
--
-- Estados (casos.status) — reutilizados quando já existiam:
--   Novo                       caso recebido
--   Em investigação            preparação pela DoLado (reclamação ou nova resposta)
--   Aguardando operador        a aguardar resposta da empresa
--   Resposta em análise        NOVO — em análise pela DoLado
--   Aguardando cliente         NOVO — à espera de informação do cliente
--   Aguardando decisão cliente a aguardar a confirmação da resolução
--   Resolvido                  resolvido
--   Bloqueado                  encaminhado para outro meio (escalada)
--   Encerrado sem resolução    NOVO
-- Aguardar autorização / autorizado / enviado continuam a ser estados do
-- texto (casos_textos.estado), nunca de casos.status.
--
-- Transições explícitas, validadas na base de dados (trigger), mesmo para a
-- service role. Exceção auditada: caso_corrigir_estado() (correção manual
-- pelo admin, com motivo). Cada mudança de estado fica em
-- casos_estados_historico (só inserção).
--
-- Nada é apagado nem reescrito: a mensagem recebida (texto, HTML original,
-- cabeçalhos relevantes, anexos) é prova; a análise e a decisão ficam ao lado.

-- ---------------------------------------------------------------------------
-- 1. Estados
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
  'Encerrado sem resolução'
));

-- Matriz de transições permitidas (fonte única; o código só a espelha para
-- apresentação em src/lib/acompanhamento/estados.ts).
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
    ('Bloqueado', 'Aguardando decisão cliente'), ('Bloqueado', 'Encerrado sem resolução')
  );
$$;

-- Histórico de estados (só inserção).
create table public.casos_estados_historico (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  de text not null,
  para text not null,
  ator text not null check (ator in ('cliente', 'equipa', 'sistema')),
  por uuid references public.utilizadores (id) on delete set null,
  correcao boolean not null default false,
  motivo text check (char_length(motivo) <= 500),
  created_at timestamptz not null default now()
);
comment on table public.casos_estados_historico is
  'Cada mudança de casos.status (de → para, quem, quando). Só inserção. Correções manuais marcadas com correcao = true e motivo.';
create index casos_estados_historico_caso_idx on public.casos_estados_historico (caso_id, created_at);

create or replace function public.casos_validar_transicao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('dolado.correcao_estado', true), '') <> 'on'
     and not public.caso_transicao_permitida(old.status, new.status) then
    raise exception 'casos: transição de estado % → % não permitida', old.status, new.status using errcode = '42501';
  end if;
  return new;
end $$;

create trigger casos_validar_transicao before update of status on public.casos
  for each row execute function public.casos_validar_transicao();

-- SECURITY DEFINER: o admin altera casos com a própria sessão (sem
-- permissão de escrita no histórico). Só insere este registo; search_path fixo.
create or replace function public.casos_registar_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ator text := nullif(current_setting('dolado.ator', true), '');
  v_por text := nullif(current_setting('dolado.ator_id', true), '');
begin
  if new.status is distinct from old.status then
    insert into public.casos_estados_historico (caso_id, de, para, ator, por, correcao, motivo)
    values (
      new.id, old.status, new.status,
      coalesce(v_ator, case when auth.uid() is not null then 'equipa' else 'sistema' end),
      coalesce(v_por::uuid, auth.uid()),
      coalesce(current_setting('dolado.correcao_estado', true), '') = 'on',
      nullif(current_setting('dolado.motivo_estado', true), '')
    );
  end if;
  return new;
end $$;
revoke execute on function public.casos_registar_estado() from public, anon, authenticated;

create trigger casos_registar_estado after update of status on public.casos
  for each row execute function public.casos_registar_estado();

create trigger casos_estados_historico_so_insercao before update on public.casos_estados_historico
  for each row execute function public.casos_textos_so_insercao();

-- Contexto do ator para o histórico (só dentro da transação).
create or replace function public.caso__ator(p_ator text, p_id uuid)
returns void
language sql
set search_path = ''
as $$
  select set_config('dolado.ator', p_ator, true), set_config('dolado.ator_id', coalesce(p_id::text, ''), true);
$$;

-- ---------------------------------------------------------------------------
-- 2. Cronologia: eventos novos, eventos só internos, ligação à comunicação
-- ---------------------------------------------------------------------------
alter table public.casos_eventos
  add column visivel_cliente boolean not null default true,
  add column comunicacao_id uuid,
  add column dados jsonb check (dados is null or (jsonb_typeof(dados) = 'object' and pg_column_size(dados) < 2000));

comment on column public.casos_eventos.visivel_cliente is 'false = acontecimento só da cronologia interna (ex.: mensagem sem ação, correção de estado).';
comment on column public.casos_eventos.dados is 'Dados curtos e não sensíveis para apresentar o evento (ex.: tipo de encaminhamento). Nunca conteúdo de mensagens.';

alter table public.casos_eventos drop constraint casos_eventos_tipo_check;
alter table public.casos_eventos add constraint casos_eventos_tipo_check check (tipo in (
  'texto_preparado', 'nova_versao', 'texto_enviado_revisao', 'links_reemitidos',
  'alteracoes_pedidas', 'texto_autorizado', 'comunicacao_enviada',
  'comprovativo_disponivel', 'dossie_disponivel',
  -- acompanhamento depois do envio
  'aguarda_resposta_empresa', 'comunicacao_recebida', 'em_analise_dolado', 'analise_concluida',
  'mensagem_sem_acao', 'solucao_apresentada', 'cliente_confirmou_resolucao', 'cliente_rejeitou_resolucao',
  'pedido_informacao_cliente', 'informacao_cliente_enviada', 'encaminhamento_registado',
  'caso_encerrado', 'estado_corrigido'));

-- Só inserção, como antes; referências apagadas podem passar a null.
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
       and not (k = any (array['utilizador_id', 'link_id', 'enviado_por', 'texto_id', 'comunicacao_id', 'por']) and n->k = 'null'::jsonb) then
      raise exception '%: registo só de inserção', tg_table_name using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop policy "Cliente vê o histórico dos próprios casos" on public.casos_eventos;
create policy "Cliente vê o histórico dos próprios casos" on public.casos_eventos
  for select to authenticated using (
    visivel_cliente
    and exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Envio: referência da reclamação e base para prazos
-- ---------------------------------------------------------------------------
alter table public.casos_textos_envios
  add column referencia text check (char_length(referencia) between 1 and 200),
  add column prazo_resposta_em date,
  add column prazo_resposta_base text check (char_length(prazo_resposta_base) between 1 and 300),
  add constraint casos_textos_envios_prazo_base check (prazo_resposta_em is null or prazo_resposta_base is not null);

comment on column public.casos_textos_envios.referencia is 'Número/referência atribuído pela empresa ou pelo canal (ex.: n.º do Livro de Reclamações).';
comment on column public.casos_textos_envios.prazo_resposta_em is
  'Prazo de resposta da empresa, só quando efetivamente aplicável e indicado pela equipa (com a base em prazo_resposta_base). Nunca calculado automaticamente.';

-- ---------------------------------------------------------------------------
-- 4. Tipos de encaminhamento (dados: novos tipos = nova linha)
-- ---------------------------------------------------------------------------
create table public.tipos_encaminhamento (
  codigo text primary key check (codigo ~ '^[a-z][a-z0-9_]{2,39}$'),
  rotulo text not null check (char_length(rotulo) between 3 and 80),
  descricao_cliente text not null check (char_length(descricao_cliente) between 10 and 500),
  estado_resultante text not null check (estado_resultante in ('Em investigação', 'Bloqueado', 'Encerrado sem resolução')),
  ativo boolean not null default true,
  ordem int not null default 100,
  created_at timestamptz not null default now()
);
comment on table public.tipos_encaminhamento is
  'Próximos passos possíveis depois da análise (encaminhamento). Para acrescentar um tipo, inserir uma linha; desativar em vez de apagar.';

insert into public.tipos_encaminhamento (codigo, rotulo, descricao_cliente, estado_resultante, ordem) values
  ('nova_comunicacao_empresa', 'Nova comunicação à empresa',
   'A DoLado vai preparar uma nova comunicação à empresa, que lhe mostramos antes de qualquer envio.', 'Em investigação', 10),
  ('entidade_reguladora', 'Entidade reguladora competente',
   'O próximo passo possível é apresentar a situação à entidade reguladora competente. A DoLado explica-lhe como.', 'Bloqueado', 20),
  ('centro_arbitragem', 'Centro de Arbitragem',
   'O próximo passo possível é recorrer a um centro de arbitragem de conflitos de consumo. A DoLado explica-lhe como.', 'Bloqueado', 30),
  ('julgado_de_paz', 'Julgado de Paz',
   'O próximo passo possível é recorrer a um julgado de paz. A DoLado explica-lhe como.', 'Bloqueado', 40),
  ('outro_meio', 'Outro meio disponível',
   'A DoLado indicou-lhe outro meio disponível para continuar a tratar a situação.', 'Bloqueado', 50),
  ('encerramento_sem_resolucao', 'Encerramento sem resolução',
   'O caso foi encerrado sem que a empresa tenha resolvido a situação.', 'Encerrado sem resolução', 90);

alter table public.tipos_encaminhamento enable row level security;
create policy "Contas autenticadas leem os tipos de encaminhamento" on public.tipos_encaminhamento
  for select to authenticated using (true);
create policy "Admin gere tipos de encaminhamento" on public.tipos_encaminhamento
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.tipos_encaminhamento from anon, authenticated;
grant select, insert, update on public.tipos_encaminhamento to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Endereço único de respostas do caso
-- ---------------------------------------------------------------------------
-- caso-<código>-<token>@<domínio>: código (6) e token (26) em base32
-- minúsculo, aleatórios (gerados no servidor com crypto.randomBytes), sem
-- UUID, nome nem dados pessoais. Nunca sequencial.
create table public.casos_enderecos_resposta (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null unique references public.casos (id) on delete cascade,
  local_part text not null unique check (local_part ~ '^caso-[a-z2-7]{6}-[a-z2-7]{26}$'),
  created_at timestamptz not null default now(),
  desativado_em timestamptz
);
comment on table public.casos_enderecos_resposta is
  'Endereço técnico de cada caso para receber respostas (parte local; o domínio vem de RESPOSTAS_DOMINIO). Só o admin e o servidor leem.';

create or replace function public.casos_enderecos_resposta_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.caso_id <> old.caso_id or new.local_part <> old.local_part or new.created_at <> old.created_at
     or (old.desativado_em is not null and new.desativado_em is distinct from old.desativado_em) then
    raise exception 'casos_enderecos_resposta: endereço imutável' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger casos_enderecos_resposta_integridade before update on public.casos_enderecos_resposta
  for each row execute function public.casos_enderecos_resposta_integridade();

-- ---------------------------------------------------------------------------
-- 6. Comunicações recebidas (coleção, nunca um campo único)
-- ---------------------------------------------------------------------------
create table public.casos_comunicacoes_recebidas (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  origem text not null check (origem in ('email', 'manual')),
  canal text not null check (canal in ('email', 'carta', 'telefone', 'livro_reclamacoes', 'outro')),
  provider text check (provider in ('brevo')),
  provider_event_id text check (char_length(provider_event_id) <= 200),
  message_id text check (char_length(message_id) <= 998),
  in_reply_to text check (char_length(in_reply_to) <= 998),
  referencias text[] not null default '{}',
  remetente_email text check (char_length(remetente_email) <= 320),
  remetente_nome text check (char_length(remetente_nome) <= 300),
  destinatario text check (char_length(destinatario) <= 320),
  para jsonb not null default '[]'::jsonb check (jsonb_typeof(para) = 'array'),
  cc jsonb not null default '[]'::jsonb check (jsonb_typeof(cc) = 'array'),
  assunto text check (char_length(assunto) <= 1000),
  corpo_texto text check (char_length(corpo_texto) <= 200000),
  -- HTML original, guardado como prova. NUNCA é apresentado como HTML.
  corpo_html text check (char_length(corpo_html) <= 1000000),
  -- Versão para apresentação: texto simples derivado (sem HTML), mostrado como texto.
  corpo_apresentacao text check (char_length(corpo_apresentacao) <= 200000),
  truncado boolean not null default false,
  cabecalhos jsonb not null default '{}'::jsonb check (jsonb_typeof(cabecalhos) = 'object'),
  data_mensagem timestamptz,
  recebida_em timestamptz not null default now(),
  spam_score numeric(8, 3),
  automatica boolean not null default false,
  suspeita_spam boolean not null default false,
  tamanho_bytes integer check (tamanho_bytes >= 0),
  registado_por uuid references public.utilizadores (id) on delete set null,
  -- Estado do caso quando chegou e se provocou a passagem a "Resposta em análise".
  estado_caso_na_rececao text not null,
  transitou boolean not null default false,
  anexos_processados_em timestamptz,
  -- Análise humana (a única parte que muda, uma vez).
  estado_analise text not null default 'por_analisar' check (estado_analise in ('por_analisar', 'analisada', 'sem_acao')),
  classificacao text check (classificacao in (
    'resposta_automatica', 'confirmacao_rececao', 'pedido_informacao', 'pedido_documentos', 'resposta_satisfatoria',
    'resposta_parcial', 'resposta_negativa', 'proposta_resolucao', 'mensagem_irrelevante', 'necessita_revisao_manual')),
  analisada_em timestamptz,
  analisada_por uuid references public.utilizadores (id) on delete set null,
  check (origem <> 'email' or (provider is not null and provider_event_id is not null)),
  check ((estado_analise = 'por_analisar') = (analisada_em is null))
);
comment on table public.casos_comunicacoes_recebidas is
  'Comunicações recebidas da empresa (ou de terceiros) num caso: e-mail para o endereço do caso (Brevo inbound) ou registo manual. Conteúdo original imutável (prova); só a análise humana é registada depois.';

create unique index casos_comunicacoes_evento_idx on public.casos_comunicacoes_recebidas (provider, provider_event_id)
  where provider_event_id is not null;
create unique index casos_comunicacoes_message_id_idx on public.casos_comunicacoes_recebidas (caso_id, message_id)
  where message_id is not null;
create index casos_comunicacoes_caso_idx on public.casos_comunicacoes_recebidas (caso_id, recebida_em);
create index casos_comunicacoes_por_analisar_idx on public.casos_comunicacoes_recebidas (caso_id) where estado_analise = 'por_analisar';

alter table public.casos_eventos
  add constraint casos_eventos_comunicacao_fk foreign key (comunicacao_id)
  references public.casos_comunicacoes_recebidas (id) on delete set null;

create or replace function public.casos_comunicacoes_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  mutaveis text[] := array['estado_analise', 'classificacao', 'analisada_em', 'analisada_por', 'anexos_processados_em', 'registado_por'];
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
  if old.anexos_processados_em is not null and new.anexos_processados_em is distinct from old.anexos_processados_em then
    raise exception 'casos_comunicacoes_recebidas: anexos já processados' using errcode = '42501';
  end if;
  if new.registado_por is distinct from old.registado_por and new.registado_por is not null then
    raise exception 'casos_comunicacoes_recebidas: registo imutável' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger casos_comunicacoes_integridade before update on public.casos_comunicacoes_recebidas
  for each row execute function public.casos_comunicacoes_integridade();

-- ---------------------------------------------------------------------------
-- 7. Anexos das comunicações (bucket privado; só o servidor grava)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunicacoes-casos', 'comunicacoes-casos', false, 15728640, array[
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Admin lê anexos de comunicações no storage"
  on storage.objects for select to authenticated
  using (bucket_id = 'comunicacoes-casos' and public.is_admin());

create table public.casos_comunicacoes_anexos (
  id uuid primary key default gen_random_uuid(),
  comunicacao_id uuid not null references public.casos_comunicacoes_recebidas (id) on delete cascade,
  caso_id uuid not null references public.casos (id) on delete cascade,
  indice int not null check (indice >= 0),
  -- Nome normalizado (nunca o caminho no storage).
  nome text not null check (char_length(nome) between 1 and 200),
  tipo_mime text check (char_length(tipo_mime) <= 200),
  tamanho_bytes bigint check (tamanho_bytes >= 0),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text,
  estado text not null check (estado in ('guardado', 'rejeitado')),
  motivo_rejeicao text check (motivo_rejeicao in ('tipo_nao_permitido', 'demasiado_grande', 'conteudo_invalido', 'falha_transferencia', 'limite_anexos')),
  created_at timestamptz not null default now(),
  unique (comunicacao_id, indice),
  check ((estado = 'guardado') = (storage_path is not null and sha256 is not null)),
  check ((estado = 'rejeitado') = (motivo_rejeicao is not null))
);
comment on table public.casos_comunicacoes_anexos is
  'Anexos de uma comunicação recebida. Guardados só os tipos permitidos e verificados; os rejeitados ficam registados (nome, tipo, motivo) sem ficheiro.';
create index casos_comunicacoes_anexos_caso_idx on public.casos_comunicacoes_anexos (caso_id);

create or replace function public.casos_comunicacoes_anexos_caso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select caso_id into new.caso_id from public.casos_comunicacoes_recebidas where id = new.comunicacao_id;
  if new.caso_id is null then
    raise exception 'casos_comunicacoes_anexos: comunicação inexistente' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger casos_comunicacoes_anexos_caso before insert on public.casos_comunicacoes_anexos
  for each row execute function public.casos_comunicacoes_anexos_caso();
create trigger casos_comunicacoes_anexos_so_insercao before update on public.casos_comunicacoes_anexos
  for each row execute function public.casos_textos_so_insercao();

-- ---------------------------------------------------------------------------
-- 8. Análise preliminar pela IA (interna; nunca decide)
-- ---------------------------------------------------------------------------
create table public.casos_analises_ia (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  comunicacao_id uuid not null references public.casos_comunicacoes_recebidas (id) on delete cascade,
  estado text not null default 'a_gerar' check (estado in ('a_gerar', 'gerado', 'falhou')),
  origem text not null check (origem in ('automatico', 'manual')),
  pedido_por uuid references public.utilizadores (id) on delete set null,
  modelo text check (char_length(modelo) <= 80),
  prompt_versao text not null check (char_length(prompt_versao) <= 40),
  schema_versao text not null check (char_length(schema_versao) <= 40),
  contexto_sha256 text check (contexto_sha256 ~ '^[0-9a-f]{64}$'),
  resposta jsonb check (resposta is null or jsonb_typeof(resposta) = 'object'),
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
comment on table public.casos_analises_ia is
  'Análise preliminar de uma comunicação recebida pela Claude API (auditoria). Só uso interno da DoLado: o cliente nunca a lê. Sem o contexto enviado (só o hash).';
create index casos_analises_ia_comunicacao_idx on public.casos_analises_ia (comunicacao_id, created_at desc);
create unique index casos_analises_ia_uma_em_curso on public.casos_analises_ia (comunicacao_id) where estado = 'a_gerar';

create or replace function public.casos_analises_ia_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'a_gerar' or new.resposta is not null then
      raise exception 'casos_analises_ia: uma análise nasce "a_gerar"' using errcode = '42501';
    end if;
    return new;
  end if;
  if old.estado <> 'a_gerar' then
    if (to_jsonb(new) - 'pedido_por') is distinct from (to_jsonb(old) - 'pedido_por')
       or (new.pedido_por is distinct from old.pedido_por and new.pedido_por is not null) then
      raise exception 'casos_analises_ia: análise concluída é imutável' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.id <> old.id or new.caso_id <> old.caso_id or new.comunicacao_id <> old.comunicacao_id or new.origem <> old.origem
     or new.prompt_versao <> old.prompt_versao or new.schema_versao <> old.schema_versao or new.created_at <> old.created_at then
    raise exception 'casos_analises_ia: identificação imutável' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger casos_analises_ia_integridade before insert or update on public.casos_analises_ia
  for each row execute function public.casos_analises_ia_integridade();

-- ---------------------------------------------------------------------------
-- 9. Pedidos de informação ao cliente
-- ---------------------------------------------------------------------------
create table public.casos_pedidos_cliente (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  comunicacao_id uuid references public.casos_comunicacoes_recebidas (id) on delete set null,
  pedido text not null check (char_length(pedido) between 3 and 2000),
  instrucoes text check (char_length(instrucoes) <= 2000),
  prazo date,
  criado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  estado text not null default 'aberto' check (estado in ('aberto', 'respondido', 'cancelado')),
  respondido_em timestamptz,
  resposta_texto text check (char_length(resposta_texto) <= 5000),
  -- Só nomes e tamanhos dos ficheiros enviados (os ficheiros estão em anexos).
  resposta_anexos jsonb not null default '[]'::jsonb check (jsonb_typeof(resposta_anexos) = 'array'),
  check ((estado = 'respondido') = (respondido_em is not null))
);
comment on table public.casos_pedidos_cliente is
  'Informação ou documentos pedidos ao cliente (ex.: a empresa pediu a fatura de setembro). O cliente responde no portal.';
create unique index casos_pedidos_cliente_um_aberto on public.casos_pedidos_cliente (caso_id) where estado = 'aberto';

create or replace function public.casos_pedidos_cliente_integridade()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.caso_id <> old.caso_id or new.pedido <> old.pedido or new.instrucoes is distinct from old.instrucoes
     or new.prazo is distinct from old.prazo or new.created_at <> old.created_at
     or (new.comunicacao_id is distinct from old.comunicacao_id and new.comunicacao_id is not null)
     or (new.criado_por is distinct from old.criado_por and new.criado_por is not null)
     or old.estado <> 'aberto' and (new.estado <> old.estado or new.resposta_texto is distinct from old.resposta_texto
        or new.resposta_anexos <> old.resposta_anexos or new.respondido_em is distinct from old.respondido_em) then
    raise exception 'casos_pedidos_cliente: pedido imutável (só a resposta é registada, uma vez)' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger casos_pedidos_cliente_integridade before update on public.casos_pedidos_cliente
  for each row execute function public.casos_pedidos_cliente_integridade();

alter table public.anexos
  add column pedido_cliente_id uuid references public.casos_pedidos_cliente (id) on delete set null;
comment on column public.anexos.pedido_cliente_id is 'Ficheiro enviado pelo cliente em resposta a um pedido de informação.';

-- ---------------------------------------------------------------------------
-- 10. Decisões depois da análise (humanas; só inserção)
-- ---------------------------------------------------------------------------
create table public.casos_analises (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  comunicacao_id uuid references public.casos_comunicacoes_recebidas (id) on delete set null,
  analise_ia_id uuid references public.casos_analises_ia (id) on delete set null,
  decisao text not null check (decisao in (
    'mensagem_sem_acao', 'resolucao_proposta', 'preparar_nova_resposta', 'pedir_informacao_cliente', 'encaminhar')),
  classificacao text check (classificacao in (
    'resposta_automatica', 'confirmacao_rececao', 'pedido_informacao', 'pedido_documentos', 'resposta_satisfatoria',
    'resposta_parcial', 'resposta_negativa', 'proposta_resolucao', 'mensagem_irrelevante', 'necessita_revisao_manual')),
  -- Análise da DoLado (interna), editada ou escrita por uma pessoa.
  resumo text check (char_length(resumo) <= 8000),
  -- Explicação ao cliente (só nas decisões que a pedem).
  mensagem_cliente text check (char_length(mensagem_cliente) <= 2000),
  tipo_encaminhamento text references public.tipos_encaminhamento (codigo),
  pedido_cliente_id uuid references public.casos_pedidos_cliente (id) on delete set null,
  estado_anterior text not null,
  estado_novo text not null,
  decidido_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  check (decisao <> 'encaminhar' or tipo_encaminhamento is not null),
  check (decisao <> 'resolucao_proposta' or mensagem_cliente is not null)
);
comment on table public.casos_analises is
  'Decisão humana depois de analisar uma comunicação (ou a situação do caso). A sugestão da IA nunca decide: fica em casos_analises_ia.';
create index casos_analises_caso_idx on public.casos_analises (caso_id, created_at);

create or replace function public.casos_analises_so_insercao()
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
       and not (k = any (array['comunicacao_id', 'analise_ia_id', 'pedido_cliente_id', 'decidido_por']) and n->k = 'null'::jsonb) then
      raise exception 'casos_analises: registo só de inserção' using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;
create trigger casos_analises_so_insercao before update on public.casos_analises
  for each row execute function public.casos_analises_so_insercao();

-- ---------------------------------------------------------------------------
-- 11. Registo técnico do webhook (observabilidade, sem dados pessoais)
-- ---------------------------------------------------------------------------
create table public.comunicacoes_inbound_registos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null check (provider in ('brevo')),
  provider_event_id text check (char_length(provider_event_id) <= 200),
  resultado text not null check (resultado in ('aceite', 'duplicado', 'rejeitado', 'erro')),
  motivo text check (char_length(motivo) <= 60),
  caso_id uuid references public.casos (id) on delete set null,
  comunicacao_id uuid references public.casos_comunicacoes_recebidas (id) on delete set null
);
comment on table public.comunicacoes_inbound_registos is
  'Cada item do webhook de receção: aceite, duplicado, rejeitado (motivo) ou erro. Sem endereços, assuntos nem conteúdo. Apagado aos 90 dias.';
create index comunicacoes_inbound_registos_data_idx on public.comunicacoes_inbound_registos (created_at);

create or replace function public.limpar_comunicacoes_inbound_registos()
returns integer
language sql
set search_path = ''
as $$
  with apagados as (
    delete from public.comunicacoes_inbound_registos where created_at < now() - interval '90 days' returning 1
  )
  select count(*)::int from apagados;
$$;

select cron.schedule(
  'limpar-registos-inbound',
  '50 3 * * *',
  $$select public.limpar_comunicacoes_inbound_registos()$$
);

-- ---------------------------------------------------------------------------
-- 12. Funções do fluxo (só o backend, com service_role)
-- ---------------------------------------------------------------------------

-- Envio ao terceiro (substitui a versão anterior): referência, base de prazo
-- e passagem a "A aguardar resposta da empresa" também depois de uma nova
-- comunicação. Regras de autorização iguais (triggers de 20261001180000).
drop function public.texto_registar_envio(uuid, text, text, text, text, uuid, timestamptz);
create function public.texto_registar_envio(
  p_texto_id uuid,
  p_conteudo_sha256 text,
  p_destinatario text,
  p_canal text,
  p_resultado text,
  p_admin uuid,
  p_em timestamptz default now(),
  p_referencia text default null,
  p_prazo_resposta_em date default null,
  p_prazo_resposta_base text default null
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v public.casos_textos;
  a public.casos_textos_autorizacoes;
  c record;
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
  if p_prazo_resposta_em is not null and nullif(btrim(coalesce(p_prazo_resposta_base, '')), '') is null then
    return jsonb_build_object('resultado', 'prazo_sem_base');
  end if;

  select id, status into c from public.casos where id = v.caso_id for update;

  insert into public.casos_textos_envios (caso_id, texto_id, autorizacao_id, conteudo_sha256, destinatario, canal, resultado, enviado_por, enviado_em,
    referencia, prazo_resposta_em, prazo_resposta_base)
  values (v.caso_id, v.id, a.id, v.conteudo_sha256, btrim(p_destinatario), p_canal, nullif(btrim(coalesce(p_resultado, '')), ''), p_admin, p_em,
    nullif(btrim(coalesce(p_referencia, '')), ''), p_prazo_resposta_em, nullif(btrim(coalesce(p_prazo_resposta_base, '')), ''));
  update public.casos_textos set estado = 'enviado', enviado_em = p_em where id = v.id;
  insert into public.casos_eventos (caso_id, tipo, texto_id, versao, ator) values (v.caso_id, 'comunicacao_enviada', v.id, v.versao, 'equipa');

  -- O caso passa a aguardar a resposta da empresa (nunca a "concluído").
  perform public.caso__ator('equipa', p_admin);
  update public.casos
     set data_envio_reclamacao = coalesce(data_envio_reclamacao, (p_em at time zone 'Europe/Lisbon')::date),
         status = case when status in ('Novo', 'Em investigação', 'Resposta em análise', 'Aguardando cliente', 'Bloqueado')
                       then 'Aguardando operador' else status end
   where id = v.caso_id;
  if c.status in ('Novo', 'Em investigação', 'Resposta em análise', 'Aguardando cliente', 'Bloqueado', 'Aguardando operador') then
    insert into public.casos_eventos (caso_id, tipo, ator) values (v.caso_id, 'aguarda_resposta_empresa', 'sistema');
  end if;
  return jsonb_build_object('resultado', 'enviado', 'enviado_em', p_em);
end $$;

-- Sugestão da IA também para uma nova comunicação depois de um envio: a
-- versão enviada fica como está (nunca "substituida") e a sugestão entra
-- como versão seguinte, por rever.
alter table public.casos_rascunhos_ia
  add column finalidade text not null default 'reclamacao' check (finalidade in ('reclamacao', 'nova_comunicacao'));
comment on column public.casos_rascunhos_ia.finalidade is 'reclamacao = primeira reclamação; nova_comunicacao = resposta à empresa depois de uma comunicação recebida.';

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

  perform 1 from public.casos where id = r.caso_id for update;
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

  if v.id is not null and v.estado <> 'enviado' then
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
  return jsonb_build_object('resultado', 'aplicado', 'texto_id', v_id, 'versao', coalesce(v.versao, 0) + 1);
end $$;

drop function public.rascunho_ia_iniciar(uuid, text, uuid, text, text);
create function public.rascunho_ia_iniciar(
  p_caso_id uuid,
  p_origem text,
  p_admin uuid,
  p_prompt_versao text,
  p_schema_versao text,
  p_finalidade text default 'reclamacao'
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
  -- Nova comunicação: só depois de um envio e com pedido de uma pessoa.
  if p_finalidade = 'nova_comunicacao' and (
    p_origem <> 'manual' or not exists (select 1 from public.casos_textos_envios where caso_id = p_caso_id)
  ) then
    return null;
  end if;

  insert into public.casos_rascunhos_ia (caso_id, origem, pedido_por, prompt_versao, schema_versao, finalidade)
  values (p_caso_id, p_origem, p_admin, p_prompt_versao, p_schema_versao, p_finalidade)
  returning id into v_id;
  return v_id;
end $$;

-- Correção manual do estado (admin, com motivo). Fica no histórico de
-- estados como correção e na cronologia interna.
create or replace function public.caso_corrigir_estado(p_caso_id uuid, p_para text, p_motivo text, p_admin uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c record;
  m text := btrim(coalesce(p_motivo, ''));
begin
  if p_admin is null or char_length(m) < 5 or char_length(m) > 500 then
    return jsonb_build_object('resultado', 'motivo_invalido');
  end if;
  select id, status into c from public.casos where id = p_caso_id for update;
  if c.id is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if c.status = p_para then
    return jsonb_build_object('resultado', 'sem_alteracao');
  end if;
  perform public.caso__ator('equipa', p_admin);
  perform set_config('dolado.correcao_estado', 'on', true);
  perform set_config('dolado.motivo_estado', m, true);
  update public.casos set status = p_para where id = p_caso_id;
  perform set_config('dolado.correcao_estado', '', true);
  perform set_config('dolado.motivo_estado', '', true);
  insert into public.casos_eventos (caso_id, tipo, ator, visivel_cliente, dados)
  values (p_caso_id, 'estado_corrigido', 'equipa', false, jsonb_build_object('de', c.status, 'para', p_para));
  return jsonb_build_object('resultado', 'ok', 'estado', p_para);
end $$;

-- Regista uma comunicação recebida (e-mail ou registo manual). Atómica e
-- idempotente: o mesmo evento (provider + provider_event_id) ou o mesmo
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
  v_event text := nullif(p_dados->>'provider_event_id', '');
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
   where (v_event is not null and provider = p_dados->>'provider' and provider_event_id = v_event)
      or (v_msg is not null and caso_id = p_caso_id and message_id = v_msg)
   limit 1;
  if v_id is not null then
    return jsonb_build_object('resultado', 'duplicada', 'comunicacao_id', v_id);
  end if;

  v_transita := c.status = 'Aguardando operador' and not v_spam;

  insert into public.casos_comunicacoes_recebidas (
    caso_id, origem, canal, provider, provider_event_id, message_id, in_reply_to, referencias,
    remetente_email, remetente_nome, destinatario, para, cc, assunto, corpo_texto, corpo_html, corpo_apresentacao,
    truncado, cabecalhos, data_mensagem, spam_score, automatica, suspeita_spam, tamanho_bytes, registado_por,
    estado_caso_na_rececao, transitou, anexos_processados_em)
  values (
    p_caso_id, v_origem, coalesce(p_dados->>'canal', 'email'), nullif(p_dados->>'provider', ''), v_event, v_msg,
    nullif(p_dados->>'in_reply_to', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_dados->'referencias', '[]'::jsonb)) x), '{}'),
    nullif(p_dados->>'remetente_email', ''), nullif(p_dados->>'remetente_nome', ''), nullif(p_dados->>'destinatario', ''),
    coalesce(p_dados->'para', '[]'::jsonb), coalesce(p_dados->'cc', '[]'::jsonb), nullif(p_dados->>'assunto', ''),
    nullif(p_dados->>'corpo_texto', ''), nullif(p_dados->>'corpo_html', ''), nullif(p_dados->>'corpo_apresentacao', ''),
    coalesce((p_dados->>'truncado')::boolean, false), coalesce(p_dados->'cabecalhos', '{}'::jsonb),
    nullif(p_dados->>'data_mensagem', '')::timestamptz, nullif(p_dados->>'spam_score', '')::numeric,
    coalesce((p_dados->>'automatica')::boolean, false), v_spam, nullif(p_dados->>'tamanho_bytes', '')::int,
    case when v_origem = 'manual' then p_admin end,
    c.status, v_transita,
    case when coalesce((p_dados->>'sem_anexos')::boolean, false) then now() end)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- Corrida com um pedido igual: o outro registou.
    select id into v_id from public.casos_comunicacoes_recebidas
     where (v_event is not null and provider = p_dados->>'provider' and provider_event_id = v_event)
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

-- Decisão humana depois da análise (as ações A–E). Valida o estado, a
-- comunicação e a transição; regista a decisão, a cronologia e, quando é o
-- caso, o pedido ao cliente.
create or replace function public.caso_decidir_analise(
  p_caso_id uuid,
  p_comunicacao_id uuid,
  p_decisao text,
  p_classificacao text,
  p_resumo text,
  p_mensagem_cliente text,
  p_tipo_encaminhamento text,
  p_pedido text,
  p_instrucoes text,
  p_prazo date,
  p_analise_ia_id uuid,
  p_admin uuid
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c record;
  com public.casos_comunicacoes_recebidas;
  t public.tipos_encaminhamento;
  v_novo text;
  v_pedido uuid;
  v_analise uuid;
  v_msg text := nullif(btrim(coalesce(p_mensagem_cliente, '')), '');
  v_resumo text := nullif(btrim(coalesce(p_resumo, '')), '');
begin
  if p_admin is null or p_decisao not in ('mensagem_sem_acao', 'resolucao_proposta', 'preparar_nova_resposta', 'pedir_informacao_cliente', 'encaminhar') then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select id, status into c from public.casos where id = p_caso_id for update;
  if c.id is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if p_comunicacao_id is not null then
    select * into com from public.casos_comunicacoes_recebidas where id = p_comunicacao_id for update;
    if com.id is null or com.caso_id <> p_caso_id then
      return jsonb_build_object('resultado', 'comunicacao_invalida');
    end if;
    if com.estado_analise <> 'por_analisar' then
      return jsonb_build_object('resultado', 'ja_analisada');
    end if;
  elsif p_decisao = 'mensagem_sem_acao' then
    return jsonb_build_object('resultado', 'comunicacao_invalida');
  end if;
  if p_analise_ia_id is not null and not exists (
    select 1 from public.casos_analises_ia where id = p_analise_ia_id and comunicacao_id = p_comunicacao_id
  ) then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if p_decisao = 'mensagem_sem_acao' then
    v_novo := case
      when c.status = 'Resposta em análise' and com.transitou
           and not exists (select 1 from public.casos_comunicacoes_recebidas
                            where caso_id = p_caso_id and estado_analise = 'por_analisar' and id <> com.id)
      then 'Aguardando operador' else c.status end;
  elsif p_decisao = 'resolucao_proposta' then
    if v_msg is null then return jsonb_build_object('resultado', 'falta_mensagem_cliente'); end if;
    v_novo := 'Aguardando decisão cliente';
  elsif p_decisao = 'preparar_nova_resposta' then
    v_novo := 'Em investigação';
  elsif p_decisao = 'pedir_informacao_cliente' then
    if char_length(btrim(coalesce(p_pedido, ''))) < 3 then return jsonb_build_object('resultado', 'falta_pedido'); end if;
    v_novo := 'Aguardando cliente';
  else
    select * into t from public.tipos_encaminhamento where codigo = p_tipo_encaminhamento and ativo;
    if t.codigo is null then return jsonb_build_object('resultado', 'encaminhamento_invalido'); end if;
    v_novo := t.estado_resultante;
    v_msg := coalesce(v_msg, t.descricao_cliente);
  end if;

  if not public.caso_transicao_permitida(c.status, v_novo) then
    return jsonb_build_object('resultado', 'transicao_invalida', 'estado', c.status);
  end if;

  if p_comunicacao_id is not null then
    update public.casos_comunicacoes_recebidas
       set estado_analise = case when p_decisao = 'mensagem_sem_acao' then 'sem_acao' else 'analisada' end,
           classificacao = p_classificacao, analisada_em = now(), analisada_por = p_admin
     where id = p_comunicacao_id;
  end if;

  if p_decisao = 'pedir_informacao_cliente' then
    update public.casos_pedidos_cliente set estado = 'cancelado' where caso_id = p_caso_id and estado = 'aberto';
    insert into public.casos_pedidos_cliente (caso_id, comunicacao_id, pedido, instrucoes, prazo, criado_por)
    values (p_caso_id, p_comunicacao_id, btrim(p_pedido), nullif(btrim(coalesce(p_instrucoes, '')), ''), p_prazo, p_admin)
    returning id into v_pedido;
  end if;

  insert into public.casos_analises (caso_id, comunicacao_id, analise_ia_id, decisao, classificacao, resumo, mensagem_cliente,
    tipo_encaminhamento, pedido_cliente_id, estado_anterior, estado_novo, decidido_por)
  values (p_caso_id, p_comunicacao_id, p_analise_ia_id, p_decisao, p_classificacao, v_resumo,
    case when p_decisao in ('resolucao_proposta', 'encaminhar') then v_msg end,
    case when p_decisao = 'encaminhar' then t.codigo end, v_pedido, c.status, v_novo, p_admin)
  returning id into v_analise;

  if v_novo <> c.status then
    perform public.caso__ator('equipa', p_admin);
    update public.casos set status = v_novo where id = p_caso_id;
  end if;

  if p_decisao = 'mensagem_sem_acao' then
    insert into public.casos_eventos (caso_id, tipo, ator, comunicacao_id, visivel_cliente)
    values (p_caso_id, 'mensagem_sem_acao', 'equipa', p_comunicacao_id, false);
    if v_novo = 'Aguardando operador' then
      insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'aguarda_resposta_empresa', 'sistema');
    end if;
  else
    insert into public.casos_eventos (caso_id, tipo, ator, comunicacao_id) values (p_caso_id, 'analise_concluida', 'equipa', p_comunicacao_id);
    if p_decisao = 'resolucao_proposta' then
      insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'solucao_apresentada', 'equipa');
    elsif p_decisao = 'pedir_informacao_cliente' then
      insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'pedido_informacao_cliente', 'equipa');
    elsif p_decisao = 'encaminhar' then
      insert into public.casos_eventos (caso_id, tipo, ator, dados)
      values (p_caso_id, 'encaminhamento_registado', 'equipa', jsonb_build_object('tipo', t.codigo, 'rotulo', t.rotulo));
      if v_novo = 'Encerrado sem resolução' then
        insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'caso_encerrado', 'equipa');
      end if;
    end if;
  end if;

  return jsonb_build_object('resultado', 'ok', 'estado', v_novo, 'analise_id', v_analise, 'pedido_id', v_pedido);
end $$;

-- Confirmação da resolução: pelo cliente (portal, p_utilizador = dono) ou
-- registada pela equipa (p_admin, ex.: confirmação por telefone).
create or replace function public.caso_confirmar_resolucao(
  p_caso_id uuid,
  p_utilizador uuid,
  p_resolvido boolean,
  p_admin uuid default null
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c record;
  v_ator text := case when p_admin is not null then 'equipa' else 'cliente' end;
begin
  if (p_utilizador is null) = (p_admin is null) or p_resolvido is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select id, status, utilizador_id into c from public.casos where id = p_caso_id for update;
  if c.id is null or (p_utilizador is not null and c.utilizador_id is distinct from p_utilizador) then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  if c.status <> 'Aguardando decisão cliente' then
    return jsonb_build_object('resultado', 'estado_invalido', 'estado', c.status);
  end if;

  perform public.caso__ator(v_ator, coalesce(p_admin, p_utilizador));
  if p_resolvido then
    update public.casos set status = 'Resolvido', tipo_abc = 'A' where id = p_caso_id;
    insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'cliente_confirmou_resolucao', v_ator);
    return jsonb_build_object('resultado', 'ok', 'estado', 'Resolvido');
  end if;
  update public.casos set status = 'Resposta em análise', tipo_abc = 'B' where id = p_caso_id;
  insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'cliente_rejeitou_resolucao', v_ator);
  insert into public.casos_eventos (caso_id, tipo, ator) values (p_caso_id, 'em_analise_dolado', 'sistema');
  return jsonb_build_object('resultado', 'ok', 'estado', 'Resposta em análise');
end $$;

-- Resposta do cliente a um pedido de informação (portal). Antes do envio da
-- reclamação, o caso volta à preparação; depois, à análise.
create or replace function public.pedido_cliente_responder(
  p_pedido_id uuid,
  p_utilizador uuid,
  p_texto text,
  p_anexos jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  p public.casos_pedidos_cliente;
  c record;
  v_texto text := nullif(btrim(coalesce(p_texto, '')), '');
  v_novo text;
begin
  if p_utilizador is null or (v_texto is null and jsonb_array_length(coalesce(p_anexos, '[]'::jsonb)) = 0) then
    return jsonb_build_object('resultado', 'vazio');
  end if;
  if char_length(coalesce(v_texto, '')) > 5000 then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select * into p from public.casos_pedidos_cliente where id = p_pedido_id;
  if p.id is null then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select id, status, utilizador_id into c from public.casos where id = p.caso_id for update;
  if c.utilizador_id is distinct from p_utilizador then
    return jsonb_build_object('resultado', 'invalido');
  end if;
  select * into p from public.casos_pedidos_cliente where id = p_pedido_id for update;
  if p.estado <> 'aberto' then
    return jsonb_build_object('resultado', 'ja_respondido');
  end if;

  update public.casos_pedidos_cliente
     set estado = 'respondido', respondido_em = now(), resposta_texto = v_texto, resposta_anexos = coalesce(p_anexos, '[]'::jsonb)
   where id = p.id;

  v_novo := case when exists (select 1 from public.casos_textos_envios where caso_id = c.id)
                 then 'Resposta em análise' else 'Em investigação' end;
  insert into public.casos_eventos (caso_id, tipo, ator) values (c.id, 'informacao_cliente_enviada', 'cliente');
  if c.status = 'Aguardando cliente' then
    perform public.caso__ator('cliente', p_utilizador);
    update public.casos set status = v_novo where id = c.id;
    if v_novo = 'Resposta em análise' then
      insert into public.casos_eventos (caso_id, tipo, ator) values (c.id, 'em_analise_dolado', 'sistema');
    end if;
  end if;
  return jsonb_build_object('resultado', 'ok', 'caso_id', c.id, 'estado', case when c.status = 'Aguardando cliente' then v_novo else c.status end);
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
  select id, caso_id into com from public.casos_comunicacoes_recebidas where id = p_comunicacao_id for update;
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
  insert into public.casos_analises_ia (caso_id, comunicacao_id, origem, pedido_por, prompt_versao, schema_versao)
  values (com.caso_id, p_comunicacao_id, p_origem, p_admin, p_prompt_versao, p_schema_versao)
  returning id into v_id;
  return v_id;
end $$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'caso__ator(text, uuid)',
    'texto_registar_envio(uuid, text, text, text, text, uuid, timestamptz, text, date, text)',
    'texto_aplicar_rascunho_ia(uuid, uuid, boolean)',
    'rascunho_ia_iniciar(uuid, text, uuid, text, text, text)',
    'caso_corrigir_estado(uuid, text, text, uuid)',
    'comunicacao_registar_recebida(uuid, jsonb, uuid)',
    'caso_decidir_analise(uuid, uuid, text, text, text, text, text, text, text, date, uuid, uuid)',
    'caso_confirmar_resolucao(uuid, uuid, boolean, uuid)',
    'pedido_cliente_responder(uuid, uuid, text, jsonb)',
    'analise_ia_iniciar(uuid, text, uuid, text, text)',
    'limpar_comunicacoes_inbound_registos()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 13. RLS: o cliente só vê o que é seu e só o que precisa; o admin lê; só o
--     servidor escreve (funções acima).
-- ---------------------------------------------------------------------------
alter table public.casos_estados_historico enable row level security;
alter table public.casos_enderecos_resposta enable row level security;
alter table public.casos_comunicacoes_recebidas enable row level security;
alter table public.casos_comunicacoes_anexos enable row level security;
alter table public.casos_analises_ia enable row level security;
alter table public.casos_pedidos_cliente enable row level security;
alter table public.casos_analises enable row level security;
alter table public.comunicacoes_inbound_registos enable row level security;

create policy "Admin lê o histórico de estados" on public.casos_estados_historico for select to authenticated using (public.is_admin());
create policy "Admin lê os endereços de respostas" on public.casos_enderecos_resposta for select to authenticated using (public.is_admin());
-- Mensagens recebidas e anexos: só a DoLado (o cliente vê o estado, o próximo
-- passo e a cronologia — nunca cabeçalhos, endereços técnicos nem a análise).
create policy "Admin lê comunicações recebidas" on public.casos_comunicacoes_recebidas for select to authenticated using (public.is_admin());
create policy "Admin lê anexos de comunicações" on public.casos_comunicacoes_anexos for select to authenticated using (public.is_admin());
create policy "Admin lê análises da IA" on public.casos_analises_ia for select to authenticated using (public.is_admin());
create policy "Admin lê registos do webhook" on public.comunicacoes_inbound_registos for select to authenticated using (public.is_admin());

create policy "Cliente vê os pedidos de informação dos próprios casos" on public.casos_pedidos_cliente
  for select to authenticated using (exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid()));
create policy "Admin lê pedidos de informação" on public.casos_pedidos_cliente for select to authenticated using (public.is_admin());

create policy "Cliente vê as decisões comunicadas dos próprios casos" on public.casos_analises
  for select to authenticated using (
    decisao in ('resolucao_proposta', 'encaminhar', 'pedir_informacao_cliente')
    and exists (select 1 from public.casos c where c.id = caso_id and c.utilizador_id = auth.uid())
  );
create policy "Admin lê decisões" on public.casos_analises for select to authenticated using (public.is_admin());

revoke all on public.casos_estados_historico, public.casos_enderecos_resposta, public.casos_comunicacoes_recebidas,
  public.casos_comunicacoes_anexos, public.casos_analises_ia, public.casos_pedidos_cliente, public.casos_analises,
  public.comunicacoes_inbound_registos from anon, authenticated;
grant select on public.casos_estados_historico, public.casos_enderecos_resposta, public.casos_comunicacoes_recebidas,
  public.casos_comunicacoes_anexos, public.casos_analises_ia, public.comunicacoes_inbound_registos to authenticated;
-- Pedidos: sem a ligação à comunicação nem quem criou.
grant select (id, caso_id, pedido, instrucoes, prazo, created_at, estado, respondido_em, resposta_texto, resposta_anexos)
  on public.casos_pedidos_cliente to authenticated;
-- Decisões: só o que é dito ao cliente (sem a análise interna, a
-- classificação, a sugestão da IA nem quem decidiu). O admin lê o resto com
-- a service role, depois de requireAdmin.
grant select (id, caso_id, decisao, mensagem_cliente, tipo_encaminhamento, created_at)
  on public.casos_analises to authenticated;
