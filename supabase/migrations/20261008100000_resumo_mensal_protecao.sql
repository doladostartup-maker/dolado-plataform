-- DoLado — Resumo mensal da Proteção (08/10/2026)
--
-- Um e-mail por mês ("A sua Proteção em setembro") a cada conta com a
-- Proteção ativa (Proteção ou Caso + Proteção), com o que a DoLado
-- acompanhou no mês anterior. É uma comunicação do serviço contratado, não
-- uma campanha: não depende de consentimento de marketing.
--
-- Não há dados novos sobre o cliente: o conteúdo é calculado no servidor a
-- partir do Monitor de Proteção (faturas, documentos, situações
-- comunicadas, avisos de datas). Esta tabela só guarda o controlo do envio
-- e a fotografia do que foi mostrado (para auditoria e, numa fase 2, para o
-- portal) — sem NIF, morada, e-mail nem nome.
--
-- Idempotência: no máximo uma linha por conta e mês (unique). A linha é
-- RESERVADA antes do envio e só depois marcada "enviado" ou "falhou":
--   * enviado  → final e imutável; nunca sai outra vez;
--   * falhou   → a Brevo recusou: a execução seguinte tenta de novo (até 3);
--                envio de resultado incerto (ex.: tempo esgotado) fica
--                falhou sem nova tentativa automática (tentativas = 3);
--   * reservado sem conclusão (processo interrompido a meio) → nunca é
--                repetido automaticamente (pode ter saído): fica para o admin.
--
-- Execução: pg_cron → rota interna do portal (mesmo padrão dos lembretes de
-- compra), dias 1 a 3 de cada mês às 09:00 UTC; o segundo e o terceiro dia
-- só apanham falhas e contas que ainda não receberam.

-- ---------------------------------------------------------------------------
-- Início da subscrição (espelho do Stripe). O resumo de um mês só vai a
-- quem teve a Proteção ativa nesse mês: precisa da data em que a subscrição
-- começou, que não existia na base de dados (current_period_start muda a
-- cada renovação; a data de criação da conta não diz quando subscreveu).
-- Vem de subscription.start_date, gravado pelo webhook em todos os eventos
-- que já atualizam esta tabela (snapshotDeSubscricao → gravarSubscricao).
-- Linhas gravadas antes desta migration ficam a null até ao próximo evento
-- da subscrição (no máximo, a renovação seguinte).
-- ORDEM: aplicar antes do deploy do código (o upsert do webhook passa a
-- enviar esta coluna).
-- ---------------------------------------------------------------------------
alter table public.stripe_subscriptions add column start_date timestamptz;

comment on column public.stripe_subscriptions.start_date is
  'Início da subscrição no Stripe (subscription.start_date). Não muda nas renovações. Null = linha gravada antes de 08/10/2026, ainda sem evento novo.';

create table public.protecao_resumos_mensais (
  id uuid primary key default gen_random_uuid(),
  utilizador_id uuid not null references public.utilizadores (id) on delete cascade,
  mes_referencia date not null check (extract(day from mes_referencia) = 1),
  estado text not null default 'reservado' check (estado in ('reservado', 'enviado', 'falhou')),
  tentativas integer not null default 1 check (tentativas between 1 and 3),
  -- Fotografia do que o e-mail mostrou (só texto já calculado; ver
  -- src/lib/resumoMensal/resumo.ts). Só preenchida quando enviado.
  conteudo jsonb,
  modelo_versao text,
  erro_codigo text,
  reservado_em timestamptz not null default now(),
  enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (utilizador_id, mes_referencia),
  check ((estado = 'enviado') = (enviado_em is not null)),
  check (estado <> 'enviado' or (conteudo is not null and modelo_versao is not null))
);

comment on table public.protecao_resumos_mensais is
  'Controlo e fotografia do resumo mensal da Proteção (um por conta e mês). Escrita só pelo servidor (funções protecao_resumo_*).';

create index protecao_resumos_mensais_mes_estado_idx on public.protecao_resumos_mensais (mes_referencia, estado);

create trigger set_updated_at before update on public.protecao_resumos_mensais
  for each row execute function public.set_updated_at();

-- Um resumo enviado é prova do que foi mostrado: nunca muda.
create or replace function public.protecao_resumo_enviado_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.estado = 'enviado' then
    raise exception 'Um resumo mensal enviado não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger protecao_resumos_mensais_enviado_imutavel
  before update on public.protecao_resumos_mensais
  for each row execute function public.protecao_resumo_enviado_imutavel();

-- ---------------------------------------------------------------------------
-- Proteção ativa durante o mês de referência: a subscrição que hoje dá a
-- Proteção à conta (user_access.stripe_subscription_id) começou antes do fim
-- desse mês (fim do mês em Lisboa). Como está ativa agora e uma subscrição
-- não volta depois de terminar, esteve ativa no mês.
--   * start_date null (linha anterior a esta migration, sem evento desde
--     então): a subscrição existia antes de 08/10/2026 — conta como iniciada
--     antes de qualquer mês de referência a partir de outubro de 2026;
--   * sem subscrição Stripe na conta, ou sem linha em stripe_subscriptions:
--     não se sabe quando começou → não recebe (nunca inventar).
-- Não é SECURITY DEFINER: só é chamada pelas funções abaixo.
-- ---------------------------------------------------------------------------
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
  );
$$;

revoke execute on function public.protecao_resumo_ativa_no_mes(uuid, date) from public, anon, authenticated;
grant execute on function public.protecao_resumo_ativa_no_mes(uuid, date) to service_role;

-- ---------------------------------------------------------------------------
-- Quem recebe: Proteção (ou Caso + Proteção) ativa agora E durante o mês de
-- referência (protecao_resumo_ativa_no_mes); e-mail atual e confirmado da
-- conta, conta não apagada nem bloqueada (como monitor_alertas_pendentes).
-- Fica de fora quem já tem o resumo do mês enviado, em curso, ou com as
-- tentativas esgotadas.
-- ---------------------------------------------------------------------------
create or replace function public.protecao_resumo_destinatarios(p_mes date)
returns table (utilizador_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select au.id, au.email::text
    from auth.users au
   where public.protecao_resumo_ativa_no_mes(au.id, p_mes)
     and au.email is not null
     and au.email_confirmed_at is not null
     and au.deleted_at is null
     and (au.banned_until is null or au.banned_until < now())
     and not exists (
       select 1 from public.protecao_resumos_mensais r
        where r.utilizador_id = au.id
          and r.mes_referencia = date_trunc('month', p_mes)::date
          and (r.estado in ('enviado', 'reservado') or r.tentativas >= 3)
     )
   order by au.created_at;
$$;

-- Reserva o envio (antes de enviar) e devolve o id; null = não enviar
-- (já enviado/em curso, tentativas esgotadas, ou sem Proteção ativa agora e
-- no mês — verificado de novo aqui, nunca só pela lista).
create or replace function public.protecao_resumo_reservar(p_utilizador uuid, p_mes date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := date_trunc('month', p_mes)::date;
  v_id uuid;
begin
  if not public.protecao_resumo_ativa_no_mes(p_utilizador, v_mes) then
    return null;
  end if;

  insert into public.protecao_resumos_mensais as r (utilizador_id, mes_referencia)
  values (p_utilizador, v_mes)
  on conflict (utilizador_id, mes_referencia) do update
     set estado = 'reservado',
         tentativas = r.tentativas + 1,
         erro_codigo = null,
         reservado_em = now()
   where r.estado = 'falhou' and r.tentativas < 3
  returning r.id into v_id;

  return v_id;
end $$;

-- Conclui uma reserva: enviado (com a fotografia do conteúdo) ou falhou.
-- p_repetir = false esgota as tentativas (envio de resultado incerto).
create or replace function public.protecao_resumo_concluir(
  p_id uuid,
  p_enviado boolean,
  p_conteudo jsonb default null,
  p_modelo_versao text default null,
  p_erro text default null,
  p_repetir boolean default true
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_enviado then
    update public.protecao_resumos_mensais
       set estado = 'enviado', conteudo = p_conteudo, modelo_versao = p_modelo_versao,
           erro_codigo = null, enviado_em = now()
     where id = p_id and estado = 'reservado';
  else
    update public.protecao_resumos_mensais
       set estado = 'falhou', erro_codigo = left(coalesce(p_erro, 'erro'), 64),
           tentativas = case when p_repetir then tentativas else 3 end
     where id = p_id and estado = 'reservado';
  end if;
  return found;
end $$;

revoke execute on function public.protecao_resumo_destinatarios(date) from public, anon, authenticated;
revoke execute on function public.protecao_resumo_reservar(uuid, date) from public, anon, authenticated;
revoke execute on function public.protecao_resumo_concluir(uuid, boolean, jsonb, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.protecao_resumo_enviado_imutavel() from public, anon, authenticated;
grant execute on function public.protecao_resumo_destinatarios(date) to service_role;
grant execute on function public.protecao_resumo_reservar(uuid, date) to service_role;
grant execute on function public.protecao_resumo_concluir(uuid, boolean, jsonb, text, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: o cliente lê só os próprios resumos ENVIADOS (para a fase 2 no
-- portal); o admin lê todos; ninguém escreve pela API (só as funções acima,
-- com service_role).
-- ---------------------------------------------------------------------------
alter table public.protecao_resumos_mensais enable row level security;

create policy "Cliente vê os próprios resumos enviados" on public.protecao_resumos_mensais
  for select to authenticated using (utilizador_id = auth.uid() and estado = 'enviado');
create policy "Admin vê todos os resumos" on public.protecao_resumos_mensais
  for select to authenticated using (public.is_admin());

revoke all on public.protecao_resumos_mensais from anon, authenticated;
grant select on public.protecao_resumos_mensais to authenticated;

-- ---------------------------------------------------------------------------
-- Agendamento: dias 1 a 3 de cada mês, 09:00 UTC (10:00 em Lisboa no verão,
-- 09:00 no inverno). Rota interna do portal com o segredo do Vault
-- 'resumo_mensal_cron_secret', igual a RESUMO_MENSAL_CRON_SECRET na Clever
-- Cloud. Sem o segredo configurado a rota responde 401 e nada é enviado.
-- ---------------------------------------------------------------------------
select
  cron.schedule(
    'resumo-mensal-protecao',
    '0 9 1-3 * *',
    $$
    select
      net.http_post(
        url := 'https://portal.dolado.pt/api/internal/resumo-mensal',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'resumo_mensal_cron_secret'
          )
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $$
  );
