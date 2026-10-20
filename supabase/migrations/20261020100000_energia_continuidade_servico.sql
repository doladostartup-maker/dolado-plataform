-- DoLado — Electricidade: interrupções do fornecimento e compensações (20/10/2026)
--
-- Origem: Radar DoLado (15/10/2026) — relatório da ERSE de 14/10/2026 sobre a
-- qualidade de serviço técnica de 2025 (111 182 incumprimentos dos padrões
-- individuais na rede de distribuição, cerca de 2,1 M€ de compensações). As
-- estatísticas não mudam direitos: serviram só de ponto de partida para a
-- auditoria em docs/legal/auditoria-interrupcoes-electricidade-2026-10-20.md.
--
-- Lacuna: a base jurídica não tinha nenhuma regra sobre a continuidade de
-- serviço. A única regra de "Qualidade de serviço" de Energia
-- (ENE_QUALIDADE_COMPENSACAO_104) é da qualidade de serviço COMERCIAL (artigo
-- 104.º, crédito até à 1.ª factura após 45 dias) — não se aplica às
-- interrupções, que seguem o artigo 106.º.
--
-- Texto lido a 20/10/2026 na versão consolidada oficial da ERSE (Janeiro de
-- 2026: Regulamento n.º 826/2023, com a Directiva n.º 21/2024 e o Regulamento
-- n.º 8/2026) — https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf:
--   arts. 2.º, n.º 2, als. aa) e bb); 7.º; 8.º; 9.º; 10.º; 12.º; 13.º; 23.º;
--   24.º; 45.º; 82.º a 84.º; 102.º; 104.º; 106.º; 110.º; Anexo I (I.C e IV).
--
-- Regras:
--   * 4 regras novas, TODAS com ativa = false, revista_em = null — a IA não
--     as recebe enquanto Thiago/advogada não as reverem e ativarem.
--   * Não altera nenhuma regra existente (o "on conflict" só reescreve uma
--     regra destas que ainda não tenha sido revista nem ativada).
--   * Categoria "Qualidade de serviço": chegam aos casos de Energia com o tipo
--     "Corte ou falha de serviço" (CATEGORIAS_POR_PROBLEMA). Para esse tipo, em
--     Energia, o limite de regras por pedido passa a 16
--     (src/lib/rascunhoIA/regras.ts) — sem isso, as regras novas tirariam o
--     lugar às regras de corte por falta de pagamento já enviadas hoje.

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa, revista_em, revista_por,
  efeito_juridico, provas_necessarias, resultado_pretendido, palavras_chave
) values

('ENE_CONTINUIDADE_PADROES_24', 'Energia', 'Qualidade de serviço', 'Continuidade de serviço — padrões individuais',
 'Interrupções de electricidade: padrões individuais anuais e direito a compensação',
 'Regulamento n.º 826/2023, de 28 de julho — RQS dos Setores Elétrico e do Gás, na redação vigente',
 'Artigos 12.º, 13.º, 23.º e 24.º; artigo 2.º, n.º 2, alíneas aa) e bb); Anexo I',
 'O operador de rede determina, em cada ano civil e para cada ponto de entrega, o número de interrupções e a sua duração total. A ERSE fixa padrões anuais para estes indicadores individuais, por nível de tensão e zona de qualidade de serviço (Anexo I). Os padrões referem-se só a interrupções acidentais longas (mais de 3 minutos), excluindo as resultantes de eventos excepcionais aprovados pela ERSE. Não contam para os padrões: as interrupções breves (de 1 segundo a 3 minutos); as interrupções previstas, isto é, aquelas de que os clientes foram informados com a antecedência mínima regulamentar (por razões de serviço ou de interesse público, com divulgação de pelo menos 36 horas); e as interrupções por acordo com o cliente ou por facto imputável ao cliente. Uma interrupção por razões de serviço sem a divulgação exigida é acidental. As interrupções devidas a fenómenos atmosféricos, avarias, casos fortuitos ou de força maior são acidentais e contam, salvo se o evento tiver sido classificado pela ERSE como excepcional. Interrupções sucessivas, relacionadas entre si e separadas por períodos de continuidade de 10 minutos ou menos, contam como uma só. Em Portugal continental, os padrões anuais em baixa tensão são: zona A — 10 interrupções ou 6 horas; zona B — 11 interrupções ou 9 horas; zona C — 15 interrupções ou 14 horas (os Açores e a Madeira têm padrões próprios no Anexo I). O incumprimento de um padrão individual confere ao cliente direito a compensação, independentemente de pedido.',
 'Electricidade fornecida pela rede pública. A contagem é anual (ano civil) e por instalação: uma interrupção isolada, mesmo longa, não basta por si só para ultrapassar um padrão. O cliente normalmente não conhece a zona de qualidade de serviço da instalação, a classificação de cada interrupção nem os indicadores apurados pelo operador de rede — não concluir que um padrão foi ultrapassado sem esses dados; quando o cliente relatar várias interrupções ou uma duração acumulada elevada, formular um pedido de esclarecimento sobre os indicadores individuais desse ano e sobre a compensação. Uma falha só na instalação interior do cliente (por exemplo, o disjuntor do quadro da casa) não é, em princípio, uma interrupção da rede. A ERSE informou, a 14/10/2026, que o apagão ibérico de 28/04/2025 foi classificado como evento excepcional: as interrupções desse evento não contam para os padrões nem dão compensação regulamentar. Não usar para cortes por falta de pagamento (regras de suspensão). Não confundir com a indemnização por danos.',
 'https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf', null, null, false, null, null,
 'O incumprimento do padrão individual do número ou da duração das interrupções acidentais longas no ano confere ao cliente direito a compensação regulamentar, sem necessidade de pedido.',
 'Registo pessoal das datas, das horas de início e de fim e da duração de cada interrupção; avisos de interrupção programada recebidos (ou a sua falta); comunicações do operador de rede ou do comercializador sobre a causa; facturas do ano seguinte. A zona de qualidade de serviço, a classificação das interrupções e os indicadores individuais são dados do operador de rede: pedem-se, não se exigem ao cliente.',
 'Esclarecimento dos indicadores individuais de continuidade do ano e, se o padrão tiver sido ultrapassado, crédito da compensação regulamentar.',
 array['falta de luz', 'interrupções', 'cortes de energia', 'apagão', 'continuidade de serviço', 'padrões individuais', 'operador de rede', 'compensação']),

('ENE_CONTINUIDADE_PAGAMENTO_106', 'Energia', 'Qualidade de serviço', 'Continuidade de serviço — pagamento da compensação',
 'Compensação por interrupções: crédito automático na factura, prazos e exclusões',
 'Regulamento n.º 826/2023, de 28 de julho — RQS dos Setores Elétrico e do Gás, na redação vigente',
 'Artigos 9.º, 102.º, 106.º e 110.º, n.os 1, 4 e 6',
 'A compensação por incumprimento dos padrões individuais de continuidade de serviço é calculada pelo operador de rede, em função do número de interrupções ou da duração acima do padrão (na duração, também da potência contratada); se forem ultrapassados os dois padrões, paga-se a compensação de valor mais elevado, e o total anual está limitado a 200% do valor pago pelo cliente nesse ano pela tarifa de uso das redes. O comercializador responde perante o cliente pela qualidade de serviço, sem prejuízo da responsabilidade do operador de rede. O crédito é feito sem qualquer pedido do cliente: o operador de rede credita as compensações aos comercializadores até 12 de Março do ano seguinte (ou até 70 dias depois da última decisão da ERSE sobre eventos excepcionais desse ano, quando estiver pendente um pedido de classificação), e o comercializador credita-as ao cliente na primeira factura emitida depois de passarem 30 dias sobre o momento em que as recebe. Montantes individuais inferiores a 0,50 € não são creditados ao cliente (seguem o artigo 110.º, n.º 4). Não há lugar a compensação nas situações do artigo 110.º, n.º 1, devidamente comprovadas, nomeadamente eventos excepcionais no sector eléctrico. O direito torna-se inexigível passados cinco anos, contados do conhecimento pelo titular. Com um novo contrato com mudança de cliente, a compensação conta a partir da data do novo contrato.',
 'Só depois de confirmado, pelo operador de rede ou pelo comercializador, o incumprimento de um padrão individual (ver ENE_CONTINUIDADE_PADROES_24) — nunca presumir. Verificar o ano das interrupções e se as facturas posteriores ao prazo de crédito (em regra, a partir de meados de Abril do ano seguinte) mostram a compensação. Compensação já creditada: não a pedir de novo; se o cliente contestar o valor, pedir o detalhe do cálculo. Compensação aparentemente devida e não creditada: reclamar ao comercializador, pedindo o crédito ou a explicação de por que não é devida, e os indicadores e o cálculo. Não calcular valores no texto: os parâmetros (potência contratada, valores unitários actualizados, limite) são do operador. Diferente das compensações de qualidade de serviço comercial (artigo 104.º, prazo de 45 dias) e da indemnização por danos.',
 'https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf', null, null, false, null, null,
 'O cliente não tem de pedir a compensação: deve recebê-la como crédito na factura, nos prazos regulamentares; a falta de crédito pode ser reclamada.',
 'Facturas do comercializador emitidas a partir de Abril do ano seguinte ao das interrupções; comunicação do comercializador ou do operador de rede sobre a compensação; resposta sobre os indicadores individuais do ano.',
 'Crédito da compensação em falta, com a indicação do cálculo, ou explicação fundamentada de por que não é devida.',
 array['compensação automática', 'crédito na factura', 'compensação não paga', 'interrupções', 'padrões individuais', 'evento excepcional', '12 de Março']),

('ENE_CONTINUIDADE_RESP_CIVIL_10', 'Energia', 'Qualidade de serviço', 'Danos associados a interrupções',
 'A compensação regulamentar não afasta a indemnização por danos',
 'Regulamento n.º 826/2023, de 28 de julho — RQS dos Setores Elétrico e do Gás, na redação vigente',
 'Artigo 10.º; artigo 9.º, n.os 1 e 3',
 'O Regulamento da Qualidade de Serviço e o pagamento das compensações nele previstas não prejudicam o regime da responsabilidade civil legalmente aplicável. A compensação regulamentar (valor calculado por regras fixas, sem prova de prejuízo) e uma eventual indemnização por danos (por exemplo, aparelhos avariados ou alimentos estragados na sequência de uma interrupção ou do restabelecimento) são coisas diferentes: a indemnização depende dos pressupostos da responsabilidade civil, nomeadamente da prova do dano, do seu valor e da sua relação com a falha, o que exige análise concreta. O comercializador responde perante o cliente pelos aspectos da qualidade de serviço que lhe sejam aplicáveis, e o operador de rede responde pelo incumprimento dos padrões relativos às instalações ligadas às suas redes.',
 'Só quando o cliente indicar um dano concreto associado a uma interrupção ou a uma perturbação do fornecimento. Não concluir quem é responsável nem que a indemnização é devida: descrever o dano, a data e a hora, a relação temporal com a falha e pedir a análise e a reparação ou a indemnização. A análise humana decide a quem dirigir o pedido (comercializador e/ou operador de rede) e que outros fundamentos considerar. Um evento excepcional pode afastar a compensação regulamentar; o efeito sobre um pedido de indemnização exige análise jurídica própria.',
 'https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf', null, null, false, null, null,
 'Permite apresentar um pedido de indemnização por danos independentemente, e para além, da compensação regulamentar.',
 'Fotografias dos aparelhos ou bens danificados; relatório ou orçamento de reparação com a causa provável; facturas de compra dos bens; datas e horas da interrupção ou da perturbação; indicação de vizinhos afectados, se houver; comunicações ao comercializador ou ao operador de rede.',
 'Análise do pedido e reparação dos danos ou pagamento da indemnização correspondente, se se confirmarem os pressupostos.',
 array['danos', 'aparelhos avariados', 'electrodomésticos', 'indemnização', 'pico de tensão', 'alimentos estragados', 'responsabilidade civil']),

('ENE_ASSISTENCIA_AVARIA_83', 'Energia', 'Qualidade de serviço', 'Assistência técnica após comunicação de avaria',
 'Prazo de chegada do operador de rede depois de comunicada uma avaria',
 'Regulamento n.º 826/2023, de 28 de julho — RQS dos Setores Elétrico e do Gás, na redação vigente',
 'Artigos 82.º, 83.º e 84.º; artigo 45.º, n.º 3',
 'Depois de uma comunicação de avaria respeitante à rede, a entidade que a recebe informa o cliente sobre a actuação mais adequada. Se o operador de rede de distribuição decidir que é necessária a deslocação, deve informar o cliente e chegar à instalação no prazo de 4 horas (2 horas para clientes prioritários) após a comunicação; para clientes em baixa tensão normal que não sejam prioritários, se a comunicação ocorrer entre as 0h00 e as 8h00, a contagem começa às 8h00. O operador deve informar a hora limite de chegada. O incumprimento destes prazos confere ao cliente direito a compensação. Se a avaria estiver na instalação de utilização do cliente ou na sua alimentação individual e não for da responsabilidade do operador de rede, é o operador que tem direito a compensação; o mesmo acontece se o cliente estiver ausente à chegada, depois de informado da hora limite. Em interrupções resultantes de avarias nas redes, o operador de rede, quando solicitado, deve informar o cliente, directamente ou através do comercializador, sobre as causas da interrupção e a hora prevista para o restabelecimento.',
 'Electricidade; avaria comunicada ao operador de rede ou ao comercializador. Necessário: data e hora da comunicação, se o operador decidiu deslocar-se, hora limite indicada e hora de chegada; saber se o cliente é prioritário. Antes de pedir a compensação, confirmar que a avaria era da rede e não da instalação interior do cliente — se for da instalação do cliente, quem pode ter direito a compensação é o operador. Não aplicar quando o operador decidiu, de forma justificada, não se deslocar (artigo 83.º, n.os 6 e 7), nem quando o próprio cliente pediu a assistência fora destes prazos (artigo 83.º, n.º 5).',
 'https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf', null, null, false, null, null,
 'A chegada do operador de rede depois do prazo aplicável confere ao cliente direito a compensação regulamentar; o cliente pode pedir informação sobre a causa e a hora prevista de restabelecimento.',
 'Data, hora e meio da comunicação da avaria (número de ocorrência, registo da chamada, SMS ou e-mail); hora limite comunicada; hora de chegada do técnico; explicação da causa.',
 'Compensação regulamentar pelo atraso e informação sobre a causa da avaria e o restabelecimento.',
 array['avaria', 'falta de luz', 'técnico não apareceu', '4 horas', 'assistência técnica', 'restabelecimento', 'operador de rede'])

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
