-- DoLado — Monitor de Protecção: electricidade e gás (20261026090000_monitor_energia.sql)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova que: faturas_monitor.energia existe, é uma lista (no máximo 4
-- fornecimentos) e vazia por omissão; o cliente só lê a energia das próprias
-- facturas e não a altera; os eventos e achados de energia são aceites pela
-- função de substituição, com os eventos "atencao" escondidos do cliente até
-- serem comunicados; tipos desconhecidos continuam recusados. Tudo numa
-- transacção revertida.

begin;
select * from no_plan();

create schema testes;
grant usage on schema testes to anon, authenticated, service_role;

create function testes.como(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
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

grant execute on all functions in schema testes to anon, authenticated, service_role;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('00000000-0000-4000-e100-00000000000a', 'ea@teste.invalid', 'authenticated', 'authenticated', now()),
  ('00000000-0000-4000-e100-00000000000b', 'eb@teste.invalid', 'authenticated', 'authenticated', now());

insert into public.contratos_monitorizados (id, utilizador_id, setor) values
  ('80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a', 'eletricidade');

insert into public.documentos_monitor (id, utilizador_id, contrato_id, tipo, storage_path) values
  ('81000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a', '80000000-0000-4000-e100-0000000000a1', 'fatura', 'ea/f1.pdf'),
  ('81000000-0000-4000-e100-0000000000a2', '00000000-0000-4000-e100-00000000000a', '80000000-0000-4000-e100-0000000000a1', 'fatura', 'ea/f2.pdf');

-- ===========================================================================
-- 1. Coluna energia
-- ===========================================================================
select has_column('public', 'faturas_monitor', 'energia', 'faturas_monitor.energia existe');

insert into public.faturas_monitor (id, contrato_id, utilizador_id, documento_id, data_emissao, total_cents) values
  ('82000000-0000-4000-e100-0000000000a1', '80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a',
   '81000000-0000-4000-e100-0000000000a1', '2026-09-05', 5000);
select is((select energia from public.faturas_monitor where id = '82000000-0000-4000-e100-0000000000a1'), '[]'::jsonb, 'energia vazia por omissão (facturas antigas)');

select is(testes.tenta($$insert into public.faturas_monitor (contrato_id, utilizador_id, documento_id, total_cents, energia) values
  ('80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a', '81000000-0000-4000-e100-0000000000a2', 5900, '{"tipo":"eletricidade"}')$$),
  'erro:23514', 'energia tem de ser uma lista');
select is(testes.tenta($$insert into public.faturas_monitor (contrato_id, utilizador_id, documento_id, total_cents, energia) values
  ('80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a', '81000000-0000-4000-e100-0000000000a2', 5900, '[{},{},{},{},{}]')$$),
  'erro:23514', 'no máximo 4 fornecimentos');

insert into public.faturas_monitor (id, contrato_id, utilizador_id, documento_id, data_emissao, total_cents, energia) values
  ('82000000-0000-4000-e100-0000000000a2', '80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a',
   '81000000-0000-4000-e100-0000000000a2', '2026-10-05', 5900,
   '[{"tipo":"eletricidade","local":"hmac:aaaa","consumoKwh":260,"dias":30,"energia":[],"totalCents":5900}]');

-- ===========================================================================
-- 2. Eventos e achados de energia
-- ===========================================================================
select is(
  public.monitor_eventos_substituir(
    '80000000-0000-4000-e100-0000000000a1',
    '82000000-0000-4000-e100-0000000000a2',
    '[{"tipo":"energia_variacao","base":"historico","severidade":"info","periodo":"2026-10-05","montante_cents":900,
       "dados":{"fornecimento":"eletricidade","diferencaCents":900},"confianca":"alta","versao_regra":"energia_v1",
       "chave":"energia_v1:t:energia_variacao","contrato_versao_id":null,"achado":null},
      {"tipo":"energia_preco_alterado","base":"historico","severidade":"atencao","periodo":"2026-10-05","montante_cents":600,
       "dados":{"fornecimento":"eletricidade"},"confianca":"media","versao_regra":"energia_v1",
       "chave":"energia_v1:t:energia_preco_alterado","contrato_versao_id":null,
       "achado":{"tipo":"energia_preco_alterado","versao_regra":"energia_v1","evidencia":{}}},
      {"tipo":"energia_acerto","base":"historico","severidade":"atencao","periodo":"2026-10-05","montante_cents":2400,
       "dados":{"fornecimento":"eletricidade"},"confianca":"alta","versao_regra":"energia_v1",
       "chave":"energia_v1:t:energia_acerto","contrato_versao_id":null,
       "achado":{"tipo":"energia_acerto_relevante","versao_regra":"energia_v1","evidencia":{}}}]'::jsonb,
    'atencao'
  ),
  3,
  'eventos de energia aceites'
);
select is((select count(*) from public.achados_monitor where contrato_id = '80000000-0000-4000-e100-0000000000a1'), 2::bigint, 'dois achados para revisão');
select is((select confianca from public.eventos_servico where tipo = 'energia_preco_alterado' and substituido_em is null), 'media', 'grau de certeza guardado');
select ok((select em_verificacao from public.faturas_monitor where id = '82000000-0000-4000-e100-0000000000a2'), 'factura em verificação');

select is(testes.tenta($$insert into public.eventos_servico (contrato_id, utilizador_id, tipo, base, severidade, versao_regra, chave)
  values ('80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a', 'energia_inventado', 'historico', 'info', 'x', 'x')$$),
  'erro:23514', 'tipo de evento desconhecido recusado');
select is(testes.tenta($$insert into public.achados_monitor (contrato_id, utilizador_id, tipo, versao_regra, chave_idempotencia)
  values ('80000000-0000-4000-e100-0000000000a1', '00000000-0000-4000-e100-00000000000a', 'energia_acerto', 'x', 'y')$$),
  'erro:23514', 'tipo de achado desconhecido recusado (o achado do acerto é energia_acerto_relevante)');

-- ===========================================================================
-- 3. RLS
-- ===========================================================================
select testes.como('00000000-0000-4000-e100-00000000000a');
select is((select energia->0->>'tipo' from public.faturas_monitor where id = '82000000-0000-4000-e100-0000000000a2'), 'eletricidade', 'A lê a energia das próprias facturas');
select is((select count(*) from public.eventos_servico where substituido_em is null), 1::bigint, 'A só vê o evento informativo (os "atencao" esperam pela revisão)');
select is(testes.tenta($$update public.faturas_monitor set energia = '[]'$$), 'erro:42501', 'A não altera a energia');
select testes.como('00000000-0000-4000-e100-00000000000b');
select is((select count(*) from public.faturas_monitor), 0::bigint, 'B não vê as facturas de A');
reset role;

-- Depois de comunicado, o evento "atencao" fica visível.
update public.achados_monitor set estado = 'comunicado', comunicado_em = now(), texto_cliente = 'Texto revisto'
 where tipo = 'energia_preco_alterado';
select testes.como('00000000-0000-4000-e100-00000000000a');
select is((select count(*) from public.eventos_servico where substituido_em is null), 2::bigint, 'evento comunicado passa a ser visível');
reset role;

select * from finish();
rollback;
