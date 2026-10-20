-- DoLado — Programa de Parceiros (Fase 1)
--
-- Correr com:   supabase test db   (stack local — nunca contra produção)
--
-- Prova: candidaturas (limite, decisão única), códigos no mesmo espaço dos
-- amigos, atribuição única por conta (amigo OU parceiro, first-touch, sem
-- auto-indicação), comissões B2C (só faturas pagas > 0 €, uma por conta,
-- elegível às 3 mensalidades, reembolso/disputa/cancelamento, máquina de
-- estados, pagamento único), B2B (validade, percentagem autorizada, só a
-- receita do 1.º ano), pacotes (códigos só depois do pagamento, quantidade),
-- activação do acesso patrocinado (uma vez, código expirado/anulado, recusa a
-- subscritores, limite de tentativas), Protecção efectiva sem Stripe, fim
-- automático, relatório só com contagens e RLS. Tudo numa transação revertida.

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

-- Fatura paga de teste (valores fixos; só muda o invoice).
create function testes.fatura(u uuid, inv text, sub text, produto text, valor int) returns text language sql as $$
  select public.parceiro_registar_fatura(u, inv, sub, produto, valor, 0, 0, 'pi_' || inv, 'cus_' || sub, now()) ->> 'resultado';
$$;

grant execute on all functions in schema testes to anon, authenticated, service_role;

-- a: admin · p: conta do próprio parceiro · c1..c4: clientes novos ·
-- f: indicado por um amigo · s: subscritor activo · n: e-mail por confirmar
insert into auth.users (id, email, aud, role, email_confirmed_at, created_at) values
  ('00000000-0000-4000-f000-0000000000aa', 'ppa@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-0000000000bb', 'ppp@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-000000000001', 'pp1@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-000000000002', 'pp2@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-000000000003', 'pp3@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-000000000004', 'pp4@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-0000000000ff', 'ppf@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-0000000000cc', 'pps@teste.invalid', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-f000-0000000000dd', 'ppn@teste.invalid', 'authenticated', 'authenticated', null, now());

update public.utilizadores set role = 'admin' where id = '00000000-0000-4000-f000-0000000000aa';

insert into public.stripe_subscriptions (stripe_subscription_id, stripe_customer_id, status) values
  ('sub_pp_s', 'cus_pp_s', 'active');
insert into public.user_access (user_id, subscription_plan, subscription_status, case_credits, avulso_credits, stripe_customer_id, stripe_subscription_id) values
  ('00000000-0000-4000-f000-0000000000cc', 'protecao', 'active', 0, 0, 'cus_pp_s', 'sub_pp_s'),
  ('00000000-0000-4000-f000-0000000000bb', 'none', null, 0, 0, 'cus_sub_pp_p', null);

-- ===========================================================================
-- Parte A — Parceiro de Indicação
-- ===========================================================================

-- Candidaturas
select is(public.parceiro_candidatura_criar('Ana Teste', 'ana@teste.invalid', 'Imobiliária Teste', 'indicacao',
  'Recomendo serviços aos meus clientes.', 'v1', 'Aceito', 'pt-PT', 'candidatura:x') ->> 'resultado',
  'criada', 'Candidatura criada como pendente');
select is((select estado from public.parceiros_candidaturas where email = 'ana@teste.invalid'), 'pendente', 'Estado inicial pendente');
select public.parceiro_candidatura_criar('Ana Teste', 'ana@teste.invalid', null, 'indicacao', 'Segunda tentativa de teste.', 'v1', 'Aceito', 'pt-PT', 'candidatura:x');
select public.parceiro_candidatura_criar('Ana Teste', 'ana@teste.invalid', null, 'indicacao', 'Terceira tentativa de teste.', 'v1', 'Aceito', 'pt-PT', 'candidatura:x');
select is(public.parceiro_candidatura_criar('Ana Teste', 'ana@teste.invalid', null, 'indicacao',
  'Quarta tentativa de teste.', 'v1', 'Aceito', 'pt-PT', 'candidatura:x') ->> 'resultado',
  'limite', 'Quarta candidatura em 24 h recusada (limite)');
select is(testes.tenta($$select public.parceiro_candidatura_criar('Ana', 'ana@teste.invalid', null, 'indicacao', 'Descrição válida.', 'v1', ' ', 'pt-PT', 'candidatura:y')$$),
  'erro:P0001', 'Sem texto aceite a candidatura é recusada');

-- O código 'PARC2345' não pode coincidir com um código de amigo.
insert into public.indicacoes_codigos (user_id, codigo) values ('00000000-0000-4000-f000-0000000000ff', 'AMGZ2345');

select is(testes.tenta($$select public.parceiro_candidatura_decidir(
  (select id from public.parceiros_candidaturas where descricao like 'Recomendo%'), true, null, 'AMGZ2345',
  '00000000-0000-4000-f000-0000000000aa')$$),
  'erro:23505', 'Código já usado por um amigo é recusado (23505, o gerador tenta outro)');
select is(public.parceiro_candidatura_decidir(
  (select id from public.parceiros_candidaturas where descricao like 'Recomendo%'), true, null, 'PARC2345',
  '00000000-0000-4000-f000-0000000000aa') ->> 'resultado',
  'aprovada', 'Aprovação cria o parceiro');
select is(public.parceiro_candidatura_decidir(
  (select id from public.parceiros_candidaturas where descricao like 'Recomendo%'), true, null, 'PARC6789',
  '00000000-0000-4000-f000-0000000000aa') ->> 'resultado',
  'ja_decidida', 'Uma candidatura só é decidida uma vez');
select is(testes.tenta($$insert into public.indicacoes_codigos (user_id, codigo) values ('00000000-0000-4000-f000-000000000004', 'PARC2345')$$),
  'erro:23505', 'Um amigo não pode receber um código de parceiro');
select is(testes.tenta($$select public.parceiro_candidatura_decidir(
  (select id from public.parceiros_candidaturas where descricao like 'Segunda%'), false, '  ', null, '00000000-0000-4000-f000-0000000000aa')$$),
  'erro:P0001', 'Rejeitar exige motivo');

create temporary table t_ids as select id as parceiro from public.parceiros where nome = 'Imobiliária Teste';
grant select on t_ids to authenticated;

select is((select estado from public.parceiros where id = (select parceiro from t_ids)), 'ativo', 'Parceiro de indicação fica ativo');
select is((select comissao_protecao_cents || '/' || comissao_caso_protecao_cents || '/' || mensalidades_necessarias || '/' || b2b_percentagem || '/' || minimo_pagamento_cents
             from public.parceiros_condicoes where parceiro_id = (select parceiro from t_ids)),
  '500/800/3/10.00/2500', 'Condições iniciais: 5 €, 8 €, 3 mensalidades, 10 %, 25 €');
select ok(exists (select 1 from public.parceiros_historico where entidade = 'parceiros' and entidade_id = (select parceiro from t_ids)
                    and por = '00000000-0000-4000-f000-0000000000aa'),
  'Criação do parceiro fica no histórico com o admin');
select is(testes.tenta($$update public.parceiros_condicoes set comissao_protecao_cents = 900$$),
  'erro:42501', 'Condições não se alteram (nova versão)');
select is(testes.tenta($$update public.parceiros_historico set acao = 'criado'$$),
  'erro:42501', 'Histórico só de inserção');

-- Conta do próprio parceiro (auto-indicação)
update public.parceiros set user_id = '00000000-0000-4000-f000-0000000000bb', alterado_por = '00000000-0000-4000-f000-0000000000aa'
 where id = (select parceiro from t_ids);

-- Atribuição
create temporary table t_visita as select public.parceiro_registar_visita('PARC2345') as id;
select ok((select id from t_visita) is not null, 'Visita por /r/ de parceiro registada');
select ok(public.parceiro_registar_visita('ZZZZ2345') is null, 'Código inexistente não regista visita');

select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000001', (select id from t_visita), null), 'atribuida',
  'Cliente novo atribuído pela ligação');
select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000001', null, 'PARC2345'), 'ja_atribuida',
  'A atribuição nunca muda');
select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000002', null, ' parc-2345 '), 'atribuida',
  'Cliente novo atribuído pelo código escrito (normalizado)');
select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000003', null, 'XXXX9999'), 'codigo_invalido',
  'Código escrito inválido');
select is(public.parceiro_atribuir('00000000-0000-4000-f000-0000000000bb', null, 'PARC2345'), 'auto_indicacao',
  'O parceiro não se atribui a si próprio');
select is(public.parceiro_atribuir('00000000-0000-4000-f000-0000000000cc', null, 'PARC2345'), 'ja_cliente',
  'Conta que já é cliente não é atribuída');

-- Amigo primeiro → parceiro recusado; parceiro primeiro → amigo recusado.
insert into public.indicacoes_visitas (id, codigo) values ('00000000-0000-4000-f000-00000000a001', 'AMGZ2345');
select is(public.indicacao_atribuir('00000000-0000-4000-f000-000000000003', '00000000-0000-4000-f000-00000000a001'), 'atribuida',
  'Conta indicada por um amigo');
select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000003', null, 'PARC2345'), 'ja_atribuida',
  'Conta indicada por um amigo não é atribuída a um parceiro');
select is(public.indicacao_atribuir('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-f000-00000000a001'), 'ja_atribuida',
  'Conta de um parceiro não é atribuída a um amigo');
select is(testes.tenta($$insert into public.indicacoes (referrer_user_id, referred_user_id, codigo, visitado_em)
  values ('00000000-0000-4000-f000-0000000000ff', '00000000-0000-4000-f000-000000000002', 'AMGZ2345', now())$$),
  'erro:23505', 'Garantia na base de dados: amigo e parceiro nunca para a mesma conta');

-- Visita expirada
create temporary table t_visita_velha as select public.parceiro_registar_visita('PARC2345') as id;
update public.parceiros_visitas set criado_em = now() - interval '31 days' where id = (select id from t_visita_velha);
select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000004', (select id from t_visita_velha), null), 'expirada',
  'Visita com mais de 30 dias não atribui');

-- Comissões B2C (cliente 1: Protecção)
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_0', 'sub_1', 'protecao', 0), 'sem_pagamento',
  'Fatura de 0 € (Protecção gratuita, cupão 100 %) não conta');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_av', 'sub_1', 'avulso', 1199), 'produto_excluido',
  'Avulso não dá comissão');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_1', 'sub_1', 'protecao', 499), 'pendente',
  '1.ª mensalidade: comissão pendente');
select is((select valor_cents from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'), 500::bigint,
  'Valor da comissão: 5 € na Protecção');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_1', 'sub_1', 'protecao', 499), 'duplicada',
  'Reenvio da mesma fatura não conta duas vezes');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_2', 'sub_1', 'protecao', 499), 'pendente',
  '2.ª mensalidade: ainda pendente');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_x', 'sub_outra', 'protecao', 499), 'outra_subscricao',
  'Outra subscrição da mesma conta não conta');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_3', 'sub_1', 'protecao', 499), 'elegivel',
  '3.ª mensalidade paga: comissão elegível');
select is(testes.fatura('00000000-0000-4000-f000-000000000003', 'in_f', 'sub_f', 'protecao', 499), 'sem_atribuicao',
  'Conta indicada por amigo: sem comissão de parceiro');
select is((select count(*)::int from public.parceiros_comissoes where tipo = 'b2c'), 1, 'Uma só comissão por conta');

-- Reembolso de uma das 3 → volta a pendente; nova fatura → elegível de novo.
select is(public.parceiro_reverter_fatura('in_2', null, 'reembolso') ->> 'resultado', 'pendente',
  'Reembolso de uma mensalidade antes do pagamento: volta a pendente');
select is((select mensalidades_pagas from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'), 2,
  'Mensalidades recontadas');
select is(testes.fatura('00000000-0000-4000-f000-000000000001', 'in_4', 'sub_1', 'protecao', 499), 'elegivel',
  'Nova mensalidade paga: elegível outra vez');

-- Máquina de estados
select is(testes.tenta($$update public.parceiros_comissoes set estado = 'paga' where stripe_subscription_id = 'sub_1'$$),
  'erro:42501', 'Elegível → paga sem aprovação nem pagamento registado é recusado');
select is(testes.tenta($$delete from public.parceiros_comissoes$$), 'erro:42501', 'Comissões nunca se apagam');

-- Aprovação e pagamento
select is(public.parceiro_aprovar_comissoes(array(select id from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'),
  '00000000-0000-4000-f000-0000000000aa'), 1, 'Comissão elegível aprovada');
select is(public.parceiro_registar_pagamento((select parceiro from t_ids),
  array(select id from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'),
  current_date, 'TRF-0001', null, '00000000-0000-4000-f000-0000000000aa', 116) ->> 'resultado',
  'iva_invalido', 'IVA acima de 23 % da comissão é recusado (erro de digitação)');
select is(public.parceiro_registar_pagamento((select parceiro from t_ids),
  array(select id from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'),
  current_date, 'TRF-0001', null, '00000000-0000-4000-f000-0000000000aa', 115, 'FR 2026/12') ->> 'resultado',
  'registado', 'Pagamento manual registado, com o IVA da factura do parceiro');
select is((select total_cents || '/' || iva_cents || '/' || total_transferido_cents || '/' || documento_parceiro
             from public.parceiros_pagamentos where referencia = 'TRF-0001'),
  '500/115/615/FR 2026/12', 'Comissão sem IVA (5 €) + IVA 23 % (1,15 €) = 6,15 € transferidos');
select is(public.parceiro_registar_pagamento((select parceiro from t_ids),
  array(select id from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'),
  current_date, 'TRF-0001', null, '00000000-0000-4000-f000-0000000000aa') ->> 'resultado',
  'ja_registado', 'Mesmo pagamento duas vezes: idempotente');
select is(public.parceiro_registar_pagamento((select parceiro from t_ids),
  array(select id from public.parceiros_comissoes where stripe_subscription_id = 'sub_1'),
  current_date, 'TRF-0002', null, '00000000-0000-4000-f000-0000000000aa') ->> 'resultado',
  'comissoes_invalidas', 'Comissão já paga não entra noutro pagamento');
select is(testes.tenta($$update public.parceiros_comissoes set estado = 'aprovada' where stripe_subscription_id = 'sub_1'$$),
  'erro:42501', 'Paga é final');
select is(public.parceiro_reverter_fatura('in_3', null, 'reembolso') ->> 'resultado', 'ja_paga',
  'Reembolso depois de paga: nada automático (aviso ao admin)');
select is(testes.tenta($$delete from public.parceiros_pagamentos$$), 'erro:42501', 'Pagamentos só de inserção');

-- Cliente 2: Caso + Protecção; disputa; cancelamento antes de elegível.
select is(testes.fatura('00000000-0000-4000-f000-000000000002', 'in_c1', 'sub_2', 'caso_protecao', 799), 'pendente',
  'Caso + Protecção: comissão pendente');
select is((select valor_cents from public.parceiros_comissoes where stripe_subscription_id = 'sub_2'), 800::bigint,
  'Valor da comissão: 8 € no Caso + Protecção');
select is(public.parceiro_reverter_fatura(null, 'pi_in_c1', 'disputa') ->> 'resultado', 'em_validacao',
  'Disputa (pelo PaymentIntent): comissão em validação');
select is(public.parceiro_validar_comissao((select id from public.parceiros_comissoes where stripe_subscription_id = 'sub_2'),
  true, 'Disputa ganha', '00000000-0000-4000-f000-0000000000aa'), 'validada', 'Validação humana');
select is((select estado from public.parceiros_comissoes where stripe_subscription_id = 'sub_2'), 'pendente',
  'Validada mas sem 3 mensalidades: pendente');
select is(public.parceiro_subscricao_terminada('sub_2'), 'cancelada', 'Cancelamento antes de elegível: comissão cancelada');
select is(testes.fatura('00000000-0000-4000-f000-000000000002', 'in_c2', 'sub_2', 'caso_protecao', 799), 'comissao_final',
  'Comissão cancelada não reabre');

-- Sinal de auto-indicação: mesmo Customer Stripe da conta do parceiro.
select is(public.parceiro_atribuir('00000000-0000-4000-f000-000000000004', null, 'PARC2345'), 'atribuida', 'Cliente 4 atribuído');
select is(public.parceiro_registar_fatura('00000000-0000-4000-f000-000000000004', 'in_s1', 'sub_4', 'protecao', 499, 0, 0,
  null, 'cus_sub_pp_p', now()) ->> 'resultado', 'em_validacao',
  'Mesmo Customer Stripe do parceiro: em validação (revisão humana)');

-- B2B
insert into public.parceiros_oportunidades (parceiro_id, entidade, apresentada_em, valida_ate, alterado_por)
values ((select parceiro from t_ids), 'Empresa Exemplo, Lda.', current_date, null, '00000000-0000-4000-f000-0000000000aa');
select is((select valida_ate - apresentada_em from public.parceiros_oportunidades where entidade = 'Empresa Exemplo, Lda.'), 90,
  'Validade inicial de 90 dias');
select is(testes.tenta($$update public.parceiros_oportunidades set valida_ate = valida_ate + 30 where entidade = 'Empresa Exemplo, Lda.'$$),
  'erro:22023', 'Prorrogar sem motivo é recusado');
select is(testes.tenta($$update public.parceiros_oportunidades set percentagem = 15, modo = 'indicada' where entidade = 'Empresa Exemplo, Lda.'$$),
  'erro:23514', 'Mais de 10 % só em venda activa com autorização');
update public.parceiros_oportunidades
   set estado = 'ganha', ganha_em = now(), contrato_inicio = date '2026-01-01', percentagem = 15, modo = 'venda_ativa',
       percentagem_autorizada_por = '00000000-0000-4000-f000-0000000000aa'
 where entidade = 'Empresa Exemplo, Lda.';
insert into public.parceiros_oportunidades_receitas (oportunidade_id, tipo, recebido_em, valor_sem_iva_cents)
select id, 'recebimento', date '2026-02-01', 100000 from public.parceiros_oportunidades where entidade = 'Empresa Exemplo, Lda.'
union all
select id, 'recebimento', date '2027-01-15', 100000 from public.parceiros_oportunidades where entidade = 'Empresa Exemplo, Lda.';
select is(public.parceiro_b2b_recalcular((select id from public.parceiros_oportunidades where entidade = 'Empresa Exemplo, Lda.'),
  '00000000-0000-4000-f000-0000000000aa') ->> 'valor_cents', '15000',
  'B2B: 15 % só da receita do 1.º ano (fora do 1.º ano não conta)');
insert into public.parceiros_oportunidades_receitas (oportunidade_id, tipo, recebido_em, valor_sem_iva_cents)
select id, 'reembolso', date '2026-03-01', 20000 from public.parceiros_oportunidades where entidade = 'Empresa Exemplo, Lda.';
select is(public.parceiro_b2b_recalcular((select id from public.parceiros_oportunidades where entidade = 'Empresa Exemplo, Lda.'),
  '00000000-0000-4000-f000-0000000000aa') ->> 'valor_cents', '12000',
  'B2B: reembolso reduz a base');
select is((select count(*)::int from public.parceiros_comissoes where tipo = 'b2b'), 1, 'B2B: uma comissão aberta por oportunidade');
select is(testes.tenta($$update public.parceiros_oportunidades set estado = 'perdida' where entidade = 'Empresa Exemplo, Lda.'$$),
  'erro:42501', 'Ganha é final');
insert into public.parceiros_oportunidades (parceiro_id, entidade, apresentada_em, valida_ate)
values ((select parceiro from t_ids), 'Empresa Antiga, S.A.', current_date - 100, current_date - 10);
select is(testes.tenta($$update public.parceiros_oportunidades set estado = 'ganha', ganha_em = now(), contrato_inicio = current_date, percentagem = 10 where entidade = 'Empresa Antiga, S.A.'$$),
  'erro:22023', 'Oportunidade fora da validade não pode ser ganha');

select ok(exists (select 1 from public.parceiros_resumo_comissoes() r where r.parceiro_id = (select parceiro from t_ids)),
  'Resumo de comissões por parceiro');

-- ===========================================================================
-- Parte B — Parceiro de Distribuição
-- ===========================================================================
insert into public.parceiros (distribuicao, nome, estado, alterado_por)
values (true, 'Empresa Distribuidora', 'ativo', '00000000-0000-4000-f000-0000000000aa');
insert into public.parceiros_pacotes (parceiro_id, nome, quantidade, duracao_meses, valor_acordado_cents, ativacao_ate, criado_por)
select id, 'Protecção 3 meses — 50 acessos', 50, 3, 50000, current_date + 60, '00000000-0000-4000-f000-0000000000aa'
  from public.parceiros where nome = 'Empresa Distribuidora';
create temporary table t_pacote as select id from public.parceiros_pacotes where nome like 'Protecção 3 meses%';
grant select on t_pacote to authenticated;

-- 50 códigos de teste com o alfabeto permitido.
create temporary table t_codigos as
  select 'ABCDEFGH' || lpad(translate(g::text, '0123456789', 'ABCDEFGHJK'), 4, 'Z') as codigo, g
    from generate_series(1, 50) g;

select is(public.parceiro_pacote_emitir_codigos((select id from t_pacote), array(select codigo from t_codigos), '00000000-0000-4000-f000-0000000000aa') ->> 'resultado',
  'pagamento_por_confirmar', 'Sem pagamento confirmado não há códigos');
select is(public.parceiro_pacote_confirmar_pagamento((select id from t_pacote), 'FT 2026/1', '00000000-0000-4000-f000-0000000000aa'),
  'confirmado', 'Pagamento do pacote confirmado pelo admin');
select is(public.parceiro_pacote_emitir_codigos((select id from t_pacote), array(select codigo from t_codigos), '00000000-0000-4000-f000-0000000000aa') ->> 'emitidos',
  '50', '50 códigos emitidos');
select is(public.parceiro_pacote_emitir_codigos((select id from t_pacote), array['ZZZZZZZZZZZZ'], '00000000-0000-4000-f000-0000000000aa') ->> 'resultado',
  'quantidade_excedida', 'Nunca mais códigos do que a quantidade');
select ok(not exists (select 1 from public.parceiros_codigos_acesso c join t_codigos t on c.codigo_hash = t.codigo),
  'Os códigos não ficam guardados em claro');
select is(testes.tenta($$update public.parceiros_pacotes set duracao_meses = 6 where id = (select id from t_pacote)$$),
  'erro:42501', 'A duração não muda depois de haver códigos');

-- Activação
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-0000000000ff', (select lower(codigo) from t_codigos where g = 1), 'v1', 'Aceito') ->> 'resultado',
  'ativado', 'Código válido (minúsculas aceites) activa a Protecção');
select is((select (termina_em at time zone 'Europe/Lisbon')::date - (inicio_em at time zone 'Europe/Lisbon')::date
             between 89 and 92 from public.acessos_patrocinados where user_id = '00000000-0000-4000-f000-0000000000ff'), true,
  'Duração de 3 meses de calendário');
select is((select ((inicio_em at time zone 'Europe/Lisbon') + interval '3 months') = (termina_em at time zone 'Europe/Lisbon')
             from public.acessos_patrocinados where user_id = '00000000-0000-4000-f000-0000000000ff'), true,
  'Fim = início + 3 meses (hora de Lisboa)');
select ok(public.conta_tem_protecao('00000000-0000-4000-f000-0000000000ff'), 'Acesso patrocinado dá Protecção');
select ok(not exists (select 1 from public.user_access where user_id = '00000000-0000-4000-f000-0000000000ff'),
  'Sem Stripe: nenhuma linha de subscrição nem Customer');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-0000000000ff', (select codigo from t_codigos where g = 1), 'v1', 'Aceito') ->> 'resultado',
  'ja_ativado', 'Mesmo código, mesma conta: idempotente');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-000000000004', (select codigo from t_codigos where g = 1), 'v1', 'Aceito') ->> 'resultado',
  'codigo_invalido', 'Código já usado por outra conta: recusado (sem o revelar)');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-0000000000ff', (select codigo from t_codigos where g = 2), 'v1', 'Aceito') ->> 'resultado',
  'acesso_ativo', 'Não se acumulam dois acessos patrocinados');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-0000000000cc', (select codigo from t_codigos where g = 2), 'v1', 'Aceito') ->> 'resultado',
  'protecao_ativa', 'Subscritor com Protecção paga: código recusado e por usar');
select is((select estado from public.parceiros_codigos_acesso c join t_codigos t on c.codigo_hash = encode(sha256(convert_to(t.codigo, 'UTF8')), 'hex') where t.g = 2),
  'emitido', 'O código recusado continua disponível');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-0000000000dd', (select codigo from t_codigos where g = 2), 'v1', 'Aceito') ->> 'resultado',
  'email_nao_confirmado', 'E-mail por confirmar não activa');
select is(public.protecao_gratuita_elegibilidade('00000000-0000-4000-f000-0000000000ff', 'hmac:' || repeat('a', 64)),
  'ja_teve_protecao', 'Acesso patrocinado conta como "já teve Protecção" para os 30 dias gratuitos');

-- Anulado e expirado
select is(public.parceiro_codigo_acesso_anular(
  (select c.id from public.parceiros_codigos_acesso c join t_codigos t on c.codigo_hash = encode(sha256(convert_to(t.codigo, 'UTF8')), 'hex') where t.g = 3),
  'Perdido', '00000000-0000-4000-f000-0000000000aa'), 'anulado', 'Código por usar anulado');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-000000000004', (select codigo from t_codigos where g = 3), 'v1', 'Aceito') ->> 'resultado',
  'codigo_invalido', 'Código anulado não activa');
select is(public.parceiro_codigo_acesso_anular(
  (select c.id from public.parceiros_codigos_acesso c join t_codigos t on c.codigo_hash = encode(sha256(convert_to(t.codigo, 'UTF8')), 'hex') where t.g = 1),
  'Engano', '00000000-0000-4000-f000-0000000000aa'), 'sem_alteracao', 'Código já activado não se anula');
update public.parceiros_pacotes set ativacao_ate = current_date - 1 where id = (select id from t_pacote);
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-000000000004', (select codigo from t_codigos where g = 4), 'v1', 'Aceito') ->> 'resultado',
  'codigo_expirado', 'Prazo de activação do pacote passado: código expirado');
update public.parceiros_pacotes set ativacao_ate = current_date + 60 where id = (select id from t_pacote);

-- Limite de tentativas (10 por hora, contando com as anteriores desta conta).
select is((select count(*)::int from (
  select public.acesso_patrocinado_ativar('00000000-0000-4000-f000-000000000004', 'ERRADO' || g, 'v1', 'Aceito') ->> 'resultado' as r
    from generate_series(1, 12) g) x where r = 'demasiadas_tentativas') >= 3, true,
  'Depois de 10 tentativas por hora: demasiadas tentativas');
select is(public.acesso_patrocinado_ativar('00000000-0000-4000-f000-000000000004', (select codigo from t_codigos where g = 5), 'v1', 'Aceito') ->> 'resultado',
  'demasiadas_tentativas', 'O limite aplica-se também a um código válido');

-- RLS
select testes.como('00000000-0000-4000-f000-0000000000ff');
select ok(public.tem_protecao(), 'Com a sessão do beneficiário: tem_protecao() verdadeiro');
select is((select count(*)::int from public.acessos_patrocinados), 1, 'O beneficiário lê o próprio acesso');
select is(testes.tenta($$select codigo_id from public.acessos_patrocinados$$), 'erro:42501', 'Mas não o código usado');
select is((select count(*)::int from public.parceiros), 0, 'Cliente não lê parceiros');
select is((select count(*)::int from public.parceiros_comissoes), 0, 'Cliente não lê comissões');
select is((select count(*)::int from public.parceiros_codigos_acesso), 0, 'Cliente não lê códigos');
select is(testes.tenta($$insert into public.acessos_patrocinados (user_id, codigo_id, pacote_id, parceiro_id, termina_em, termos_versao, texto_aceite)
  values (auth.uid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now() + interval '1 year', 'v', 't')$$),
  'erro:42501', 'Cliente não cria acessos pela API');
select is(testes.tenta($$select public.acesso_patrocinado_ativar(auth.uid(), 'ABCDEFGHAAAA', 'v', 't')$$),
  'erro:42501', 'Cliente não chama a activação diretamente');
select is(testes.tenta($$select public.parceiro_relatorio_distribuicao(gen_random_uuid())$$),
  'erro:P0001', 'Relatório só para admin');
select is(testes.tenta($$select public.limite_tentar('x', 1, interval '1 hour')$$), 'erro:42501', 'Limites só para o servidor');
reset role;

select testes.como('00000000-0000-4000-f000-0000000000aa');
select is((select count(*)::int from public.parceiros), 2, 'Admin lê os parceiros');
select is(testes.tenta($$update public.parceiros set nome = 'X'$$), 'erro:42501', 'Admin não escreve pela API (só servidor)');
reset role;

-- Relatório
select is(public.parceiro_relatorio_distribuicao((select id from public.parceiros where nome = 'Empresa Distribuidora')) - 'ativos_agora',
  jsonb_build_object('adquiridos', 50, 'emitidos', 50, 'ativados', 1, 'disponiveis', 48, 'expirados', 0, 'anulados', 1),
  'Relatório com contagens');
select ok(not (public.parceiro_relatorio_distribuicao((select id from public.parceiros where nome = 'Empresa Distribuidora'))::text ~ 'teste\.invalid|0000-4000'),
  'Relatório sem e-mails nem ids de beneficiários');

-- Fim automático
alter table public.acessos_patrocinados disable trigger acessos_patrocinados_prova_imutavel;
update public.acessos_patrocinados set inicio_em = now() - interval '3 months 1 day', termina_em = now() - interval '1 minute'
 where user_id = '00000000-0000-4000-f000-0000000000ff';
alter table public.acessos_patrocinados enable trigger acessos_patrocinados_prova_imutavel;
select ok(not public.conta_tem_protecao('00000000-0000-4000-f000-0000000000ff'), 'Depois do fim: sem Protecção (mesmo antes do job)');
insert into public.preferencias_setor (utilizador_id, setor) values ('00000000-0000-4000-f000-0000000000ff', 'Telecomunicações');
select is((public.acesso_patrocinado_manutencao() ->> 'terminados')::int, 1, 'Job termina o acesso');
select is((select estado from public.acessos_patrocinados where user_id = '00000000-0000-4000-f000-0000000000ff'), 'terminado', 'Estado terminado');
select ok((select desativado_em is not null from public.preferencias_setor where utilizador_id = '00000000-0000-4000-f000-0000000000ff'),
  'Dados da Protecção desactivados (conservados), como no fim de uma subscrição');
select ok(not exists (select 1 from public.user_access where user_id = '00000000-0000-4000-f000-0000000000ff'),
  'Nenhuma cobrança nem subscrição criada no fim');
select is(public.acesso_patrocinado_marco_atual((select id from public.acessos_patrocinados where user_id = '00000000-0000-4000-f000-0000000000ff')),
  'fim', 'Aviso de fim pendente');

select * from finish();
rollback;
