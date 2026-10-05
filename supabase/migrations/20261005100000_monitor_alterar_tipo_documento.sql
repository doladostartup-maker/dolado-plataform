-- DoLado — Monitor de Proteção: alterar o tipo de um documento na revisão
-- (05/10/2026).
--
-- O pipeline de leitura escolhe fatura ou contrato a partir de
-- documentos_monitor.tipo, mas o tipo era só o que o cliente escolheu no
-- upload e não havia forma de o corrigir: um contrato enviado como fatura
-- ficava "por rever" para sempre (a leitura devolvia "não é uma fatura").
--
-- 1. documentos_monitor.tipo_indicado: o tipo escolhido pelo cliente,
--    imutável. documentos_monitor.tipo passa a ser o tipo usado pelo sistema.
-- 2. extracoes_documento.estado 'invalidada' (+ invalidada_em): leituras
--    anteriores a uma alteração de tipo deixam de ser usadas, sem as apagar.
-- 3. documentos_tipo_alteracoes: auditoria (só inserção) — tipo anterior,
--    tipo novo, quando e quem.
-- 4. monitor_documento_alterar_tipo(): alteração atómica, só pelo servidor
--    (service_role), depois de a Server Action validar o papel admin. Nunca
--    automática: a deteção do tipo pela leitura é só uma sugestão.

-- ===========================================================================
-- 1. Tipo indicado pelo cliente
-- ===========================================================================

alter table public.documentos_monitor
  add column tipo_indicado text check (tipo_indicado in ('fatura', 'contrato', 'desconhecido'));

update public.documentos_monitor set tipo_indicado = tipo where tipo_indicado is null;

alter table public.documentos_monitor alter column tipo_indicado set not null;

comment on column public.documentos_monitor.tipo is
  'Tipo usado pelo sistema para ler o documento (fatura/contrato). Começa igual ao indicado pelo cliente; só muda por decisão da DoLado na revisão (documentos_tipo_alteracoes).';
comment on column public.documentos_monitor.tipo_indicado is
  'Tipo escolhido pelo cliente no upload. Nunca muda.';

create or replace function public.documentos_monitor_tipo_indicado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.tipo_indicado := coalesce(new.tipo_indicado, new.tipo);
  elsif new.tipo_indicado is distinct from old.tipo_indicado then
    raise exception 'O tipo indicado pelo cliente não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function public.documentos_monitor_tipo_indicado() from public, anon, authenticated;

create trigger documentos_monitor_tipo_indicado before insert or update of tipo_indicado
  on public.documentos_monitor for each row execute function public.documentos_monitor_tipo_indicado();

-- ===========================================================================
-- 2. Leituras invalidadas
-- ===========================================================================
-- Uma leitura invalidada sai do índice de idempotência (só "sucesso"): o
-- documento volta a ser lido com o tipo novo, nunca com a leitura antiga.

alter table public.extracoes_documento drop constraint extracoes_documento_estado_check;
alter table public.extracoes_documento add constraint extracoes_documento_estado_check
  check (estado in ('sucesso', 'invalida', 'erro', 'invalidada'));
alter table public.extracoes_documento add column invalidada_em timestamptz;

comment on column public.extracoes_documento.invalidada_em is
  'Leitura posta de parte (ex.: o tipo do documento foi corrigido na revisão). Fica guardada, mas nunca é usada.';

-- ===========================================================================
-- 3. Auditoria
-- ===========================================================================

create table public.documentos_tipo_alteracoes (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos_monitor (id) on delete cascade,
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  tipo_anterior text not null check (tipo_anterior in ('fatura', 'contrato', 'desconhecido')),
  tipo_novo text not null check (tipo_novo in ('fatura', 'contrato')),
  alterado_por uuid not null references auth.users (id),
  contrato_id uuid references public.contratos_monitorizados (id) on delete set null,
  leituras_invalidadas integer not null default 0 check (leituras_invalidadas >= 0),
  fatura_removida boolean not null default false,
  valores_retirados integer not null default 0 check (valores_retirados >= 0),
  created_at timestamptz not null default now(),
  check (tipo_novo <> tipo_anterior)
);

comment on table public.documentos_tipo_alteracoes is
  'Alterações do tipo de um documento do Monitor feitas na revisão da DoLado: tipo anterior, novo, quem e quando, e o que foi posto de parte (leituras, fatura registada, valores propostos). Só inserção.';

create index documentos_tipo_alteracoes_documento_idx on public.documentos_tipo_alteracoes (documento_id);

create trigger documentos_tipo_alteracoes_so_insercao before update on public.documentos_tipo_alteracoes
  for each row execute function public.monitor_so_insercao();

alter table public.documentos_tipo_alteracoes enable row level security;

revoke all on public.documentos_tipo_alteracoes from anon, authenticated;
grant select on public.documentos_tipo_alteracoes to authenticated;

-- Uso interno: só o admin lê (o cliente vê apenas o tipo atual do documento).
create policy "documentos_tipo_alteracoes: admin lê"
  on public.documentos_tipo_alteracoes for select to authenticated
  using (public.is_admin());

-- ===========================================================================
-- 4. Alteração do tipo
-- ===========================================================================
-- Numa só transação:
--   * valida o documento (ativo, ficheiro ainda guardado, sem leitura em curso);
--   * recusa se houver dados desse documento já decididos por uma pessoa
--     (valores confirmados pelo cliente ou pela DoLado, resumo da fatura
--     confirmado/contestado, situação já revista) — esses casos tratam-se à
--     mão, nunca se desfazem em silêncio;
--   * põe de parte o que veio da leitura antiga: leituras → invalidada;
--     valores propostos → rejeitado; valores aceites pelo sistema →
--     substituido (coluna canónica limpa); fatura registada → apagada (os
--     eventos e as situações por rever dessa fatura vão com ela);
--   * muda o tipo, devolve o documento a "pendente" e regista a auditoria.
-- O ficheiro no Storage não é tocado. Os identificadores já guardados no
-- serviço ficam (são do mesmo documento, qualquer que seja o tipo). A nova
-- leitura é feita a seguir pelo servidor, com o pipeline do tipo novo.
-- Erros: P0002 documento inexistente; 22023 tipo inválido/igual;
-- P0001 documento sem ficheiro ou a ser lido; 42501 revisor sem papel admin
-- ou dados já decididos.

create or replace function public.monitor_documento_alterar_tipo(p_documento uuid, p_tipo text, p_por uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.documentos_monitor;
  v_fatura uuid;
  v_leituras integer := 0;
  v_valores integer := 0;
  v_retirados integer := 0;
  f record;
begin
  if p_tipo is null or p_tipo not in ('fatura', 'contrato') then
    raise exception 'Tipo de documento inválido: %', p_tipo using errcode = '22023';
  end if;
  if p_por is null or not exists (select 1 from public.utilizadores where id = p_por and role = 'admin') then
    raise exception 'Só a DoLado altera o tipo de um documento' using errcode = '42501';
  end if;

  select * into d from public.documentos_monitor where id = p_documento for update;
  if not found then
    raise exception 'Documento inexistente' using errcode = 'P0002';
  end if;
  if d.tipo = p_tipo then
    raise exception 'O documento já é tratado como %', p_tipo using errcode = '22023';
  end if;
  if d.desativado_em is not null or d.etapa = 'repetido' then
    raise exception 'Documento sem ficheiro ativo' using errcode = 'P0001';
  end if;
  if d.etapa in ('a_verificar', 'a_ler', 'a_registar')
     and d.etapa_atualizada_em > now() - interval '5 minutes' then
    raise exception 'O documento está a ser lido' using errcode = 'P0001';
  end if;

  if d.contrato_id is not null then
    perform 1 from public.contratos_monitorizados where id = d.contrato_id for update;
  end if;

  select id into v_fatura from public.faturas_monitor where documento_id = d.id;

  if exists (
       select 1 from public.contratos_campos
        where documento_id = d.id
          and (confirmado_cliente_em is not null or confirmado_admin_em is not null)
     )
     or exists (
       select 1 from public.faturas_monitor
        where id = v_fatura and (confirmada_cliente_em is not null or valores_contestados_em is not null)
     )
     or exists (
       select 1 from public.achados_monitor a
        where a.fatura_id = v_fatura
          and (a.estado in ('confirmado', 'comunicado', 'descartado')
               or exists (select 1 from public.achados_revisoes r where r.achado_id = a.id))
     ) then
    raise exception 'O documento tem dados já decididos pelo cliente ou pela DoLado' using errcode = '42501';
  end if;

  update public.extracoes_documento
     set estado = 'invalidada', invalidada_em = now()
   where documento_id = d.id and estado = 'sucesso';
  get diagnostics v_leituras = row_count;

  update public.contratos_campos set estado = 'rejeitado'
   where documento_id = d.id and estado in ('proposto', 'em_conflito');
  get diagnostics v_valores = row_count;

  for f in
    select id, contrato_id, campo from public.contratos_campos where documento_id = d.id and estado = 'atual'
  loop
    update public.contratos_campos set estado = 'substituido', substituido_em = now() where id = f.id;
    execute format('update public.contratos_monitorizados set %1$I = null where id = $1', f.campo) using f.contrato_id;
    v_retirados := v_retirados + 1;
  end loop;

  if v_fatura is not null then
    delete from public.faturas_monitor where id = v_fatura;
  end if;

  if d.contrato_id is not null then
    perform public.monitor_recalcular_estado(d.contrato_id);
  end if;

  update public.documentos_monitor
     set tipo = p_tipo,
         estado = 'pendente',
         associacao_estado = case when contrato_id is null then null else associacao_estado end,
         associacao_sugerida = case when contrato_id is null then null else associacao_sugerida end,
         associacao_confianca = case when contrato_id is null then null else associacao_confianca end,
         associacao_motivos = case when contrato_id is null then '[]'::jsonb else associacao_motivos end,
         associacao_conflitos = case when contrato_id is null then '[]'::jsonb else associacao_conflitos end
   where id = d.id;

  insert into public.documentos_tipo_alteracoes
    (documento_id, utilizador_id, tipo_anterior, tipo_novo, alterado_por, contrato_id,
     leituras_invalidadas, fatura_removida, valores_retirados)
  values
    (d.id, d.utilizador_id, d.tipo, p_tipo, p_por, d.contrato_id,
     v_leituras, v_fatura is not null, v_valores + v_retirados);

  return jsonb_build_object(
    'tipo_anterior', d.tipo,
    'contrato_id', d.contrato_id,
    'leituras_invalidadas', v_leituras,
    'fatura_removida', v_fatura is not null,
    'valores_retirados', v_valores + v_retirados
  );
end $$;

revoke execute on function public.monitor_documento_alterar_tipo(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.monitor_documento_alterar_tipo(uuid, text, uuid) to service_role;
