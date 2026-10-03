-- Monitor de Proteção — processamento em segundo plano, confirmação em lote
-- e nomes comerciais dos fornecedores (03/10/2026).
--
-- 1. documentos_monitor.etapa: a leitura de um documento deixou de correr
--    dentro do pedido HTTP do upload. O pedido grava o documento e devolve;
--    o servidor processa a seguir e regista aqui a etapa real em que está.
--    O browser acompanha estas colunas (RLS: o cliente só lê os próprios).
-- 2. monitor_campos_decidir(): as decisões do cliente sobre os valores lidos
--    (correto / não está correto / corrigido) gravam-se numa só operação,
--    atómica, em vez de uma Server Action por clique.
-- 3. fornecedores: nome comercial ("Vodafone") a partir da designação
--    jurídica lida no documento ("Vodafone Portugal, Comunicações Pessoais,
--    S.A."), por correspondência determinística — sem IA. Acrescentar uma
--    empresa = inserir uma linha (ou um alias), sem alterar código.

-- ===========================================================================
-- 1. Etapas do processamento
-- ===========================================================================

alter table public.documentos_monitor
  add column etapa text
    check (etapa in ('recebido', 'a_verificar', 'a_ler', 'a_registar', 'concluido', 'falhou', 'repetido')),
  add column etapa_atualizada_em timestamptz,
  add column tempos_ms jsonb;

comment on column public.documentos_monitor.etapa is
  'Etapa real do processamento automático: recebido → a_verificar (hash) → a_ler (Claude API) → a_registar → concluido | falhou | repetido. null nos documentos anteriores a 03/10/2026.';
comment on column public.documentos_monitor.tempos_ms is
  'Duração de cada fase do processamento, em milissegundos (verificar, ler, registar, total) — medição de desempenho.';

create index documentos_monitor_etapa_idx on public.documentos_monitor (etapa)
  where etapa in ('recebido', 'a_verificar', 'a_ler', 'a_registar');

-- ===========================================================================
-- 2. Decisões do cliente sobre os valores lidos, em lote
-- ===========================================================================
-- p_decisoes: [{"campo_id": uuid, "acao": "aceitar"|"rejeitar"|"corrigir", "valor": jsonb}]
-- * Só campos do contrato e do utilizador indicados (a posse é verificada
--   aqui, além da Server Action).
-- * Campos já decididos (ex.: segundo envio do mesmo formulário) são
--   ignorados — idempotente.
-- * "corrigir": a proposta fica rejeitada e o valor do cliente passa a ser
--   o atual (origem "cliente"), com o histórico preservado.
-- * Tudo numa transação: ou ficam todas as decisões, ou nenhuma.
create or replace function public.monitor_campos_decidir(p_utilizador uuid, p_contrato uuid, p_decisoes jsonb)
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

  -- Bloqueia o contrato: decisões do mesmo contrato ficam em série.
  perform 1 from public.contratos_monitorizados
   where id = p_contrato and utilizador_id = p_utilizador and desativado_em is null
   for update;
  if not found then
    raise exception 'Contrato inexistente' using errcode = 'P0002';
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

revoke execute on function public.monitor_campos_decidir(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.monitor_campos_decidir(uuid, uuid, jsonb) to service_role;

-- ===========================================================================
-- 3. Fornecedores (nome comercial)
-- ===========================================================================

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome_comercial text not null unique check (char_length(nome_comercial) between 1 and 80),
  nome_legal text,
  aliases text[] not null default '{}',
  setores text[] not null default '{}'
    check (setores <@ array['telecomunicacoes', 'eletricidade', 'gas', 'agua', 'outro']::text[]),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fornecedores is
  'Nome comercial apresentado ao cliente a partir do nome lido no documento (nome legal ou alias). Correspondência exata depois de normalizar (src/lib/monitor/fornecedores.ts). Sem correspondência, mantém-se o nome lido.';

create trigger set_updated_at before update on public.fornecedores
  for each row execute function public.set_updated_at();

alter table public.fornecedores enable row level security;
revoke insert, update, delete, truncate, references, trigger on public.fornecedores from anon, authenticated;

create policy "Admin vê os fornecedores"
  on public.fornecedores for select to authenticated
  using (public.is_admin());

-- Principais fornecedores dos setores suportados. Os aliases cobrem as
-- designações jurídicas e as marcas mais comuns nas faturas e contratos.
insert into public.fornecedores (nome_comercial, nome_legal, aliases, setores) values
  ('MEO', 'MEO - Serviços de Comunicações e Multimédia, S.A.',
    array['MEO', 'MEO Serviços de Comunicações e Multimédia', 'Altice', 'Altice Portugal', 'PT Comunicações', 'Portugal Telecom'],
    array['telecomunicacoes']),
  ('NOS', 'NOS Comunicações, S.A.',
    array['NOS', 'NOS Comunicações', 'NOS Comunicacoes', 'ZON', 'ZON Optimus'],
    array['telecomunicacoes']),
  ('Vodafone', 'Vodafone Portugal, Comunicações Pessoais, S.A.',
    array['Vodafone', 'Vodafone Portugal', 'Vodafone Portugal Comunicações Pessoais'],
    array['telecomunicacoes']),
  ('NOWO', 'NOWO Communications, S.A.',
    array['NOWO', 'NOWO Communications', 'Cabovisão', 'Cabovisao'],
    array['telecomunicacoes']),
  ('DIGI', 'Digi Portugal, Lda.',
    array['DIGI', 'Digi Portugal', 'Digi Communications'],
    array['telecomunicacoes']),
  ('EDP', 'EDP Comercial - Comercialização de Energia, S.A.',
    array['EDP', 'EDP Comercial', 'EDP Comercial Comercialização de Energia', 'EDP Energia'],
    array['eletricidade', 'gas']),
  ('SU Eletricidade', 'SU Eletricidade, S.A.',
    array['SU Eletricidade', 'EDP Serviço Universal'],
    array['eletricidade']),
  ('Galp', 'Galp Power, S.A.',
    array['Galp', 'Galp Power', 'Galp Energia', 'Petrogal', 'Galp Gás Natural'],
    array['eletricidade', 'gas']),
  ('Endesa', 'Endesa Energia, S.A. - Sucursal Portugal',
    array['Endesa', 'Endesa Energia', 'Endesa Energia Sucursal Portugal'],
    array['eletricidade', 'gas']),
  ('Iberdrola', 'Iberdrola Clientes Portugal, Unipessoal Lda.',
    array['Iberdrola', 'Iberdrola Clientes Portugal'],
    array['eletricidade', 'gas']),
  ('Goldenergy', 'Goldenergy - Comercializadora de Energia, S.A.',
    array['Goldenergy', 'Goldenergy Comercializadora de Energia'],
    array['eletricidade', 'gas']),
  ('Repsol', 'Repsol Gás Portugal, S.A.',
    array['Repsol', 'Repsol Gás Portugal', 'Repsol Gas Portugal', 'Repsol Electricidad y Gas'],
    array['eletricidade', 'gas']),
  ('Coopérnico', 'Coopérnico - Cooperativa de Desenvolvimento Sustentável, CRL',
    array['Coopérnico', 'Coopernico'],
    array['eletricidade']),
  ('Luzboa', 'Luzboa, S.A.',
    array['Luzboa'],
    array['eletricidade']),
  ('EPAL', 'EPAL - Empresa Portuguesa das Águas Livres, S.A.',
    array['EPAL', 'Empresa Portuguesa das Águas Livres'],
    array['agua']),
  ('Águas do Porto', 'Águas e Energia do Porto, EM',
    array['Águas do Porto', 'Aguas do Porto', 'Águas e Energia do Porto'],
    array['agua']);
