-- DoLado — Acompanhamento de serviços: contrato + faturas (04/10/2026).
--
-- Plano: docs/especificacoes/PLANO_ACOMPANHAMENTO_SERVICOS.md (validado por
-- Thiago a 03/10/2026: revisão humana de tudo o que mereça atenção; dados
-- atuais do Monitor são de teste; nome "Serviços acompanhados").
--
-- Princípio: o contrato é o que foi contratado; a fatura é o que aconteceu
-- num período; a comparação é feita pelo código. Uma fatura NUNCA altera
-- condições contratuais.
--
-- contratos_monitorizados passa a representar o SERVIÇO ACOMPANHADO (pode
-- existir sem contrato). O nome da tabela e das colunas contrato_id mantém-se
-- (RLS, funções, Edge Function e testes dependem dele).
--
-- Tudo aditivo. Único passo sobre dados: as propostas ainda pendentes vindas
-- de faturas para fornecedor/mensalidade/referência ficam "rejeitado" (a
-- fatura deixa de propor condições contratuais) — o histórico mantém-se.

-- ===========================================================================
-- 1. Condições contratuais novas (promoção e serviços incluídos)
-- ===========================================================================

comment on table public.contratos_monitorizados is
  'Serviço acompanhado pela DoLado (com ou sem contrato). Condições contratuais em contratos_campos (nunca vindas de faturas) e versões em contratos_versoes; o que aconteceu em cada período em faturas_monitor e eventos_servico.';

alter table public.contratos_monitorizados
  add column desconto_promocao_cents integer check (desconto_promocao_cents >= 0),
  add column data_inicio_promocao date,
  add column servicos_incluidos text check (char_length(servicos_incluidos) <= 300);

alter table public.contratos_campos drop constraint contratos_campos_campo_check;
alter table public.contratos_campos add constraint contratos_campos_campo_check check (campo in (
  'fornecedor', 'referencia_contrato', 'servico', 'data_inicio', 'data_fim_fidelizacao',
  'data_fim_promocao', 'descricao_promocao', 'mensalidade_cents', 'vantagem_cents',
  'cessacao_operador_cents', 'cessacao_operador_data', 'cpe', 'cui',
  'tipo_fidelizacao', 'nova_instalacao', 'equipamento_subsidiado',
  'data_assinatura', 'data_ativacao', 'duracao_fidelizacao_meses', 'inicio_na_ativacao',
  'desconto_promocao_cents', 'data_inicio_promocao', 'servicos_incluidos'
));

-- ===========================================================================
-- 2. Integridade genérica
-- ===========================================================================

create or replace function public.monitor_so_insercao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Registo só de inserção (%)', tg_table_name using errcode = '42501';
end $$;

revoke execute on function public.monitor_so_insercao() from public, anon, authenticated;

-- ===========================================================================
-- 3. Identificadores do serviço (associação de documentos)
-- ===========================================================================
-- NIF e nome do titular nunca ficam em texto: só o hash (igualdade) e uma
-- apresentação mascarada. Referências de conta/contrato/serviço ficam
-- normalizadas (já são mostradas ao cliente no próprio documento).

create table public.servicos_identificadores (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  tipo text not null check (tipo in (
    'nif_titular', 'titular', 'numero_cliente', 'referencia_conta', 'referencia_contrato',
    'numero_servico', 'cpe', 'cui'
  )),
  valor_normalizado text not null check (char_length(valor_normalizado) between 1 and 120),
  apresentacao text check (char_length(apresentacao) <= 60),
  origem text not null check (origem in ('contrato', 'fatura', 'cliente', 'admin')),
  documento_id uuid references public.documentos_monitor (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (contrato_id, tipo, valor_normalizado)
);

comment on table public.servicos_identificadores is
  'Identificadores estáveis de um serviço acompanhado (NIF/titular só em hash). Usados para decidir se um documento pertence ao serviço. Só inserção.';

create index servicos_identificadores_contrato_idx on public.servicos_identificadores (contrato_id);

create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.servicos_identificadores for each row execute function public.monitor_verificar_dono();
create trigger servicos_identificadores_so_insercao before update on public.servicos_identificadores
  for each row execute function public.monitor_so_insercao();

-- ===========================================================================
-- 4. Associação de cada documento a um serviço
-- ===========================================================================
-- Um documento com associação "possivel" ou "conflito" fica sem contrato_id
-- (nada é registado no serviço) até o cliente decidir. associacao_sugerida =
-- serviço em causa (o escolhido no upload ou o mais próximo).

alter table public.documentos_monitor
  add column associacao_estado text
    check (associacao_estado in ('confirmada', 'possivel', 'conflito', 'novo_servico', 'manual', 'legado')),
  add column associacao_confianca numeric(3, 2) check (associacao_confianca between 0 and 1),
  add column associacao_motivos jsonb not null default '[]'::jsonb check (jsonb_typeof(associacao_motivos) = 'array'),
  add column associacao_conflitos jsonb not null default '[]'::jsonb check (jsonb_typeof(associacao_conflitos) = 'array'),
  add column associacao_sugerida uuid references public.contratos_monitorizados (id) on delete set null;

comment on column public.documentos_monitor.associacao_estado is
  'confirmada (identificadores coincidem), possivel (não confirmado), conflito (identificação diferente), novo_servico (criou um serviço), manual (o cliente associou explicitamente — ver associacoes_documento), legado (anterior a 04/10/2026).';

update public.documentos_monitor set associacao_estado = 'legado' where contrato_id is not null;

create index documentos_monitor_por_associar_idx on public.documentos_monitor (utilizador_id)
  where associacao_estado in ('possivel', 'conflito') and contrato_id is null;

-- Dono da sugestão = dono do documento.
create or replace function public.documentos_monitor_sugestao_dono()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.associacao_sugerida is not null and not exists (
    select 1 from public.contratos_monitorizados where id = new.associacao_sugerida and utilizador_id = new.utilizador_id
  ) then
    raise exception 'Serviço sugerido de outro utilizador' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.documentos_monitor_sugestao_dono() from public, anon, authenticated;

create trigger documentos_monitor_sugestao_dono before insert or update of associacao_sugerida
  on public.documentos_monitor for each row execute function public.documentos_monitor_sugestao_dono();

-- Prova de cada decisão de associação (automática ou explícita).
create table public.associacoes_documento (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_monitor (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  contrato_id uuid references public.contratos_monitorizados (id) on delete set null,
  decisao text not null check (decisao in ('automatica', 'associar_mesmo_assim', 'outro_servico', 'novo_servico', 'cancelar')),
  estado_associacao text,
  motivos jsonb not null default '[]'::jsonb,
  conflitos jsonb not null default '[]'::jsonb,
  decidido_por uuid references auth.users (id) on delete set null,
  papel text not null check (papel in ('cliente', 'admin', 'sistema')),
  created_at timestamptz not null default now()
);

comment on table public.associacoes_documento is
  'Auditoria das associações documento → serviço. Uma associação contra o resultado da verificação (associar_mesmo_assim, outro_servico) fica sempre aqui com quem decidiu. Só inserção.';

create index associacoes_documento_documento_idx on public.associacoes_documento (documento_id);

create trigger associacoes_documento_so_insercao before update on public.associacoes_documento
  for each row execute function public.monitor_so_insercao();

-- ===========================================================================
-- 5. Faturas: identificação, duplicados e resultado da comparação
-- ===========================================================================
-- Os componentes (mensalidade recorrente, descontos, consumos, extras,
-- equipamentos, créditos, impostos) são calculados pelo código a partir das
-- linhas — uma só fonte, também para as faturas antigas.

alter table public.faturas_monitor
  add column numero_fatura text check (char_length(numero_fatura) <= 60),
  add column mensalidade_lida_cents integer check (mensalidade_lida_cents >= 0),
  add column resultado text check (resultado in ('ok', 'info', 'atencao')),
  add column em_verificacao boolean not null default false,
  add column confirmada_cliente_em timestamptz,
  add column valores_contestados_em timestamptz;

comment on column public.faturas_monitor.mensalidade_lida_cents is
  'Mensalidade indicada na fatura (valor OBSERVADO). Nunca é uma condição contratual.';
comment on column public.faturas_monitor.em_verificacao is
  'Há uma situação desta fatura à espera de revisão da DoLado (o cliente vê só "Em verificação").';

create unique index faturas_monitor_numero_idx on public.faturas_monitor (contrato_id, numero_fatura)
  where numero_fatura is not null;

-- ===========================================================================
-- 6. Versões das condições contratuais
-- ===========================================================================
-- A versão em vigor (valido_ate null) espelha as condições atuais do contrato
-- (contratos_campos com origem contrato/cliente/admin — nunca fatura). Uma
-- alteração legítima (renegociação, nova promoção…) fecha a versão em vigor e
-- abre outra a partir de uma data: cada fatura é comparada com a versão
-- válida no seu período.

create table public.contratos_versoes (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  valido_desde date,
  valido_ate date,
  mensalidade_cents integer check (mensalidade_cents >= 0),
  desconto_cents integer check (desconto_cents >= 0),
  descricao_promocao text,
  promocao_inicio date,
  promocao_fim date,
  servicos_incluidos text,
  data_fim_fidelizacao date,
  origem text,
  documento_id uuid references public.documentos_monitor (id) on delete set null,
  motivo text not null default 'inicial'
    check (motivo in ('inicial', 'renegociacao', 'alteracao_tarifaria', 'nova_promocao', 'mudanca_pacote', 'correcao', 'outro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valido_ate is null or valido_desde is null or valido_ate >= valido_desde)
);

comment on table public.contratos_versoes is
  'Versões das condições contratuais de um serviço, com período de validade. Só a versão em vigor (valido_ate null) acompanha as correções; as fechadas não mudam.';

create unique index contratos_versoes_em_vigor_idx on public.contratos_versoes (contrato_id) where valido_ate is null;
create index contratos_versoes_contrato_idx on public.contratos_versoes (contrato_id, valido_desde);

create trigger set_updated_at before update on public.contratos_versoes
  for each row execute function public.set_updated_at();
create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.contratos_versoes for each row execute function public.monitor_verificar_dono();

create or replace function public.contratos_versoes_fechadas_imutaveis()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.valido_ate is not null then
    raise exception 'Uma versão fechada do contrato não pode ser alterada' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.contratos_versoes_fechadas_imutaveis() from public, anon, authenticated;

create trigger contratos_versoes_fechadas_imutaveis before update on public.contratos_versoes
  for each row execute function public.contratos_versoes_fechadas_imutaveis();

-- Valor atual de um campo contratual (ignora valores lidos de faturas).
create or replace function public.monitor_valor_contratual(p_contrato uuid, p_campo text)
returns public.contratos_campos
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.contratos_campos
   where contrato_id = p_contrato and campo = p_campo and estado = 'atual' and origem <> 'fatura'
   limit 1;
$$;

create or replace function public.monitor_versao_sincronizar(p_contrato uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid;
  m public.contratos_campos;
  d public.contratos_campos;
  dp public.contratos_campos;
  v_pi public.contratos_campos;
  pf public.contratos_campos;
  s public.contratos_campos;
  f public.contratos_campos;
  v_aberta public.contratos_versoes;
begin
  select utilizador_id into v_dono from public.contratos_monitorizados where id = p_contrato;
  if not found then
    return;
  end if;

  m := public.monitor_valor_contratual(p_contrato, 'mensalidade_cents');
  d := public.monitor_valor_contratual(p_contrato, 'desconto_promocao_cents');
  dp := public.monitor_valor_contratual(p_contrato, 'descricao_promocao');
  v_pi := public.monitor_valor_contratual(p_contrato, 'data_inicio_promocao');
  pf := public.monitor_valor_contratual(p_contrato, 'data_fim_promocao');
  s := public.monitor_valor_contratual(p_contrato, 'servicos_incluidos');
  f := public.monitor_valor_contratual(p_contrato, 'data_fim_fidelizacao');

  select * into v_aberta from public.contratos_versoes where contrato_id = p_contrato and valido_ate is null for update;

  if v_aberta.id is null then
    if m.id is null and d.id is null and dp.id is null and pf.id is null and s.id is null then
      return;
    end if;
    insert into public.contratos_versoes (contrato_id, utilizador_id, motivo) values (p_contrato, v_dono, 'inicial')
    returning * into v_aberta;
  end if;

  update public.contratos_versoes set
    mensalidade_cents = (m.valor #>> '{}')::integer,
    desconto_cents = (d.valor #>> '{}')::integer,
    descricao_promocao = dp.valor #>> '{}',
    promocao_inicio = (v_pi.valor #>> '{}')::date,
    promocao_fim = (pf.valor #>> '{}')::date,
    servicos_incluidos = s.valor #>> '{}',
    data_fim_fidelizacao = (f.valor #>> '{}')::date,
    origem = coalesce(m.origem, d.origem, dp.origem, pf.origem, s.origem),
    documento_id = coalesce(m.documento_id, d.documento_id, dp.documento_id, pf.documento_id)
  where id = v_aberta.id
    and (mensalidade_cents, desconto_cents, descricao_promocao, promocao_inicio, promocao_fim, servicos_incluidos, data_fim_fidelizacao)
        is distinct from
        ((m.valor #>> '{}')::integer, (d.valor #>> '{}')::integer, dp.valor #>> '{}', (v_pi.valor #>> '{}')::date,
         (pf.valor #>> '{}')::date, s.valor #>> '{}', (f.valor #>> '{}')::date);
end $$;

-- Alteração legítima do contrato a partir de p_desde: fecha a versão em vigor
-- (fica como estava) e abre uma nova, que acompanha os valores aceites a seguir.
create or replace function public.monitor_versao_nova(p_contrato uuid, p_desde date, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aberta public.contratos_versoes;
  v_id uuid;
begin
  if p_desde is null then
    raise exception 'Data de início da alteração em falta' using errcode = '22023';
  end if;
  perform public.monitor_versao_sincronizar(p_contrato);
  select * into v_aberta from public.contratos_versoes where contrato_id = p_contrato and valido_ate is null for update;
  if v_aberta.id is null then
    raise exception 'Sem versão em vigor' using errcode = 'P0002';
  end if;
  if v_aberta.valido_desde is not null and p_desde <= v_aberta.valido_desde then
    raise exception 'A alteração tem de começar depois da versão em vigor' using errcode = '22023';
  end if;

  update public.contratos_versoes set valido_ate = p_desde - 1 where id = v_aberta.id;
  insert into public.contratos_versoes (
    contrato_id, utilizador_id, valido_desde, mensalidade_cents, desconto_cents, descricao_promocao,
    promocao_inicio, promocao_fim, servicos_incluidos, data_fim_fidelizacao, origem, documento_id, motivo
  ) values (
    p_contrato, v_aberta.utilizador_id, p_desde, v_aberta.mensalidade_cents, v_aberta.desconto_cents, v_aberta.descricao_promocao,
    v_aberta.promocao_inicio, v_aberta.promocao_fim, v_aberta.servicos_incluidos, v_aberta.data_fim_fidelizacao,
    v_aberta.origem, v_aberta.documento_id, coalesce(p_motivo, 'outro')
  ) returning id into v_id;
  return v_id;
end $$;

-- Estado do serviço: recalcula o fim da fidelização (20261003160000) e
-- sincroniza a versão em vigor do contrato.
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
  perform public.monitor_fim_fidelizacao_calcular(p_contrato);

  select * into c from public.contratos_monitorizados where id = p_contrato;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;

  perform public.monitor_versao_sincronizar(p_contrato);

  if c.estado = 'terminado' then
    return c.estado;
  end if;

  if exists (select 1 from public.contratos_campos where contrato_id = p_contrato and estado = 'em_conflito') then
    v_estado := 'a_confirmar';
  elsif c.fornecedor is not null and c.mensalidade_cents is not null and c.data_fim_fidelizacao is not null
        and (c.setor <> 'telecomunicacoes'
             or (coalesce(c.data_inicio, c.data_ativacao) is not null and c.vantagem_cents is not null)) then
    v_estado := 'completo';
  else
    v_estado := 'parcial';
  end if;

  if v_estado is distinct from c.estado then
    update public.contratos_monitorizados set estado = v_estado where id = p_contrato;
  end if;
  return v_estado;
end $$;

revoke execute on function public.monitor_valor_contratual(uuid, text) from public, anon, authenticated;
revoke execute on function public.monitor_versao_sincronizar(uuid) from public, anon, authenticated;
revoke execute on function public.monitor_versao_nova(uuid, date, text) from public, anon, authenticated;
revoke execute on function public.monitor_recalcular_estado(uuid) from public, anon, authenticated;
grant execute on function public.monitor_versao_sincronizar(uuid) to service_role;
grant execute on function public.monitor_versao_nova(uuid, date, text) to service_role;
grant execute on function public.monitor_recalcular_estado(uuid) to service_role;

-- Decisões do cliente sobre os valores lidos (20261003150000), agora com a
-- alteração do contrato opcional na MESMA transação: se as condições novas
-- forem uma alteração (não uma correção), a versão em vigor fecha na véspera
-- de p_alteracao_desde antes de as decisões serem aplicadas. Ou fica tudo,
-- ou nada.
drop function public.monitor_campos_decidir(uuid, uuid, jsonb);

create or replace function public.monitor_campos_decidir(
  p_utilizador uuid,
  p_contrato uuid,
  p_decisoes jsonb,
  p_alteracao_desde date default null,
  p_alteracao_motivo text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  f public.contratos_campos;
  n integer := 0;
begin
  if jsonb_typeof(p_decisoes) is distinct from 'array' then
    raise exception 'Decisões inválidas' using errcode = '22023';
  end if;

  perform 1 from public.contratos_monitorizados
   where id = p_contrato and utilizador_id = p_utilizador and desativado_em is null
   for update;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;

  if p_alteracao_desde is not null then
    perform public.monitor_versao_nova(p_contrato, p_alteracao_desde, p_alteracao_motivo);
  end if;

  for d in
    select * from jsonb_to_recordset(p_decisoes) as x(campo_id uuid, acao text, valor jsonb)
  loop
    select * into f from public.contratos_campos
     where id = d.campo_id and contrato_id = p_contrato and utilizador_id = p_utilizador
     for update;
    if not found then
      raise exception 'Campo inexistente' using errcode = 'P0002';
    end if;
    if f.estado not in ('proposto', 'em_conflito') then
      continue;
    end if;

    if d.acao = 'aceitar' then
      perform public.monitor_campo_aceitar(f.id, 'cliente');
    elsif d.acao = 'rejeitar' then
      perform public.monitor_campo_rejeitar(f.id);
    elsif d.acao = 'corrigir' then
      if d.valor is null or jsonb_typeof(d.valor) = 'null' then
        raise exception 'Valor em falta' using errcode = '22023';
      end if;
      perform public.monitor_campo_rejeitar(f.id);
      perform public.monitor_campo_definir(p_contrato, f.campo, d.valor, 'cliente');
    else
      raise exception 'Ação inválida: %', d.acao using errcode = '22023';
    end if;
    n := n + 1;
  end loop;

  return n;
end $$;

revoke execute on function public.monitor_campos_decidir(uuid, uuid, jsonb, date, text) from public, anon, authenticated;
grant execute on function public.monitor_campos_decidir(uuid, uuid, jsonb, date, text) to service_role;

-- ===========================================================================
-- 7. Eventos do serviço (histórico / timeline)
-- ===========================================================================
-- Conclusões estruturadas de cada comparação (código: src/lib/monitor/
-- acompanhamento.ts). Frases geradas pelo código a partir do tipo e dos
-- dados — sem IA. Recalcular = os eventos anteriores ficam substituido_em
-- (nunca apagados). Os eventos "atencao" geram um achado para revisão
-- humana; o cliente só os vê depois de a DoLado os comunicar.

create table public.eventos_servico (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_monitorizados (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  fatura_id uuid references public.faturas_monitor (id) on delete cascade,
  tipo text not null check (tipo in (
    'sem_alteracao_relevante', 'mensalidade_conforme', 'mensalidade_alterada', 'mensalidade_mantida',
    'diferenca_preco_contrato', 'promocao_aplicada', 'promocao_em_falta', 'promocao_alterada',
    'promocao_terminada', 'consumo_adicional', 'servico_extra', 'cobranca_recorrente_nova',
    'cobranca_pontual', 'credito_aplicado', 'alteracao_impostos', 'alteracao_periodo',
    'servico_alterado', 'diferenca_nao_explicada', 'possivel_duplicado', 'fidelizacao_diferente',
    'servico_errado', 'dados_insuficientes', 'primeira_fatura', 'desconhecido',
    'contrato_adicionado', 'alerta_enviado'
  )),
  base text not null check (base in ('contrato', 'historico', 'documento')),
  severidade text not null check (severidade in ('ok', 'info', 'atencao')),
  periodo date,
  montante_cents integer,
  dados jsonb not null default '{}'::jsonb,
  confianca text check (confianca in ('alta', 'media', 'baixa')),
  versao_regra text not null,
  chave text not null,
  contrato_versao_id uuid references public.contratos_versoes (id) on delete set null,
  achado_id uuid references public.achados_monitor (id) on delete set null,
  substituido_em timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.eventos_servico is
  'Histórico do serviço: conclusões estruturadas por fatura (e, no futuro, alertas e outros acontecimentos). Eventos "atencao" só são visíveis ao cliente depois de comunicados (achado comunicado).';

create index eventos_servico_contrato_idx on public.eventos_servico (contrato_id, periodo desc) where substituido_em is null;
create index eventos_servico_fatura_idx on public.eventos_servico (fatura_id) where substituido_em is null;

create trigger monitor_verificar_dono before insert or update of contrato_id, utilizador_id
  on public.eventos_servico for each row execute function public.monitor_verificar_dono();

create or replace function public.eventos_servico_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'substituido_em' - 'achado_id') is distinct from (to_jsonb(old) - 'substituido_em' - 'achado_id')
     or (old.substituido_em is not null and new.substituido_em is distinct from old.substituido_em) then
    raise exception 'Um evento do histórico não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.eventos_servico_imutavel() from public, anon, authenticated;

create trigger eventos_servico_imutavel before update on public.eventos_servico
  for each row execute function public.eventos_servico_imutavel();

-- ===========================================================================
-- 8. Achados: tipos novos e "obsoleto"
-- ===========================================================================

alter table public.achados_monitor drop constraint achados_monitor_tipo_check;
alter table public.achados_monitor add constraint achados_monitor_tipo_check check (tipo in (
  'aumento_nao_explicado', 'linha_nova', 'possivel_dupla_faturacao', 'cessacao_divergente',
  'mensalidade_alterada', 'diferenca_preco_contrato', 'promocao_em_falta', 'promocao_alterada',
  'cobranca_recorrente_nova', 'possivel_duplicado', 'fidelizacao_diferente', 'diferenca_nao_explicada'
));

alter table public.achados_monitor drop constraint achados_monitor_estado_check;
alter table public.achados_monitor add constraint achados_monitor_estado_check
  check (estado in ('detetado', 'em_revisao', 'confirmado', 'descartado', 'comunicado', 'obsoleto'));

comment on column public.achados_monitor.estado is
  'obsoleto: a comparação foi refeita (ex.: contrato adicionado depois) e a situação deixou de se verificar antes de ser revista.';

-- A fatura fica "em verificação" enquanto tiver achados por rever.
create or replace function public.faturas_monitor_atualizar_verificacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.fatura_id is not null then
    update public.faturas_monitor f
       set em_verificacao = exists (
             select 1 from public.achados_monitor a
              where a.fatura_id = f.id and a.estado in ('detetado', 'em_revisao')
           )
     where f.id = new.fatura_id;
  end if;
  return null;
end $$;

revoke execute on function public.faturas_monitor_atualizar_verificacao() from public, anon, authenticated;

create trigger achados_monitor_verificacao after insert or update of estado on public.achados_monitor
  for each row execute function public.faturas_monitor_atualizar_verificacao();

-- Substitui os eventos de uma fatura (ou os do serviço sem fatura, quando
-- p_fatura é null) pelos novos, numa só transação:
--   * eventos ativos anteriores → substituido_em;
--   * cada evento "atencao" com dados de achado → achado (idempotente pela
--     chave; o mesmo resultado numa reanálise reutiliza o achado);
--   * achados por rever desta fatura que deixaram de se verificar → obsoleto
--     (o F4 — cessação — tem regra própria e não é tocado aqui).
-- p_eventos: [{tipo, base, severidade, periodo, montante_cents, dados,
--              confianca, versao_regra, chave, contrato_versao_id,
--              achado: {tipo, versao_regra, evidencia} | null}]
create or replace function public.monitor_eventos_substituir(
  p_contrato uuid,
  p_fatura uuid,
  p_eventos jsonb,
  p_resultado text default null
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid;
  e record;
  v_achado uuid;
  v_chaves text[] := '{}';
  n integer := 0;
begin
  if jsonb_typeof(p_eventos) is distinct from 'array' then
    raise exception 'Eventos inválidos' using errcode = '22023';
  end if;
  select utilizador_id into v_dono from public.contratos_monitorizados where id = p_contrato for update;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
  end if;
  if p_fatura is not null and not exists (
    select 1 from public.faturas_monitor where id = p_fatura and contrato_id = p_contrato
  ) then
    raise exception 'Fatura de outro serviço' using errcode = '42501';
  end if;

  update public.eventos_servico set substituido_em = now()
   where contrato_id = p_contrato and substituido_em is null
     and fatura_id is not distinct from p_fatura;

  for e in
    select * from jsonb_to_recordset(p_eventos) as x(
      tipo text, base text, severidade text, periodo date, montante_cents integer, dados jsonb,
      confianca text, versao_regra text, chave text, contrato_versao_id uuid, achado jsonb
    )
  loop
    v_achado := null;
    if e.severidade = 'atencao' and e.achado is not null and jsonb_typeof(e.achado) = 'object' then
      insert into public.achados_monitor (contrato_id, utilizador_id, fatura_id, tipo, versao_regra, chave_idempotencia, evidencia)
      values (p_contrato, v_dono, p_fatura, e.achado->>'tipo', e.achado->>'versao_regra', e.chave,
              coalesce(e.achado->'evidencia', '{}'::jsonb))
      on conflict (chave_idempotencia) do nothing;
      select id into v_achado from public.achados_monitor where chave_idempotencia = e.chave;
      -- Uma reanálise volta a encontrar a mesma situação: reabre o achado obsoleto.
      update public.achados_monitor set estado = 'detetado' where id = v_achado and estado = 'obsoleto';
      v_chaves := v_chaves || e.chave;
    end if;

    insert into public.eventos_servico (
      contrato_id, utilizador_id, fatura_id, tipo, base, severidade, periodo, montante_cents, dados,
      confianca, versao_regra, chave, contrato_versao_id, achado_id
    ) values (
      p_contrato, v_dono, p_fatura, e.tipo, e.base, e.severidade, e.periodo, e.montante_cents,
      coalesce(e.dados, '{}'::jsonb), e.confianca, e.versao_regra, e.chave, e.contrato_versao_id, v_achado
    );
    n := n + 1;
  end loop;

  if p_fatura is not null then
    update public.achados_monitor set estado = 'obsoleto'
     where fatura_id = p_fatura and estado in ('detetado', 'em_revisao')
       and tipo <> 'cessacao_divergente'
       and not (chave_idempotencia = any (v_chaves));
    update public.faturas_monitor set resultado = p_resultado where id = p_fatura and p_resultado is not null;
  end if;

  return n;
end $$;

revoke execute on function public.monitor_eventos_substituir(uuid, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.monitor_eventos_substituir(uuid, uuid, jsonb, text) to service_role;

-- ===========================================================================
-- 9. RLS e privilégios — o cliente só lê; toda a escrita é do servidor
-- ===========================================================================

alter table public.servicos_identificadores enable row level security;
alter table public.associacoes_documento enable row level security;
alter table public.contratos_versoes enable row level security;
alter table public.eventos_servico enable row level security;

revoke insert, update, delete, truncate, references, trigger on
  public.servicos_identificadores, public.associacoes_documento, public.contratos_versoes, public.eventos_servico
  from anon, authenticated;

create policy "Cliente vê os identificadores dos próprios serviços"
  on public.servicos_identificadores for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê todos os identificadores"
  on public.servicos_identificadores for select to authenticated
  using (public.is_admin());

create policy "Cliente vê as próprias decisões de associação"
  on public.associacoes_documento for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê todas as decisões de associação"
  on public.associacoes_documento for select to authenticated
  using (public.is_admin());

create policy "Cliente vê as versões dos próprios contratos"
  on public.contratos_versoes for select to authenticated
  using (utilizador_id = auth.uid());
create policy "Admin vê todas as versões de contratos"
  on public.contratos_versoes for select to authenticated
  using (public.is_admin());

-- Eventos "atencao" só depois de a DoLado comunicar o achado (revisão humana).
create policy "Cliente vê os próprios eventos revistos"
  on public.eventos_servico for select to authenticated
  using (
    utilizador_id = auth.uid()
    and (
      severidade <> 'atencao'
      or exists (select 1 from public.achados_monitor a where a.id = achado_id and a.estado = 'comunicado')
    )
  );
create policy "Admin vê todos os eventos"
  on public.eventos_servico for select to authenticated
  using (public.is_admin());

-- ===========================================================================
-- 10. Dados existentes (de teste — decisão de 03/10/2026)
-- ===========================================================================
-- A fatura deixa de propor condições contratuais: as propostas pendentes
-- vindas de faturas para fornecedor/mensalidade/referência ficam rejeitadas
-- (continuam no histórico). Depois, cada serviço recalcula o estado e cria a
-- versão inicial do contrato, se tiver condições contratuais.

update public.contratos_campos
   set estado = 'rejeitado'
 where origem = 'fatura'
   and estado in ('proposto', 'em_conflito')
   and campo in ('fornecedor', 'mensalidade_cents', 'referencia_contrato');

do $$
declare
  c record;
begin
  for c in select id from public.contratos_monitorizados loop
    perform public.monitor_recalcular_estado(c.id);
  end loop;
end $$;
