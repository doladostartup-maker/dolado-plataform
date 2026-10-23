-- DoLado Empresas — Fase 2: fundação do modelo de dados (23/10/2026)
--
-- Piloto da DoLado Empresas (plano aprovado por Thiago a 23/10/2026). Esta
-- migration só cria estruturas: nenhuma interface as usa ainda e nenhuma conta
-- é de empresa (EMPRESAS_ATIVO desligado). Tipo A + B (ver o plano, secção
-- "Activação segura das migrations"): aplicar ANTES do merge — o código actual
-- não lê nada daqui e as policies restritivas só se aplicam a contas de
-- empresa, que ainda não existem.
--
-- Decisões:
--   - utilizadores.tipo_conta ('particular' | 'empresa'): todas as contas
--     nascem particulares (handle_new_user não muda); só empresa_marcar_conta()
--     (service_role) passa uma conta NOVA e SEM HISTÓRICO a empresa, nunca o
--     contrário (risco RC1 — nunca converter uma conta particular existente).
--     A verificação de que o signUp criou mesmo a conta (identities não vazio)
--     é feita no servidor (Fase 4).
--   - No piloto, uma conta de empresa = uma organização; o Monitor continua com
--     pertença por utilizador_id. As tabelas novas usam pertença por
--     organização (organizacoes_membros), preparadas para vários utilizadores.
--     Dívida documentada em docs/especificacoes/DOLADO_EMPRESAS_PILOTO.md.
--   - Contas de empresa só lêem com a sessão verificada com o segundo factor
--     (aal2): policies das tabelas novas e policies RESTRITIVAS nas tabelas do
--     Monitor que o cliente lê. Para contas particulares, as restritivas são
--     sempre verdadeiras — nada muda.
--   - Toda a escrita é da service_role (funções a criar nas fases seguintes).
--   - Pseudónimos do identificador fiscal com versão da chave
--     (hmac:v<N>:<hex>), para permitir rotação controlada.

-- ===========================================================================
-- 1. Tipo de conta
-- ===========================================================================
alter table public.utilizadores
  add column tipo_conta text not null default 'particular'
    check (tipo_conta in ('particular', 'empresa'));

comment on column public.utilizadores.tipo_conta is
  'particular | empresa. Todas as contas nascem particulares; só empresa_marcar_conta() (service_role) passa uma conta nova e sem histórico a empresa. Imutável fora disso.';

create or replace function public.utilizadores_tipo_conta_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo_conta is distinct from old.tipo_conta
     and not (old.tipo_conta = 'particular' and new.tipo_conta = 'empresa'
              and coalesce(current_setting('dolado.empresa_marcar', true), '') = '1') then
    raise exception 'utilizadores.tipo_conta: só empresa_marcar_conta() pode alterar o tipo de conta'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger utilizadores_tipo_conta_imutavel
  before update of tipo_conta on public.utilizadores
  for each row execute function public.utilizadores_tipo_conta_imutavel();

revoke execute on function public.utilizadores_tipo_conta_imutavel() from public, anon, authenticated;

-- ===========================================================================
-- 2. Ajudantes de sessão
-- ===========================================================================
-- A conta da sessão é de empresa? (SECURITY DEFINER: lê utilizadores sem
-- depender das policies; usado dentro de policies.)
create or replace function public.conta_empresa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.utilizadores
     where id = (select auth.uid()) and tipo_conta = 'empresa'
  );
$$;

-- Sessão verificada com o segundo factor (claim aal do JWT).
create or replace function public.sessao_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2';
$$;

revoke execute on function public.conta_empresa() from public, anon;
revoke execute on function public.sessao_aal2() from public, anon;
grant execute on function public.conta_empresa() to authenticated, service_role;
grant execute on function public.sessao_aal2() to authenticated, service_role;

-- ===========================================================================
-- 3. Organizações
-- ===========================================================================
create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 200),
  tipo_entidade text not null
    check (tipo_entidade in ('sociedade', 'empresario_nome_individual', 'profissional_independente')),
  -- NIPC/NIF em claro: dado de facturação da própria organização.
  nif text not null check (nif ~ '^[0-9]{9}$'),
  -- Pseudónimo do identificador (comparação com a análise gratuita) e versão
  -- da chave com que foi calculado; recalculável a partir do nif.
  identificador_hmac text check (identificador_hmac ~ '^hmac:v[0-9]+:[0-9a-f]{64}$'),
  identificador_chave_versao integer check (identificador_chave_versao >= 1),
  responsavel_nome text check (responsavel_nome is null or char_length(responsavel_nome) <= 200),
  morada_fiscal text check (morada_fiscal is null or char_length(morada_fiscal) <= 500),
  estado text not null default 'email_por_confirmar'
    check (estado in ('email_por_confirmar', 'mfa_por_configurar', 'a_aguardar_aprovacao', 'lista_espera',
                      'aprovada', 'ativa', 'pagamento_em_atraso', 'suspensa', 'cancelada', 'rejeitada', 'encerrada')),
  activada_em timestamptz,
  revisao_obrigatoria_ate timestamptz,
  -- Fim do acesso só de consulta e exportação (suspensão, cancelamento).
  acesso_consulta_ate timestamptz,
  -- Limites do plano: configuráveis por organização (sem limite físico).
  limite_instalacoes integer not null default 2 check (limite_instalacoes >= 1),
  limite_servicos integer not null default 5 check (limite_servicos >= 1),
  limite_facturas_mes integer not null default 15 check (limite_facturas_mes >= 0),
  -- Mensalidade SEM IVA (Protecção Empresas: 49 € + IVA).
  preco_mensal_cents integer not null default 4900 check (preco_mensal_cents >= 0),
  preco_garantido_ate timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((identificador_hmac is null) = (identificador_chave_versao is null))
);

comment on table public.organizacoes is
  'DoLado Empresas: organização cliente (piloto). Escrita só pela service_role; leitura pelos membros com sessão aal2 e pelo admin.';

-- Um NIPC/NIF por organização em curso (pode voltar depois de terminada).
create unique index organizacoes_nif_em_curso
  on public.organizacoes (nif) where estado not in ('rejeitada', 'cancelada', 'encerrada');
create index organizacoes_identificador_hmac_idx on public.organizacoes (identificador_hmac);
create index organizacoes_estado_idx on public.organizacoes (estado);

create trigger set_updated_at before update on public.organizacoes
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- 4. Membros
-- ===========================================================================
create table public.organizacoes_membros (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  papel text not null default 'administrador' check (papel in ('administrador')),
  -- Futuro: acesso limitado a instalações (null = todas). Não usado no piloto.
  instalacoes_permitidas uuid[],
  criado_em timestamptz not null default now(),
  removido_em timestamptz
);

comment on table public.organizacoes_membros is
  'Pertença a uma organização. Piloto: um administrador por organização e uma organização por conta.';

create unique index organizacoes_membros_um_administrador
  on public.organizacoes_membros (organizacao_id) where removido_em is null and papel = 'administrador';
create unique index organizacoes_membros_uma_organizacao
  on public.organizacoes_membros (utilizador_id) where removido_em is null;

-- Só contas de empresa podem ser membros.
create or replace function public.organizacoes_membros_conta_empresa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.utilizadores where id = new.utilizador_id and tipo_conta = 'empresa') then
    raise exception 'organizacoes_membros: só contas de empresa podem pertencer a uma organização'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger organizacoes_membros_conta_empresa
  before insert or update of utilizador_id on public.organizacoes_membros
  for each row execute function public.organizacoes_membros_conta_empresa();

revoke execute on function public.organizacoes_membros_conta_empresa() from public, anon, authenticated;

-- A conta da sessão pertence a esta organização? (usado nas policies)
create or replace function public.e_membro_organizacao(p_organizacao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizacoes_membros
     where organizacao_id = p_organizacao
       and utilizador_id = (select auth.uid())
       and removido_em is null
  );
$$;

revoke execute on function public.e_membro_organizacao(uuid) from public, anon;
grant execute on function public.e_membro_organizacao(uuid) to authenticated, service_role;

-- ===========================================================================
-- 5. Instalações e ligação aos serviços do Monitor
-- ===========================================================================
create table public.instalacoes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  morada text check (morada is null or char_length(morada) <= 500),
  desativada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.instalacoes is
  'Instalações de uma organização (sede, lojas, escritórios). Sem limite físico: o limite do plano está em organizacoes.limite_instalacoes.';

create unique index instalacoes_nome_unico
  on public.instalacoes (organizacao_id, lower(btrim(nome))) where desativada_em is null;
create index instalacoes_organizacao_idx on public.instalacoes (organizacao_id);

create trigger set_updated_at before update on public.instalacoes
  for each row execute function public.set_updated_at();

alter table public.contratos_monitorizados
  add column instalacao_id uuid references public.instalacoes (id) on delete set null;

comment on column public.contratos_monitorizados.instalacao_id is
  'DoLado Empresas: instalação do serviço (null nos particulares). Tem de ser de uma instalação activa da organização do dono.';

create index contratos_monitorizados_instalacao_idx
  on public.contratos_monitorizados (instalacao_id) where instalacao_id is not null;

create or replace function public.contratos_instalacao_coerente()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.instalacoes i
      join public.organizacoes_membros m on m.organizacao_id = i.organizacao_id
     where i.id = new.instalacao_id
       and i.desativada_em is null
       and m.utilizador_id = new.utilizador_id
       and m.removido_em is null
  ) then
    raise exception 'contratos_monitorizados: a instalação não pertence à organização do dono do serviço'
      using errcode = '23514';
  end if;
  return new;
end $$;

-- Só corre quando há instalação: zero custo nos serviços dos particulares.
create trigger contratos_instalacao_coerente
  before insert or update of instalacao_id, utilizador_id on public.contratos_monitorizados
  for each row when (new.instalacao_id is not null)
  execute function public.contratos_instalacao_coerente();

revoke execute on function public.contratos_instalacao_coerente() from public, anon, authenticated;

-- ===========================================================================
-- 6. Ciclo de pagamento manual
-- ===========================================================================
create table public.empresa_periodos (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  inicio date not null,
  fim date not null,
  valor_cents integer not null check (valor_cents >= 0),
  estado_pagamento text not null default 'por_pagar' check (estado_pagamento in ('por_pagar', 'pago', 'anulado')),
  -- Referência da factura emitida no sistema de facturação externo.
  referencia_factura text check (referencia_factura is null or char_length(referencia_factura) <= 100),
  pago_em timestamptz,
  confirmado_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim > inicio),
  check ((estado_pagamento = 'pago') = (pago_em is not null)),
  unique (organizacao_id, inicio)
);

comment on table public.empresa_periodos is
  'Períodos mensais (aniversário da activação) da Protecção Empresas, pagos por transferência e confirmados no backoffice. Valores sem IVA.';

create trigger set_updated_at before update on public.empresa_periodos
  for each row execute function public.set_updated_at();

-- ===========================================================================
-- 7. Documentos e quota mensal
-- ===========================================================================
create table public.empresa_documentos (
  documento_id uuid primary key references public.documentos_monitor (id) on delete cascade,
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  instalacao_id uuid not null references public.instalacoes (id) on delete cascade,
  -- Contrato e facturas históricas da configuração inicial: não contam.
  configuracao_inicial boolean not null default false,
  periodo_id uuid references public.empresa_periodos (id) on delete set null,
  estado_quota text not null default 'reservada'
    check (estado_quota in ('reservada', 'consumida', 'libertada', 'nao_conta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not configuracao_inicial or estado_quota = 'nao_conta')
);

comment on table public.empresa_documentos is
  'Metadados empresariais de cada documento do Monitor (instalação escolhida no carregamento, quota). documentos_monitor não muda.';

create index empresa_documentos_organizacao_idx on public.empresa_documentos (organizacao_id, periodo_id);

create trigger set_updated_at before update on public.empresa_documentos
  for each row execute function public.set_updated_at();

create table public.empresa_quota_excecoes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  periodo_id uuid references public.empresa_periodos (id) on delete set null,
  facturas_adicionais integer not null check (facturas_adicionais > 0),
  motivo text not null check (char_length(btrim(motivo)) between 1 and 500),
  concedida_por uuid references public.utilizadores (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.empresa_quota_excecoes is
  'Excepções à quota mensal autorizadas pelo admin (sem cobrança de excedentes). Só inserção.';

-- ===========================================================================
-- 8. Revisão humana, ocorrências e histórico (instrumentação desde o início)
-- ===========================================================================
create table public.empresa_revisoes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('documento', 'fatura', 'achado', 'associacao')),
  alvo_id uuid not null,
  revisor uuid references public.utilizadores (id) on delete set null,
  minutos integer not null check (minutos between 0 and 600),
  resultado text not null check (resultado in ('confirmado', 'corrigido', 'descartado')),
  tipo_erro text check (tipo_erro is null or tipo_erro in
    ('extracao_valor', 'extracao_data', 'extracao_identificador', 'associacao_servico', 'associacao_instalacao',
     'classificacao', 'outro')),
  nota text check (nota is null or char_length(nota) <= 1000),
  created_at timestamptz not null default now()
);

comment on table public.empresa_revisoes is
  'Revisão humana das análises empresariais: minutos e tipo de erro (custo e qualidade do piloto). Só inserção; só admin lê.';

create index empresa_revisoes_organizacao_idx on public.empresa_revisoes (organizacao_id, created_at);

create table public.empresa_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references public.organizacoes (id) on delete cascade,
  utilizador_id uuid references public.utilizadores (id) on delete set null,
  tipo text not null check (tipo in ('guarda_recusado', 'erro_extracao', 'erro_associacao', 'erro_tecnico')),
  -- Rota ou função; nunca conteúdo dos documentos nem dados pessoais.
  contexto text not null check (char_length(contexto) between 1 and 200),
  created_at timestamptz not null default now()
);

comment on table public.empresa_ocorrencias is
  'Registo técnico do piloto (guardas recusados, erros de extracção/associação). Sem conteúdo. Só inserção; só admin lê.';

create index empresa_ocorrencias_created_idx on public.empresa_ocorrencias (created_at);

create table public.organizacoes_historico (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  estado_antes text,
  estado_depois text not null,
  alterado_por uuid,
  motivo text check (motivo is null or char_length(motivo) <= 500),
  created_at timestamptz not null default now()
);

comment on table public.organizacoes_historico is
  'Cada mudança de estado de uma organização (trigger). Quem e porquê vêm de dolado.alterado_por / dolado.motivo. Só inserção; só admin lê.';

create index organizacoes_historico_organizacao_idx on public.organizacoes_historico (organizacao_id, created_at);

create or replace function public.organizacoes_registar_historico()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.organizacoes_historico (organizacao_id, estado_antes, estado_depois, alterado_por, motivo)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.estado end,
      new.estado,
      nullif(current_setting('dolado.alterado_por', true), '')::uuid,
      nullif(current_setting('dolado.motivo', true), '')
    );
  end if;
  return new;
end $$;

create trigger organizacoes_registar_historico
  after insert or update of estado on public.organizacoes
  for each row execute function public.organizacoes_registar_historico();

revoke execute on function public.organizacoes_registar_historico() from public, anon, authenticated;

-- Só inserção (apagar só em cascata, quando a organização é eliminada).
create or replace function public.empresa_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    return new;
  end if;
  raise exception '%: registo só de inserção', tg_table_name using errcode = '42501';
end $$;

revoke execute on function public.empresa_so_insercao() from public, anon, authenticated;

create trigger empresa_quota_excecoes_so_insercao before update or delete on public.empresa_quota_excecoes
  for each row execute function public.empresa_so_insercao();
create trigger empresa_revisoes_so_insercao before update or delete on public.empresa_revisoes
  for each row execute function public.empresa_so_insercao();
create trigger empresa_ocorrencias_so_insercao before update or delete on public.empresa_ocorrencias
  for each row execute function public.empresa_so_insercao();
create trigger organizacoes_historico_so_insercao before update or delete on public.organizacoes_historico
  for each row execute function public.empresa_so_insercao();

-- ===========================================================================
-- 9. Acesso ao serviço
-- ===========================================================================
-- total: análises e consulta · consulta: só consulta e exportação · nenhum.
-- O ciclo (atraso, suspensão, cancelamento) é a Fase 5; aqui só a leitura.
create or replace function public.empresa_tem_acesso(p_organizacao uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_estado text;
  v_consulta_ate timestamptz;
begin
  -- Com sessão de cliente, só a própria organização (ou o admin).
  if (select auth.role()) = 'authenticated'
     and not (public.e_membro_organizacao(p_organizacao) or public.is_admin()) then
    return 'nenhum';
  end if;

  select estado, acesso_consulta_ate into v_estado, v_consulta_ate
    from public.organizacoes where id = p_organizacao;
  if not found then return 'nenhum'; end if;

  if v_estado in ('ativa', 'pagamento_em_atraso') then return 'total'; end if;
  if v_estado = 'suspensa' then return 'consulta'; end if;
  if v_estado in ('cancelada', 'encerrada') and v_consulta_ate is not null and v_consulta_ate > now() then
    return 'consulta';
  end if;
  return 'nenhum';
end $$;

revoke execute on function public.empresa_tem_acesso(uuid) from public, anon;
grant execute on function public.empresa_tem_acesso(uuid) to authenticated, service_role;

-- ===========================================================================
-- 10. Marcar uma conta nova como conta de empresa (risco RC1)
-- ===========================================================================
-- marcada | ja_empresa | sem_conta | conta_admin | conta_antiga | com_historico
-- Só contas criadas há menos de 15 minutos e sem nenhum histórico particular.
create or replace function public.empresa_marcar_conta(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_criada timestamptz;
  v_role text;
  v_tipo text;
begin
  perform pg_advisory_xact_lock(hashtextextended('empresa_marcar:' || coalesce(p_user::text, ''), 0));

  select u.created_at into v_criada from auth.users u where u.id = p_user;
  if v_criada is null then return 'sem_conta'; end if;

  select role, tipo_conta into v_role, v_tipo from public.utilizadores where id = p_user;
  if v_role is null then return 'sem_conta'; end if;
  if v_tipo = 'empresa' then return 'ja_empresa'; end if;
  if v_role = 'admin' then return 'conta_admin'; end if;
  if v_criada < now() - interval '15 minutes' then return 'conta_antiga'; end if;

  if exists (select 1 from public.user_access where user_id = p_user)
     or exists (select 1 from public.casos where utilizador_id = p_user)
     or exists (select 1 from public.pedidos_caso where user_id = p_user)
     or exists (select 1 from public.contratos_monitorizados where utilizador_id = p_user)
     or exists (select 1 from public.documentos_monitor where utilizador_id = p_user)
     or exists (select 1 from public.protecao_gratuita where user_id = p_user)
     or exists (select 1 from public.acessos_patrocinados where user_id = p_user)
     or exists (select 1 from public.stripe_payments where user_id = p_user)
     or exists (select 1 from public.consentimentos_compra where user_id = p_user)
     or exists (select 1 from public.indicacoes_codigos where user_id = p_user)
     or exists (select 1 from public.parceiros_atribuicoes where user_id = p_user)
     or exists (select 1 from public.parceiros_area_acessos where user_id = p_user)
     or exists (select 1 from public.diagnosticos_gratuitos where conta_id = p_user) then
    return 'com_historico';
  end if;

  perform set_config('dolado.empresa_marcar', '1', true);
  update public.utilizadores set tipo_conta = 'empresa' where id = p_user;
  perform set_config('dolado.empresa_marcar', '', true);
  return 'marcada';
end $$;

revoke execute on function public.empresa_marcar_conta(uuid) from public, anon, authenticated;
grant execute on function public.empresa_marcar_conta(uuid) to service_role;

-- ===========================================================================
-- 11. RLS e privilégios das tabelas novas
-- ===========================================================================
alter table public.organizacoes enable row level security;
alter table public.organizacoes_membros enable row level security;
alter table public.instalacoes enable row level security;
alter table public.empresa_periodos enable row level security;
alter table public.empresa_documentos enable row level security;
alter table public.empresa_quota_excecoes enable row level security;
alter table public.empresa_revisoes enable row level security;
alter table public.empresa_ocorrencias enable row level security;
alter table public.organizacoes_historico enable row level security;

-- Membros com sessão aal2 lêem a própria organização; o admin lê tudo.
create policy "organizacoes: membro lê a própria (aal2)" on public.organizacoes
  for select to authenticated
  using (public.e_membro_organizacao(id) and (select public.sessao_aal2()));
create policy "organizacoes: admin lê" on public.organizacoes
  for select to authenticated using (public.is_admin());

create policy "organizacoes_membros: conta lê a própria pertença (aal2)" on public.organizacoes_membros
  for select to authenticated
  using (utilizador_id = (select auth.uid()) and (select public.sessao_aal2()));
create policy "organizacoes_membros: admin lê" on public.organizacoes_membros
  for select to authenticated using (public.is_admin());

create policy "instalacoes: membro lê (aal2)" on public.instalacoes
  for select to authenticated
  using (public.e_membro_organizacao(organizacao_id) and (select public.sessao_aal2()));
create policy "instalacoes: admin lê" on public.instalacoes
  for select to authenticated using (public.is_admin());

create policy "empresa_periodos: membro lê (aal2)" on public.empresa_periodos
  for select to authenticated
  using (public.e_membro_organizacao(organizacao_id) and (select public.sessao_aal2()));
create policy "empresa_periodos: admin lê" on public.empresa_periodos
  for select to authenticated using (public.is_admin());

create policy "empresa_documentos: membro lê (aal2)" on public.empresa_documentos
  for select to authenticated
  using (public.e_membro_organizacao(organizacao_id) and (select public.sessao_aal2()));
create policy "empresa_documentos: admin lê" on public.empresa_documentos
  for select to authenticated using (public.is_admin());

create policy "empresa_quota_excecoes: admin lê" on public.empresa_quota_excecoes
  for select to authenticated using (public.is_admin());
create policy "empresa_revisoes: admin lê" on public.empresa_revisoes
  for select to authenticated using (public.is_admin());
create policy "empresa_ocorrencias: admin lê" on public.empresa_ocorrencias
  for select to authenticated using (public.is_admin());
create policy "organizacoes_historico: admin lê" on public.organizacoes_historico
  for select to authenticated using (public.is_admin());

-- Nenhuma escrita pelo cliente nem pelo anon: só a service_role (funções das
-- fases seguintes). O pseudónimo do identificador não é lido pelo cliente.
revoke all on public.organizacoes, public.organizacoes_membros, public.instalacoes, public.empresa_periodos,
  public.empresa_documentos, public.empresa_quota_excecoes, public.empresa_revisoes, public.empresa_ocorrencias,
  public.organizacoes_historico from anon, authenticated;

grant select (id, nome, tipo_entidade, nif, responsavel_nome, morada_fiscal, estado, activada_em,
  revisao_obrigatoria_ate, acesso_consulta_ate, limite_instalacoes, limite_servicos, limite_facturas_mes,
  preco_mensal_cents, preco_garantido_ate, created_at, updated_at)
  on public.organizacoes to authenticated;
grant select (id, organizacao_id, utilizador_id, papel, criado_em, removido_em)
  on public.organizacoes_membros to authenticated;
grant select on public.instalacoes, public.empresa_periodos, public.empresa_documentos,
  public.empresa_quota_excecoes, public.empresa_revisoes, public.empresa_ocorrencias, public.organizacoes_historico
  to authenticated;

grant select, insert, update, delete on public.organizacoes, public.organizacoes_membros, public.instalacoes,
  public.empresa_periodos, public.empresa_documentos to service_role;
grant select, insert on public.empresa_quota_excecoes, public.empresa_revisoes, public.empresa_ocorrencias,
  public.organizacoes_historico to service_role;

-- ===========================================================================
-- 12. Monitor: contas de empresa só lêem com a sessão aal2
-- ===========================================================================
-- Policies RESTRITIVAS (somam-se às existentes com AND). Para contas
-- particulares, conta_empresa() é falso e a condição é sempre verdadeira:
-- o que cada cliente lê hoje não muda. (select …) avalia uma vez por consulta.
create policy "empresa: Monitor só com aal2" on public.contratos_monitorizados as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.documentos_monitor as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.faturas_monitor as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.contratos_campos as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.contratos_versoes as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.servicos_identificadores as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.associacoes_documento as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.eventos_servico as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.achados_monitor as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.contratos_alertas_envios as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
create policy "empresa: Monitor só com aal2" on public.protecao_resumos_mensais as restrictive
  for select to authenticated using (not (select public.conta_empresa()) or (select public.sessao_aal2()));
