-- DoLado — Programa de Parceiros, Fase 1 (base de dados)
--
-- Especificação e decisões: docs/especificacoes/PROGRAMA_PARCEIROS_FASE1.md
--
-- Dois modelos, ligados só pela tabela parceiros:
--   1. Parceiro de Indicação — código próprio (mesmo espaço de /r/<código>
--      dos amigos, ou escrito pelo cliente), atribuição first-touch de 30 dias,
--      comissão fixa B2C depois de N mensalidades pagas (> 0 €) da primeira
--      subscrição; oportunidades B2B com comissão sobre a receita recebida no
--      1.º ano. Pagamento das comissões sempre manual (backoffice).
--   2. Parceiro de Distribuição — pacotes pré-pagos de Protecção, códigos de
--      activação individuais (guardados só como hash), acesso patrocinado sem
--      Stripe (sem Customer, subscrição nem fatura) que termina sozinho.
--
-- Regras transversais:
--   - Nenhuma tabela é escrita pela API: só as funções parceiro_* /
--     acesso_patrocinado_* (service_role). O cliente só lê o próprio acesso
--     patrocinado; tudo o resto é só do admin.
--   - Uma conta só tem UMA atribuição: amigo (indicacoes) ou parceiro
--     (parceiros_atribuicoes), a primeira válida, para sempre. Decisão de
--     Thiago (20/10/2026): o cliente indicado por um parceiro não tem desconto.
--   - Comissões: máquina de estados na base de dados (também para a
--     service_role), histórico só de inserção, uma comissão B2C por conta,
--     uma fatura conta uma vez, pagamento único por comissão.
--   - Acesso patrocinado: recusado a quem já tem subscrição paga activa e
--     conta como "já teve Protecção" para a Protecção gratuita de 30 dias
--     (decisões de Thiago, 20/10/2026).
--   - Sem IP, sem dados de casos, faturas ou documentos dos clientes.

-- ---------------------------------------------------------------------------
-- 0. Ator das alterações (histórico): as funções gravam o admin em
-- dolado.ator (só nesta transação).
-- ---------------------------------------------------------------------------
create or replace function public.parceiros_ator()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('dolado.ator', true), '')::uuid;
$$;

revoke execute on function public.parceiros_ator() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Candidaturas
-- ---------------------------------------------------------------------------
create table public.parceiros_candidaturas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  empresa text check (empresa is null or char_length(empresa) <= 160),
  tipo_pretendido text not null check (tipo_pretendido in ('indicacao', 'distribuicao', 'ambos')),
  descricao text not null check (char_length(btrim(descricao)) between 10 and 2000),
  -- Prova da aceitação das condições do programa e da informação de privacidade.
  condicoes_versao text not null,
  texto_aceite text not null,
  idioma text not null default 'pt-PT' check (idioma in ('pt-PT', 'en-GB')),
  estado text not null default 'pendente' check (estado in ('pendente', 'aprovada', 'rejeitada')),
  motivo text check (motivo is null or char_length(motivo) <= 1000),
  decidido_por uuid references public.utilizadores (id) on delete set null,
  decidido_em timestamptz,
  parceiro_id uuid,
  created_at timestamptz not null default now(),
  check ((estado = 'pendente') = (decidido_em is null))
);

comment on table public.parceiros_candidaturas is
  'Candidaturas ao Programa de Parceiros (/parceiros). Escrita só por parceiro_candidatura_*; só o admin lê. Rejeitadas apagadas 12 meses depois da decisão.';

create index parceiros_candidaturas_estado_idx on public.parceiros_candidaturas (estado, created_at);

-- ---------------------------------------------------------------------------
-- 2. Parceiros e condições comerciais (versionadas)
-- ---------------------------------------------------------------------------
create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  indicacao boolean not null default false,
  distribuicao boolean not null default false,
  nome text not null check (char_length(btrim(nome)) between 2 and 160),
  contacto_nome text check (contacto_nome is null or char_length(contacto_nome) <= 120),
  contacto_email text check (contacto_email is null or (contacto_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contacto_email) <= 254)),
  estado text not null default 'em_negociacao'
    check (estado in ('em_negociacao', 'ativo', 'suspenso', 'encerrado')),
  data_inicio date,
  -- Conta DoLado do próprio parceiro, se tiver (só para recusar auto-indicações).
  user_id uuid references public.utilizadores (id) on delete set null,
  candidatura_id uuid references public.parceiros_candidaturas (id) on delete set null,
  notas text check (notas is null or char_length(notas) <= 4000),
  -- Admin que fez a última alteração direta (vai para o histórico).
  alterado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (indicacao or distribuicao)
);

comment on table public.parceiros is
  'Parceiros comerciais (indicação e/ou distribuição). Nunca têm acesso à plataforma na Fase 1. Só o admin lê.';

alter table public.parceiros_candidaturas
  add constraint parceiros_candidaturas_parceiro_fk
  foreign key (parceiro_id) references public.parceiros (id) on delete set null;

create trigger set_updated_at before update on public.parceiros
  for each row execute function public.set_updated_at();

-- Condições do Parceiro de Indicação. Só inserção: mudar = nova versão a
-- partir de uma data. As comissões guardam a versão usada.
create table public.parceiros_condicoes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete cascade,
  valido_desde timestamptz not null default now(),
  -- Comissão fixa por produto (cêntimos, SEM IVA; acresce o IVA do parceiro, se aplicável).
  comissao_protecao_cents int not null default 500 check (comissao_protecao_cents between 0 and 100000),
  comissao_caso_protecao_cents int not null default 800 check (comissao_caso_protecao_cents between 0 and 100000),
  -- Mensalidades pagas (> 0 €) da primeira subscrição para a comissão B2C ficar elegível.
  mensalidades_necessarias int not null default 3 check (mensalidades_necessarias between 1 and 24),
  -- B2B: percentagem sobre a receita elegível (sem IVA, menos reembolsos) do 1.º ano.
  b2b_percentagem numeric(5, 2) not null default 10 check (b2b_percentagem between 0 and 20),
  -- Referência para o pagamento (não bloqueia; o admin decide).
  minimo_pagamento_cents int not null default 2500 check (minimo_pagamento_cents >= 0),
  nota text check (nota is null or char_length(nota) <= 1000),
  criado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (parceiro_id, valido_desde)
);

comment on table public.parceiros_condicoes is
  'Condições comerciais do Parceiro de Indicação (versões, só inserção). Valores iniciais: 5 € Protecção, 8 € Caso + Protecção, 3 mensalidades, 10 % B2B, mínimo 25 €.';

create or replace function public.parceiros_condicao_atual(p_parceiro uuid, p_em timestamptz default now())
returns uuid
language sql
stable
set search_path = ''
as $$
  select c.id from public.parceiros_condicoes c
   where c.parceiro_id = p_parceiro and c.valido_desde <= p_em
   order by c.valido_desde desc
   limit 1;
$$;

revoke execute on function public.parceiros_condicao_atual(uuid, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Histórico (só inserção) de todas as alterações comerciais
-- ---------------------------------------------------------------------------
create table public.parceiros_historico (
  id bigint generated always as identity primary key,
  parceiro_id uuid,
  entidade text not null,
  entidade_id uuid not null,
  acao text not null check (acao in ('criado', 'alterado')),
  alteracoes jsonb not null,
  por uuid,
  em timestamptz not null default now()
);

comment on table public.parceiros_historico is
  'Histórico só de inserção das alterações a parceiros, condições, oportunidades, pacotes, códigos, comissões e pagamentos (sem dados de clientes).';

create index parceiros_historico_idx on public.parceiros_historico (entidade, entidade_id, em);
create index parceiros_historico_parceiro_idx on public.parceiros_historico (parceiro_id, em);

create or replace function public.parceiros_registar_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_novo jsonb := to_jsonb(new);
  v_antigo jsonb;
  v_diff jsonb;
  v_parceiro uuid;
begin
  -- Nunca guardar hashes de códigos nem campos técnicos no histórico.
  v_novo := v_novo - 'codigo_hash' - 'updated_at' - 'created_at';
  v_parceiro := case
    when tg_table_name = 'parceiros' then new.id
    else nullif(v_novo ->> 'parceiro_id', '')::uuid
  end;

  if tg_op = 'INSERT' then
    v_diff := v_novo;
  else
    v_antigo := to_jsonb(old) - 'codigo_hash' - 'updated_at' - 'created_at';
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('de', v_antigo -> n.key, 'para', n.value)), '{}'::jsonb)
      into v_diff
      from jsonb_each(v_novo) n
     where (v_antigo -> n.key) is distinct from n.value;
    if v_diff = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into public.parceiros_historico (parceiro_id, entidade, entidade_id, acao, alteracoes, por)
  values (v_parceiro, tg_table_name, new.id,
          case when tg_op = 'INSERT' then 'criado' else 'alterado' end,
          v_diff,
          coalesce(public.parceiros_ator(), nullif(v_novo ->> 'alterado_por', '')::uuid,
                   nullif(v_novo ->> 'criado_por', '')::uuid));
  return null;
end $$;

revoke execute on function public.parceiros_registar_historico() from public, anon, authenticated;

create or replace function public.parceiros_historico_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'parceiros_historico: só inserção' using errcode = '42501';
end $$;

create trigger parceiros_historico_so_insercao before update or delete on public.parceiros_historico
  for each row execute function public.parceiros_historico_so_insercao();

create trigger parceiros_historico after insert or update on public.parceiros
  for each row execute function public.parceiros_registar_historico();
create trigger parceiros_historico after insert on public.parceiros_condicoes
  for each row execute function public.parceiros_registar_historico();

-- Condições: só inserção.
create or replace function public.parceiros_condicoes_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old; -- apagar o parceiro (cascade)
  end if;
  raise exception 'parceiros_condicoes: as condições não se alteram (criar nova versão)' using errcode = '42501';
end $$;

create trigger parceiros_condicoes_imutavel before update or delete on public.parceiros_condicoes
  for each row execute function public.parceiros_condicoes_imutavel();

-- ---------------------------------------------------------------------------
-- 4. Códigos de parceiro (mesmo espaço dos códigos de amigos) e visitas
-- ---------------------------------------------------------------------------
create table public.parceiros_codigos (
  codigo text primary key check (codigo ~ '^[A-HJ-NP-Z2-9]{8}$'),
  parceiro_id uuid not null references public.parceiros (id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

comment on table public.parceiros_codigos is
  'Códigos do Parceiro de Indicação: servem em /r/<código> e no campo "Código de parceiro". Nunca coincidem com um código de amigo.';

create index parceiros_codigos_parceiro_idx on public.parceiros_codigos (parceiro_id);

-- Um código é de um amigo OU de um parceiro. 23505 para o gerador tentar outro.
create or replace function public.codigo_indicacao_unico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('codigo_indicacao:' || new.codigo, 0));
  if tg_table_name = 'parceiros_codigos'
     and exists (select 1 from public.indicacoes_codigos c where c.codigo = new.codigo) then
    raise exception 'código já usado por um amigo' using errcode = '23505';
  end if;
  if tg_table_name = 'indicacoes_codigos'
     and exists (select 1 from public.parceiros_codigos c where c.codigo = new.codigo) then
    raise exception 'código já usado por um parceiro' using errcode = '23505';
  end if;
  return new;
end $$;

revoke execute on function public.codigo_indicacao_unico() from public, anon, authenticated;

create trigger codigo_indicacao_unico before insert on public.parceiros_codigos
  for each row execute function public.codigo_indicacao_unico();
create trigger codigo_indicacao_unico before insert on public.indicacoes_codigos
  for each row execute function public.codigo_indicacao_unico();

-- O código e o parceiro nunca mudam (só "ativo").
create or replace function public.parceiros_codigos_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo is distinct from old.codigo or new.parceiro_id is distinct from old.parceiro_id
     or new.criado_em is distinct from old.criado_em then
    raise exception 'parceiros_codigos: o código não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger parceiros_codigos_imutavel before update on public.parceiros_codigos
  for each row execute function public.parceiros_codigos_imutavel();

-- Visita por /r/<código> com consentimento de marketing (como os amigos):
-- só o id vai para o cookie. Apagadas aos 30 dias.
create table public.parceiros_visitas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null references public.parceiros_codigos (codigo) on delete cascade,
  criado_em timestamptz not null default now()
);

create index parceiros_visitas_retencao_idx on public.parceiros_visitas (criado_em);
create index parceiros_visitas_codigo_idx on public.parceiros_visitas (codigo, criado_em);

-- ---------------------------------------------------------------------------
-- 5. Atribuições (uma por conta, amigo OU parceiro, nunca muda)
-- ---------------------------------------------------------------------------
create table public.parceiros_atribuicoes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  -- null depois de a conta ser apagada (a comissão é registo financeiro e fica).
  user_id uuid unique references public.utilizadores (id) on delete set null,
  codigo text not null,
  via text not null check (via in ('ligacao', 'codigo')),
  visita_id uuid references public.parceiros_visitas (id) on delete set null,
  visitado_em timestamptz,
  atribuido_em timestamptz not null default now(),
  check ((via = 'ligacao') = (visitado_em is not null))
);

comment on table public.parceiros_atribuicoes is
  'Conta atribuída a um Parceiro de Indicação (ligação /r/ com consentimento, ou código escrito pelo cliente). Atribuída só pelo servidor.';

create index parceiros_atribuicoes_parceiro_idx on public.parceiros_atribuicoes (parceiro_id, atribuido_em);

create or replace function public.parceiros_atribuicoes_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Só a ação referencial (conta apagada → user_id null; visita apagada → visita_id null).
  if pg_trigger_depth() > 1
     and new.id = old.id and new.parceiro_id = old.parceiro_id and new.codigo = old.codigo
     and new.via = old.via and new.atribuido_em = old.atribuido_em
     and new.visitado_em is not distinct from old.visitado_em then
    return new;
  end if;
  raise exception 'parceiros_atribuicoes: uma atribuição nunca muda' using errcode = '42501';
end $$;

create trigger parceiros_atribuicoes_imutavel before update on public.parceiros_atribuicoes
  for each row execute function public.parceiros_atribuicoes_imutavel();

-- Garantia na base de dados: amigo e parceiro nunca para a mesma conta.
create or replace function public.atribuicao_unica_por_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- As duas tabelas têm nomes de coluna diferentes (o PL/pgSQL não aceita
  -- new.<campo> inexistente, mesmo num ramo que não corre).
  v_user uuid := coalesce(to_jsonb(new) ->> 'user_id', to_jsonb(new) ->> 'referred_user_id')::uuid;
begin
  if v_user is null then
    return new;
  end if;
  if tg_table_name = 'parceiros_atribuicoes'
     and exists (select 1 from public.indicacoes i where i.referred_user_id = v_user) then
    raise exception 'a conta já foi indicada por um amigo' using errcode = '23505';
  end if;
  if tg_table_name = 'indicacoes'
     and exists (select 1 from public.parceiros_atribuicoes a where a.user_id = v_user) then
    raise exception 'a conta já está atribuída a um parceiro' using errcode = '23505';
  end if;
  return new;
end $$;

revoke execute on function public.atribuicao_unica_por_conta() from public, anon, authenticated;

create trigger atribuicao_unica_por_conta before insert on public.parceiros_atribuicoes
  for each row execute function public.atribuicao_unica_por_conta();
create trigger atribuicao_unica_por_conta before insert on public.indicacoes
  for each row execute function public.atribuicao_unica_por_conta();

-- indicacao_atribuir (amigos): igual, mas uma conta já atribuída a um
-- parceiro devolve 'ja_atribuida' (em vez de erro) e partilha o bloqueio
-- por conta com parceiro_atribuir.
create or replace function public.indicacao_atribuir(p_referred uuid, p_visita uuid, p_janela_dias int default 30)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visita record;
begin
  perform pg_advisory_xact_lock(hashtextextended('atribuicao:' || p_referred::text, 0));

  if exists (select 1 from public.indicacoes where referred_user_id = p_referred)
     or exists (select 1 from public.parceiros_atribuicoes where user_id = p_referred) then
    return 'ja_atribuida';
  end if;

  select v.id, v.codigo, v.criado_em, c.user_id as referrer
    into v_visita
    from public.indicacoes_visitas v
    join public.indicacoes_codigos c on c.codigo = v.codigo
   where v.id = p_visita;
  if not found then return 'visita_invalida'; end if;
  if v_visita.criado_em < now() - make_interval(days => p_janela_dias) then return 'expirada'; end if;
  if v_visita.referrer = p_referred then return 'auto_indicacao'; end if;
  if public.indicacao_conta_ja_cliente(p_referred) then return 'ja_cliente'; end if;

  insert into public.indicacoes (referrer_user_id, referred_user_id, codigo, visita_id, visitado_em)
  values (v_visita.referrer, p_referred, v_visita.codigo, v_visita.id, v_visita.criado_em)
  on conflict (referred_user_id) do nothing;
  if not found then return 'ja_atribuida'; end if;
  return 'atribuida';
end $$;

revoke execute on function public.indicacao_atribuir(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.indicacao_atribuir(uuid, uuid, int) to service_role;

-- Visita por /r/<código> de parceiro (só depois do consentimento). Devolve o
-- id da visita ou null (código inexistente, inativo ou parceiro não ativo).
create or replace function public.parceiro_registar_visita(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from public.parceiros_codigos c
      join public.parceiros p on p.id = c.parceiro_id
     where c.codigo = p_codigo and c.ativo and p.estado = 'ativo' and p.indicacao
  ) then
    return null;
  end if;
  insert into public.parceiros_visitas (codigo) values (p_codigo) returning id into v_id;
  return v_id;
end $$;

-- Atribuição: via ligação (p_visita) ou código escrito pelo cliente
-- (p_codigo). atribuida | ja_atribuida | visita_invalida | expirada |
-- codigo_invalido | auto_indicacao | ja_cliente
create or replace function public.parceiro_atribuir(
  p_user uuid,
  p_visita uuid,
  p_codigo text,
  p_janela_dias int default 30
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_visitado timestamptz;
  v_parceiro public.parceiros%rowtype;
begin
  if (p_visita is null) = (p_codigo is null) then
    raise exception 'parceiro_atribuir: indicar a visita ou o código (só um)';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atribuicao:' || p_user::text, 0));

  if exists (select 1 from public.indicacoes where referred_user_id = p_user)
     or exists (select 1 from public.parceiros_atribuicoes where user_id = p_user) then
    return 'ja_atribuida';
  end if;

  if p_visita is not null then
    select v.codigo, v.criado_em into v_codigo, v_visitado
      from public.parceiros_visitas v where v.id = p_visita;
    if not found then return 'visita_invalida'; end if;
    if v_visitado < now() - make_interval(days => p_janela_dias) then return 'expirada'; end if;
  else
    v_codigo := upper(regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g'));
  end if;

  select p.* into v_parceiro
    from public.parceiros_codigos c
    join public.parceiros p on p.id = c.parceiro_id
   where c.codigo = v_codigo and c.ativo and p.estado = 'ativo' and p.indicacao;
  if not found then return 'codigo_invalido'; end if;

  if v_parceiro.user_id = p_user then return 'auto_indicacao'; end if;
  if public.indicacao_conta_ja_cliente(p_user) then return 'ja_cliente'; end if;

  insert into public.parceiros_atribuicoes (parceiro_id, user_id, codigo, via, visita_id, visitado_em)
  values (v_parceiro.id, p_user, v_codigo,
          case when p_visita is null then 'codigo' else 'ligacao' end,
          p_visita, v_visitado);
  return 'atribuida';
end $$;

revoke execute on function public.parceiro_registar_visita(text) from public, anon, authenticated;
revoke execute on function public.parceiro_atribuir(uuid, uuid, text, int) from public, anon, authenticated;
grant execute on function public.parceiro_registar_visita(text) to service_role;
grant execute on function public.parceiro_atribuir(uuid, uuid, text, int) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Oportunidades empresariais (B2B) e receitas recebidas
-- ---------------------------------------------------------------------------
create table public.parceiros_oportunidades (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  entidade text not null check (char_length(btrim(entidade)) between 2 and 160),
  -- Só quando a comunicação dos dados for legítima; opcional.
  contacto text check (contacto is null or char_length(contacto) <= 300),
  apresentada_em date not null default (now() at time zone 'Europe/Lisbon')::date,
  -- 90 dias por omissão (trigger); prorrogar exige motivo.
  valida_ate date not null,
  prorrogacao_motivo text check (prorrogacao_motivo is null or char_length(prorrogacao_motivo) <= 500),
  estado text not null default 'nova'
    check (estado in ('nova', 'em_contacto', 'reuniao_realizada', 'proposta_enviada', 'ganha', 'perdida')),
  -- 'indicada' = percentagem das condições; 'venda_ativa' = até 20 %, com autorização.
  modo text not null default 'indicada' check (modo in ('indicada', 'venda_ativa')),
  percentagem numeric(5, 2) check (percentagem is null or percentagem between 0 and 20),
  percentagem_autorizada_por uuid references public.utilizadores (id) on delete set null,
  contrato_referencia text check (contrato_referencia is null or char_length(contrato_referencia) <= 120),
  contrato_inicio date,
  valor_contratual_cents bigint check (valor_contratual_cents is null or valor_contratual_cents >= 0),
  ganha_em timestamptz,
  notas text check (notas is null or char_length(notas) <= 4000),
  alterado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valida_ate >= apresentada_em),
  check (estado <> 'ganha' or (contrato_inicio is not null and percentagem is not null and ganha_em is not null)),
  -- Acima de 10 %: só venda activa pelo parceiro e com autorização registada.
  check (percentagem is null or percentagem <= 10 or (modo = 'venda_ativa' and percentagem_autorizada_por is not null))
);

comment on table public.parceiros_oportunidades is
  'Oportunidades B2B apresentadas por parceiros (CRM mínimo). Validade de 90 dias, prorrogável com motivo. Sem dados pessoais obrigatórios.';

create index parceiros_oportunidades_parceiro_idx on public.parceiros_oportunidades (parceiro_id, estado);

create trigger set_updated_at before update on public.parceiros_oportunidades
  for each row execute function public.set_updated_at();
create trigger parceiros_historico after insert or update on public.parceiros_oportunidades
  for each row execute function public.parceiros_registar_historico();

-- Ganha só dentro da validade; ganha/perdida são finais (correção = admin
-- por "Corrigir estado", que não existe na Fase 1 — de propósito).
create or replace function public.parceiros_oportunidades_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.valida_ate is null then
    new.valida_ate := new.apresentada_em + 90;
  end if;
  if tg_op = 'UPDATE' then
    if new.valida_ate > old.valida_ate and new.prorrogacao_motivo is not distinct from old.prorrogacao_motivo then
      raise exception 'oportunidade: prorrogar a validade exige um motivo novo' using errcode = '22023';
    end if;
    if old.estado in ('ganha', 'perdida') and new.estado is distinct from old.estado then
      raise exception 'oportunidade: estado final' using errcode = '42501';
    end if;
    if new.parceiro_id is distinct from old.parceiro_id or new.apresentada_em is distinct from old.apresentada_em then
      raise exception 'oportunidade: o parceiro e a data de apresentação não mudam' using errcode = '42501';
    end if;
    if old.estado = 'ganha' and (
         new.percentagem is distinct from old.percentagem
      or new.contrato_inicio is distinct from old.contrato_inicio
      or new.modo is distinct from old.modo) then
      raise exception 'oportunidade: condições da comissão fixas depois de ganha' using errcode = '42501';
    end if;
  end if;
  if new.estado = 'ganha' and (tg_op = 'INSERT' or old.estado <> 'ganha')
     and (new.ganha_em at time zone 'Europe/Lisbon')::date > new.valida_ate then
    raise exception 'oportunidade: atribuição expirada (prorrogar antes de marcar como ganha)' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger parceiros_oportunidades_regras before insert or update on public.parceiros_oportunidades
  for each row execute function public.parceiros_oportunidades_regras();

-- Receitas efetivamente recebidas (sem IVA). Reembolso = movimento negativo.
-- Só inserção.
create table public.parceiros_oportunidades_receitas (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid not null references public.parceiros_oportunidades (id) on delete restrict,
  tipo text not null check (tipo in ('recebimento', 'reembolso')),
  recebido_em date not null,
  valor_sem_iva_cents bigint not null check (valor_sem_iva_cents > 0),
  referencia text check (referencia is null or char_length(referencia) <= 120),
  registado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now()
);

create index parceiros_oportunidades_receitas_idx on public.parceiros_oportunidades_receitas (oportunidade_id, recebido_em);

create trigger parceiros_receitas_so_insercao before update or delete on public.parceiros_oportunidades_receitas
  for each row execute function public.parceiros_historico_so_insercao();

-- ---------------------------------------------------------------------------
-- 7. Faturas pagas das contas atribuídas (base das comissões B2C)
-- ---------------------------------------------------------------------------
create table public.parceiros_faturas (
  invoice_id text primary key,
  atribuicao_id uuid not null references public.parceiros_atribuicoes (id) on delete restrict,
  stripe_subscription_id text not null,
  produto text not null check (produto in ('protecao', 'caso_protecao')),
  valor_pago_cents int not null check (valor_pago_cents > 0),
  iva_cents int not null default 0 check (iva_cents >= 0),
  desconto_cents int not null default 0 check (desconto_cents >= 0),
  stripe_payment_intent_id text,
  pago_em timestamptz not null,
  estado text not null default 'paga' check (estado in ('paga', 'reembolsada', 'disputada')),
  estado_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.parceiros_faturas is
  'Faturas pagas (> 0 €) da subscrição de uma conta atribuída a um parceiro. Só para contar mensalidades; sem dados pessoais.';

create index parceiros_faturas_atribuicao_idx on public.parceiros_faturas (atribuicao_id, estado);
create index parceiros_faturas_pi_idx on public.parceiros_faturas (stripe_payment_intent_id) where stripe_payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- 8. Comissões e pagamentos
-- ---------------------------------------------------------------------------
create table public.parceiros_pagamentos (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  -- Soma das comissões, sem IVA (as comissões são valores sem IVA; decisão de
  -- Thiago, 20/10/2026: "acresce IVA à taxa legal em vigor, quando aplicável").
  total_cents bigint not null check (total_cents > 0),
  -- IVA da factura do parceiro (opcional; null = parceiro isento ou sem IVA).
  -- A DoLado está no regime normal e deduz este IVA. Nunca mais de 23 %.
  iva_cents bigint check (iva_cents is null or (iva_cents >= 0 and iva_cents <= ceil(total_cents * 0.23))),
  -- Valor efectivamente transferido.
  total_transferido_cents bigint generated always as (total_cents + coalesce(iva_cents, 0)) stored,
  -- Número da factura/recibo emitido pelo parceiro (opcional).
  documento_parceiro text check (documento_parceiro is null or char_length(documento_parceiro) <= 120),
  pago_em date not null,
  referencia text not null check (char_length(btrim(referencia)) between 2 and 120),
  aprovado_por uuid not null references public.utilizadores (id) on delete restrict,
  nota text check (nota is null or char_length(nota) <= 1000),
  created_at timestamptz not null default now(),
  unique (parceiro_id, referencia)
);

create trigger parceiros_pagamentos_so_insercao before update or delete on public.parceiros_pagamentos
  for each row execute function public.parceiros_historico_so_insercao();
create trigger parceiros_historico after insert on public.parceiros_pagamentos
  for each row execute function public.parceiros_registar_historico();

create table public.parceiros_comissoes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  tipo text not null check (tipo in ('b2c', 'b2b')),
  -- B2C: uma comissão por conta atribuída (nunca recorrente).
  atribuicao_id uuid unique references public.parceiros_atribuicoes (id) on delete restrict,
  stripe_subscription_id text,
  produto text check (produto in ('protecao', 'caso_protecao')),
  mensalidades_pagas int not null default 0 check (mensalidades_pagas >= 0),
  -- B2B: uma ou mais (receitas recebidas em momentos diferentes), por oportunidade.
  oportunidade_id uuid references public.parceiros_oportunidades (id) on delete restrict,
  base_cents bigint check (base_cents is null or base_cents >= 0),
  percentagem numeric(5, 2),
  condicao_id uuid references public.parceiros_condicoes (id) on delete restrict,
  valor_cents bigint not null check (valor_cents >= 0),
  estado text not null default 'pendente'
    check (estado in ('pendente', 'em_validacao', 'elegivel', 'aprovada', 'paga', 'cancelada', 'revertida')),
  motivo text check (motivo is null or char_length(motivo) <= 500),
  elegivel_em timestamptz,
  aprovada_em timestamptz,
  aprovada_por uuid references public.utilizadores (id) on delete set null,
  pagamento_id uuid references public.parceiros_pagamentos (id) on delete restrict,
  paga_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((tipo = 'b2c') = (atribuicao_id is not null)),
  check ((tipo = 'b2b') = (oportunidade_id is not null)),
  check ((estado = 'paga') = (pagamento_id is not null)),
  check (estado not in ('aprovada', 'paga') or aprovada_por is not null)
);

comment on table public.parceiros_comissoes is
  'Comissões do Parceiro de Indicação. Estados: pendente → em_validacao/elegivel → aprovada → paga; cancelada/revertida finais. Transições validadas na base de dados.';

create index parceiros_comissoes_parceiro_idx on public.parceiros_comissoes (parceiro_id, estado);
create index parceiros_comissoes_oportunidade_idx on public.parceiros_comissoes (oportunidade_id) where oportunidade_id is not null;
-- B2B: no máximo uma comissão por pagar (pendente/elegível/em validação) por oportunidade.
create unique index parceiros_comissoes_b2b_aberta
  on public.parceiros_comissoes (oportunidade_id)
  where oportunidade_id is not null and estado in ('pendente', 'em_validacao', 'elegivel');

create trigger set_updated_at before update on public.parceiros_comissoes
  for each row execute function public.set_updated_at();
create trigger parceiros_historico after insert or update on public.parceiros_comissoes
  for each row execute function public.parceiros_registar_historico();

create or replace function public.parceiros_comissoes_transicao()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'parceiros_comissoes: nunca apagar (cancelar ou reverter)' using errcode = '42501';
  end if;
  if new.parceiro_id is distinct from old.parceiro_id or new.tipo is distinct from old.tipo
     or new.atribuicao_id is distinct from old.atribuicao_id
     or new.oportunidade_id is distinct from old.oportunidade_id then
    raise exception 'parceiros_comissoes: origem imutável' using errcode = '42501';
  end if;
  -- Valor fixo a partir da aprovação.
  if old.estado in ('aprovada', 'paga') and new.valor_cents is distinct from old.valor_cents then
    raise exception 'parceiros_comissoes: valor fixo depois de aprovada' using errcode = '42501';
  end if;
  if new.estado = old.estado then
    return new;
  end if;
  v_ok := case old.estado
    when 'pendente' then new.estado in ('em_validacao', 'elegivel', 'cancelada', 'revertida')
    when 'em_validacao' then new.estado in ('pendente', 'elegivel', 'cancelada', 'revertida')
    when 'elegivel' then new.estado in ('pendente', 'em_validacao', 'aprovada', 'cancelada', 'revertida')
    when 'aprovada' then new.estado in ('pendente', 'em_validacao', 'paga', 'cancelada', 'revertida')
    else false
  end;
  if not v_ok then
    raise exception 'parceiros_comissoes: transição % → % não permitida', old.estado, new.estado using errcode = '42501';
  end if;
  return new;
end $$;

create trigger parceiros_comissoes_transicao before update or delete on public.parceiros_comissoes
  for each row execute function public.parceiros_comissoes_transicao();

-- Fatura paga (webhook invoice.paid, depois do acesso gravado). Atómica e
-- idempotente por invoice. Só a primeira subscrição da conta atribuída conta.
-- p_suspeita (ex.: cartão igual ao do parceiro) → "em_validacao".
-- Resultado: sem_atribuicao | sem_pagamento | duplicada | outra_subscricao |
-- comissao_final | pendente | elegivel | em_validacao
create or replace function public.parceiro_registar_fatura(
  p_user uuid,
  p_invoice text,
  p_subscription text,
  p_produto text,
  p_valor_pago_cents int,
  p_iva_cents int,
  p_desconto_cents int,
  p_payment_intent text,
  p_customer text,
  p_pago_em timestamptz,
  p_suspeita text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atr public.parceiros_atribuicoes%rowtype;
  v_com public.parceiros_comissoes%rowtype;
  v_cond public.parceiros_condicoes%rowtype;
  v_parceiro public.parceiros%rowtype;
  v_pagas int;
  v_suspeita text := p_suspeita;
  v_estado text;
begin
  if p_invoice is null or p_subscription is null then
    raise exception 'parceiro_registar_fatura: invoice e subscrição obrigatórias';
  end if;

  select * into v_atr from public.parceiros_atribuicoes where user_id = p_user for update;
  if not found then
    return jsonb_build_object('resultado', 'sem_atribuicao');
  end if;
  if coalesce(p_valor_pago_cents, 0) <= 0 then
    -- 0 € (Protecção gratuita, cupão de 100 %): não é uma mensalidade paga.
    return jsonb_build_object('resultado', 'sem_pagamento');
  end if;
  if p_produto not in ('protecao', 'caso_protecao') then
    return jsonb_build_object('resultado', 'produto_excluido');
  end if;

  select * into v_com from public.parceiros_comissoes where atribuicao_id = v_atr.id for update;
  if found and v_com.stripe_subscription_id is distinct from p_subscription then
    return jsonb_build_object('resultado', 'outra_subscricao', 'comissao_id', v_com.id);
  end if;
  if found and v_com.estado in ('aprovada', 'paga', 'cancelada', 'revertida') then
    insert into public.parceiros_faturas (invoice_id, atribuicao_id, stripe_subscription_id, produto,
      valor_pago_cents, iva_cents, desconto_cents, stripe_payment_intent_id, pago_em)
    values (p_invoice, v_atr.id, p_subscription, p_produto, p_valor_pago_cents,
      coalesce(p_iva_cents, 0), coalesce(p_desconto_cents, 0), p_payment_intent, p_pago_em)
    on conflict (invoice_id) do nothing;
    return jsonb_build_object('resultado', 'comissao_final', 'comissao_id', v_com.id, 'estado', v_com.estado);
  end if;

  insert into public.parceiros_faturas (invoice_id, atribuicao_id, stripe_subscription_id, produto,
    valor_pago_cents, iva_cents, desconto_cents, stripe_payment_intent_id, pago_em)
  values (p_invoice, v_atr.id, p_subscription, p_produto, p_valor_pago_cents,
    coalesce(p_iva_cents, 0), coalesce(p_desconto_cents, 0), p_payment_intent, p_pago_em)
  on conflict (invoice_id) do nothing;
  if not found then
    return jsonb_build_object('resultado', 'duplicada', 'comissao_id', v_com.id);
  end if;

  select * into v_parceiro from public.parceiros where id = v_atr.parceiro_id;
  -- Mesmo Customer Stripe do próprio parceiro: sinal de auto-indicação (revisão humana).
  if v_suspeita is null and v_parceiro.user_id is not null and p_customer is not null
     and exists (select 1 from public.user_access ua
                  where ua.user_id = v_parceiro.user_id and ua.stripe_customer_id = p_customer) then
    v_suspeita := 'mesmo_cliente_stripe';
  end if;

  if v_com.id is null then
    select * into v_cond from public.parceiros_condicoes
     where id = public.parceiros_condicao_atual(v_atr.parceiro_id, v_atr.atribuido_em);
    if not found then
      raise exception 'parceiro_registar_fatura: parceiro sem condições comerciais';
    end if;
    insert into public.parceiros_comissoes (parceiro_id, tipo, atribuicao_id, stripe_subscription_id, produto,
      condicao_id, valor_cents)
    values (v_atr.parceiro_id, 'b2c', v_atr.id, p_subscription, p_produto, v_cond.id,
      case p_produto when 'protecao' then v_cond.comissao_protecao_cents else v_cond.comissao_caso_protecao_cents end)
    returning * into v_com;
  else
    select * into v_cond from public.parceiros_condicoes where id = v_com.condicao_id;
  end if;

  select count(*) into v_pagas from public.parceiros_faturas
   where atribuicao_id = v_atr.id and stripe_subscription_id = p_subscription and estado = 'paga';

  v_estado := case
    when v_suspeita is not null or v_com.estado = 'em_validacao' then 'em_validacao'
    when v_pagas >= v_cond.mensalidades_necessarias then 'elegivel'
    else 'pendente'
  end;

  update public.parceiros_comissoes
     set mensalidades_pagas = v_pagas,
         estado = v_estado,
         motivo = coalesce(v_suspeita, motivo),
         elegivel_em = case when v_estado = 'elegivel' then coalesce(elegivel_em, now()) else elegivel_em end
   where id = v_com.id;

  return jsonb_build_object('resultado', v_estado, 'comissao_id', v_com.id, 'mensalidades_pagas', v_pagas);
end $$;

-- Reembolso integral ou disputa de uma fatura contada. Comissão por pagar →
-- recontada (pode voltar a "pendente"); disputa → "em_validacao". Comissão já
-- paga → nada automático ('ja_paga': aviso ao admin).
create or replace function public.parceiro_reverter_fatura(p_invoice text, p_payment_intent text, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fat public.parceiros_faturas%rowtype;
  v_com public.parceiros_comissoes%rowtype;
  v_cond public.parceiros_condicoes%rowtype;
  v_pagas int;
  v_estado text;
begin
  if p_motivo not in ('reembolso', 'disputa') then
    raise exception 'parceiro_reverter_fatura: motivo inválido';
  end if;
  select * into v_fat from public.parceiros_faturas
   where (p_invoice is not null and invoice_id = p_invoice)
      or (p_invoice is null and p_payment_intent is not null and stripe_payment_intent_id = p_payment_intent)
   limit 1
   for update;
  if not found then
    return jsonb_build_object('resultado', 'sem_fatura');
  end if;

  if v_fat.estado = 'paga' then
    update public.parceiros_faturas
       set estado = case when p_motivo = 'reembolso' then 'reembolsada' else 'disputada' end,
           estado_em = now()
     where invoice_id = v_fat.invoice_id;
  end if;

  select * into v_com from public.parceiros_comissoes
   where atribuicao_id = v_fat.atribuicao_id and stripe_subscription_id = v_fat.stripe_subscription_id
   for update;
  if not found then
    return jsonb_build_object('resultado', 'sem_comissao');
  end if;
  if v_com.estado = 'paga' then
    return jsonb_build_object('resultado', 'ja_paga', 'comissao_id', v_com.id, 'parceiro_id', v_com.parceiro_id);
  end if;
  if v_com.estado in ('cancelada', 'revertida') then
    return jsonb_build_object('resultado', 'comissao_final', 'comissao_id', v_com.id);
  end if;

  select * into v_cond from public.parceiros_condicoes where id = v_com.condicao_id;
  select count(*) into v_pagas from public.parceiros_faturas
   where atribuicao_id = v_fat.atribuicao_id and stripe_subscription_id = v_fat.stripe_subscription_id and estado = 'paga';

  v_estado := case
    when p_motivo = 'disputa' then 'em_validacao'
    when v_com.estado = 'em_validacao' then 'em_validacao'
    when v_pagas >= v_cond.mensalidades_necessarias then v_com.estado
    else 'pendente'
  end;

  update public.parceiros_comissoes
     set mensalidades_pagas = v_pagas,
         estado = v_estado,
         motivo = case when p_motivo = 'disputa' then 'disputa' else 'fatura_reembolsada' end,
         aprovada_em = case when v_estado in ('pendente', 'em_validacao') then null else aprovada_em end,
         aprovada_por = case when v_estado in ('pendente', 'em_validacao') then null else aprovada_por end
   where id = v_com.id;

  return jsonb_build_object('resultado', v_estado, 'comissao_id', v_com.id, 'mensalidades_pagas', v_pagas);
end $$;

-- Subscrição terminada (customer.subscription.deleted): comissão ainda não
-- elegível → cancelada. Só a primeira subscrição conta; uma nova não reabre.
create or replace function public.parceiro_subscricao_terminada(p_subscription text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parceiros_comissoes
     set estado = 'cancelada', motivo = 'subscricao_terminada'
   where tipo = 'b2c' and stripe_subscription_id = p_subscription and estado = 'pendente';
  return case when found then 'cancelada' else 'sem_alteracao' end;
end $$;

-- Validação humana de uma comissão "em_validacao".
create or replace function public.parceiro_validar_comissao(p_id uuid, p_aprovar boolean, p_motivo text, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_com public.parceiros_comissoes%rowtype;
  v_necessarias int;
begin
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'parceiro_validar_comissao: motivo obrigatório';
  end if;
  perform set_config('dolado.ator', p_admin::text, true);
  select * into v_com from public.parceiros_comissoes where id = p_id for update;
  if not found or v_com.estado <> 'em_validacao' then
    return 'nao_em_validacao';
  end if;
  if not p_aprovar then
    update public.parceiros_comissoes set estado = 'cancelada', motivo = p_motivo where id = p_id;
    return 'cancelada';
  end if;
  select c.mensalidades_necessarias into v_necessarias from public.parceiros_condicoes c where c.id = v_com.condicao_id;
  update public.parceiros_comissoes
     set estado = case when v_com.tipo = 'b2b' or v_com.mensalidades_pagas >= coalesce(v_necessarias, 1) then 'elegivel' else 'pendente' end,
         motivo = p_motivo,
         elegivel_em = case when v_com.tipo = 'b2b' or v_com.mensalidades_pagas >= coalesce(v_necessarias, 1) then now() end
   where id = p_id;
  return 'validada';
end $$;

-- Aprovação administrativa (elegível → aprovada).
create or replace function public.parceiro_aprovar_comissoes(p_ids uuid[], p_admin uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  perform set_config('dolado.ator', p_admin::text, true);
  update public.parceiros_comissoes
     set estado = 'aprovada', aprovada_em = now(), aprovada_por = p_admin
   where id = any (p_ids) and estado = 'elegivel';
  get diagnostics n = row_count;
  return n;
end $$;

-- Cancelamento manual (exceção), com motivo.
create or replace function public.parceiro_cancelar_comissao(p_id uuid, p_motivo text, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'parceiro_cancelar_comissao: motivo obrigatório';
  end if;
  perform set_config('dolado.ator', p_admin::text, true);
  update public.parceiros_comissoes set estado = 'cancelada', motivo = p_motivo
   where id = p_id and estado in ('pendente', 'em_validacao', 'elegivel', 'aprovada');
  return case when found then 'cancelada' else 'sem_alteracao' end;
end $$;

-- Pagamento manual: todas as comissões aprovadas, do mesmo parceiro e por
-- pagar. Idempotente por (parceiro, referência).
create or replace function public.parceiro_registar_pagamento(
  p_parceiro uuid,
  p_comissoes uuid[],
  p_pago_em date,
  p_referencia text,
  p_nota text,
  p_admin uuid,
  p_iva_cents bigint default null,
  p_documento_parceiro text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existente public.parceiros_pagamentos%rowtype;
  v_total bigint;
  v_n int;
  v_id uuid;
begin
  if coalesce(array_length(p_comissoes, 1), 0) = 0 then
    raise exception 'parceiro_registar_pagamento: sem comissões';
  end if;
  perform set_config('dolado.ator', p_admin::text, true);
  perform pg_advisory_xact_lock(hashtextextended('parceiro_pagamento:' || p_parceiro::text, 0));

  select * into v_existente from public.parceiros_pagamentos
   where parceiro_id = p_parceiro and referencia = btrim(p_referencia);
  if found then
    return jsonb_build_object('resultado', 'ja_registado', 'pagamento_id', v_existente.id);
  end if;

  perform 1 from public.parceiros_comissoes where id = any (p_comissoes) for update;
  select count(*), coalesce(sum(valor_cents), 0) into v_n, v_total
    from public.parceiros_comissoes
   where id = any (p_comissoes) and parceiro_id = p_parceiro and estado = 'aprovada';
  if v_n <> array_length(p_comissoes, 1) then
    return jsonb_build_object('resultado', 'comissoes_invalidas');
  end if;
  if v_total <= 0 then
    return jsonb_build_object('resultado', 'sem_valor');
  end if;

  if p_iva_cents is not null and (p_iva_cents < 0 or p_iva_cents > ceil(v_total * 0.23)) then
    return jsonb_build_object('resultado', 'iva_invalido', 'total_cents', v_total);
  end if;

  insert into public.parceiros_pagamentos (parceiro_id, total_cents, iva_cents, documento_parceiro, pago_em,
    referencia, aprovado_por, nota)
  values (p_parceiro, v_total, p_iva_cents, nullif(btrim(coalesce(p_documento_parceiro, '')), ''), p_pago_em,
    btrim(p_referencia), p_admin, p_nota)
  returning id into v_id;

  update public.parceiros_comissoes
     set estado = 'paga', pagamento_id = v_id, paga_em = now()
   where id = any (p_comissoes);

  return jsonb_build_object('resultado', 'registado', 'pagamento_id', v_id, 'total_cents', v_total,
                            'iva_cents', p_iva_cents, 'total_transferido_cents', v_total + coalesce(p_iva_cents, 0));
end $$;

-- B2B: (re)calcula a comissão a partir das receitas recebidas no 1.º ano do
-- contrato. Cria a diferença ainda não coberta pelas comissões já aprovadas
-- ou pagas; atualiza a comissão aberta, se houver. Resultado: sem_alteracao |
-- criada | atualizada | ajuste_negativo (receita desceu depois de aprovada/paga:
-- decisão humana).
create or replace function public.parceiro_b2b_recalcular(p_oportunidade uuid, p_admin uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_op public.parceiros_oportunidades%rowtype;
  v_base bigint;
  v_devido bigint;
  v_fechado bigint;
  v_aberta public.parceiros_comissoes%rowtype;
  v_cond uuid;
begin
  perform set_config('dolado.ator', p_admin::text, true);
  select * into v_op from public.parceiros_oportunidades where id = p_oportunidade for update;
  if not found or v_op.estado <> 'ganha' then
    return jsonb_build_object('resultado', 'nao_ganha');
  end if;

  select coalesce(sum(case tipo when 'recebimento' then valor_sem_iva_cents else -valor_sem_iva_cents end), 0)
    into v_base
    from public.parceiros_oportunidades_receitas
   where oportunidade_id = p_oportunidade
     and recebido_em >= v_op.contrato_inicio
     and recebido_em < (v_op.contrato_inicio + interval '12 months')::date;
  v_base := greatest(v_base, 0);
  v_devido := floor(v_base * v_op.percentagem / 100);

  select coalesce(sum(valor_cents), 0) into v_fechado
    from public.parceiros_comissoes
   where oportunidade_id = p_oportunidade and estado in ('aprovada', 'paga');

  select * into v_aberta from public.parceiros_comissoes
   where oportunidade_id = p_oportunidade and estado in ('pendente', 'em_validacao', 'elegivel')
   for update;

  if v_devido < v_fechado then
    if v_aberta.id is not null then
      update public.parceiros_comissoes set estado = 'cancelada', motivo = 'receita_reduzida' where id = v_aberta.id;
    end if;
    return jsonb_build_object('resultado', 'ajuste_negativo', 'diferenca_cents', v_devido - v_fechado);
  end if;

  if v_devido - v_fechado = 0 then
    if v_aberta.id is not null then
      update public.parceiros_comissoes set estado = 'cancelada', motivo = 'receita_reduzida' where id = v_aberta.id;
      return jsonb_build_object('resultado', 'atualizada', 'valor_cents', 0);
    end if;
    return jsonb_build_object('resultado', 'sem_alteracao');
  end if;

  if v_aberta.id is not null then
    update public.parceiros_comissoes
       set valor_cents = v_devido - v_fechado, base_cents = v_base
     where id = v_aberta.id;
    return jsonb_build_object('resultado', 'atualizada', 'comissao_id', v_aberta.id, 'valor_cents', v_devido - v_fechado);
  end if;

  v_cond := public.parceiros_condicao_atual(v_op.parceiro_id, v_op.ganha_em);
  insert into public.parceiros_comissoes (parceiro_id, tipo, oportunidade_id, base_cents, percentagem, condicao_id,
    valor_cents, estado, elegivel_em)
  values (v_op.parceiro_id, 'b2b', p_oportunidade, v_base, v_op.percentagem, v_cond,
    v_devido - v_fechado, 'elegivel', now())
  returning * into v_aberta;
  return jsonb_build_object('resultado', 'criada', 'comissao_id', v_aberta.id, 'valor_cents', v_aberta.valor_cents);
end $$;

-- Resumo para o pagamento mensal (só admin).
create or replace function public.parceiros_resumo_comissoes()
returns table (
  parceiro_id uuid,
  nome text,
  pendentes int,
  em_validacao int,
  elegiveis_cents bigint,
  aprovadas_cents bigint,
  pagas_cents bigint,
  minimo_pagamento_cents int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  -- Só bloqueia sessões da API que não sejam de admin (service_role e o servidor passam).
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'parceiros_resumo_comissoes: só admin';
  end if;
  return query
  select p.id, p.nome,
         (count(*) filter (where c.estado = 'pendente'))::int,
         (count(*) filter (where c.estado = 'em_validacao'))::int,
         coalesce(sum(c.valor_cents) filter (where c.estado = 'elegivel'), 0)::bigint,
         coalesce(sum(c.valor_cents) filter (where c.estado = 'aprovada'), 0)::bigint,
         coalesce(sum(c.valor_cents) filter (where c.estado = 'paga'), 0)::bigint,
         coalesce((select cc.minimo_pagamento_cents from public.parceiros_condicoes cc
                    where cc.id = public.parceiros_condicao_atual(p.id)), 2500)
    from public.parceiros p
    left join public.parceiros_comissoes c on c.parceiro_id = p.id
   where p.indicacao
   group by p.id, p.nome
   order by p.nome;
end $$;

revoke execute on function public.parceiro_registar_fatura(uuid, text, text, text, int, int, int, text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.parceiro_reverter_fatura(text, text, text) from public, anon, authenticated;
revoke execute on function public.parceiro_subscricao_terminada(text) from public, anon, authenticated;
revoke execute on function public.parceiro_validar_comissao(uuid, boolean, text, uuid) from public, anon, authenticated;
revoke execute on function public.parceiro_aprovar_comissoes(uuid[], uuid) from public, anon, authenticated;
revoke execute on function public.parceiro_cancelar_comissao(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.parceiro_registar_pagamento(uuid, uuid[], date, text, text, uuid, bigint, text) from public, anon, authenticated;
revoke execute on function public.parceiro_b2b_recalcular(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.parceiros_resumo_comissoes() from public, anon;
grant execute on function public.parceiro_registar_fatura(uuid, text, text, text, int, int, int, text, text, timestamptz, text) to service_role;
grant execute on function public.parceiro_reverter_fatura(text, text, text) to service_role;
grant execute on function public.parceiro_subscricao_terminada(text) to service_role;
grant execute on function public.parceiro_validar_comissao(uuid, boolean, text, uuid) to service_role;
grant execute on function public.parceiro_aprovar_comissoes(uuid[], uuid) to service_role;
grant execute on function public.parceiro_cancelar_comissao(uuid, text, uuid) to service_role;
grant execute on function public.parceiro_registar_pagamento(uuid, uuid[], date, text, text, uuid, bigint, text) to service_role;
grant execute on function public.parceiro_b2b_recalcular(uuid, uuid) to service_role;
grant execute on function public.parceiros_resumo_comissoes() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. Candidaturas: criar (público, pelo servidor) e decidir (admin)
-- ---------------------------------------------------------------------------
-- Limitação de tentativas (sem IP): chave já pseudonimizada pelo servidor
-- (ex.: 'candidatura:<hmac do e-mail>', 'codigo_acesso:<user>'). Apagadas
-- ao fim de 2 dias.
create table public.limites_tentativas (
  id bigint generated always as identity primary key,
  chave text not null check (char_length(chave) between 3 and 200),
  em timestamptz not null default now()
);

create index limites_tentativas_idx on public.limites_tentativas (chave, em);

comment on table public.limites_tentativas is
  'Tentativas recentes por chave pseudonimizada (formulários e códigos). Sem IP nem e-mail em claro; apagadas aos 2 dias.';

-- true = pode continuar (e regista a tentativa); false = limite atingido.
create or replace function public.limite_tentar(p_chave text, p_maximo int, p_janela interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('limite:' || p_chave, 0));
  if (select count(*) from public.limites_tentativas where chave = p_chave and em > now() - p_janela) >= p_maximo then
    return false;
  end if;
  insert into public.limites_tentativas (chave) values (p_chave);
  return true;
end $$;

revoke execute on function public.limite_tentar(text, int, interval) from public, anon, authenticated;
grant execute on function public.limite_tentar(text, int, interval) to service_role;

create or replace function public.parceiro_candidatura_criar(
  p_nome text,
  p_email text,
  p_empresa text,
  p_tipo text,
  p_descricao text,
  p_condicoes_versao text,
  p_texto_aceite text,
  p_idioma text,
  p_chave_limite text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(btrim(p_condicoes_versao), '') = '' or coalesce(btrim(p_texto_aceite), '') = '' then
    raise exception 'parceiro_candidatura_criar: aceitação em falta';
  end if;
  -- 3 candidaturas por e-mail em 24 h.
  if not public.limite_tentar(p_chave_limite, 3, interval '24 hours') then
    return jsonb_build_object('resultado', 'limite');
  end if;
  insert into public.parceiros_candidaturas (nome, email, empresa, tipo_pretendido, descricao,
    condicoes_versao, texto_aceite, idioma)
  values (btrim(p_nome), lower(btrim(p_email)), nullif(btrim(coalesce(p_empresa, '')), ''), p_tipo, btrim(p_descricao),
    p_condicoes_versao, p_texto_aceite, coalesce(p_idioma, 'pt-PT'))
  returning id into v_id;
  return jsonb_build_object('resultado', 'criada', 'id', v_id);
end $$;

-- Aprovar: cria o parceiro (estado ativo), as condições iniciais (se for de
-- indicação) e o código (gerado no servidor, p_codigo). Rejeitar: motivo.
create or replace function public.parceiro_candidatura_decidir(
  p_id uuid,
  p_aprovar boolean,
  p_motivo text,
  p_codigo text,
  p_admin uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.parceiros_candidaturas%rowtype;
  v_parceiro uuid;
  v_indicacao boolean;
begin
  perform set_config('dolado.ator', p_admin::text, true);
  select * into v_c from public.parceiros_candidaturas where id = p_id for update;
  if not found then
    return jsonb_build_object('resultado', 'inexistente');
  end if;
  if v_c.estado <> 'pendente' then
    return jsonb_build_object('resultado', 'ja_decidida', 'estado', v_c.estado, 'parceiro_id', v_c.parceiro_id);
  end if;

  if not p_aprovar then
    if coalesce(btrim(p_motivo), '') = '' then
      raise exception 'parceiro_candidatura_decidir: motivo obrigatório para rejeitar';
    end if;
    update public.parceiros_candidaturas
       set estado = 'rejeitada', motivo = p_motivo, decidido_por = p_admin, decidido_em = now()
     where id = p_id;
    return jsonb_build_object('resultado', 'rejeitada');
  end if;

  v_indicacao := v_c.tipo_pretendido in ('indicacao', 'ambos');
  insert into public.parceiros (indicacao, distribuicao, nome, contacto_nome, contacto_email, estado,
    data_inicio, candidatura_id)
  values (v_indicacao, v_c.tipo_pretendido in ('distribuicao', 'ambos'),
    coalesce(v_c.empresa, v_c.nome), v_c.nome, v_c.email,
    case when v_indicacao then 'ativo' else 'em_negociacao' end,
    case when v_indicacao then (now() at time zone 'Europe/Lisbon')::date end, v_c.id)
  returning id into v_parceiro;

  if v_indicacao then
    if p_codigo is null then
      raise exception 'parceiro_candidatura_decidir: código em falta';
    end if;
    insert into public.parceiros_condicoes (parceiro_id, criado_por) values (v_parceiro, p_admin);
    insert into public.parceiros_codigos (codigo, parceiro_id) values (p_codigo, v_parceiro);
  end if;

  update public.parceiros_candidaturas
     set estado = 'aprovada', motivo = p_motivo, decidido_por = p_admin, decidido_em = now(), parceiro_id = v_parceiro
   where id = p_id;
  return jsonb_build_object('resultado', 'aprovada', 'parceiro_id', v_parceiro, 'codigo', p_codigo);
end $$;

revoke execute on function public.parceiro_candidatura_criar(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.parceiro_candidatura_decidir(uuid, boolean, text, text, uuid) from public, anon, authenticated;
grant execute on function public.parceiro_candidatura_criar(text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.parceiro_candidatura_decidir(uuid, boolean, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 10. Distribuição: pacotes, códigos de acesso, acessos patrocinados
-- ---------------------------------------------------------------------------
create table public.parceiros_pacotes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  -- Fase 1: só Protecção (sem casos incluídos).
  servico text not null default 'protecao' check (servico in ('protecao')),
  quantidade int not null check (quantidade between 1 and 10000),
  duracao_meses int not null default 3 check (duracao_meses between 1 and 24),
  valor_acordado_cents bigint not null check (valor_acordado_cents >= 0),
  ativacao_ate date not null,
  pagamento_estado text not null default 'por_pagar' check (pagamento_estado in ('por_pagar', 'pago')),
  pagamento_confirmado_em timestamptz,
  pagamento_confirmado_por uuid references public.utilizadores (id) on delete set null,
  pagamento_referencia text check (pagamento_referencia is null or char_length(pagamento_referencia) <= 120),
  estado text not null default 'ativo' check (estado in ('ativo', 'anulado')),
  condicoes text check (condicoes is null or char_length(condicoes) <= 4000),
  criado_por uuid references public.utilizadores (id) on delete set null,
  alterado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((pagamento_estado = 'pago') = (pagamento_confirmado_em is not null))
);

comment on table public.parceiros_pacotes is
  'Pacotes pré-pagos de um Parceiro de Distribuição (ex.: 50 acessos de 3 meses de Protecção). Códigos só depois do pagamento confirmado pelo admin.';

create index parceiros_pacotes_parceiro_idx on public.parceiros_pacotes (parceiro_id);

create trigger set_updated_at before update on public.parceiros_pacotes
  for each row execute function public.set_updated_at();
create trigger parceiros_historico after insert or update on public.parceiros_pacotes
  for each row execute function public.parceiros_registar_historico();

create or replace function public.parceiros_pacotes_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parceiro_id is distinct from old.parceiro_id or new.servico is distinct from old.servico then
    raise exception 'pacote: parceiro e serviço imutáveis' using errcode = '42501';
  end if;
  if old.pagamento_estado = 'pago' and new.pagamento_estado <> 'pago' then
    raise exception 'pacote: pagamento confirmado não volta atrás' using errcode = '42501';
  end if;
  if old.estado = 'anulado' and new.estado <> 'anulado' then
    raise exception 'pacote: anulado é final' using errcode = '42501';
  end if;
  -- Depois de haver códigos: só se pode aumentar a quantidade e alargar o prazo.
  if exists (select 1 from public.parceiros_codigos_acesso c where c.pacote_id = old.id) then
    if new.quantidade < (select count(*) from public.parceiros_codigos_acesso c where c.pacote_id = old.id)
       or new.duracao_meses is distinct from old.duracao_meses then
      raise exception 'pacote: quantidade abaixo dos códigos emitidos ou duração alterada' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger parceiros_pacotes_regras before update on public.parceiros_pacotes
  for each row execute function public.parceiros_pacotes_regras();

-- Códigos de activação: só o hash SHA-256 (calculado pela base de dados) e
-- os 4 últimos caracteres (apoio ao cliente). O código em claro só existe no
-- momento da emissão (exportação única).
create table public.parceiros_codigos_acesso (
  id uuid primary key default gen_random_uuid(),
  pacote_id uuid not null references public.parceiros_pacotes (id) on delete restrict,
  codigo_hash text not null unique check (codigo_hash ~ '^[0-9a-f]{64}$'),
  sufixo text not null check (sufixo ~ '^[A-HJ-NP-Z2-9]{4}$'),
  estado text not null default 'emitido' check (estado in ('emitido', 'ativado', 'anulado')),
  emitido_em timestamptz not null default now(),
  ativado_em timestamptz,
  user_id uuid references public.utilizadores (id) on delete set null,
  anulado_em timestamptz,
  anulado_motivo text check (anulado_motivo is null or char_length(anulado_motivo) <= 500),
  check ((estado = 'ativado') = (ativado_em is not null)),
  check ((estado = 'anulado') = (anulado_em is not null))
);

comment on table public.parceiros_codigos_acesso is
  'Códigos de activação de um pacote (só hash). Expiram com parceiros_pacotes.ativacao_ate. Uma activação por código. Nunca confundir com cupões Stripe nem códigos de indicação.';

create index parceiros_codigos_acesso_pacote_idx on public.parceiros_codigos_acesso (pacote_id, estado);

create or replace function public.parceiros_codigos_acesso_regras()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo_hash is distinct from old.codigo_hash or new.pacote_id is distinct from old.pacote_id
     or new.emitido_em is distinct from old.emitido_em or new.sufixo is distinct from old.sufixo then
    raise exception 'código de acesso: imutável' using errcode = '42501';
  end if;
  if old.estado <> 'emitido' and new.estado is distinct from old.estado then
    raise exception 'código de acesso: já usado ou anulado' using errcode = '42501';
  end if;
  -- A conta pode ser apagada (user_id → null), nunca trocada.
  if old.user_id is not null and new.user_id is not null and new.user_id <> old.user_id then
    raise exception 'código de acesso: beneficiário imutável' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger parceiros_codigos_acesso_regras before update on public.parceiros_codigos_acesso
  for each row execute function public.parceiros_codigos_acesso_regras();
create trigger parceiros_codigos_acesso_so_insercao before delete on public.parceiros_codigos_acesso
  for each row execute function public.parceiros_historico_so_insercao();

create table public.acessos_patrocinados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  codigo_id uuid not null unique references public.parceiros_codigos_acesso (id) on delete restrict,
  pacote_id uuid not null references public.parceiros_pacotes (id) on delete restrict,
  parceiro_id uuid not null references public.parceiros (id) on delete restrict,
  inicio_em timestamptz not null default now(),
  termina_em timestamptz not null,
  estado text not null default 'ativo' check (estado in ('ativo', 'terminado')),
  terminado_em timestamptz,
  -- Prova da aceitação das condições do benefício.
  termos_versao text not null,
  texto_aceite text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (termina_em > inicio_em)
);

comment on table public.acessos_patrocinados is
  'Protecção oferecida por um Parceiro de Distribuição. Sem Stripe: acesso = estado ativo e termina_em > now(); termina sozinho, sem cobrança. Escrita só por acesso_patrocinado_*.';

create index acessos_patrocinados_user_idx on public.acessos_patrocinados (user_id, estado);
create index acessos_patrocinados_ativos_idx on public.acessos_patrocinados (termina_em) where estado = 'ativo';
-- No máximo um acesso patrocinado ativo por conta.
create unique index acessos_patrocinados_um_ativo on public.acessos_patrocinados (user_id) where estado = 'ativo';

create trigger set_updated_at before update on public.acessos_patrocinados
  for each row execute function public.set_updated_at();

create or replace function public.acessos_patrocinados_prova_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id or new.codigo_id is distinct from old.codigo_id
     or new.pacote_id is distinct from old.pacote_id or new.parceiro_id is distinct from old.parceiro_id
     or new.inicio_em is distinct from old.inicio_em or new.termina_em is distinct from old.termina_em
     or new.termos_versao is distinct from old.termos_versao or new.texto_aceite is distinct from old.texto_aceite
     or new.created_at is distinct from old.created_at then
    raise exception 'acessos_patrocinados: início, fim e aceitação são imutáveis' using errcode = '42501';
  end if;
  if old.estado = 'terminado' and new.estado = 'ativo' then
    raise exception 'acessos_patrocinados: um acesso terminado não volta a ficar ativo' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger acessos_patrocinados_prova_imutavel before update on public.acessos_patrocinados
  for each row execute function public.acessos_patrocinados_prova_imutavel();

-- Avisos ao beneficiário (activação, 15 dias antes, fim): uma linha por
-- acesso e marco (idempotência), como na Protecção gratuita.
create table public.acessos_patrocinados_avisos (
  id uuid primary key default gen_random_uuid(),
  acesso_id uuid not null references public.acessos_patrocinados (id) on delete cascade,
  marco text not null check (marco in ('ativacao', 'd15', 'fim')),
  estado text not null default 'reservado' check (estado in ('reservado', 'enviado', 'falhou')),
  tentativas integer not null default 1,
  erro_codigo text,
  reservado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (acesso_id, marco)
);

-- Emitir códigos em lote: os códigos em claro vêm do servidor (gerados com
-- crypto.randomBytes); a base de dados guarda só o hash. Só com o pagamento
-- confirmado, pacote e parceiro ativos e dentro da quantidade.
create or replace function public.parceiro_pacote_emitir_codigos(p_pacote uuid, p_codigos text[], p_admin uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.parceiros_pacotes%rowtype;
  v_parceiro text;
  v_emitidos int;
  v_n int := coalesce(array_length(p_codigos, 1), 0);
begin
  perform set_config('dolado.ator', p_admin::text, true);
  select * into v_p from public.parceiros_pacotes where id = p_pacote for update;
  if not found then return jsonb_build_object('resultado', 'inexistente'); end if;
  select estado into v_parceiro from public.parceiros where id = v_p.parceiro_id;
  if v_parceiro <> 'ativo' then return jsonb_build_object('resultado', 'parceiro_nao_ativo'); end if;
  if v_p.estado <> 'ativo' then return jsonb_build_object('resultado', 'pacote_anulado'); end if;
  if v_p.pagamento_estado <> 'pago' then return jsonb_build_object('resultado', 'pagamento_por_confirmar'); end if;
  if v_p.ativacao_ate < (now() at time zone 'Europe/Lisbon')::date then
    return jsonb_build_object('resultado', 'pacote_expirado');
  end if;
  if v_n = 0 then return jsonb_build_object('resultado', 'sem_codigos'); end if;
  if exists (select 1 from unnest(p_codigos) c where c !~ '^[A-HJ-NP-Z2-9]{12}$') then
    raise exception 'parceiro_pacote_emitir_codigos: formato de código inválido';
  end if;

  select count(*) into v_emitidos from public.parceiros_codigos_acesso where pacote_id = p_pacote;
  if v_emitidos + v_n > v_p.quantidade then
    return jsonb_build_object('resultado', 'quantidade_excedida', 'disponiveis', v_p.quantidade - v_emitidos);
  end if;

  insert into public.parceiros_codigos_acesso (pacote_id, codigo_hash, sufixo)
  select p_pacote, encode(sha256(convert_to(c, 'UTF8')), 'hex'), right(c, 4)
    from unnest(p_codigos) c;

  return jsonb_build_object('resultado', 'emitidos', 'emitidos', v_n, 'total', v_emitidos + v_n);
end $$;

-- Anular um código ainda não usado.
create or replace function public.parceiro_codigo_acesso_anular(p_id uuid, p_motivo text, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'parceiro_codigo_acesso_anular: motivo obrigatório';
  end if;
  perform set_config('dolado.ator', p_admin::text, true);
  update public.parceiros_codigos_acesso
     set estado = 'anulado', anulado_em = now(), anulado_motivo = p_motivo
   where id = p_id and estado = 'emitido';
  return case when found then 'anulado' else 'sem_alteracao' end;
end $$;

-- Confirmar o pagamento de um pacote (admin).
create or replace function public.parceiro_pacote_confirmar_pagamento(p_pacote uuid, p_referencia text, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('dolado.ator', p_admin::text, true);
  update public.parceiros_pacotes
     set pagamento_estado = 'pago', pagamento_confirmado_em = now(), pagamento_confirmado_por = p_admin,
         pagamento_referencia = nullif(btrim(coalesce(p_referencia, '')), '')
   where id = p_pacote and pagamento_estado = 'por_pagar';
  return case when found then 'confirmado' else 'sem_alteracao' end;
end $$;

revoke execute on function public.parceiro_pacote_emitir_codigos(uuid, text[], uuid) from public, anon, authenticated;
revoke execute on function public.parceiro_codigo_acesso_anular(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.parceiro_pacote_confirmar_pagamento(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.parceiro_pacote_emitir_codigos(uuid, text[], uuid) to service_role;
grant execute on function public.parceiro_codigo_acesso_anular(uuid, text, uuid) to service_role;
grant execute on function public.parceiro_pacote_confirmar_pagamento(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 11. Protecção da conta: subscrição OU Protecção gratuita OU acesso patrocinado
-- ---------------------------------------------------------------------------
create or replace function public.acesso_patrocinado_em_curso(p_user uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.acessos_patrocinados a
     where a.user_id = p_user and a.estado = 'ativo' and a.termina_em > now()
  );
$$;

revoke execute on function public.acesso_patrocinado_em_curso(uuid) from public, anon;
grant execute on function public.acesso_patrocinado_em_curso(uuid) to authenticated, service_role;

create or replace function public.conta_tem_protecao(p_user uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
           select 1 from public.user_access ua
            where ua.user_id = p_user
              and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
         )
      or public.protecao_gratuita_em_curso(p_user)
      or public.acesso_patrocinado_em_curso(p_user);
$$;

-- Fim de uma subscrição paga: não desativa nada enquanto houver período
-- gratuito OU acesso patrocinado em curso.
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
    if not public.protecao_gratuita_em_curso(new.user_id)
       and not public.acesso_patrocinado_em_curso(new.user_id) then
      perform public.protecao_desativar_dados(new.user_id);
    end if;
  elsif v_agora and not v_antes then
    perform public.protecao_reativar_dados(new.user_id);
  end if;

  if v_agora then
    update public.protecao_gratuita
       set estado = 'convertida',
           convertida_em = now(),
           convertida_plano = new.subscription_plan
     where user_id = new.user_id and estado in ('ativa', 'terminada');
  end if;

  return null;
end $$;

revoke execute on function public.alertas_seguir_protecao() from public, anon, authenticated;

-- Decisão de Thiago (20/10/2026): um acesso patrocinado conta como "já teve
-- Protecção" para a Protecção gratuita de 30 dias.
create or replace function public.protecao_gratuita_ja_teve_subscricao(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
           select 1 from public.user_access ua
            where ua.user_id = p_user
              and (ua.stripe_subscription_id is not null
                   or ua.subscription_plan in ('protecao', 'caso_protecao'))
         )
      or exists (
           select 1 from public.user_access ua
             join public.stripe_subscriptions s on s.stripe_customer_id = ua.stripe_customer_id
            where ua.user_id = p_user
         )
      or exists (
           select 1 from public.stripe_payments p
            where p.user_id = p_user and p.stripe_subscription_id is not null
              and p.estado in ('concluido', 'reembolsado', 'assinatura_cancelada')
         )
      or exists (
           select 1 from public.acessos_patrocinados a where a.user_id = p_user
         );
$$;

revoke execute on function public.protecao_gratuita_ja_teve_subscricao(uuid) from public, anon, authenticated;

-- Resumo mensal: também quem teve acesso patrocinado em curso no mês.
create or replace function public.protecao_resumo_ativa_no_mes(p_utilizador uuid, p_mes date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
           select 1
             from public.user_access ua
             join public.stripe_subscriptions s on s.stripe_subscription_id = ua.stripe_subscription_id
            where ua.user_id = p_utilizador
              and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
              and (
                s.start_date is null
                or s.start_date < ((date_trunc('month', p_mes::timestamp) + interval '1 month') at time zone 'Europe/Lisbon')
              )
         )
      or exists (
           select 1 from public.protecao_gratuita g
            where g.user_id = p_utilizador
              and g.estado = 'ativa' and g.termina_em > now()
              and g.inicio_em < ((date_trunc('month', p_mes::timestamp) + interval '1 month') at time zone 'Europe/Lisbon')
         )
      or exists (
           select 1 from public.acessos_patrocinados a
            where a.user_id = p_utilizador
              and a.estado = 'ativo' and a.termina_em > now()
              and a.inicio_em < ((date_trunc('month', p_mes::timestamp) + interval '1 month') at time zone 'Europe/Lisbon')
         );
$$;

-- Avisos da Protecção gratuita: nenhum depois de um acesso patrocinado (o
-- período gratuito termina na activação; "vai terminar"/"terminou" seria falso).
create or replace function public.protecao_gratuita_marco_atual(p_id uuid, p_agora timestamptz default now())
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_g public.protecao_gratuita%rowtype;
  v_marco text;
begin
  select * into v_g from public.protecao_gratuita where id = p_id;
  if not found or v_g.estado = 'convertida' then
    return null;
  end if;
  if exists (
    select 1 from public.user_access ua
     where ua.user_id = v_g.user_id and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
  ) then
    return null;
  end if;
  if exists (select 1 from public.acessos_patrocinados a where a.user_id = v_g.user_id) then
    return null;
  end if;

  if v_g.termina_em <= p_agora then
    return case when p_agora < v_g.termina_em + interval '7 days' then 'd30' end;
  end if;

  v_marco := case
    when p_agora >= v_g.termina_em - interval '1 day' then 'd29'
    when p_agora >= v_g.termina_em - interval '5 days' then 'd25'
    when p_agora >= v_g.inicio_em + interval '7 days' then 'd7'
    else 'd0'
  end;
  if v_marco in ('d7', 'd25') and v_g.lembretes_desativados_em is not null then
    return null;
  end if;
  return v_marco;
end $$;

revoke execute on function public.protecao_gratuita_marco_atual(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.protecao_gratuita_marco_atual(uuid, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 12. Activação, fim e avisos do acesso patrocinado
-- ---------------------------------------------------------------------------
-- Resultado: ativado | ja_ativado (o mesmo código, esta conta) |
-- demasiadas_tentativas | codigo_invalido | codigo_expirado |
-- protecao_ativa (subscrição paga — decisão de Thiago: recusar) |
-- acesso_ativo (já tem outro acesso patrocinado) | email_nao_confirmado |
-- conta_invalida
create or replace function public.acesso_patrocinado_ativar(
  p_user uuid,
  p_codigo text,
  p_termos_versao text,
  p_texto_aceite text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g'));
  v_hash text;
  v_c public.parceiros_codigos_acesso%rowtype;
  v_p public.parceiros_pacotes%rowtype;
  v_parceiro text;
  v_a public.acessos_patrocinados%rowtype;
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
begin
  if coalesce(btrim(p_termos_versao), '') = '' or coalesce(btrim(p_texto_aceite), '') = '' then
    raise exception 'acesso_patrocinado_ativar: aceitação das condições em falta';
  end if;
  if not exists (select 1 from public.utilizadores u where u.id = p_user and u.role = 'cliente') then
    return jsonb_build_object('resultado', 'conta_invalida');
  end if;
  if not exists (
    select 1 from auth.users au
     where au.id = p_user and au.email_confirmed_at is not null and au.deleted_at is null
  ) then
    return jsonb_build_object('resultado', 'email_nao_confirmado');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('acesso_patrocinado:' || p_user::text, 0));

  -- Contra tentativas de adivinhar códigos: 10 por conta e por hora (as
  -- válidas também contam; um utilizador normal precisa de uma).
  if not public.limite_tentar('codigo_acesso:' || p_user::text, 10, interval '1 hour') then
    return jsonb_build_object('resultado', 'demasiadas_tentativas');
  end if;

  if v_codigo !~ '^[A-HJ-NP-Z2-9]{12}$' then
    return jsonb_build_object('resultado', 'codigo_invalido');
  end if;
  v_hash := encode(sha256(convert_to(v_codigo, 'UTF8')), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('codigo_acesso:' || v_hash, 0));

  select * into v_c from public.parceiros_codigos_acesso where codigo_hash = v_hash for update;
  if not found or v_c.estado = 'anulado' then
    return jsonb_build_object('resultado', 'codigo_invalido');
  end if;
  if v_c.estado = 'ativado' then
    if v_c.user_id = p_user then
      select * into v_a from public.acessos_patrocinados where codigo_id = v_c.id;
      return jsonb_build_object('resultado', 'ja_ativado', 'id', v_a.id,
                                'inicio_em', v_a.inicio_em, 'termina_em', v_a.termina_em);
    end if;
    -- Nunca revelar que o código existe e foi usado por outra pessoa.
    return jsonb_build_object('resultado', 'codigo_invalido');
  end if;

  select * into v_p from public.parceiros_pacotes where id = v_c.pacote_id;
  select estado into v_parceiro from public.parceiros where id = v_p.parceiro_id;
  if v_p.estado <> 'ativo' or v_p.pagamento_estado <> 'pago' or v_parceiro <> 'ativo' then
    return jsonb_build_object('resultado', 'codigo_invalido');
  end if;
  if v_p.ativacao_ate < v_hoje then
    return jsonb_build_object('resultado', 'codigo_expirado');
  end if;

  if exists (
    select 1 from public.user_access ua
     where ua.user_id = p_user and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
  ) then
    return jsonb_build_object('resultado', 'protecao_ativa');
  end if;
  if public.acesso_patrocinado_em_curso(p_user) then
    return jsonb_build_object('resultado', 'acesso_ativo');
  end if;

  -- Meses de calendário em Lisboa (31/01 + 1 mês = 28/29 de Fevereiro).
  insert into public.acessos_patrocinados (user_id, codigo_id, pacote_id, parceiro_id, inicio_em, termina_em,
    termos_versao, texto_aceite)
  values (p_user, v_c.id, v_p.id, v_p.parceiro_id, now(),
    ((now() at time zone 'Europe/Lisbon') + make_interval(months => v_p.duracao_meses)) at time zone 'Europe/Lisbon',
    p_termos_versao, p_texto_aceite)
  returning * into v_a;

  update public.parceiros_codigos_acesso
     set estado = 'ativado', ativado_em = now(), user_id = p_user
   where id = v_c.id;

  -- Uma Protecção gratuita em curso termina (o acesso patrocinado cobre-a;
  -- evita os avisos "o seu período gratuito vai terminar").
  update public.protecao_gratuita
     set estado = 'terminada', terminada_em = now()
   where user_id = p_user and estado = 'ativa';

  perform public.protecao_reativar_dados(p_user);

  return jsonb_build_object('resultado', 'ativado', 'id', v_a.id,
                            'inicio_em', v_a.inicio_em, 'termina_em', v_a.termina_em);
end $$;

-- Job: termina os acessos cuja data passou; sem outra Protecção, desativa
-- os dados (conservados 6 meses, como no fim de uma subscrição). Limpa
-- tentativas, visitas de parceiros e candidaturas rejeitadas antigas.
create or replace function public.acesso_patrocinado_manutencao(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_terminados int := 0;
  v_tentativas int;
  v_visitas int;
  v_candidaturas int;
begin
  for v_user in
    update public.acessos_patrocinados
       set estado = 'terminado', terminado_em = p_agora
     where estado = 'ativo' and termina_em <= p_agora
    returning user_id
  loop
    v_terminados := v_terminados + 1;
    if not public.conta_tem_protecao(v_user) then
      perform public.protecao_desativar_dados(v_user);
    end if;
  end loop;

  delete from public.limites_tentativas where em < p_agora - interval '2 days';
  get diagnostics v_tentativas = row_count;
  delete from public.parceiros_visitas where criado_em < p_agora - interval '30 days';
  get diagnostics v_visitas = row_count;
  delete from public.parceiros_candidaturas
   where estado = 'rejeitada' and decidido_em < p_agora - interval '12 months';
  get diagnostics v_candidaturas = row_count;

  return jsonb_build_object('terminados', v_terminados, 'tentativas_apagadas', v_tentativas,
                            'visitas_apagadas', v_visitas, 'candidaturas_apagadas', v_candidaturas);
end $$;

-- Marco actual do aviso: ativacao (primeiro dia), d15 (15 dias antes do fim),
-- fim (nos 7 dias seguintes ao fim). Nada se a conta tiver subscrição paga.
create or replace function public.acesso_patrocinado_marco_atual(p_id uuid, p_agora timestamptz default now())
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_a public.acessos_patrocinados%rowtype;
begin
  select * into v_a from public.acessos_patrocinados where id = p_id;
  if not found then return null; end if;
  if v_a.termina_em <= p_agora then
    if exists (
      select 1 from public.user_access ua
       where ua.user_id = v_a.user_id and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
    ) then
      return null;
    end if;
    return case when p_agora < v_a.termina_em + interval '7 days' then 'fim' end;
  end if;
  if p_agora >= v_a.termina_em - interval '15 days' then
    return case when exists (
      select 1 from public.user_access ua
       where ua.user_id = v_a.user_id and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
    ) then null else 'd15' end;
  end if;
  return case when p_agora < v_a.inicio_em + interval '1 day' then 'ativacao' end;
end $$;

create or replace function public.acesso_patrocinado_avisos_pendentes(p_agora timestamptz default now())
returns table (acesso_id uuid, user_id uuid, email text, marco text, inicio_em timestamptz, termina_em timestamptz, parceiro text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.user_id, au.email::text, m.marco, a.inicio_em, a.termina_em, p.nome
    from public.acessos_patrocinados a
    join public.parceiros p on p.id = a.parceiro_id
    join auth.users au on au.id = a.user_id
    cross join lateral (select public.acesso_patrocinado_marco_atual(a.id, p_agora) as marco) m
   where a.termina_em > p_agora - interval '7 days'
     and m.marco is not null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and not exists (
       select 1 from public.acessos_patrocinados_avisos x
        where x.acesso_id = a.id and x.marco = m.marco
          and (x.estado in ('enviado', 'reservado') or x.tentativas >= 3)
     )
   order by a.inicio_em;
$$;

create or replace function public.acesso_patrocinado_aviso_reservar(p_id uuid, p_marco text, p_agora timestamptz default now())
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if public.acesso_patrocinado_marco_atual(p_id, p_agora) is distinct from p_marco then
    return null;
  end if;
  insert into public.acessos_patrocinados_avisos as x (acesso_id, marco)
  values (p_id, p_marco)
  on conflict (acesso_id, marco) do update
     set estado = 'reservado', tentativas = x.tentativas + 1, erro_codigo = null, reservado_em = now()
   where x.estado = 'falhou' and x.tentativas < 3
  returning x.id into v_id;
  return v_id;
end $$;

create or replace function public.acesso_patrocinado_aviso_concluir(
  p_aviso uuid, p_enviado boolean, p_erro text default null, p_repetir boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_enviado then
    update public.acessos_patrocinados_avisos
       set estado = 'enviado', erro_codigo = null, enviado_em = now()
     where id = p_aviso and estado = 'reservado';
  else
    update public.acessos_patrocinados_avisos
       set estado = 'falhou', erro_codigo = left(coalesce(p_erro, 'erro'), 64),
           tentativas = case when p_repetir then tentativas else 3 end
     where id = p_aviso and estado = 'reservado';
  end if;
  return found;
end $$;

revoke execute on function public.acesso_patrocinado_ativar(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.acesso_patrocinado_manutencao(timestamptz) from public, anon, authenticated;
revoke execute on function public.acesso_patrocinado_marco_atual(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.acesso_patrocinado_avisos_pendentes(timestamptz) from public, anon, authenticated;
revoke execute on function public.acesso_patrocinado_aviso_reservar(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.acesso_patrocinado_aviso_concluir(uuid, boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.acesso_patrocinado_ativar(uuid, text, text, text) to service_role;
grant execute on function public.acesso_patrocinado_manutencao(timestamptz) to service_role;
grant execute on function public.acesso_patrocinado_marco_atual(uuid, timestamptz) to service_role;
grant execute on function public.acesso_patrocinado_avisos_pendentes(timestamptz) to service_role;
grant execute on function public.acesso_patrocinado_aviso_reservar(uuid, text, timestamptz) to service_role;
grant execute on function public.acesso_patrocinado_aviso_concluir(uuid, boolean, text, boolean) to service_role;

-- Relatório de um Parceiro de Distribuição (só contagens; sem quem activou).
create or replace function public.parceiro_relatorio_distribuicao(p_parceiro uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
begin
  -- Só bloqueia sessões da API que não sejam de admin (service_role e o servidor passam).
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'parceiro_relatorio_distribuicao: só admin';
  end if;
  select jsonb_build_object(
    'adquiridos', coalesce((select sum(quantidade) from public.parceiros_pacotes
                             where parceiro_id = p_parceiro and estado = 'ativo'), 0),
    'emitidos', count(c.id),
    'ativados', count(c.id) filter (where c.estado = 'ativado'),
    'disponiveis', count(c.id) filter (where c.estado = 'emitido' and pk.ativacao_ate >= v_hoje and pk.estado = 'ativo'),
    'expirados', count(c.id) filter (where c.estado = 'emitido' and (pk.ativacao_ate < v_hoje or pk.estado = 'anulado')),
    'anulados', count(c.id) filter (where c.estado = 'anulado'),
    'ativos_agora', (select count(*) from public.acessos_patrocinados a
                      where a.parceiro_id = p_parceiro and a.estado = 'ativo' and a.termina_em > now())
  )
    into v
    from public.parceiros_pacotes pk
    left join public.parceiros_codigos_acesso c on c.pacote_id = pk.id
   where pk.parceiro_id = p_parceiro;
  return v;
end $$;

revoke execute on function public.parceiro_relatorio_distribuicao(uuid) from public, anon;
grant execute on function public.parceiro_relatorio_distribuicao(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 13. RLS: só o admin lê; o cliente lê só o próprio acesso patrocinado (para
-- conta_tem_protecao() com a sessão dele). Ninguém escreve pela API.
-- ---------------------------------------------------------------------------
alter table public.parceiros_candidaturas enable row level security;
alter table public.parceiros enable row level security;
alter table public.parceiros_condicoes enable row level security;
alter table public.parceiros_historico enable row level security;
alter table public.parceiros_codigos enable row level security;
alter table public.parceiros_visitas enable row level security;
alter table public.parceiros_atribuicoes enable row level security;
alter table public.parceiros_oportunidades enable row level security;
alter table public.parceiros_oportunidades_receitas enable row level security;
alter table public.parceiros_faturas enable row level security;
alter table public.parceiros_pagamentos enable row level security;
alter table public.parceiros_comissoes enable row level security;
alter table public.limites_tentativas enable row level security;
alter table public.parceiros_pacotes enable row level security;
alter table public.parceiros_codigos_acesso enable row level security;
alter table public.acessos_patrocinados enable row level security;
alter table public.acessos_patrocinados_avisos enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'parceiros_candidaturas', 'parceiros', 'parceiros_condicoes', 'parceiros_historico',
    'parceiros_codigos', 'parceiros_visitas', 'parceiros_atribuicoes', 'parceiros_oportunidades',
    'parceiros_oportunidades_receitas', 'parceiros_faturas', 'parceiros_pagamentos',
    'parceiros_comissoes', 'parceiros_pacotes', 'parceiros_codigos_acesso',
    'acessos_patrocinados', 'acessos_patrocinados_avisos'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy "Admin lê %s" on public.%I for select to authenticated using (public.is_admin())', t, t);
  end loop;
end $$;

revoke all on public.limites_tentativas from anon, authenticated;

-- O cliente lê o próprio acesso patrocinado; das colunas, nunca o código nem o pacote.
create policy "Cliente lê o próprio acesso patrocinado" on public.acessos_patrocinados
  for select to authenticated using (user_id = auth.uid());
revoke select on public.acessos_patrocinados from authenticated;
grant select (id, user_id, parceiro_id, inicio_em, termina_em, estado, terminado_em, created_at)
  on public.acessos_patrocinados to authenticated;

-- ---------------------------------------------------------------------------
-- 14. Job: fim dos acessos patrocinados e limpezas (só SQL). Os e-mails são
-- enviados pela rota interna da Protecção gratuita (a acrescentar no código).
-- ---------------------------------------------------------------------------
select cron.schedule(
  'acessos-patrocinados-manutencao',
  '25 * * * *',
  $$ select public.acesso_patrocinado_manutencao(); $$
);

-- Funções de trigger (não chamáveis diretamente, mas sem EXECUTE pela API por coerência).
revoke execute on function public.parceiros_historico_so_insercao() from public, anon, authenticated;
revoke execute on function public.parceiros_condicoes_imutavel() from public, anon, authenticated;
revoke execute on function public.parceiros_codigos_imutavel() from public, anon, authenticated;
revoke execute on function public.parceiros_atribuicoes_imutavel() from public, anon, authenticated;
revoke execute on function public.parceiros_oportunidades_regras() from public, anon, authenticated;
revoke execute on function public.parceiros_comissoes_transicao() from public, anon, authenticated;
revoke execute on function public.parceiros_pacotes_regras() from public, anon, authenticated;
revoke execute on function public.parceiros_codigos_acesso_regras() from public, anon, authenticated;
revoke execute on function public.acessos_patrocinados_prova_imutavel() from public, anon, authenticated;
