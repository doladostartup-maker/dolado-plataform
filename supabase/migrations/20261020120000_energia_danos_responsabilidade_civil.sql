-- DoLado — Electricidade: danos em aparelhos e outros bens (20/10/2026)
--
-- Pendente 3 da auditoria docs/legal/auditoria-interrupcoes-electricidade-2026-10-20.md:
-- o RQS (artigo 10.º) não afasta a responsabilidade civil, mas a base
-- jurídica não tinha o regime civil. Carga pedida por Thiago a 20/10/2026.
--
-- Texto lido a 20/10/2026 na versão consolidada do Código Civil (90.ª versão,
-- Lei n.º 29/2026, de 23/06) publicada pela PGDL:
--   art. 483.º (responsabilidade por factos ilícitos), art. 509.º (danos
--   causados por instalações de energia eléctrica ou gás), art. 510.º
--   (limites), art. 798.º (responsabilidade do devedor), art. 799.º
--   (presunção de culpa).
--
-- Regras:
--   * 2 regras novas, ativa = false, revista_em = null — a IA não as recebe
--     enquanto não forem revistas e activadas.
--   * Energia / "Qualidade de serviço": chegam aos casos de Energia com o tipo
--     "Corte ou falha de serviço" (limite próprio de 18 regras,
--     src/lib/rascunhoIA/regras.ts).
--   * Não altera nenhuma regra existente.

insert into public.regras_juridicas (
  codigo, setor, categoria, subcategoria, titulo, diploma, artigo, resumo,
  condicoes_aplicabilidade, fonte_url, em_vigor_desde, revogada_em, ativa, revista_em, revista_por,
  efeito_juridico, provas_necessarias, resultado_pretendido, palavras_chave
) values

('ENE_DANOS_INSTALACAO_CC_509', 'Energia', 'Qualidade de serviço', 'Danos associados a interrupções',
 'Danos causados pela condução ou entrega da electricidade: responsabilidade de quem dirige a instalação',
 'Código Civil — Decreto-Lei n.º 47344/66, de 25 de Novembro, na redacção vigente',
 'Artigos 509.º e 510.º',
 'Quem tiver a direcção efectiva de uma instalação destinada à condução ou entrega da energia eléctrica, e a utilizar no seu interesse, responde, independentemente de culpa, tanto pelo prejuízo que derive da condução ou entrega da electricidade como pelos danos resultantes da própria instalação, excepto se, ao tempo do acidente, a instalação estiver de acordo com as regras técnicas em vigor e em perfeito estado de conservação. Não obrigam a reparação os danos devidos a causa de força maior, entendida como toda a causa exterior independente do funcionamento e utilização da coisa. Os danos causados por utensílios de uso de energia não são reparáveis nos termos desta disposição. Sem culpa do responsável, a indemnização tem os limites máximos previstos no artigo 510.º. Saber quem tem a direcção efectiva da instalação em causa (a rede de distribuição é explorada pelo operador de rede), se o dano deriva da condução ou entrega da electricidade (por exemplo, uma sobretensão) e se se verifica alguma das excepções necessita de análise concreta.',
 'Electricidade; dano concreto em bens do cliente (por exemplo, aparelhos avariados) com indícios de ter origem na rede — sobretensão, oscilação de tensão ou restabelecimento do fornecimento — e não na instalação interior do cliente. O n.º 3 exclui deste regime os danos causados pelos próprios utensílios de uso de energia: distinguir dos danos sofridos pelos aparelhos em consequência da electricidade entregue; a qualificação é feita na análise humana. A força maior do artigo 509.º (causa exterior) não é o mesmo que o evento excepcional do RQS: não presumir que um implica o outro. Não concluir a responsabilidade: descrever o dano, a data e a hora e a relação com a falha, e pedir a análise e a indemnização. Em princípio, o pedido dirige-se a quem explora a rede (operador de rede), podendo dar-se conhecimento ao comercializador; a análise humana confirma. Usar em conjunto com ENE_CONTINUIDADE_RESP_CIVIL_10.',
 'https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=775&tabela=leis', null, null, false, null, null,
 'Quem dirige a instalação de condução ou entrega da electricidade responde, mesmo sem culpa, pelos danos que dela derivem, salvo as excepções do artigo 509.º e dentro dos limites do artigo 510.º.',
 'Fotografias dos aparelhos danificados; relatório técnico ou orçamento de reparação que indique a causa provável (por exemplo, sobretensão); facturas de compra ou outra prova do valor dos bens; data e hora da falha ou do restabelecimento; indicação de vizinhos com danos semelhantes, se houver; número de ocorrência e comunicações ao operador de rede ou ao comercializador.',
 'Análise do pedido e reparação dos danos ou pagamento da indemnização correspondente, se se confirmarem os pressupostos.',
 array['aparelhos avariados', 'electrodomésticos queimados', 'sobretensão', 'pico de tensão', 'danos', 'indemnização', 'operador de rede']),

('ENE_DANOS_CULPA_CC_798', 'Energia', 'Qualidade de serviço', 'Danos associados a interrupções',
 'Danos por falha do fornecimento: responsabilidade contratual e por facto ilícito',
 'Código Civil — Decreto-Lei n.º 47344/66, de 25 de Novembro, na redacção vigente',
 'Artigos 798.º e 799.º; artigo 483.º',
 'O devedor que falta culposamente ao cumprimento da obrigação torna-se responsável pelo prejuízo que causa ao credor; incumbe ao devedor provar que a falta de cumprimento ou o cumprimento defeituoso não procede de culpa sua. Fora de uma relação contratual, quem, com dolo ou mera culpa, violar ilicitamente o direito de outrem ou uma disposição legal destinada a proteger interesses alheios fica obrigado a indemnizar o lesado pelos danos resultantes da violação; só existe obrigação de indemnizar independentemente de culpa nos casos especificados na lei. No fornecimento de electricidade, o contrato é celebrado com o comercializador e a rede é explorada pelo operador de rede: saber qual destes regimes se aplica, perante quem, se houve incumprimento ou facto ilícito e se o dano resulta dele necessita de análise concreta.',
 'Electricidade; dano concreto (por exemplo, bens estragados durante uma interrupção prolongada, aparelhos avariados ou outros prejuízos) associado a uma falha ou deficiência do fornecimento. Não concluir que houve culpa, incumprimento ou facto ilícito: descrever os factos, o dano e o seu valor e pedir a análise e a indemnização. A presunção de culpa do artigo 799.º só vale numa relação contratual (em regra, com o comercializador). Distinguir sempre da compensação regulamentar do RQS, que não depende de culpa nem de prova do prejuízo. Usar em conjunto com ENE_CONTINUIDADE_RESP_CIVIL_10; a análise humana decide entre este fundamento e o do artigo 509.º (ENE_DANOS_INSTALACAO_CC_509).',
 'https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=775&tabela=leis', null, null, false, null, null,
 'Numa relação contratual, o incumprimento culposo obriga a indemnizar o prejuízo, presumindo-se a culpa do devedor; fora dela, a indemnização depende de facto ilícito e culposo.',
 'Contrato de fornecimento; datas e horas da falha e da sua duração; prova do dano e do seu valor (fotografias, facturas, orçamentos, relatório técnico); comunicações com o comercializador e o operador de rede.',
 'Análise do pedido e indemnização do prejuízo, se se confirmarem os pressupostos.',
 array['danos', 'indemnização', 'prejuízo', 'alimentos estragados', 'aparelhos avariados', 'incumprimento', 'responsabilidade civil'])

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
