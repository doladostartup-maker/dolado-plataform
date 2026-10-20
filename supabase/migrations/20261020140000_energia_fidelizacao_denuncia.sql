-- DoLado — Electricidade: indemnização da fidelização e denúncia sem encargos (20/10/2026)
--
-- Auditoria: docs/legal/auditoria-energia-facturacao-contratacao-2026-10-20.md
-- (lacunas J2 e J3). O RRC (Regulamento n.º 827/2023) é comum aos sectores
-- eléctrico e do gás, mas só o Gás tinha estas duas regras
-- (GAS_FIDELIZACAO_INDEMNIZACAO_19 e GAS_DENUNCIA_SEM_ENCARGOS_81, revistas a
-- 08/10/2026). Em Energia, os casos de fidelização, penalização e
-- cancelamento ficavam sem o limite da indemnização e sem o direito de
-- denúncia a todo o tempo.
--
-- Texto lido a 20/10/2026 no PDF da ERSE
-- https://www.erse.pt/media/cw5fdm3i/regulamento-827-2023_consolidado.pdf
-- (artigo 19.º, n.os 8 a 11; artigo 81.º, n.os 1 a 4). Esse PDF corresponde
-- à publicação de 28/07/2023 e não indica o Regulamento n.º 8/2026, que
-- alterou o RRC: confirmar a redacção em vigor ANTES de rever e activar.
--
-- Regras:
--   * 2 regras novas, AMBAS com ativa = false, revista_em = null — a IA não as
--     recebe enquanto Thiago/advogada não as reverem e activarem.
--   * Não altera nenhuma regra existente (o "on conflict" só reescreve uma
--     destas que ainda não tenha sido revista nem activada).
--   * Prioridade na selecção: src/lib/rascunhoIA/perfilEnergia.ts (tipos
--     "Fidelização ou penalização", "Cancelamento recusado" e "Cobrança após
--     cancelamento").

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa, revista_em, revista_por,
  efeito_juridico, provas_necessarias, resultado_pretendido, palavras_chave
) values

('ENE_FIDELIZACAO_INDEMNIZACAO_19', 'Energia', 'Fidelização', 'Fidelização — indemnização pelo cliente',
 'Indemnização por incumprimento da fidelização: proporcionada e limitada às perdas directas',
 'Regulamento n.º 827/2023, de 28 de julho — RRC dos Setores Elétrico e do Gás, na redação vigente', 'Artigo 19.º, n.os 9 a 11',
 'O incumprimento da cláusula relativa ao período de fidelização pelo cliente obriga-o a indemnizar o comercializador, nos termos estipulados contratualmente. Essa indemnização deve ser proporcionada e não pode exceder as perdas económicas directas para o comercializador resultantes da cessação do contrato, incluindo os custos de quaisquer investimentos ou serviços agrupados que já tenham sido prestados no âmbito do contrato. A factura deve incluir a informação relativa à data do termo do período de fidelização. A proporcionalidade do valor concreto exigido necessita de análise concreta.',
 'Contrato de fornecimento de electricidade com um período de fidelização válido em vigor (verificar primeiro a contrapartida, a referência expressa e destacada na proposta e o limite de 12 meses — regras ENE_FIDELIZACAO_CONTRAPARTIDA_19 e ENE_FIDELIZACAO_MAX_12M_19: se a cláusula estiver excluída, não há indemnização a discutir); cessação antecipada por iniciativa do cliente; valor exigido e respectiva justificação conhecidos. Não concluir que o valor é excessivo: descrever o valor, pedir a sua justificação e a demonstração das perdas directas. Se o contrato for misto (electricidade e gás), são dois contratos: tratar cada um.',
 'https://www.erse.pt/media/cw5fdm3i/regulamento-827-2023_consolidado.pdf', null, null, false, null, null,
 'O valor da indemnização por sair durante a fidelização tem de estar previsto no contrato, ser proporcionado e não exceder as perdas económicas directas do comercializador.',
 'Proposta e contrato com a cláusula de fidelização (duração, contrapartida e indemnização); factura ou carta com o valor exigido; data do pedido de cessação; facturas com a data do termo da fidelização.',
 'Justificação do valor exigido e, se não estiver demonstrado, a sua redução ao que corresponda às perdas económicas directas ou a anulação.',
 array['penalização', 'indemnização', 'fidelização', 'sair antes do fim', 'cancelar com fidelização', 'valor de saída', 'electricidade']),

('ENE_DENUNCIA_SEM_ENCARGOS_81', 'Energia', 'Cancelamento', 'Cessação — denúncia pelo cliente',
 'Denúncia do contrato pelo cliente a todo o tempo, sem encargos, salvo fidelização em vigor',
 'Regulamento n.º 827/2023, de 28 de julho — RRC dos Setores Elétrico e do Gás, na redação vigente', 'Artigo 81.º, n.º 1, alíneas b) e c), e n.os 2 a 4',
 'O contrato de fornecimento pode cessar por denúncia ou oposição à renovação por parte do cliente, a todo o tempo, sem encargos, salvo se estiver vigente um período de fidelização; cessa também com a celebração de contrato de fornecimento com outro comercializador. O comercializador não pode denunciar o contrato durante a sua vigência, sem prejuízo do artigo 19.º. Nos contratos com consumidores, o comercializador não pode opor-se à renovação, salvo se tiverem ocorrido pelo menos três incumprimentos de pagamento tempestivo nos doze meses imediatamente anteriores ou se pretender cessar a actividade de comercialização ou não celebrar de forma generalizada novos contratos; quando permitida, a oposição depende de pré-aviso mínimo de 45 dias, com indicação expressa de que, na ausência de nova contratação, haverá interrupção do fornecimento.',
 'Contrato de fornecimento de electricidade. Verificar se existe período de fidelização em vigor (se existir, ver ENE_FIDELIZACAO_INDEMNIZACAO_19), quem pôs termo ao contrato, as datas do pedido de cessação ou da mudança de comercializador e, se for o comercializador a opor-se à renovação, o pré-aviso. Encargos cobrados depois da cessação: confrontar com a data efectiva da cessação. Se o contrato for misto (electricidade e gás), são dois contratos: tratar cada um.',
 'https://www.erse.pt/media/cw5fdm3i/regulamento-827-2023_consolidado.pdf', null, null, false, null, null,
 'Sem fidelização em vigor, o cliente pode pôr termo ao contrato de electricidade a todo o tempo e sem encargos; a mudança de comercializador também faz cessar o contrato anterior.',
 'Comprovativo do pedido de cessação ou de oposição à renovação, com data; contrato (para verificar a fidelização); data da mudança de comercializador, se for o caso; facturas ou cartas com encargos de saída.',
 'Cessação do contrato na data pedida, sem encargos, e anulação de encargos de saída cobrados sem fidelização em vigor.',
 array['cancelar contrato', 'denúncia', 'rescindir', 'oposição à renovação', 'encargos de saída', 'cancelamento recusado', 'electricidade'])

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
-- Nunca reescreve uma regra já revista ou activa.
where public.regras_juridicas.revista_em is null and not public.regras_juridicas.ativa;
