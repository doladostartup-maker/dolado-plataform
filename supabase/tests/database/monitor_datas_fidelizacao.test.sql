-- DoLado — Monitor de Proteção: datas da fidelização (03/10/2026)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que o fim da fidelização é calculado a partir do início (ou da data
-- de ativação) + duração, com origem "calculado"; que acompanha alterações
-- do início e da duração; que um fim indicado (documento ou cliente)
-- prevalece e nunca é substituído por um cálculo; que a data de assinatura
-- nunca serve de início; que só o fim pode ter origem "calculado"; e que os
-- valores dos campos novos são validados. Tudo numa transação revertida.

begin;
select * from no_plan();

create schema testes;

create function testes.tenta(q text) returns text language plpgsql as $$
begin
  execute q;
  return 'ok';
exception when others then
  return 'erro:' || sqlstate;
end $$;

create function testes.fim(c uuid) returns text language sql as $$
  select coalesce(m.data_fim_fidelizacao::text, 'null') || '/' || coalesce(f.origem, '-')
    from public.contratos_monitorizados m
    left join public.contratos_campos f
      on f.contrato_id = m.id and f.campo = 'data_fim_fidelizacao' and f.estado = 'atual'
   where m.id = c;
$$;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-f100-00000000000a', 'datas@teste.invalid', 'authenticated', 'authenticated', now(), '{"nome":"D"}');

insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('70000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f100-00000000000a', 'telecomunicacoes'),
  ('70000000-0000-4000-f100-0000000000a2', '00000000-0000-4000-f100-00000000000a', 'telecomunicacoes');

-- Contrato 1: só a data de assinatura e a duração — não há início, não há fim.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'data_assinatura', '"2025-04-08"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'inicio_na_ativacao', '"sim"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '24', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a1'), 'null/-', 'só assinatura + duração: o fim não é calculado');

-- Data de ativação: início da fidelização na falta de data_inicio.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'data_ativacao', '"2025-04-20"', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a1'), '2027-04-20/calculado', 'ativação + 24 meses: fim calculado');

-- Início explícito prevalece sobre a ativação.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'data_inicio', '"2025-04-25"', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a1'), '2027-04-25/calculado', 'início explícito + 24 meses');

-- A duração muda: o fim calculado acompanha; o anterior fica no histórico.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '12', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a1'), '2026-04-25/calculado', 'nova duração: fim recalculado');
select is((select count(*)::int from public.contratos_campos
            where contrato_id = '70000000-0000-4000-f100-0000000000a1' and campo = 'data_fim_fidelizacao' and estado = 'substituido'),
  2, 'fins calculados anteriores ficam substituídos');

-- Fim do mês: 31/01 + 1 mês = 28/02 (como somarMeses no código).
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'data_inicio', '"2025-01-31"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '1', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a1'), '2025-02-28/calculado', 'fim do mês limitado ao último dia');

-- Um fim indicado pelo cliente prevalece e não é recalculado.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'data_fim_fidelizacao', '"2027-04-08"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '24', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a1'), '2027-04-08/cliente', 'fim indicado pelo cliente prevalece');

-- Contrato 2: fim lido do documento prevalece sobre o cálculo.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a2', 'data_inicio', '"2025-04-08"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a2', 'duracao_fidelizacao_meses', '24', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a2'), '2027-04-08/calculado', 'contrato 2: fim calculado');
select public.monitor_campo_aceitar(
  public.monitor_campo_propor('70000000-0000-4000-f100-0000000000a2', 'data_fim_fidelizacao', '"2027-04-07"', 'contrato'), 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a2'), '2027-04-07/contrato', 'fim do documento aceite substitui o calculado');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a2', 'duracao_fidelizacao_meses', '12', 'cliente');
select is(testes.fim('70000000-0000-4000-f100-0000000000a2'), '2027-04-07/contrato', 'fim do documento não é recalculado');

-- Estado: telecom completo com a data de ativação em vez do início.
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'fornecedor', '"Vodafone"', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'mensalidade_cents', '7146', 'cliente');
select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'vantagem_cents', '69600', 'cliente');
select is((select estado from public.contratos_monitorizados where id = '70000000-0000-4000-f100-0000000000a1'), 'completo', 'telecom completo');

-- Validações.
select is(testes.tenta($$select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '0', 'cliente')$$), 'erro:23514', 'duração 0 rejeitada');
select is(testes.tenta($$select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '24.5', 'cliente')$$), 'erro:23514', 'duração não inteira rejeitada');
select is(testes.tenta($$select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'duracao_fidelizacao_meses', '"24"', 'cliente')$$), 'erro:23514', 'duração em texto rejeitada');
select is(testes.tenta($$select public.monitor_campo_definir('70000000-0000-4000-f100-0000000000a1', 'inicio_na_ativacao', '"talvez"', 'cliente')$$), 'erro:23514', 'início na ativação só sim/não');
select is(testes.tenta($$insert into public.contratos_campos (contrato_id, utilizador_id, campo, valor, origem, estado)
  values ('70000000-0000-4000-f100-0000000000a1', '00000000-0000-4000-f100-00000000000a', 'data_inicio', '"2025-01-01"', 'calculado', 'proposto')$$),
  'erro:23514', 'só o fim da fidelização pode ter origem "calculado"');

-- Privilégios: a função de cálculo não é chamável pela API.
select ok(not has_function_privilege('authenticated', 'public.monitor_fim_fidelizacao_calcular(uuid)', 'EXECUTE'), 'cálculo do fim: não executável pelo cliente');
select ok(not has_function_privilege('anon', 'public.monitor_fim_fidelizacao_calcular(uuid)', 'EXECUTE'), 'cálculo do fim: não executável por anon');

select * from finish();
rollback;
