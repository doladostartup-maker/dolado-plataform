-- DoLado — Energia Solar / Autoconsumo (13/10/2026)
--
-- Auditoria: docs/legal/auditoria-regras-energia-solar-2026-10-13.md
-- Relatório desta implementação: docs/legal/implementacao-energia-solar-2026-10-13.md
--
-- 1. Respostas adicionais do formulário dos casos de painéis solares
--    (pedidos_caso.detalhes_caso e casos.detalhes_caso, jsonb validado):
--    forma de contratação, financiamento e tipo de contrato (compra/CAER).
--    Só decidem que regras jurídicas podem ser consideradas
--    (src/lib/rascunhoIA/perfilAutoconsumo.ts) — nunca acesso, plano nem preço.
-- 2. converter_pedido_em_caso() copia detalhes_caso para o caso (resto igual
--    a 20261005190000_caso_extra.sql).
-- 3. 17 regras novas (9 gerais, 5 de Autoconsumo/UPAC, 3 de CAER).
--
-- Textos legais lidos a 13/10/2026 nas versões consolidadas oficiais (PGDL) e
-- no Diário da República:
--   DL 84/2021 (sem alterações): arts. 2.º, 3.º, 11.º, 15.º, 40.º, 43.º;
--   DL 24/2014 (7.ª versão, Lei 10/2023): arts. 3.º, 9.º, 10.º, 16.º, 17.º;
--   Lei 24/96: art. 12.º;
--   DL 133/2009 (7.ª versão, DL 103/2025): arts. 4.º, n.º 1, al. o), e 18.º;
--   DL 15/2022 (11.ª versão, DL 130/2026): arts. 11.º, 81.º, 81.º-A, 84.º, 88.º, 96.º;
--   Lei 29/2026, de 23/06 (DR n.º 119, 1.ª série): arts. 2.º a 6.º, 11.º, 12.º.
--   DL 130/2026: em vigor a 28/08/2026 (DGEG); aplica-se aos procedimentos
--   de controlo prévio iniciados depois dessa data.
--
-- Regras:
--   * TODAS entram com ativa = false, revista_em = null, revista_por = null —
--     a IA não as recebe enquanto Thiago/advogada não as reverem e ativarem.
--   * Não altera nenhuma regra existente. As regras do DL 24/2014 sobre o
--     prazo de livre resolução (DIST_LIVRE_RESOLUCAO, COMPRA_LR_BENS_INICIO_10)
--     já dizem 14 dias em regra e 30 dias só nos contratos das subalíneas ii)
--     e v) da alínea i) do artigo 3.º — é o texto em vigor do artigo 10.º.
--   * ON CONFLICT só atualiza regras desta carga ainda não revistas nem ativas.
--   * Categorias novas: Autoconsumo, CAER, Crédito coligado e Danos. As três
--     primeiras só chegam à IA pelo perfil de Autoconsumo (regras.ts).
--   * O validador da IA só aceita diplomas que constem do diploma/artigo das
--     regras enviadas: por isso as regras da UPAC indicam no diploma a
--     redação do DL 130/2026.

-- ===========================================================================
-- 1. detalhes_caso
-- ===========================================================================

create or replace function public.detalhes_caso_valido(d jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select d is null or (
    jsonb_typeof(d) = 'object'
    and not exists (
      select 1 from jsonb_object_keys(d) as k(chave)
      where k.chave not in ('forma_contratacao', 'financiamento', 'tipo_contrato_solar')
    )
    and (d -> 'forma_contratacao' is null
         or d ->> 'forma_contratacao' in ('estabelecimento', 'domicilio', 'distancia', 'fora_estabelecimento', 'nao_sei'))
    and (d -> 'financiamento' is null
         or d ->> 'financiamento' in ('nao', 'sim_com_compra', 'sim_separado', 'nao_sei'))
    and (d -> 'tipo_contrato_solar' is null
         or d ->> 'tipo_contrato_solar' in ('compra_instalacao', 'caer', 'nao_sei'))
  )
$$;

comment on function public.detalhes_caso_valido(jsonb) is
  'Respostas adicionais do formulário (casos de painéis solares): só chaves e valores das listas fechadas de src/lib/pedidoCaso.ts.';

revoke execute on function public.detalhes_caso_valido(jsonb) from public, anon;
grant execute on function public.detalhes_caso_valido(jsonb) to authenticated, service_role;

alter table public.pedidos_caso
  add column if not exists detalhes_caso jsonb
  constraint pedidos_caso_detalhes_caso_valido check (public.detalhes_caso_valido(detalhes_caso));

alter table public.casos
  add column if not exists detalhes_caso jsonb
  constraint casos_detalhes_caso_valido check (public.detalhes_caso_valido(detalhes_caso));

comment on column public.pedidos_caso.detalhes_caso is
  'Casos de painéis solares (Energia → Autoconsumo): forma de contratação, financiamento e tipo de contrato. Gravado só pelo servidor. Só seleção de regras jurídicas — nunca acesso.';
comment on column public.casos.detalhes_caso is
  'Casos de painéis solares (Energia → Autoconsumo): forma de contratação, financiamento e tipo de contrato (copiado do pedido; o admin pode corrigir). Só seleção de regras jurídicas — nunca acesso.';

-- ===========================================================================
-- 2. converter_pedido_em_caso: copia detalhes_caso
-- ===========================================================================

create or replace function public.converter_pedido_em_caso(p_pedido_id uuid, p_user_id uuid, p_origem_avulso text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pedido public.pedidos_caso%rowtype;
  v_email text;
  v_caso uuid;
  v_consumo text;
  v_origem_credito text;
begin
  select * into v_pedido from public.pedidos_caso where id = p_pedido_id for update;
  if not found or v_pedido.user_id is distinct from p_user_id then
    return null;
  end if;
  if v_pedido.estado = 'convertido' then
    return v_pedido.caso_id;
  end if;
  if v_pedido.estado = 'cancelado' then
    return null;
  end if;

  -- Pedido pago com uma compra única (Avulso ou Caso Extra): gasta essa
  -- compra. Sem origem: regra normal (subscrição primeiro). Se algo abaixo
  -- falhar, tudo é revertido.
  v_consumo := public.consumir_credito_caso(p_user_id, p_origem_avulso);
  if v_consumo is null then
    return null;
  end if;

  if v_consumo = 'subscricao' then
    v_origem_credito := 'subscricao';
  else
    select produto into v_origem_credito from public.case_credit_grants where origem = v_consumo;
  end if;

  select email into v_email from public.utilizadores where id = p_user_id;

  insert into public.casos (
    utilizador_id, nome, email, telefone, sector, empresa, problema_tipo, descricao,
    momento_cliente, origem, autorizacao, consentimento_tratamento_em,
    consentimento_alertas, consentimento_alertas_em, status, origem_credito, detalhes_caso
  ) values (
    p_user_id, v_pedido.nome, v_email, v_pedido.telefone, v_pedido.sector, v_pedido.empresa,
    v_pedido.problema_tipo, v_pedido.descricao, v_pedido.momento_cliente, v_pedido.origem,
    v_pedido.autorizacao, v_pedido.pedido_confirmado_em,
    v_pedido.consentimento_alertas, v_pedido.consentimento_alertas_em, 'Novo', v_origem_credito,
    v_pedido.detalhes_caso
  ) returning id into v_caso;

  if v_consumo like 'checkout:%' then
    update public.case_credit_grants set caso_id = v_caso where origem = v_consumo;
  end if;

  if v_pedido.anexo_caminho is not null then
    insert into public.anexos (caso_id, nome_ficheiro, caminho_storage, tipo_mime, tamanho_bytes)
    values (v_caso, coalesce(v_pedido.anexo_nome, v_pedido.anexo_caminho), v_pedido.anexo_caminho,
            v_pedido.anexo_tipo, v_pedido.anexo_tamanho);
  end if;

  update public.pedidos_caso
     set estado = 'convertido', caso_id = v_caso, convertido_em = now()
   where id = p_pedido_id;

  return v_caso;
end $$;

revoke execute on function public.converter_pedido_em_caso(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.converter_pedido_em_caso(uuid, uuid, text) to service_role;

-- ===========================================================================
-- 3. Regras jurídicas (todas inativas e por rever)
-- ===========================================================================

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa, revista_em, revista_por,
  efeito_juridico, provas_necessarias, resultado_pretendido, palavras_chave
) values

-- ---------------------------------------------------------------------------
-- Gerais (setor null) — DL 84/2021
-- ---------------------------------------------------------------------------

('GAR_EMPREITADA_3', null, 'Conformidade', 'Âmbito — fornecimento e instalação',
 'Bens fornecidos com instalação, em empreitada ou prestação de serviços',
 'Decreto-Lei n.º 84/2021, de 18 de outubro', 'Artigo 3.º, n.º 1, alíneas a) e b)',
 'O regime do Decreto-Lei n.º 84/2021 aplica-se aos contratos de compra e venda celebrados entre consumidores e profissionais, incluindo os de fornecimento de bens a fabricar ou a produzir, e também aos bens fornecidos no âmbito de um contrato de empreitada ou de outra prestação de serviços, bem como à locação de bens, com as necessárias adaptações. Num contrato em que o profissional fornece e instala equipamento (por exemplo, painéis solares, inversor ou bateria), os bens fornecidos podem por isso estar abrangidos pelas regras de conformidade, de entrega e dos direitos do consumidor deste diploma. A qualificação do contrato e as adaptações necessárias exigem análise concreta.',
 'Consumidor (pessoa singular, para uso não profissional) e profissional; contrato celebrado a partir de 01/01/2022. Identificar se o profissional vendeu e/ou instalou os bens e o que consta do contrato ou orçamento. Esta regra define o âmbito: usar em conjunto com as regras de conformidade e de entrega do mesmo diploma. Não aplicar o regime dos bens imóveis (artigos 22.º a 25.º) sem análise humana: um equipamento instalado depois numa habitação não é, por si só, a compra de um imóvel. Se o equipamento pertence a um terceiro que o explora (por exemplo, contrato de aproveitamento energético renovável), análise humana.',
 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301', '2022-01-01', null, false, null, null,
 'Os bens fornecidos e instalados no âmbito de empreitada ou prestação de serviços podem beneficiar do regime de conformidade do Decreto-Lei n.º 84/2021, com as necessárias adaptações.',
 'Contrato, proposta ou orçamento de fornecimento e instalação; faturas; descrição dos equipamentos; data de conclusão da instalação.',
 'Aplicação do regime de conformidade (reposição da conformidade, redução do preço ou resolução) aos bens fornecidos e instalados.',
 array['fornecimento e instalação', 'empreitada', 'instalação', 'painéis solares', 'equipamento instalado', 'prestação de serviços']),

('GAR_ENTREGA_INSTALACAO_11', null, 'Entrega', 'Entrega — instalação pelo profissional',
 'Com instalação a cargo do profissional, a entrega dá-se com a instalação concluída',
 'Decreto-Lei n.º 84/2021, de 18 de outubro', 'Artigo 11.º, n.º 2',
 'Nos casos em que o contrato de compra e venda preveja a instalação do bem por conta do profissional, o bem considera-se entregue quando a instalação se encontrar concluída. A data de entrega releva, nomeadamente, para o prazo de entrega (artigo 11.º, n.os 4 a 8), para a contagem do prazo de garantia (artigo 12.º) e para a falta de conformidade manifestada nos primeiros 30 dias (artigo 16.º). Um equipamento deixado no local mas ainda não instalado, ou com a instalação por concluir, não se considera, em princípio, entregue para estes efeitos. Saber se a instalação está concluída necessita de análise concreta.',
 'Contrato que preveja a instalação do bem por conta do profissional; consumidor e profissional; contrato celebrado a partir de 01/01/2022. Identificar o que o contrato inclui na instalação (por exemplo, ligação, configuração e colocação em funcionamento), a data de entrega do equipamento e a data (ou a falta) de conclusão da instalação. Nos bens fornecidos em empreitada ou prestação de serviços, aplica-se com as necessárias adaptações (artigo 3.º, n.º 1, alínea b)).',
 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301', '2022-01-01', null, false, null, null,
 'Enquanto a instalação a cargo do profissional não estiver concluída, o bem não se considera entregue: o prazo de entrega pode estar por cumprir e os prazos que contam da entrega ainda não começaram.',
 'Contrato ou orçamento com a instalação incluída; guia de entrega do equipamento; comunicações sobre o agendamento e a conclusão; fotografias da instalação por concluir; auto ou relatório de conclusão, se existir.',
 'Conclusão da instalação na data acordada ou num prazo adicional adequado; contagem dos prazos a partir da conclusão.',
 array['instalação por concluir', 'instalação incompleta', 'entrega', 'data de entrega', 'instalação concluída', 'sistema não operacional']),

('GAR_RECUSA_PAGAMENTO_15_7', null, 'Conformidade', 'Direitos do consumidor — pagamento',
 'Recusa do pagamento do remanescente do preço até ao cumprimento',
 'Decreto-Lei n.º 84/2021, de 18 de outubro', 'Artigo 15.º, n.os 7 e 8',
 'O consumidor tem o direito de recusar o pagamento de qualquer parte remanescente do preço ao profissional até que este cumpra os deveres previstos no Decreto-Lei n.º 84/2021. Este direito não abrange a recusa de prestações que estejam em mora. A existência de um dever por cumprir (por exemplo, falta de conformidade ou falta de entrega) e o montante que corresponde à parte remanescente necessitam de análise concreta.',
 'Contrato abrangido pelo Decreto-Lei n.º 84/2021 (consumidor e profissional; a partir de 01/01/2022). Deve existir parte do preço ainda por pagar e um dever do profissional por cumprir, identificado em concreto. Verificar o plano de pagamentos e as datas de vencimento: prestações já vencidas e em mora não estão abrangidas. Citar a norma de forma factual, sem recomendar ao cliente que deixe de pagar. Se o pagamento for feito através de um contrato de crédito, analisar em separado a regra do crédito coligado.',
 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301', '2022-01-01', null, false, null, null,
 'O profissional não pode exigir a parte remanescente do preço enquanto não cumprir; as prestações já em mora não ficam abrangidas.',
 'Contrato e plano de pagamentos; faturas e recibos; prova da falta de conformidade ou da instalação por concluir; comunicações ao profissional.',
 'Suspensão da exigência do remanescente do preço até ao cumprimento pelo profissional.',
 array['pagar antes', 'remanescente', 'reter pagamento', 'última prestação', 'pagamento final', 'instalação por concluir']),

('GAR_COMERCIAL_43', null, 'Garantia', 'Garantia comercial',
 'Garantia comercial: vincula nos termos da declaração e da publicidade',
 'Decreto-Lei n.º 84/2021, de 18 de outubro', 'Artigo 2.º, alínea k); artigo 43.º',
 'A garantia comercial é um compromisso, gratuito ou oneroso, assumido pelo profissional, pelo produtor ou por qualquer intermediário (o garante), para além das obrigações legais de garantia de conformidade. Vincula o garante nos termos da declaração de garantia e da publicidade disponibilizada antes ou no momento da celebração do contrato; se forem diferentes, o consumidor beneficia das condições mais favoráveis, salvo se a publicidade tiver sido corrigida antes da celebração do contrato de forma idêntica ou comparável. Quando o produtor oferece uma garantia comercial de durabilidade por um determinado período, é diretamente responsável perante o consumidor pela reparação ou substituição durante todo esse período. A declaração é entregue por escrito ou noutro suporte duradouro até à entrega do bem, em português, e indica que os direitos legais do consumidor não são afetados; a falta destes requisitos não afasta o carácter vinculativo da garantia. A garantia comercial não substitui nem reduz a garantia legal.',
 'Existe uma garantia comercial (declaração, certificado, ficha técnica ou publicidade) — por exemplo, garantias de fabricante de 10, 15, 20 ou 25 anos sobre painéis ou inversores, ou garantias de desempenho ou de produção. Identificar o garante, o âmbito, a duração, as condições de acionamento e a publicidade anterior ou contemporânea do contrato. Distinguir sempre da garantia legal (artigos 12.º e seguintes): as duas podem coexistir. Contrato celebrado a partir de 01/01/2022.',
 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301', '2022-01-01', null, false, null, null,
 'O garante fica obrigado nos termos da declaração e da publicidade; em caso de divergência valem as condições mais favoráveis ao consumidor. Os direitos legais de conformidade mantêm-se.',
 'Declaração ou certificado de garantia; publicidade, proposta comercial ou ficha técnica com a garantia anunciada; fatura com marca e modelo; comunicações com o garante.',
 'Cumprimento da garantia comercial nos termos mais favoráveis, sem prejuízo da garantia legal.',
 array['garantia comercial', 'garantia do fabricante', 'garantia de desempenho', '25 anos', 'garantia de produção', 'certificado de garantia']),

('GAR_PRODUTOR_DIRETO_40', null, 'Garantia', 'Responsabilidade do produtor',
 'Responsabilidade direta do produtor pela reparação ou substituição',
 'Decreto-Lei n.º 84/2021, de 18 de outubro', 'Artigo 2.º, alínea p); artigo 40.º',
 'Sem prejuízo dos direitos perante o profissional, o consumidor que adquiriu um bem com falta de conformidade pode optar por exigir do produtor a reparação ou a substituição, salvo se tal for impossível ou desproporcionado. O produtor pode opor-se, nomeadamente, quando a não conformidade resulte exclusivamente de declarações do profissional sobre o bem ou de má utilização, quando não tenha colocado o bem em circulação, quando se possa considerar que a não conformidade não existia quando colocou o bem no mercado, ou quando tenham decorrido mais de 10 anos desde essa colocação. O representante do produtor na zona de domicílio do consumidor é solidariamente responsável. Saber quem é o produtor e se se verifica alguma oposição necessita de análise concreta.',
 'Só quando existir fundamento factual para envolver o produtor: falta de conformidade de um bem identificado (marca e modelo) e, por exemplo, o vendedor ou instalador não resolve, não responde ou deixou de exercer atividade. Não usar quando o problema resulte só da instalação ou de declarações do vendedor. Produtor = fabricante, importador na União Europeia ou quem se apresente como produtor. Contrato celebrado a partir de 01/01/2022.',
 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301', '2022-01-01', null, false, null, null,
 'O consumidor pode dirigir o pedido de reparação ou substituição diretamente ao produtor ou ao seu representante na zona de domicílio, salvo as oposições do n.º 2.',
 'Fatura com marca, modelo e número de série; prova da falta de conformidade (relatório técnico, registos do equipamento); comunicações sem resposta ao vendedor ou instalador.',
 'Reparação ou substituição do bem pelo produtor ou pelo seu representante.',
 array['fabricante', 'produtor', 'marca', 'importador', 'instalador fechou', 'representante do produtor']),

-- ---------------------------------------------------------------------------
-- Gerais (setor null) — Lei 24/96, DL 133/2009, DL 24/2014
-- ---------------------------------------------------------------------------

('CONS_REPARACAO_DANOS_12', null, 'Danos', 'Reparação de danos',
 'Direito à indemnização por danos de bens ou serviços defeituosos',
 'Lei n.º 24/96, de 31 de julho — Lei de Defesa do Consumidor', 'Artigo 12.º',
 'O consumidor tem direito à indemnização dos danos patrimoniais e não patrimoniais resultantes do fornecimento de bens ou prestações de serviços defeituosos. O produtor é responsável, independentemente de culpa, pelos danos causados por defeitos de produtos que coloque no mercado, nos termos da lei. A existência do dano, a sua causa e o seu montante necessitam de análise concreta e de prova.',
 'Relação de consumo; dano concreto (por exemplo, infiltrações ou danos no telhado, danos elétricos noutros equipamentos ou outros prejuízos materiais) e indícios de que resulta do fornecimento ou da prestação de serviço defeituosos (por exemplo, da instalação). Não usar sem dano identificado. Não concluir a responsabilidade: descrever o dano e a sua relação com o fornecimento ou o serviço e pedir a reparação ou a indemnização. A responsabilidade objetiva do produtor tem regime próprio, não coberto por esta regra.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/lei/1996-34491075', null, null, false, null, null,
 'O consumidor pode pedir a reparação ou a indemnização dos danos resultantes do bem ou do serviço defeituoso.',
 'Fotografias e vídeos com data; relatório técnico; orçamentos ou faturas de reparação; datas da instalação e do aparecimento do dano; comunicações à empresa.',
 'Reparação dos danos ou indemnização do valor correspondente.',
 array['danos', 'infiltração', 'telhado', 'estragos', 'danos elétricos', 'indemnização']),

('CRED_COLIGADO_18', null, 'Crédito coligado', 'Crédito aos consumidores',
 'Crédito coligado: efeitos da compra no contrato de crédito',
 'Decreto-Lei n.º 133/2009, de 2 de junho — Contratos de Crédito aos Consumidores, na redação vigente', 'Artigo 4.º, n.º 1, alínea o); artigo 18.º',
 'O contrato de crédito está coligado a um contrato de compra e venda ou de prestação de serviços específico se o crédito servir exclusivamente para financiar o pagamento do preço desse fornecimento e ambos os contratos constituírem objetivamente uma unidade económica, designadamente se o crédito for financiado pelo fornecedor ou, no financiamento por terceiro, se o credor recorrer ao fornecedor para preparar ou celebrar o contrato de crédito ou se o bem ou o serviço estiverem expressamente previstos no contrato de crédito. Nesse caso, a invalidade ou a revogação do contrato de compra e venda repercute-se, na mesma medida, no contrato de crédito, e a invalidade ou a ineficácia do crédito repercute-se na compra. Em caso de incumprimento ou de desconformidade no cumprimento do contrato de compra e venda ou de prestação de serviços, o consumidor que, após interpelar o vendedor, não obtenha a satisfação do seu direito ao exato cumprimento pode interpelar o credor para invocar a exceção de não cumprimento, a redução do montante do crédito em montante igual ao da redução do preço ou a resolução do contrato de crédito; nos dois últimos casos, não está obrigado a pagar ao credor o montante correspondente ao recebido pelo vendedor. A qualificação como crédito coligado necessita de análise concreta.',
 'Só quando houver indícios de que o financiamento e a compra constituem uma unidade económica: crédito usado exclusivamente para pagar o preço deste fornecimento e financiado pelo fornecedor, apresentado, preparado ou celebrado através do fornecedor, ou com o bem ou o serviço expressamente previsto no contrato de crédito. Um empréstimo pessoal contratado pelo consumidor de forma independente não é, por si só, crédito coligado. Antes de interpelar o credor ao abrigo do n.º 3, o consumidor tem de ter interpelado o vendedor sem obter o exato cumprimento. Contratos de crédito excluídos do diploma (artigo 2.º, por exemplo pelo montante) ficam fora. Confirmar o regime aplicável à data do contrato de crédito (o regime europeu do crédito aos consumidores está em revisão) — análise humana.',
 'https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=1107&tabela=leis', null, null, false, null, null,
 'Num crédito coligado, a invalidade ou revogação da compra repercute-se no crédito; perante incumprimento do vendedor não resolvido após interpelação, o consumidor pode invocar perante o credor a exceção de não cumprimento, a redução do crédito ou a resolução do contrato de crédito.',
 'Contrato de crédito e ficha de informação normalizada; contrato ou proposta de fornecimento; prova de que o crédito foi apresentado ou preparado pelo vendedor ou de que o bem consta do contrato de crédito; interpelação ao vendedor e resposta.',
 'Repercussão da invalidade, revogação ou resolução da compra no contrato de crédito; suspensão, redução ou resolução do crédito, conforme o caso.',
 array['financiamento', 'crédito', 'prestações', 'crédito coligado', 'financeira', 'empréstimo']),

('DIST_FORA_ESTAB_FORMA_9', null, 'Contrato', 'Contratos celebrados fora do estabelecimento',
 'Contrato fora do estabelecimento: forma escrita e entrega de cópia',
 'Decreto-Lei n.º 24/2014, de 14 de fevereiro', 'Artigo 9.º',
 'O contrato celebrado fora do estabelecimento comercial é reduzido a escrito e deve, sob pena de nulidade, conter, de forma clara e compreensível e em língua portuguesa, as informações pré-contratuais previstas no artigo 4.º. O fornecedor deve entregar ao consumidor uma cópia do contrato assinado ou a confirmação do contrato em papel ou, se o consumidor concordar, noutro suporte duradouro. A falta de forma ou de informação obrigatória e as suas consequências necessitam de análise concreta.',
 'Só contratos celebrados fora do estabelecimento comercial (artigo 3.º, alínea i)): por exemplo, no domicílio do consumidor, no local de trabalho, durante deslocação organizada pelo fornecedor, ou no estabelecimento imediatamente depois de contacto pessoal fora dele. Não aplicar a contratos à distância nem a contratos celebrados no estabelecimento. Confirmar a forma de contratação e verificar as exclusões do artigo 2.º. Identificar se existe contrato escrito, se contém as informações do artigo 4.º e se foi entregue cópia.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-73222992', null, null, false, null, null,
 'Um contrato fora do estabelecimento sem forma escrita ou sem as informações do artigo 4.º pode ser nulo; o consumidor tem direito a cópia ou confirmação em suporte duradouro.',
 'Contrato assinado ou a sua falta; cópia ou confirmação recebida e data; documentos entregues pelo vendedor; local e circunstâncias da celebração.',
 'Entrega da cópia do contrato; reconhecimento das consequências da falta de forma ou de informação obrigatória.',
 array['porta a porta', 'venda ao domicílio', 'cópia do contrato', 'contrato em casa', 'vendedor em casa', 'forma escrita']),

('DIST_ACESSORIOS_16', null, 'Livre resolução', 'Livre resolução de contratos à distância',
 'Livre resolução extingue os contratos acessórios',
 'Decreto-Lei n.º 24/2014, de 14 de fevereiro', 'Artigo 3.º, alínea g); artigo 16.º',
 'Sem prejuízo do regime próprio dos contratos de crédito aos consumidores, o exercício do direito de livre resolução de um contrato celebrado à distância ou fora do estabelecimento comercial implica a resolução automática dos contratos acessórios, sem direito a indemnização ou pagamento de quaisquer encargos, excetuados os custos previstos no artigo 12.º, n.º 3, e no artigo 13.º. Contrato acessório é aquele ao abrigo do qual o consumidor adquire bens ou serviços no âmbito do contrato à distância ou fora do estabelecimento, fornecidos pelo profissional ou por um terceiro com base em acordo entre esse terceiro e o profissional (por exemplo, manutenção, seguro ou monitorização associados).',
 'Livre resolução validamente exercida de um contrato à distância ou fora do estabelecimento (DIST_LIVRE_RESOLUCAO). Identificar o contrato acessório e a ligação ao contrato principal (fornecido pelo mesmo profissional ou por terceiro com acordo com o profissional). Contratos de crédito: regime próprio (regra do crédito coligado, se aplicável). Não aplicar sem livre resolução exercida.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-73222992', null, null, false, null, null,
 'Os contratos acessórios cessam automaticamente com a livre resolução, sem indemnização nem encargos além dos legalmente previstos.',
 'Declaração de livre resolução e data; contratos acessórios (manutenção, seguro, monitorização ou outros); acordo entre o profissional e o terceiro, se conhecido.',
 'Cessação dos contratos acessórios sem encargos e restituição dos montantes pagos por eles.',
 array['contrato acessório', 'manutenção', 'seguro', 'livre resolução', 'monitorização']),

-- ---------------------------------------------------------------------------
-- Energia → Autoconsumo (UPAC) — DL 15/2022
-- ---------------------------------------------------------------------------

('UPAC_CONTROLO_PREVIO_11_81', 'Energia', 'Autoconsumo', 'Unidade de produção para autoconsumo (UPAC)',
 'Controlo prévio da UPAC conforme a potência instalada',
 'Decreto-Lei n.º 15/2022, de 14 de janeiro — Sistema Elétrico Nacional, na redação do Decreto-Lei n.º 130/2026', 'Artigo 11.º, n.os 1 a 6; artigo 81.º, n.os 1 e 2',
 'As unidades de produção para autoconsumo (UPAC) estão sujeitas a controlo prévio conforme a potência: isenção, quando a capacidade instalada é igual ou inferior a 800 W e se exclui a injeção de excedente na rede elétrica de serviço público; comunicação prévia, até 30 kW inclusive; registo prévio e certificado de exploração, acima de 30 kW e até 1 MW inclusive; licença de produção e de exploração, acima de 1 MW. Os títulos (comprovativo da comunicação prévia, comprovativo de registo, certificado de exploração ou licença) são emitidos ao autoconsumidor no autoconsumo individual e, no autoconsumo coletivo, ao condomínio, à entidade gestora ou à comunidade de energia. A lei atribui estes procedimentos ao autoconsumidor: se a empresa se comprometeu a tratar da comunicação, do registo ou do licenciamento, essa obrigação resulta do contrato.',
 'Sistema de produção de eletricidade para autoconsumo (por exemplo, painéis solares). Identificar a potência instalada, se há injeção de excedente na rede e o que o contrato ou a proposta diz sobre legalização, registo ou comunicação. Redação dada pelo Decreto-Lei n.º 130/2026, em vigor desde 28/08/2026 e aplicável aos procedimentos de controlo prévio iniciados a partir dessa data; para procedimentos iniciados antes, verificar a redação anterior (o limiar de isenção era diferente) — análise humana. Não concluir que a empresa infringiu a lei: o dever legal é do autoconsumidor; o dever da empresa depende do que foi acordado.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2022-177634029', '2026-08-28', null, false, null, null,
 'O título exigido depende da potência e da injeção na rede e é emitido ao autoconsumidor. Se a empresa assumiu tratar do processo, o incumprimento é contratual.',
 'Contrato ou proposta (cláusulas sobre legalização, registo ou comunicação); potência instalada (kW) e existência de injeção na rede; comprovativo de comunicação prévia, registo ou certificado de exploração, ou a sua falta; comunicações da DGEG ou do operador de rede.',
 'Regularização do controlo prévio da UPAC pela empresa, quando o tenha assumido no contrato; reparação dos prejuízos decorrentes do atraso.',
 array['registo UPAC', 'comunicação prévia', 'legalização', 'DGEG', 'controlo prévio', 'potência instalada', 'autoconsumo']),

('UPAC_CERTIFICADO_EXPLORACAO_81A', 'Energia', 'Autoconsumo', 'Unidade de produção para autoconsumo (UPAC)',
 'Certificado de exploração da UPAC: emissão, auditoria e prazo para regularizar',
 'Decreto-Lei n.º 15/2022, de 14 de janeiro — Sistema Elétrico Nacional, na redação vigente', 'Artigo 81.º-A',
 'Nas UPAC sujeitas a certificado de exploração, o certificado é emitido automaticamente. A DGEG verifica o cumprimento dos procedimentos e condições e pode auditar quaisquer procedimentos até dois anos após a sua conclusão. Se identificar uma irregularidade no procedimento de certificação, notifica o titular do certificado para a regularizar no prazo máximo de 30 dias, prorrogável uma vez a pedido do titular; se não for regularizada, o certificado é revogado.',
 'UPAC com registo prévio e certificado de exploração (em regra, acima de 30 kW e até 1 MW). Identificar a notificação da DGEG, a data de receção, a irregularidade indicada e quem tratou do procedimento por conta do cliente. Se a empresa assumiu o procedimento no contrato, o pedido de correção dirige-se a ela, sem concluir sobre a sua responsabilidade.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2022-177634029', null, null, false, null, null,
 'Uma irregularidade detetada pela DGEG tem de ser regularizada em 30 dias (prorrogáveis uma vez), sob pena de revogação do certificado.',
 'Certificado de exploração; notificação da DGEG e data; contrato com a empresa que tratou do procedimento; comunicações com essa empresa.',
 'Regularização da irregularidade no prazo, pela empresa que assumiu o procedimento; reparação dos prejuízos se o certificado for revogado.',
 array['certificado de exploração', 'auditoria DGEG', 'revogação', 'irregularidade', 'notificação DGEG']),

('UPAC_INSTALADOR_84', 'Energia', 'Autoconsumo', 'Unidade de produção para autoconsumo (UPAC)',
 'Instalação da UPAC por entidade instaladora ou técnico habilitado',
 'Decreto-Lei n.º 15/2022, de 14 de janeiro — Sistema Elétrico Nacional, na redação do Decreto-Lei n.º 130/2026', 'Artigo 84.º',
 'A instalação de UPAC com potência instalada superior a 800 W é obrigatoriamente executada por entidade instaladora de instalações elétricas de serviço particular ou por técnicos responsáveis pela execução de instalações elétricas. Excetua-se a UPAC composta por equipamentos que não careçam de instalação, certificados e com capacidade instalada inferior a 1,5 kW. A entidade instaladora ou o técnico responsável deve assegurar que os equipamentos a instalar estão certificados e que a UPAC está isenta de controlo prévio ou devidamente registada ou licenciada. A entidade instaladora deve declarar na plataforma eletrónica da DGEG as UPAC instaladas, com a potência, a tecnologia e a localização (freguesia e concelho).',
 'UPAC com potência instalada superior a 800 W (ou a exceção do n.º 2). Identificar quem instalou (empresa ou técnico), a sua habilitação, a potência e se a UPAC foi declarada na plataforma. Redação dada pelo Decreto-Lei n.º 130/2026, em vigor desde 28/08/2026: para instalações e procedimentos anteriores, verificar a redação então vigente — análise humana. A falta de habilitação ou de declaração descreve-se como facto a confirmar; não concluir infração.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2022-177634029', '2026-08-28', null, false, null, null,
 'A instalação acima de 800 W tem de ser feita por entidade ou técnico habilitado, que verifica a certificação dos equipamentos e o título da UPAC e a declara na plataforma.',
 'Identificação da empresa ou técnico e da sua habilitação; potência instalada; fatura e contrato de instalação; comprovativo (ou falta) da declaração na plataforma; certificados dos equipamentos.',
 'Declaração da UPAC na plataforma e regularização pela entidade instaladora; reposição da conformidade da instalação.',
 array['instalador', 'entidade instaladora', 'técnico responsável', 'habilitação', 'declaração na plataforma', '800 W']),

('UPAC_EQUIPAMENTOS_CERTIFICADOS_96', 'Energia', 'Autoconsumo', 'Unidade de produção para autoconsumo (UPAC)',
 'Equipamentos da UPAC certificados por organismo acreditado',
 'Decreto-Lei n.º 15/2022, de 14 de janeiro — Sistema Elétrico Nacional, na redação vigente', 'Artigo 96.º; artigo 88.º, n.º 2, alínea h)',
 'As entidades instaladoras comprovam na plataforma eletrónica da DGEG que os equipamentos instalados na UPAC estão certificados. A certificação é concedida por organismo de certificação acreditado pelo IPAC ou por outro organismo nacional de acreditação, e os equipamentos devem satisfazer as normas europeias aplicáveis (CEN/CENELEC) ou, na sua falta, as normas internacionais ou portuguesas indicadas na lei. A DGEG mantém uma lista de equipamentos certificados no seu sítio na Internet. O autoconsumidor tem o dever de assegurar que os equipamentos de produção instalados se encontram certificados, pelo que tem interesse direto em pedir prova dessa certificação.',
 'Identificar marca e modelo dos painéis, do inversor e de outros equipamentos, os certificados entregues e se constam da lista da DGEG. Não concluir que um equipamento não está certificado sem confirmação: pedir prova da certificação. Se o equipamento não estiver certificado ou não corresponder ao contratado, analisar também as regras de conformidade.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2022-177634029', null, null, false, null, null,
 'Os equipamentos da UPAC têm de estar certificados; a entidade instaladora comprova-o na plataforma e o autoconsumidor deve assegurá-lo.',
 'Fichas técnicas; certificados dos equipamentos; fatura com marca e modelo; consulta da lista de equipamentos certificados da DGEG; comprovativo da declaração na plataforma.',
 'Entrega da prova de certificação ou substituição por equipamento certificado.',
 array['certificação', 'equipamento certificado', 'inversor', 'painel', 'IPAC', 'lista DGEG']),

('UPAC_DEVERES_AUTOCONSUMIDOR_88', 'Energia', 'Autoconsumo', 'Unidade de produção para autoconsumo (UPAC)',
 'Direitos e deveres do autoconsumidor; UPAC detida ou gerida por terceiros',
 'Decreto-Lei n.º 15/2022, de 14 de janeiro — Sistema Elétrico Nacional, na redação do Decreto-Lei n.º 130/2026', 'Artigo 88.º',
 'São deveres do autoconsumidor, entre outros: obter o título de controlo prévio; suportar o custo das alterações da ligação da instalação de utilização à rede e, quando existam, os encargos de ligação da UPAC, nos termos da regulamentação; dimensionar a UPAC de forma a aproximar a energia produzida da consumida, minimizando o excedente; prestar informações às entidades de fiscalização e facilitar o acesso à UPAC; assegurar que os equipamentos de produção instalados estão certificados; e, cessada a atividade, adotar os procedimentos para a remoção da UPAC. Entre os direitos estão instalar UPAC, consumir a eletricidade produzida, transacionar o excedente e cessar a atividade. A UPAC pode ser propriedade de terceiros ou gerida por terceiros, desde que estes estejam, mediante acordo, sujeitos às instruções do autoconsumidor; este continua responsável pelos processos associados ao setor elétrico, enquanto utilizador da rede, e os terceiros não são autoconsumidores.',
 'Usar para separar o que é dever legal do cliente (autoconsumidor) do que a empresa assumiu por contrato (por exemplo, tratar do registo, dimensionar o sistema ou gerir a UPAC). Identificar o modelo contratual (compra, aluguer, gestão por terceiro ou contrato de aproveitamento energético renovável). Redação dada pelo Decreto-Lei n.º 130/2026 (em vigor desde 28/08/2026). Não usar para imputar ao cliente uma falha da empresa nem para concluir a responsabilidade da empresa.',
 'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2022-177634029', '2026-08-28', null, false, null, null,
 'Os deveres legais perante o sistema elétrico são do autoconsumidor; o que a empresa se comprometeu a fazer (registo, dimensionamento, gestão) resulta do contrato.',
 'Contrato (compra, aluguer, gestão ou cedência); proposta e estudo de dimensionamento; comunicações sobre o registo e a ligação.',
 'Identificação de quem deve cumprir cada obrigação e pedido dirigido à entidade certa.',
 array['autoconsumidor', 'deveres', 'dimensionamento', 'excedente', 'gestão por terceiros', 'titular da UPAC']),

-- ---------------------------------------------------------------------------
-- Energia → CAER — Lei 29/2026 (só casos com características de CAER)
-- ---------------------------------------------------------------------------

('CAER_AMBITO_FORMA_2_4', 'Energia', 'CAER', 'Contrato de aproveitamento energético renovável',
 'CAER: âmbito, forma escrita e conteúdo obrigatório do contrato',
 'Lei n.º 29/2026, de 23 de junho — Contrato de Aproveitamento Energético Renovável', 'Artigos 2.º e 4.º',
 'Através de um contrato de aproveitamento energético renovável (CAER), os proprietários podem ceder os direitos de aproveitamento energético dos seus imóveis, designadamente de telhados ou terraços de cobertura, de solos urbanos não construídos e de áreas sem reconhecida aptidão agrícola, pecuária ou florestal, para UPAC associadas a uma instalação de consumo, com potência instalada até 1 MW e a partir de fonte renovável. O CAER é obrigatoriamente reduzido a escrito e é entregue ao proprietário uma cópia do contrato no prazo de 30 dias após a celebração; as condições devem ser equitativas e previamente conhecidas. A duração máxima é de 15 anos, prorrogável uma vez por igual período. O contrato regula obrigatoriamente: a duração, a renovação, o termo e a eventual existência de direito de resolução; a partilha de custos com a instalação, o controlo prévio, a operação e a manutenção; a partilha de receitas da energia; e a propriedade dos equipamentos no fim do contrato.',
 'Só quando o caso tiver características de CAER: o cliente cedeu o direito de aproveitamento energético do telhado, terraço ou terreno e é um terceiro que instala e explora a UPAC. Não aplicar a uma simples compra e instalação de painéis. Contrato celebrado a partir de 01/07/2026 (entrada em vigor da lei); para contratos anteriores com características semelhantes, análise humana. O regime do autoconsumo continua a aplicar-se. O modelo-tipo de contrato será definido por portaria — verificar se já foi publicada.',
 'https://files.diariodarepublica.pt/1s/2026/06/11900/0000200008.pdf', '2026-07-01', null, false, null, null,
 'O CAER tem de ser escrito, com cópia entregue em 30 dias, duração máxima de 15 anos (prorrogável uma vez), e regular obrigatoriamente custos, receitas, termo, resolução e propriedade final dos equipamentos.',
 'Contrato e data de celebração; cópia entregue e data; cláusulas sobre duração, custos, receitas, resolução e propriedade dos equipamentos.',
 'Entrega da cópia do contrato e cumprimento das condições contratuais obrigatórias.',
 array['CAER', 'cedência do telhado', 'aproveitamento energético', 'aluguer do telhado', 'terceiro explora', 'propriedade dos equipamentos']),

('CAER_INFORMACAO_5_6', 'Energia', 'CAER', 'Contrato de aproveitamento energético renovável',
 'CAER: informação prévia obrigatória (equipamentos, produção estimada, valores e danos)',
 'Lei n.º 29/2026, de 23 de junho — Contrato de Aproveitamento Energético Renovável', 'Artigos 5.º e 6.º',
 'A entidade promotora do CAER presta todos os esclarecimentos exigíveis e informa, antes da celebração do contrato, por escrito, de forma clara, exaustiva e atualizada, em língua portuguesa e em suporte duradouro (ou documento facilmente descarregável), nomeadamente sobre: a sua identificação e contactos para reclamações; compensações e reembolsos se os níveis de qualidade não forem atingidos; as principais características dos equipamentos e instalações, incluindo a previsão de potência; a estimativa de produção e o seu destino (autoconsumo, armazenamento ou injeção na rede); as tarifas pela energia produzida e qualquer tarifa imputada ao consumidor; o tipo de manutenção e as condições de reparação do imóvel em caso de danos imputáveis aos equipamentos e instalações; qualquer outro valor a pagar ao ou pelo consumidor e a sua atualização; o modo de reclamar; e as causas de invalidade, prorrogação, suspensão ou cessação. A proposta de contrato contém menção comprovativa de que estas informações foram prestadas.',
 'Só contratos com características de CAER, celebrados a partir de 01/07/2026. Identificar que informação foi entregue antes da assinatura, em que suporte, e se a proposta contém a menção comprovativa. A estimativa de produção é uma informação obrigatória, não uma garantia de produção: a diferença entre a estimativa e a produção real necessita de análise concreta.',
 'https://files.diariodarepublica.pt/1s/2026/06/11900/0000200008.pdf', '2026-07-01', null, false, null, null,
 'A falta de informação prévia obrigatória (incluindo estimativa de produção, valores e reparação de danos) pode ser invocada perante a entidade promotora.',
 'Proposta e documentos pré-contratuais; menção comprovativa da informação; estimativa de produção entregue; condições de manutenção e reparação; tabela de valores.',
 'Prestação da informação em falta e cumprimento das condições informadas, incluindo a reparação de danos no imóvel.',
 array['estimativa de produção', 'informação prévia', 'reparação do telhado', 'tarifas', 'CAER', 'manutenção']),

('CAER_EMPRESA_DGEG_3', 'Energia', 'CAER', 'Contrato de aproveitamento energético renovável',
 'Empresas que oferecem CAER comunicam previamente o início da atividade à DGEG',
 'Lei n.º 29/2026, de 23 de junho — Contrato de Aproveitamento Energético Renovável', 'Artigo 3.º',
 'As empresas que pretendam oferecer serviços no âmbito de CAER comunicam previamente à DGEG o início da atividade, com identificação, sítio na Internet, contactos, descrição do serviço e data prevista de início, e só podem iniciar a atividade depois de verificada a conformidade da comunicação. A DGEG mantém e divulga no seu sítio na Internet um registo das empresas que oferecem CAER. A oferta de CAER não dispensa o cumprimento das regras do regime de autoconsumo.',
 'Só casos com características de CAER (atividade a partir de 01/07/2026). Serve para identificar a empresa e confirmar se consta do registo da DGEG; não concluir infração sem confirmação.',
 'https://files.diariodarepublica.pt/1s/2026/06/11900/0000200008.pdf', '2026-07-01', null, false, null, null,
 'Pode confirmar-se no registo da DGEG se a empresa comunicou a atividade de oferta de CAER.',
 'Identificação da empresa; consulta do registo da DGEG; contrato.',
 'Identificação correta da empresa responsável e dos seus contactos para reclamação.',
 array['registo DGEG', 'empresa CAER', 'comunicação de atividade'])

on conflict (codigo) do update set
  setor = excluded.setor,
  categoria = excluded.categoria,
  subcategoria = excluded.subcategoria,
  titulo = excluded.titulo,
  diploma = excluded.diploma,
  artigo = excluded.artigo,
  resumo = excluded.resumo,
  condicoes_aplicabilidade = excluded.condicoes_aplicabilidade,
  fonte_url = excluded.fonte_url,
  em_vigor_desde = excluded.em_vigor_desde,
  revogada_em = excluded.revogada_em,
  efeito_juridico = excluded.efeito_juridico,
  provas_necessarias = excluded.provas_necessarias,
  resultado_pretendido = excluded.resultado_pretendido,
  palavras_chave = excluded.palavras_chave,
  ativa = false,
  revista_em = null,
  revista_por = null
-- Nunca reescreve uma regra já revista ou ativa.
where public.regras_juridicas.revista_em is null and not public.regras_juridicas.ativa;
