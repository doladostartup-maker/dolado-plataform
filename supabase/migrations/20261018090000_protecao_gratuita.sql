-- DoLado — Proteção gratuita durante 30 dias (18/10/2026)
--
-- Oferta permanente: quem nunca teve a Proteção pode experimentá-la durante
-- 30 dias, sem cartão e sem compromisso. Decisões de Thiago (18/10/2026):
--   * estado interno, não um trial do Stripe: nenhum Customer, subscrição ou
--     fatura é criado no Stripe durante o período gratuito; o Stripe continua
--     a ser a fonte de verdade das subscrições pagas;
--   * uma vez por conta e por e-mail (pseudónimo HMAC do e-mail normalizado,
--     calculado no servidor, guardado mesmo depois de a conta ser apagada);
--     nunca para quem já teve Proteção ou Caso + Proteção;
--   * o período começa quando o cliente o ativa expressamente (nunca ao criar
--     a conta) e termina sozinho, sem cobrança nem subscrição;
--   * aderir durante o período: a 1.ª cobrança da Proteção é no dia em que o
--     período gratuito terminaria (trial_end no Checkout, decidido no
--     servidor). O Caso + Proteção é cobrado logo, como sempre.
--
-- O acesso depende só de termina_em > now(): se o pg_cron falhar, a Proteção
-- gratuita termina na mesma. O job horário trata do que vem depois (estado,
-- desativação dos dados como no fim de uma subscrição e e-mails), sempre de
-- forma idempotente e a recuperar atrasos.

-- ---------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------
create table public.protecao_gratuita (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  inicio_em timestamptz not null default now(),
  termina_em timestamptz not null,
  estado text not null default 'ativa'
    check (estado in ('ativa', 'convertida', 'terminada')),
  terminada_em timestamptz,
  convertida_em timestamptz,
  convertida_plano text check (convertida_plano in ('protecao', 'caso_protecao')),
  -- Página onde o cliente carregou em "Experimentar" (valores fixos; métricas).
  origem text not null default 'outro'
    check (origem in ('homepage', 'precario', 'protecao', 'portal', 'outro')),
  -- Prova da aceitação dos Termos (versão e texto exato).
  termos_versao text not null,
  texto_aceite text not null,
  -- Lembretes opcionais (dias 7 e 25): o cliente pode deixar de os receber.
  lembretes_desativados_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (termina_em > inicio_em)
);

comment on table public.protecao_gratuita is
  'Proteção gratuita de 30 dias (uma por conta). Acesso = estado ativa e termina_em > now(). Escrita só pelas funções protecao_gratuita_* (service_role).';

create index protecao_gratuita_ativas_idx on public.protecao_gratuita (termina_em) where estado = 'ativa';

create trigger set_updated_at before update on public.protecao_gratuita
  for each row execute function public.set_updated_at();

-- Prova imutável: início, fim e aceitação nunca mudam depois de gravados.
create or replace function public.protecao_gratuita_prova_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.inicio_em is distinct from old.inicio_em
     or new.termina_em is distinct from old.termina_em
     or new.termos_versao is distinct from old.termos_versao
     or new.texto_aceite is distinct from old.texto_aceite
     or new.origem is distinct from old.origem
     or new.created_at is distinct from old.created_at then
    raise exception 'protecao_gratuita: início, fim e aceitação são imutáveis';
  end if;
  -- Um período terminado ou convertido nunca volta a "ativa".
  if old.estado <> 'ativa' and new.estado = 'ativa' then
    raise exception 'protecao_gratuita: um período terminado não volta a ficar ativo';
  end if;
  return new;
end $$;

revoke execute on function public.protecao_gratuita_prova_imutavel() from public, anon, authenticated;

create trigger protecao_gratuita_prova_imutavel before update on public.protecao_gratuita
  for each row execute function public.protecao_gratuita_prova_imutavel();

-- Um uso por e-mail, mesmo depois de a conta ser apagada (sem FK de
-- propósito). Só o pseudónimo HMAC-SHA256 do e-mail normalizado (chave
-- PROTECAO_GRATUITA_CHAVE, só no servidor) — nunca o e-mail.
create table public.protecao_gratuita_utilizacoes (
  email_hash text primary key check (email_hash ~ '^hmac:[0-9a-f]{64}$'),
  utilizada_em timestamptz not null default now(),
  -- Conservação: o pseudónimo é apagado 24 meses depois da utilização.
  apagar_em timestamptz not null default (now() + interval '24 months')
);

comment on table public.protecao_gratuita_utilizacoes is
  'Pseudónimos (HMAC) dos e-mails que já usaram a Proteção gratuita. Só para impedir uma segunda utilização; apagados aos 24 meses.';

-- E-mails do período gratuito: uma linha por período e marco (idempotência).
create table public.protecao_gratuita_avisos (
  id uuid primary key default gen_random_uuid(),
  gratuita_id uuid not null references public.protecao_gratuita (id) on delete cascade,
  marco text not null check (marco in ('d0', 'd7', 'd25', 'd29', 'd30')),
  estado text not null default 'reservado' check (estado in ('reservado', 'enviado', 'falhou')),
  tentativas integer not null default 1,
  erro_codigo text,
  reservado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (gratuita_id, marco)
);

-- ---------------------------------------------------------------------------
-- 2. RLS: o cliente lê só o próprio período; o admin lê tudo; ninguém escreve
-- pela API (só as funções abaixo, com service_role).
-- ---------------------------------------------------------------------------
alter table public.protecao_gratuita enable row level security;
alter table public.protecao_gratuita_utilizacoes enable row level security;
alter table public.protecao_gratuita_avisos enable row level security;

create policy "Cliente lê a própria Proteção gratuita" on public.protecao_gratuita
  for select to authenticated using (user_id = auth.uid());
create policy "Admin lê as Proteções gratuitas" on public.protecao_gratuita
  for select to authenticated using (public.is_admin());
create policy "Admin lê os avisos da Proteção gratuita" on public.protecao_gratuita_avisos
  for select to authenticated using (public.is_admin());

revoke all on public.protecao_gratuita from anon, authenticated;
revoke all on public.protecao_gratuita_utilizacoes from anon, authenticated;
revoke all on public.protecao_gratuita_avisos from anon, authenticated;
grant select on public.protecao_gratuita to authenticated;
grant select on public.protecao_gratuita_avisos to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Proteção da conta: subscrição Stripe ativa OU período gratuito em curso.
-- Fonte única para tem_protecao(), envios (alertas, aviso setorial, resumo)
-- e o fim/regresso da Proteção. Security invoker: com a sessão do cliente,
-- o RLS só deixa ver as linhas da própria conta.
-- ---------------------------------------------------------------------------
create or replace function public.protecao_gratuita_em_curso(p_user uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.protecao_gratuita g
     where g.user_id = p_user and g.estado = 'ativa' and g.termina_em > now()
  );
$$;

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
      or public.protecao_gratuita_em_curso(p_user);
$$;

-- protecao_ativa() só era executável pelo dono; agora é usada por uma função
-- security invoker chamada com a sessão do cliente (tem_protecao()).
grant execute on function public.protecao_ativa(text, text) to authenticated, service_role;
revoke execute on function public.protecao_gratuita_em_curso(uuid) from public, anon;
revoke execute on function public.conta_tem_protecao(uuid) from public, anon;
grant execute on function public.protecao_gratuita_em_curso(uuid) to authenticated, service_role;
grant execute on function public.conta_tem_protecao(uuid) to authenticated, service_role;

create or replace function public.tem_protecao()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.conta_tem_protecao(auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 4. Fim e regresso da Proteção (dados do Monitor e aviso setorial). Uma só
-- implementação para o fim de uma subscrição e o fim do período gratuito.
-- SECURITY DEFINER justificado: chamadas pelo trigger de user_access e pelo
-- job (service_role); só tocam nas linhas da conta indicada e só em
-- desativado_em. Não executáveis pela API.
-- ---------------------------------------------------------------------------
create or replace function public.protecao_desativar_dados(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.preferencias_setor set desativado_em = now()
   where utilizador_id = p_user and desativado_em is null;
  update public.contratos_monitorizados set desativado_em = now()
   where utilizador_id = p_user and desativado_em is null;
  update public.documentos_monitor set desativado_em = now()
   where utilizador_id = p_user and desativado_em is null;
$$;

create or replace function public.protecao_reativar_dados(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.preferencias_setor set desativado_em = null
   where utilizador_id = p_user
     and desativado_em > now() - public.retencao_alertas_desativados();
  update public.contratos_monitorizados set desativado_em = null
   where utilizador_id = p_user
     and desativado_em > now() - public.retencao_alertas_desativados();
  update public.documentos_monitor set desativado_em = null
   where utilizador_id = p_user
     and desativado_em > now() - public.retencao_alertas_desativados();
$$;

revoke execute on function public.protecao_desativar_dados(uuid) from public, anon, authenticated;
revoke execute on function public.protecao_reativar_dados(uuid) from public, anon, authenticated;

-- Trigger de user_access: igual ao anterior, mas o fim da subscrição não
-- desativa nada enquanto o período gratuito estiver em curso. Uma subscrição
-- que passa a dar Proteção marca o período gratuito como convertido.
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
    if not public.protecao_gratuita_em_curso(new.user_id) then
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

-- ---------------------------------------------------------------------------
-- 5. Elegibilidade e ativação
-- ---------------------------------------------------------------------------
create or replace function public.protecao_gratuita_duracao()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 days' $$;

grant execute on function public.protecao_gratuita_duracao() to authenticated, service_role;

-- A conta já teve (ou tem) Proteção ou Caso + Proteção pagos? Qualquer
-- subscrição Stripe ligada à conta conta — também a do piloto Remax.
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
         );
$$;

-- elegivel | ativa | ja_utilizada | ja_teve_protecao | protecao_ativa |
-- email_nao_confirmado | conta_invalida
create or replace function public.protecao_gratuita_elegibilidade(p_user uuid, p_email_hash text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_g public.protecao_gratuita%rowtype;
begin
  if not exists (select 1 from public.utilizadores u where u.id = p_user and u.role = 'cliente') then
    return 'conta_invalida';
  end if;
  if not exists (
    select 1 from auth.users au
     where au.id = p_user and au.email_confirmed_at is not null and au.deleted_at is null
  ) then
    return 'email_nao_confirmado';
  end if;

  select * into v_g from public.protecao_gratuita where user_id = p_user;
  if found then
    return case when v_g.estado = 'ativa' and v_g.termina_em > now() then 'ativa' else 'ja_utilizada' end;
  end if;

  if exists (
    select 1 from public.user_access ua
     where ua.user_id = p_user and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
  ) then
    return 'protecao_ativa';
  end if;
  if public.protecao_gratuita_ja_teve_subscricao(p_user) then
    return 'ja_teve_protecao';
  end if;
  if p_email_hash is null or exists (
    select 1 from public.protecao_gratuita_utilizacoes x where x.email_hash = p_email_hash
  ) then
    return 'ja_utilizada';
  end if;
  return 'elegivel';
end $$;

-- Ativação atómica e idempotente: devolve { resultado, id, inicio_em,
-- termina_em }. resultado: ativada | ativa (já estava) | o motivo da
-- elegibilidade.
create or replace function public.protecao_gratuita_ativar(
  p_user uuid,
  p_email_hash text,
  p_origem text,
  p_termos_versao text,
  p_texto_aceite text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motivo text;
  v_g public.protecao_gratuita%rowtype;
begin
  if p_email_hash is null or p_email_hash !~ '^hmac:[0-9a-f]{64}$' then
    raise exception 'protecao_gratuita_ativar: pseudónimo do e-mail inválido';
  end if;
  if coalesce(btrim(p_termos_versao), '') = '' or coalesce(btrim(p_texto_aceite), '') = '' then
    raise exception 'protecao_gratuita_ativar: aceitação dos Termos em falta';
  end if;

  -- Dois pedidos ao mesmo tempo (mesma conta ou mesmo e-mail): um de cada vez.
  perform pg_advisory_xact_lock(hashtextextended('protecao_gratuita:' || p_user::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('protecao_gratuita:' || p_email_hash, 0));

  v_motivo := public.protecao_gratuita_elegibilidade(p_user, p_email_hash);
  if v_motivo = 'ativa' then
    select * into v_g from public.protecao_gratuita where user_id = p_user;
    return jsonb_build_object('resultado', 'ativa', 'id', v_g.id,
                              'inicio_em', v_g.inicio_em, 'termina_em', v_g.termina_em);
  end if;
  if v_motivo <> 'elegivel' then
    return jsonb_build_object('resultado', v_motivo);
  end if;

  insert into public.protecao_gratuita_utilizacoes (email_hash) values (p_email_hash);

  insert into public.protecao_gratuita (user_id, inicio_em, termina_em, origem, termos_versao, texto_aceite)
  values (
    p_user, now(), now() + public.protecao_gratuita_duracao(),
    case when p_origem in ('homepage', 'precario', 'protecao', 'portal') then p_origem else 'outro' end,
    p_termos_versao, p_texto_aceite
  )
  returning * into v_g;

  -- Dados retidos de uma Proteção anterior (não deveria haver: só quem nunca
  -- teve Proteção ativa) — por robustez, como no regresso de uma subscrição.
  perform public.protecao_reativar_dados(p_user);

  return jsonb_build_object('resultado', 'ativada', 'id', v_g.id,
                            'inicio_em', v_g.inicio_em, 'termina_em', v_g.termina_em);
end $$;

revoke execute on function public.protecao_gratuita_ja_teve_subscricao(uuid) from public, anon, authenticated;
revoke execute on function public.protecao_gratuita_elegibilidade(uuid, text) from public, anon, authenticated;
revoke execute on function public.protecao_gratuita_ativar(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.protecao_gratuita_elegibilidade(uuid, text) to service_role;
grant execute on function public.protecao_gratuita_ativar(uuid, text, text, text, text) to service_role;

-- Deixar de receber os lembretes opcionais (dias 7 e 25). Idempotente.
create or replace function public.protecao_gratuita_desativar_lembretes(p_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with alterado as (
    update public.protecao_gratuita
       set lembretes_desativados_em = coalesce(lembretes_desativados_em, now())
     where id = p_id
    returning 1
  )
  select exists (select 1 from alterado);
$$;

revoke execute on function public.protecao_gratuita_desativar_lembretes(uuid) from public, anon, authenticated;
grant execute on function public.protecao_gratuita_desativar_lembretes(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Fim do período (job horário) — idempotente e a recuperar atrasos.
-- ---------------------------------------------------------------------------
create or replace function public.protecao_gratuita_manutencao(p_agora timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_terminadas int := 0;
  v_apagadas int := 0;
begin
  for v_user in
    update public.protecao_gratuita
       set estado = 'terminada', terminada_em = p_agora
     where estado = 'ativa' and termina_em <= p_agora
    returning user_id
  loop
    v_terminadas := v_terminadas + 1;
    -- Sem subscrição paga: os dados ficam desativados (conservados 6 meses,
    -- como no fim de uma subscrição; reativados se aderir dentro do prazo).
    if not public.conta_tem_protecao(v_user) then
      perform public.protecao_desativar_dados(v_user);
    end if;
  end loop;

  delete from public.protecao_gratuita_utilizacoes where apagar_em <= p_agora;
  get diagnostics v_apagadas = row_count;

  return jsonb_build_object('terminadas', v_terminadas, 'pseudonimos_apagados', v_apagadas);
end $$;

revoke execute on function public.protecao_gratuita_manutencao(timestamptz) from public, anon, authenticated;
grant execute on function public.protecao_gratuita_manutencao(timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 7. E-mails: dia 0 (ativação), 7, 25 (faltam 5 dias), 29 (último dia) e 30
-- (fim, só sem adesão). Em cada momento só o marco atual (um marco perdido
-- não é enviado depois do seguinte). Dias 7 e 25 respeitam
-- lembretes_desativados_em. Nunca depois de aderir.
-- ---------------------------------------------------------------------------
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
  -- Já tem subscrição paga (webhook a caminho): nada sobre o período gratuito.
  if exists (
    select 1 from public.user_access ua
     where ua.user_id = v_g.user_id and public.protecao_ativa(ua.subscription_plan, ua.subscription_status)
  ) then
    return null;
  end if;

  if v_g.termina_em <= p_agora then
    -- Fim: só nos 7 dias seguintes (nunca um aviso antigo).
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

-- Pendentes: e-mail atual e confirmado da conta (como os avisos de datas).
create or replace function public.protecao_gratuita_avisos_pendentes(p_agora timestamptz default now())
returns table (gratuita_id uuid, user_id uuid, email text, marco text, inicio_em timestamptz, termina_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.user_id, au.email::text, m.marco, g.inicio_em, g.termina_em
    from public.protecao_gratuita g
    join auth.users au on au.id = g.user_id
    cross join lateral (select public.protecao_gratuita_marco_atual(g.id, p_agora) as marco) m
   where g.estado in ('ativa', 'terminada')
     and g.termina_em > p_agora - interval '7 days'
     and m.marco is not null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and not exists (
       select 1 from public.protecao_gratuita_avisos a
        where a.gratuita_id = g.id and a.marco = m.marco
          and (a.estado in ('enviado', 'reservado') or a.tentativas >= 3)
     )
   order by g.inicio_em;
$$;

-- Reserva (antes de enviar); null = não enviar. Verifica de novo o marco.
create or replace function public.protecao_gratuita_aviso_reservar(p_id uuid, p_marco text, p_agora timestamptz default now())
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if public.protecao_gratuita_marco_atual(p_id, p_agora) is distinct from p_marco then
    return null;
  end if;
  insert into public.protecao_gratuita_avisos as a (gratuita_id, marco)
  values (p_id, p_marco)
  on conflict (gratuita_id, marco) do update
     set estado = 'reservado', tentativas = a.tentativas + 1, erro_codigo = null, reservado_em = now()
   where a.estado = 'falhou' and a.tentativas < 3
  returning a.id into v_id;
  return v_id;
end $$;

-- Conclui: enviado ou falhou (p_repetir = false esgota as tentativas — envio
-- de resultado incerto nunca é repetido sozinho).
create or replace function public.protecao_gratuita_aviso_concluir(
  p_aviso uuid, p_enviado boolean, p_erro text default null, p_repetir boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_enviado then
    update public.protecao_gratuita_avisos
       set estado = 'enviado', erro_codigo = null, enviado_em = now()
     where id = p_aviso and estado = 'reservado';
  else
    update public.protecao_gratuita_avisos
       set estado = 'falhou', erro_codigo = left(coalesce(p_erro, 'erro'), 64),
           tentativas = case when p_repetir then tentativas else 3 end
     where id = p_aviso and estado = 'reservado';
  end if;
  return found;
end $$;

revoke execute on function public.protecao_gratuita_marco_atual(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.protecao_gratuita_avisos_pendentes(timestamptz) from public, anon, authenticated;
revoke execute on function public.protecao_gratuita_aviso_reservar(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.protecao_gratuita_aviso_concluir(uuid, boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.protecao_gratuita_marco_atual(uuid, timestamptz) to service_role;
grant execute on function public.protecao_gratuita_avisos_pendentes(timestamptz) to service_role;
grant execute on function public.protecao_gratuita_aviso_reservar(uuid, text, timestamptz) to service_role;
grant execute on function public.protecao_gratuita_aviso_concluir(uuid, boolean, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Envios da Proteção: alertas de datas, aviso setorial e resumo mensal
-- passam a usar conta_tem_protecao() (inclui o período gratuito).
-- ---------------------------------------------------------------------------
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
     where c.desativado_em is null
       and c.estado <> 'terminado'
       and au.email is not null
       and au.email_confirmed_at is not null
       and au.deleted_at is null
       and (au.banned_until is null or au.banned_until < now())
       and public.conta_tem_protecao(c.utilizador_id)
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

create or replace function public.avisos_setor_destinatarios(p_setor text)
returns table (nome text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(u.nome), ''), au.email) as nome,
         au.email
    from public.preferencias_setor p
    join auth.users au on au.id = p.utilizador_id
    left join public.utilizadores u on u.id = p.utilizador_id
   where p.setor = p_setor
     and p.desativado_em is null
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and public.conta_tem_protecao(p.utilizador_id);
$$;

-- Resumo mensal: subscrição como antes OU período gratuito em curso que
-- começou antes do fim do mês de referência.
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
         );
$$;

-- ---------------------------------------------------------------------------
-- 9. Métricas (só admin): sem dados pessoais, só contagens.
-- ---------------------------------------------------------------------------
create or replace function public.protecao_gratuita_metricas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception 'protecao_gratuita_metricas: só admin';
  end if;

  select jsonb_build_object(
    'ativadas', count(*),
    'ativas_agora', count(*) filter (where g.estado = 'ativa' and g.termina_em > now()),
    'contas_novas', count(*) filter (where au.created_at > g.inicio_em - interval '24 hours'),
    'com_documentos', count(*) filter (where exists (
        select 1 from public.documentos_monitor d
         where d.utilizador_id = g.user_id and d.created_at between g.inicio_em and g.termina_em)),
    'com_analise', count(*) filter (where exists (
        select 1 from public.documentos_monitor d
         where d.utilizador_id = g.user_id and d.etapa = 'concluido'
           and d.created_at between g.inicio_em and g.termina_em)),
    'chegaram_ao_fim', count(*) filter (where g.termina_em <= now()),
    'convertidas', count(*) filter (where g.estado = 'convertida'),
    'convertidas_durante', count(*) filter (where g.estado = 'convertida' and g.convertida_em < g.termina_em),
    'convertidas_caso_protecao', count(*) filter (where g.convertida_plano = 'caso_protecao'),
    'cancelamentos_posteriores', count(*) filter (where g.estado = 'convertida' and exists (
        select 1 from public.subscricao_cancelamentos c
         where c.user_id = g.user_id and c.pedido_em >= g.convertida_em and c.revertido_em is null)),
    'por_origem', coalesce((
        select jsonb_object_agg(o.origem, o.n)
          from (select origem, count(*) as n from public.protecao_gratuita group by origem) o
      ), '{}'::jsonb)
  )
    into v
    from public.protecao_gratuita g
    left join auth.users au on au.id = g.user_id;

  return v;
end $$;

revoke execute on function public.protecao_gratuita_metricas() from public, anon;
grant execute on function public.protecao_gratuita_metricas() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Job horário: rota interna do portal com o segredo do Vault
-- 'protecao_gratuita_cron_secret', igual a PROTECAO_GRATUITA_CRON_SECRET na
-- Clever Cloud. Sem o segredo configurado a rota responde 401 e nada é
-- enviado (o acesso termina na mesma pela data).
-- ---------------------------------------------------------------------------
select
  cron.schedule(
    'protecao-gratuita',
    '20 * * * *',
    $$
    select
      net.http_post(
        url := 'https://portal.dolado.pt/api/internal/protecao-gratuita',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'protecao_gratuita_cron_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $$
  );
