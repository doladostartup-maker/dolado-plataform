-- DoLado — Proteção gratuita durante 30 dias
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: elegibilidade (uma vez por conta e por e-mail; nunca para quem já
-- teve Proteção; e-mail confirmado), ativação atómica e idempotente, acesso
-- só pela data (sem depender do job), fim pelo job com os dados desativados
-- como no fim de uma subscrição, conversão marcada pela subscrição paga,
-- avisos idempotentes, envios da Proteção a incluir o período gratuito, RLS
-- (cada cliente só lê o próprio período; ninguém escreve pela API) e funções
-- só para a service_role. Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function testes.tenta(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'erro:' || sqlstate;
end $$;

create function testes.h(c text) returns text language sql as $$ select 'hmac:' || repeat(c, 64) $$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- a: conta nova · b: conta nova (outro e-mail) · c: e-mail por confirmar ·
-- d: já teve Proteção (subscrição Stripe) · e: Caso + Proteção ativo ·
-- f: admin · g: só comprou um Avulso (pode experimentar).
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-e000-00000000000a', 'pga@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-00000000000b', 'pgb@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-00000000000c', 'pgc@teste.invalid', 'authenticated', 'authenticated', null, now()),
  ('00000000-0000-4000-e000-00000000000d', 'pgd@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-00000000000e', 'pge@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-00000000000f', 'pgf@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-e000-000000000010', 'pgg@teste.invalid', 'authenticated', 'authenticated', now(), now());

update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-e000-00000000000f';

insert into public.stripe_subscriptions (stripe_subscription_id, stripe_customer_id, status) values
  ('sub_pg_d', 'cus_pg_d', 'canceled'),
  ('sub_pg_e', 'cus_pg_e', 'active');
insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits, avulso_credits, stripe_customer_id, stripe_subscription_id) values
  ('00000000-0000-4000-e000-00000000000d', 'none', 'canceled', 0, 0, 'cus_pg_d', 'sub_pg_d'),
  ('00000000-0000-4000-e000-00000000000e', 'caso_protecao', 'active', 1, 0, 'cus_pg_e', 'sub_pg_e'),
  ('00000000-0000-4000-e000-000000000010', 'none', null, 1, 1, 'cus_pg_g', null);

-- ---------------------------------------------------------------------------
-- Elegibilidade
-- ---------------------------------------------------------------------------
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-e000-00000000000a', testes.h('a')), 'elegivel', 'Conta nova é elegível');
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-e000-000000000010', testes.h('7')), 'elegivel', 'Quem só comprou um Avulso é elegível');
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-e000-00000000000c', testes.h('c')), 'email_nao_confirmado', 'E-mail por confirmar não é elegível');
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-e000-00000000000d', testes.h('d')), 'ja_teve_protecao', 'Quem já teve uma subscrição não é elegível');
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-e000-00000000000e', testes.h('e')), 'protecao_ativa', 'Quem tem Caso + Proteção ativo não é elegível');
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-e000-00000000000f', testes.h('f')), 'conta_invalida', 'Admin não é elegível');

select is(
  public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000d', testes.h('d'), 'homepage', 'v', 't') ->> 'resultado',
  'ja_teve_protecao', 'Ativação recusada a quem já teve Proteção'
);
select ok(not exists (select 1 from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000d'),
  'Recusa não grava nenhum período');
select is(testes.tenta($$select public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000a', 'sem-formato', 'homepage', 'v', 't')$$),
  'erro:P0001', 'Pseudónimo do e-mail com formato inválido é recusado');
select is(testes.tenta($$select public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000a', testes.h('a'), 'homepage', 'v', '  ')$$),
  'erro:P0001', 'Sem o texto aceite, a ativação é recusada');

-- ---------------------------------------------------------------------------
-- Ativação
-- ---------------------------------------------------------------------------
select is(
  public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000a', testes.h('a'), 'homepage', '2026-10-18', 'Li e aceito os Termos') ->> 'resultado',
  'ativada', 'Conta nova ativa a Proteção gratuita'
);
select is(
  (select termina_em - inicio_em from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'),
  interval '30 days', 'O período tem 30 dias'
);
select is(
  public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000a', testes.h('a'), 'precario', '2026-10-18', 'Li e aceito os Termos') ->> 'resultado',
  'ativa', 'Segunda ativação da mesma conta é idempotente'
);
select is((select count(*)::int from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 1, 'Só um período por conta');
select is((select origem from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'homepage', 'A origem da primeira ativação fica');
select is(
  public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000b', testes.h('a'), 'homepage', 'v', 't') ->> 'resultado',
  'ja_utilizada', 'Outra conta com o mesmo e-mail (pseudónimo) não pode experimentar'
);
select is(
  public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000b', testes.h('b'), 'origem-estranha', 'v', 't') ->> 'resultado',
  'ativada', 'Outra conta com outro e-mail ativa'
);
select is((select origem from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000b'), 'outro', 'Origem desconhecida fica "outro"');

select ok(public.conta_tem_protecao('00000000-0000-4000-e000-00000000000a'), 'Período em curso dá Proteção');
select ok(not public.conta_tem_protecao('00000000-0000-4000-e000-00000000000c'), 'Sem período nem subscrição: sem Proteção');

-- Prova imutável
select is(testes.tenta($$update public.protecao_gratuita set termina_em = termina_em + interval '30 days' where user_id = '00000000-0000-4000-e000-00000000000a'$$),
  'erro:P0001', 'O fim do período não pode ser prolongado');
select is(testes.tenta($$update public.protecao_gratuita set texto_aceite = 'outro' where user_id = '00000000-0000-4000-e000-00000000000a'$$),
  'erro:P0001', 'O texto aceite é imutável');

-- ---------------------------------------------------------------------------
-- RLS e permissões
-- ---------------------------------------------------------------------------
select testes.como('00000000-0000-4000-e000-00000000000a');
select is((select count(*)::int from public.protecao_gratuita), 1, 'Cliente só vê o próprio período');
select ok(public.tem_protecao(), 'tem_protecao() inclui o período gratuito');
select is(testes.tenta($$update public.protecao_gratuita set estado = 'terminada'$$), 'erro:42501', 'Cliente não altera o período');
select is(testes.tenta($$insert into public.protecao_gratuita (user_id, termina_em, termos_versao, texto_aceite) values (auth.uid(), now() + interval '1 year', 'v', 't')$$),
  'erro:42501', 'Cliente não cria períodos');
select is(testes.tenta($$select public.protecao_gratuita_ativar(auth.uid(), 'hmac:' || repeat('9', 64), 'homepage', 'v', 't')$$),
  'erro:42501', 'Cliente não chama a ativação diretamente');
select is(testes.tenta($$select * from public.protecao_gratuita_utilizacoes$$), 'erro:42501', 'Cliente não lê os pseudónimos');
select is(testes.tenta($$select public.protecao_gratuita_metricas()$$), 'erro:P0001', 'Métricas só para admin');
select is(testes.tenta($$select public.protecao_desativar_dados(auth.uid())$$), 'erro:42501', 'Cliente não desativa dados');
select is(testes.tenta($$select public.protecao_gratuita_manutencao()$$), 'erro:42501', 'Cliente não corre o job');
select is(testes.tenta($$select * from public.protecao_gratuita_avisos_pendentes()$$), 'erro:42501', 'Cliente não lê os avisos pendentes (e-mails)');
select is(testes.tenta($$select public.protecao_gratuita_desativar_lembretes(gen_random_uuid())$$), 'erro:42501', 'Cliente não chama a função dos lembretes diretamente');
reset role;

select testes.como('00000000-0000-4000-e000-00000000000c');
select ok(not public.tem_protecao(), 'Outra conta sem período: tem_protecao() falso');
select is((select count(*)::int from public.protecao_gratuita), 0, 'Outra conta não vê períodos alheios');
reset role;

select testes.como('00000000-0000-4000-e000-00000000000f');
select is((select (public.protecao_gratuita_metricas() ->> 'ativadas')::int >= 2), true, 'Admin lê as métricas');
reset role;

-- ---------------------------------------------------------------------------
-- Envios da Proteção incluem o período gratuito
-- ---------------------------------------------------------------------------
insert into public.preferencias_setor (utilizador_id, setor) values
  ('00000000-0000-4000-e000-00000000000a', 'Telecomunicações'),
  ('00000000-0000-4000-e000-00000000000c', 'Telecomunicações');
select ok(exists (select 1 from public.avisos_setor_destinatarios('Telecomunicações') where email = 'pga@teste.invalid'),
  'Aviso setorial chega a quem está no período gratuito');
select ok(not exists (select 1 from public.avisos_setor_destinatarios('Telecomunicações') where email = 'pgc@teste.invalid'),
  'Aviso setorial não chega a quem não tem Proteção');
select ok(public.protecao_resumo_ativa_no_mes('00000000-0000-4000-e000-00000000000a', date_trunc('month', now())::date),
  'Resumo mensal do mês em curso inclui o período gratuito');

-- ---------------------------------------------------------------------------
-- Avisos (e-mails) idempotentes
-- ---------------------------------------------------------------------------
select is(
  (select marco from public.protecao_gratuita_avisos_pendentes() where user_id = '00000000-0000-4000-e000-00000000000a'),
  'd0', 'Logo após a ativação: e-mail do dia 0 pendente'
);
select isnt(public.protecao_gratuita_aviso_reservar((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'd0'),
  null, 'Reserva o dia 0');
select is(public.protecao_gratuita_aviso_reservar((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'd0'),
  null, 'Segunda reserva do mesmo marco é recusada');
select is(public.protecao_gratuita_aviso_reservar((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'd25'),
  null, 'Não reserva um marco que ainda não chegou');
select ok(public.protecao_gratuita_aviso_concluir(
  (select a.id from public.protecao_gratuita_avisos a join public.protecao_gratuita g on g.id = a.gratuita_id where g.user_id = '00000000-0000-4000-e000-00000000000a'),
  true), 'Conclui o envio');
select ok(not exists (select 1 from public.protecao_gratuita_avisos_pendentes() where user_id = '00000000-0000-4000-e000-00000000000a'),
  'Dia 0 enviado já não está pendente');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '7 days 1 hour'),
  'd7', 'Ao 7.º dia: d7');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '25 days 1 hour'),
  'd25', 'A 5 dias do fim: d25');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '29 days 1 hour'),
  'd29', 'No último dia: d29');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '30 days 1 hour'),
  'd30', 'Depois do fim: d30');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '38 days'),
  null, 'Mais de 7 dias depois do fim: nenhum aviso antigo');

select ok(public.protecao_gratuita_desativar_lembretes((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a')),
  'Deixar de receber os lembretes');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '7 days 1 hour'),
  null, 'Sem lembretes: o dia 7 não sai');
select is(public.protecao_gratuita_marco_atual((select id from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), now() + interval '29 days 1 hour'),
  'd29', 'O aviso do último dia (serviço) sai na mesma');

-- ---------------------------------------------------------------------------
-- Fim pela data (sem o job) e pelo job
-- ---------------------------------------------------------------------------
alter table public.protecao_gratuita disable trigger protecao_gratuita_prova_imutavel;
update public.protecao_gratuita
   set inicio_em = now() - interval '31 days', termina_em = now() - interval '1 day'
 where user_id = '00000000-0000-4000-e000-00000000000a';
alter table public.protecao_gratuita enable trigger protecao_gratuita_prova_imutavel;

select ok(not public.conta_tem_protecao('00000000-0000-4000-e000-00000000000a'), 'Passado o fim, sem Proteção mesmo sem o job');
select ok(not exists (select 1 from public.avisos_setor_destinatarios('Telecomunicações') where email = 'pga@teste.invalid'),
  'Passado o fim, nenhum aviso setorial');
select ok((select desativado_em is null from public.preferencias_setor where utilizador_id = '00000000-0000-4000-e000-00000000000a'),
  'Antes do job, os dados ainda não estão desativados');

select is((public.protecao_gratuita_manutencao() ->> 'terminadas')::int >= 1, true, 'O job termina o período');
select is((select estado from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'terminada', 'Estado terminada');
select ok((select desativado_em is not null from public.preferencias_setor where utilizador_id = '00000000-0000-4000-e000-00000000000a'),
  'Dados desativados (conservados), como no fim de uma subscrição');
select ok(exists (select 1 from public.preferencias_setor where utilizador_id = '00000000-0000-4000-e000-00000000000a'),
  'Nada é apagado no fim do período');
select is((public.protecao_gratuita_manutencao() ->> 'terminadas')::int, 0, 'O job é idempotente');
select is(testes.tenta($$update public.protecao_gratuita set estado = 'ativa' where user_id = '00000000-0000-4000-e000-00000000000a'$$),
  'erro:P0001', 'Um período terminado não volta a ficar ativo');
select is(
  (select marco from public.protecao_gratuita_avisos_pendentes() where user_id = '00000000-0000-4000-e000-00000000000a'),
  'd30', 'E-mail de fim pendente'
);
select is(
  public.protecao_gratuita_ativar('00000000-0000-4000-e000-00000000000a', testes.h('a'), 'homepage', 'v', 't') ->> 'resultado',
  'ja_utilizada', 'Segunda Proteção gratuita na mesma conta é recusada'
);

-- Adesão depois do fim: convertida e dados reativados
insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits, avulso_credits, stripe_customer_id, stripe_subscription_id)
values ('00000000-0000-4000-e000-00000000000a', 'protecao', 'active', 0, 0, 'cus_pg_a', 'sub_pg_a');
select is((select estado from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'convertida', 'Adesão marca o período como convertido');
select is((select convertida_plano from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000a'), 'protecao', 'Com o plano escolhido');
select ok((select desativado_em is null from public.preferencias_setor where utilizador_id = '00000000-0000-4000-e000-00000000000a'),
  'Dados reativados com a subscrição');
select ok(not exists (select 1 from public.protecao_gratuita_avisos_pendentes() where user_id = '00000000-0000-4000-e000-00000000000a'),
  'Depois de aderir, nenhum aviso do período gratuito');

-- ---------------------------------------------------------------------------
-- Adesão durante o período (b): convertida; o fim de uma subscrição durante
-- um período em curso não desativa os dados.
-- ---------------------------------------------------------------------------
insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e000-00000000000b', 'Energia');
insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits, avulso_credits)
values ('00000000-0000-4000-e000-00000000000b', 'protecao', 'trialing', 0, 0);
select is((select estado from public.protecao_gratuita where user_id = '00000000-0000-4000-e000-00000000000b'), 'convertida',
  'Adesão com a 1.ª cobrança no fim do período (trialing) marca a conversão');
select ok(public.conta_tem_protecao('00000000-0000-4000-e000-00000000000b'), 'Mantém a Proteção');
update public.user_access set subscription_status = 'canceled', subscription_plan = 'none'
 where user_id = '00000000-0000-4000-e000-00000000000b';
select ok(not public.conta_tem_protecao('00000000-0000-4000-e000-00000000000b'), 'Subscrição cancelada depois da conversão: sem Proteção');
select ok((select desativado_em is not null from public.preferencias_setor where utilizador_id = '00000000-0000-4000-e000-00000000000b'),
  'Dados desativados no fim da subscrição');

-- Conta g: período em curso e uma subscrição (de outra origem) que termina
select public.protecao_gratuita_ativar('00000000-0000-4000-e000-000000000010', testes.h('7'), 'precario', 'v', 't');
insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-e000-000000000010', 'Água');
alter table public.user_access disable trigger user_access_alertas_seguir_protecao;
update public.user_access set subscription_plan = 'protecao', subscription_status = 'active'
 where user_id = '00000000-0000-4000-e000-000000000010';
alter table public.user_access enable trigger user_access_alertas_seguir_protecao;
update public.user_access set subscription_plan = 'none', subscription_status = 'canceled'
 where user_id = '00000000-0000-4000-e000-000000000010';
select ok((select desativado_em is null from public.preferencias_setor where utilizador_id = '00000000-0000-4000-e000-000000000010'),
  'Fim de uma subscrição com o período gratuito em curso não desativa os dados');

-- ---------------------------------------------------------------------------
-- Conservação dos pseudónimos
-- ---------------------------------------------------------------------------
update public.protecao_gratuita_utilizacoes set apagar_em = now() - interval '1 minute' where email_hash = testes.h('b');
select is((public.protecao_gratuita_manutencao() ->> 'pseudonimos_apagados')::int, 1, 'Pseudónimos apagados aos 24 meses');

select * from finish();
rollback;
