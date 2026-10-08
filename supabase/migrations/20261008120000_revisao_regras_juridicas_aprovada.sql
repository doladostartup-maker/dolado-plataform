-- Revisão jurídica aprovada pela advogada (08/10/2026; confirmação de Thiago,
-- docs/legal/decisoes-juridicas-e-ropa-2026-10-08.md).
--
--   * COMPRA_INDISPONIBILIDADE_DISTANCIA_19 (nova): DL 24/2014, art. 19.º —
--     indisponibilidade em contrato à distância, distinta do atraso/falta de
--     entrega do art. 11.º do DL 84/2021;
--   * COMPRA_ENTREGA_PRAZO_11 / COMPRA_ENTREGA_REEMBOLSO_11: remetem para a
--     regra própria do art. 19.º;
--   * GAS_CORTE_PREAVISO_79 + GAS_CORTE_AGENDAMENTO_79_7 (nova): RRC, art. 79.º,
--     n.º 7 — prazo de agendamento (cinco dias úteis no gás) distinto do
--     pré-aviso (n.º 3) e da proibição de dias do n.º 11;
--   * CCG_BOAFE_CONSUMIDOR: sem nulidade automática; exige identificar a
--     proibição legal concreta (DL 446/85; nas relações com consumidores, o
--     art. 20.º manda aplicar também os arts. 21.º e 22.º).
--
-- Textos confrontados a 08/10/2026 com o Diário da República (DL 24/2014,
-- DL 446/85) e com o RRC consolidado publicado pela ERSE.
--
-- Cada alteração grava a revisão de 08/10/2026 (revista_em = 2026-10-08,
-- revista_por = 'advogada'). Em produção, três destas regras já tinham
-- revista_em = 2026-10-08 (ativadas no backoffice a 07/10/2026, com o texto da
-- carga 4): para o trigger a_revisao_ao_alterar, texto novo com a MESMA data
-- não é uma nova revisão e a regra seria desativada. Por isso a revisão
-- anterior das seis regras é primeiro limpa (sem mudar texto) e só depois é
-- gravado o texto revisto — tudo nesta transação, sem janela em que fiquem
-- inativas para quem lê. GPL canalizado: mantém-se a redação de produção
-- (não aplicar), mais prudente. A migration falha (não segue em silêncio) se
-- uma regra que altera não existir ou não ficar revista e ativa.

do $$
declare
  v_falta text;
begin
  select string_agg(c, ', ') into v_falta
    from unnest(array['GAS_CORTE_PREAVISO_79', 'COMPRA_ENTREGA_PRAZO_11', 'COMPRA_ENTREGA_REEMBOLSO_11']) as c
   where not exists (select 1 from public.regras_juridicas r where r.codigo = c);
  if v_falta is not null then
    raise exception 'Regras jurídicas em falta (carga 4 não aplicada?): %', v_falta;
  end if;
end $$;

-- Limpa a revisão anterior (só revista_em/revista_por/ativa; o texto não muda,
-- por isso o trigger não interfere). A constraint exige ativa = false sem revisão.
update public.regras_juridicas
   set revista_em = null, revista_por = null, ativa = false
 where codigo in ('COMPRA_INDISPONIBILIDADE_DISTANCIA_19', 'GAS_CORTE_PREAVISO_79', 'GAS_CORTE_AGENDAMENTO_79_7',
                  'CCG_BOAFE_CONSUMIDOR', 'COMPRA_ENTREGA_PRAZO_11', 'COMPRA_ENTREGA_REEMBOLSO_11');

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa,
  revista_em, revista_por, efeito_juridico, provas_necessarias,
  resultado_pretendido, palavras_chave
) values (
  'COMPRA_INDISPONIBILIDADE_DISTANCIA_19', 'Compras & Reembolsos', 'Entrega', 'Indisponibilidade',
  'Indisponibilidade em contrato à distância: informar e reembolsar',
  'Decreto-Lei n.º 24/2014, de 14 de fevereiro', 'Artigo 19.º, n.os 2 a 5',
  'Quando o contrato tiver sido celebrado à distância e o fornecedor não puder cumprir por indisponibilidade do bem ou serviço encomendado, deve informar o consumidor e reembolsar todos os montantes pagos no prazo máximo de 30 dias desde que conhece a indisponibilidade. Se não reembolsar nesse prazo, deve devolver o dobro no prazo de 15 dias úteis, sem prejuízo de indemnização. O fornecedor só pode fornecer um bem ou prestar um serviço de qualidade e preço equivalentes se essa possibilidade tiver sido prevista antes da celebração do contrato ou no próprio contrato, se o consumidor o tiver consentido expressamente e se o fornecedor o informar por escrito de que, caso exerça o direito de livre resolução, as despesas de devolução ficam a cargo do fornecedor. Esta regra não se confunde com o atraso na entrega regulado pelo artigo 11.º do Decreto-Lei n.º 84/2021, que exige em regra prazo adicional adequado antes da resolução, salvo as exceções desse artigo.',
  'Contrato celebrado à distância abrangido pelo Decreto-Lei n.º 24/2014; indisponibilidade do bem ou serviço encomendado que impede o cumprimento; identificar quando o fornecedor conheceu a indisponibilidade, comunicação, valores pagos, prazo e montante do reembolso, eventual proposta equivalente e prova de aceitação expressa. Não aplicar a contratos presenciais nem confundir indisponibilidade conhecida com mero atraso de entrega. Para venda de bens móveis, analisar também, em separado, o artigo 11.º do Decreto-Lei n.º 84/2021.',
  'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-73222992', null, null, true, '2026-10-08', 'advogada',
  'Reembolso integral em 30 dias após conhecimento da indisponibilidade; se incumprido, reembolso em dobro em 15 dias úteis, sem prejuízo de indemnização. Substituição equivalente apenas com previsão prévia, consentimento expresso e informação escrita sobre as despesas de devolução, que ficam a cargo do fornecedor se o consumidor exercer a livre resolução. A aplicação depende dos factos e do âmbito do contrato à distância.',
  'Confirmação e data do contrato; prova de que foi celebrado à distância; comunicação da indisponibilidade e respetiva data; comprovativo dos montantes pagos; proposta de bem ou serviço equivalente, consentimento expresso e informação escrita sobre as despesas de devolução, se existirem; comprovativos e datas do reembolso.',
  'Informação da indisponibilidade e reembolso integral nos prazos do artigo 19.º; se houver atraso, restituição em dobro e eventual indemnização, conforme os factos.',
  array['indisponibilidade', 'contrato à distância', 'encomenda indisponível', 'reembolso em 30 dias', 'reembolso em dobro', 'artigo 19.º', 'Decreto-Lei 24/2014']
)
on conflict (codigo) do update set
  setor = excluded.setor, categoria = excluded.categoria, subcategoria = excluded.subcategoria,
  titulo = excluded.titulo, diploma = excluded.diploma, artigo = excluded.artigo,
  resumo = excluded.resumo, condicoes_aplicabilidade = excluded.condicoes_aplicabilidade,
  fonte_url = excluded.fonte_url, efeito_juridico = excluded.efeito_juridico,
  provas_necessarias = excluded.provas_necessarias, resultado_pretendido = excluded.resultado_pretendido,
  palavras_chave = excluded.palavras_chave, ativa = true,
  revista_em = '2026-10-08', revista_por = 'advogada';

update public.regras_juridicas
set artigo = 'Artigo 78.º, n.º 1; artigo 79.º, n.os 1 a 3, 6, 7, 11 e 12',
    resumo = 'O pré-aviso escrito identifica o motivo, os meios para evitar a interrupção, as condições e preços de restabelecimento e o dia a partir do qual pode ocorrer. Nas situações do artigo 79.º, n.º 3, o pré-aviso tem antecedência mínima de 20 dias, ou 30 dias para clientes economicamente vulneráveis. Depois do pré-aviso, a interrupção deve ocorrer preferencialmente na data indicada; por razões de agendamento entre operador e comercializador pode ocorrer até cinco dias úteis depois para clientes de gás, que não são clientes BTN. Este prazo de agendamento não substitui nem reduz o pré-aviso. A regra abrange clientes domésticos e não domésticos de gás de rede; o limite de consumo anual de 10 000 m3(n) respeita à proibição de interrupção no último dia útil da semana ou véspera de feriado do n.º 11, não ao n.º 7.',
    condicoes_aplicabilidade = 'Fornecimento de gás natural por rede; interrupção por facto imputável ao cliente nas situações do artigo 78.º, n.º 1. Identificar causa e alínea, quem tinha o dever de enviar o pré-aviso, conteúdo e data do pré-aviso, data indicada, data efetiva e razão do eventual adiamento. Aplicável a clientes domésticos e não domésticos; Não aplicar esta regra de RRC do gás natural a GPL canalizado (tem regulamentação própria não coberta nesta carga) nem a gás de garrafa. O formulário não distingue o tipo de gás: só citar após confirmação humana de que é gás natural. O prazo mínimo é 20 dias, ou 30 dias para cliente economicamente vulnerável, nas situações do artigo 79.º, n.º 3. Verificar em separado o n.º 11 se o consumo anual for igual ou inferior a 10 000 m3(n).',
    efeito_juridico = 'Atraso de agendamento até cinco dias úteis após a data indicada pode ser permitido; prazo superior, sem novo pré-aviso, pode contrariar o n.º 7. Para as situações do n.º 3, mantém-se o pré-aviso mínimo de 20 dias, ou 30 dias para cliente economicamente vulnerável. O limite do n.º 11 é uma proteção distinta, aplicável ao gás com consumo anual até 10 000 m3(n).',
    revista_em = '2026-10-08', revista_por = 'advogada', ativa = true
where codigo = 'GAS_CORTE_PREAVISO_79';

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa,
  revista_em, revista_por, efeito_juridico, provas_necessarias,
  resultado_pretendido, palavras_chave
) values (
  'GAS_CORTE_AGENDAMENTO_79_7', 'Gás', 'Suspensão', 'Gás natural — agendamento da interrupção',
  'Agendamento da interrupção após o pré-aviso',
  'Regulamento n.º 827/2023, de 28 de julho — RRC dos Setores Elétrico e do Gás, na redação vigente', 'Artigo 79.º, n.º 7',
  'Depois de enviado o pré-aviso, a interrupção deve ocorrer preferencialmente na data nele indicada. Só por razões de agendamento entre o operador da rede de distribuição e o comercializador pode ocorrer depois dessa data, até 10 dias úteis para clientes BTN e até cinco dias úteis para os restantes. Clientes de gás não são clientes BTN para esta regra: aplica-se o limite de cinco dias úteis, sem distinção entre clientes domésticos e não domésticos. O prazo de agendamento corre depois da data prevista no pré-aviso e não substitui o pré-aviso mínimo do artigo 79.º, n.º 3: 20 dias, ou 30 dias para clientes economicamente vulneráveis, nos casos aí previstos. O limite de consumo anual de 10 000 m3(n) do n.º 11 é uma proteção separada, relativa aos dias em que a interrupção pode ocorrer.',
  'Fornecimento de gás natural por rede; interrupção por facto imputável ao cliente; existe pré-aviso com data prevista e a interrupção ocorreu depois dessa data. Identificar datas, causa do adiamento e se o pré-aviso respeitou o prazo mínimo aplicável. Abrange clientes domésticos e não domésticos. Não aplicar esta regra de RRC do gás natural a GPL canalizado (tem regulamentação própria não coberta nesta carga) nem a gás de garrafa. O formulário não distingue o tipo de gás: só citar após confirmação humana de que é gás natural. Verificar separadamente o artigo 79.º, n.º 11, quando o consumo anual seja igual ou inferior a 10 000 m3(n).',
  'https://diariodarepublica.pt/dr/detalhe/regulamento/827-2023-216305857', null, null, true, '2026-10-08', 'advogada',
  'Para fornecimento de gás, adiamento por razões de agendamento até cinco dias úteis depois da data prevista pode ser permitido. Prazo superior, sem novo pré-aviso, ou adiamento por motivo diferente pode contrariar o n.º 7. Não confundir este prazo com o pré-aviso mínimo ou com a proibição de dias do n.º 11.',
  'Pré-aviso e comprovativo de envio; data nele indicada; data efetiva da interrupção; comunicação do operador/comercializador sobre o motivo do adiamento; consumo anual, se relevante para o n.º 11.',
  'Verificar se a interrupção respeitou a data prevista ou se o adiamento foi por razão de agendamento e não ultrapassou cinco dias úteis; verificar separadamente o prazo e as limitações do pré-aviso.',
  array['gás', 'agendamento', 'interrupção', 'corte', 'cinco dias úteis', 'pré-aviso', 'artigo 79.º']
)
on conflict (codigo) do update set
  setor = excluded.setor, categoria = excluded.categoria, subcategoria = excluded.subcategoria,
  titulo = excluded.titulo, diploma = excluded.diploma, artigo = excluded.artigo,
  resumo = excluded.resumo, condicoes_aplicabilidade = excluded.condicoes_aplicabilidade,
  fonte_url = excluded.fonte_url, efeito_juridico = excluded.efeito_juridico,
  provas_necessarias = excluded.provas_necessarias, resultado_pretendido = excluded.resultado_pretendido,
  palavras_chave = excluded.palavras_chave, ativa = true,
  revista_em = '2026-10-08', revista_por = 'advogada';

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa,
  revista_em, revista_por, efeito_juridico, provas_necessarias,
  resultado_pretendido, palavras_chave
) values (
  'CCG_BOAFE_CONSUMIDOR', null, 'Contrato', 'Cláusulas contratuais gerais — boa-fé e proibições legais',
  'Cláusulas contratuais gerais: identificar a proibição antes de concluir nulidade',
  'Decreto-Lei n.º 446/85, de 25 de outubro', 'Artigos 5.º a 8.º, 12.º, 15.º, 16.º e 18.º a 22.º',
  'O controlo de cláusulas contratuais gerais exige identificar a cláusula concreta, o contrato, a qualidade das partes, o modo de formação e a norma de proibição aplicável. A nulidade prevista no artigo 12.º do Decreto-Lei n.º 446/85 não decorre automaticamente de a cláusula parecer desequilibrada, ambígua ou contrária à boa-fé: primeiro é necessário demonstrar que viola uma proibição legal aplicável, incluindo, quando pertinente, a proibição geral das cláusulas contrárias à boa-fé e os respetivos critérios (artigos 15.º e 16.º) ou as listas de cláusulas proibidas; nas relações com consumidores finais, o artigo 20.º manda aplicar as listas dos artigos 18.º e 19.º e ainda as dos artigos 21.º (absolutamente proibidas) e 22.º (relativamente proibidas, consoante o quadro negocial padronizado). A comunicação, a informação, a interpretação e a inclusão da cláusula são questões distintas e podem produzir consequências próprias nos termos dos artigos 5.º a 8.º. A avaliação depende das circunstâncias concretas.',
  'Contrato de adesão ou relação em que tenham sido usadas cláusulas contratuais gerais. Identificar o texto integral da cláusula e a versão aceite; determinar se houve negociação individual; apurar a qualidade das partes e a finalidade do contrato; identificar a alínea ou norma de proibição concreta, o contexto e os efeitos; avaliar separadamente comunicação, informação, ambiguidade, boa-fé e inclusão. Não concluir nulidade apenas por invocação genérica de boa-fé ou desequilíbrio.',
  'https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1985-34436475', null, null, true, '2026-10-08', 'advogada',
  'Sem identificação de proibição legal concreta e verificação dos respetivos pressupostos, não concluir que a cláusula é nula. Se os pressupostos do artigo 12.º se verificarem, a nulidade respeita à cláusula proibida; falhas de comunicação, informação ou inclusão podem determinar a exclusão da cláusula nos termos próprios, sem equiparação automática à nulidade.',
  'Texto integral e versão da cláusula; contrato e prova da aceitação; elementos sobre negociação individual, qualidade das partes e finalidade; factos que permitam testar a norma de proibição invocada e os requisitos legais de comunicação/informação.',
  'Identificar a cláusula e a norma de proibição aplicável; avaliar separadamente nulidade, exclusão, interpretação e deveres de comunicação/informação; não concluir nulidade automaticamente.',
  array['cláusulas contratuais gerais', 'boa-fé', 'nulidade', 'proibição legal', 'artigo 12.º', 'Decreto-Lei 446/85']
)
on conflict (codigo) do update set
  setor = excluded.setor, categoria = excluded.categoria, subcategoria = excluded.subcategoria,
  titulo = excluded.titulo, diploma = excluded.diploma, artigo = excluded.artigo,
  resumo = excluded.resumo, condicoes_aplicabilidade = excluded.condicoes_aplicabilidade,
  fonte_url = excluded.fonte_url, efeito_juridico = excluded.efeito_juridico,
  provas_necessarias = excluded.provas_necessarias, resultado_pretendido = excluded.resultado_pretendido,
  palavras_chave = excluded.palavras_chave, ativa = true,
  revista_em = '2026-10-08', revista_por = 'advogada';

update public.regras_juridicas
set resumo = 'O profissional deve entregar o bem na data ou no período acordado; se nada foi acordado, sem demora injustificada e até 30 dias. Perante falta de entrega, o consumidor deve, em regra, fixar prazo adicional adequado e só pode resolver se o bem não for entregue nesse prazo. A resolução imediata é possível quando o profissional recusa entregar, o prazo era essencial nas circunstâncias ou o consumidor informou previamente que a data era essencial. Esta regra trata atraso/falta de entrega ao abrigo do artigo 11.º do Decreto-Lei n.º 84/2021; se o contrato à distância não puder ser cumprido por indisponibilidade do bem ou serviço, avaliar separadamente o artigo 19.º do Decreto-Lei n.º 24/2014.',
    condicoes_aplicabilidade = 'Compra e venda de bem móvel entre consumidor (pessoa singular, para uso não profissional) e profissional (quem vende no âmbito da sua atividade); contrato celebrado a partir de 01/01/2022. Não aplicar a vendas entre particulares. Identificar data do contrato, prazo ou data acordados, estado da entrega, eventual recusa, essencialidade do prazo e comunicação prévia, e prazo adicional fixado. Se houver indisponibilidade em contrato à distância, analisar também a regra própria do artigo 19.º do Decreto-Lei n.º 24/2014.',
    ativa = true, revista_em = '2026-10-08', revista_por = 'advogada'
where codigo = 'COMPRA_ENTREGA_PRAZO_11';

-- A regra do reembolso do DL 84/2021 continua própria da resolução por falta
-- de entrega; torna explícito que não substitui a regra do DL 24/2014.
update public.regras_juridicas
set resumo = case when position('artigo 19.º do Decreto-Lei n.º 24/2014' in resumo) = 0
                  then resumo || ' Esta regra respeita à resolução por falta de entrega ao abrigo do artigo 11.º do Decreto-Lei n.º 84/2021; a indisponibilidade que impede cumprimento de contrato à distância deve ser avaliada também, de forma autónoma, pelo artigo 19.º do Decreto-Lei n.º 24/2014.'
                  else resumo end,
    ativa = true, revista_em = '2026-10-08', revista_por = 'advogada'
where codigo = 'COMPRA_ENTREGA_REEMBOLSO_11';

do $$
declare
  v_mal text;
begin
  select string_agg(c, ', ') into v_mal
    from unnest(array['COMPRA_INDISPONIBILIDADE_DISTANCIA_19', 'GAS_CORTE_PREAVISO_79', 'GAS_CORTE_AGENDAMENTO_79_7',
                      'CCG_BOAFE_CONSUMIDOR', 'COMPRA_ENTREGA_PRAZO_11', 'COMPRA_ENTREGA_REEMBOLSO_11']) as c
   where not exists (
     select 1 from public.regras_juridicas r
      where r.codigo = c and r.ativa and r.revista_em = date '2026-10-08' and r.revista_por = 'advogada');
  if v_mal is not null then
    raise exception 'Regras jurídicas não ficaram revistas e ativas: %', v_mal;
  end if;
end $$;
