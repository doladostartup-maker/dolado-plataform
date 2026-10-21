# Auditoria — Monitor de Protecção: electricidade e gás (21 de Outubro de 2026)

Acompanha a implementação técnica descrita em `docs/especificacoes/MONITOR_ENERGIA_FASE1.md`. Legenda: **[F]** facto verificado (no código ou num texto já confrontado pela DoLado); **[H]** hipótese a confirmar.

## 1. Âmbito e conclusão

A Fase 1 é **factual**: lê facturas, normaliza valores, calcula a diferença entre facturas e explica-a. **Não activa nenhuma regra jurídica**, não calcula indemnizações nem custos de saída de energia, não reutiliza regras nem fórmulas das telecomunicações e não classifica nada como incumprimento.

- [F] As situações que podem indiciar um problema (subida do preço por kWh, do termo fixo ou da potência, mudança de tarifário, acerto relevante, serviço adicional novo, desconto que desaparece) são **sempre revistas por uma pessoa** antes de o cliente as ver (achados, regra 2 do "Uso de IA"). Enquanto estão por rever, o portal mostra só os totais.
- [F] Num tarifário indexado ou dinâmico, a variação do preço é **só informativa** ("pode variar de factura para factura, de acordo com a fórmula prevista no contrato").
- [F] As frases descrevem o facto, a diferença em euros e o que o cliente pode confirmar ("Confirme se recebeu uma comunicação do comercializador sobre esta alteração"), sem citar normas nem concluir responsabilidade. Teste automático para as palavras "indevido", "ilegal", "viola", "incumprimento", "tem direito" (pt e en).
- [F] Nenhum dado enviado à Claude API mudou de natureza: o documento continua a ser lido como antes (só o schema da resposta é maior). O CPE/CUI passa a ser pseudonimizado, o que **reduz** os dados guardados.

## 2. Enquadramento aplicável (referência para a Fase 2)

Fonte principal: Regulamento de Relações Comerciais dos Sectores Eléctrico e do Gás (RRC), **Regulamento n.º 827/2023**, de 28 de Julho, rectificado pela Declaração de Rectificação n.º 830/2023. [F] A auditoria de 20/10/2026 registou uma alteração pelo **Regulamento n.º 8/2026** (objecto declarado: mobilidade eléctrica), cujo texto não foi lido. [H] A ERSE lista também um acto que altera em conjunto o RRC, o Regulamento do Autoconsumo, o Guia de Medição e o RQS; número e data não confirmados nesta auditoria (o site da ERSE não respondeu ao pedido automático). **Antes da Fase 2, confirmar todos os artigos abaixo no texto consolidado mais recente.**

Os resumos seguintes vêm das regras já confrontadas pela DoLado com o PDF do RRC (tabela `regras_juridicas`); servem de referência, não de parecer.

| Tema | Norma | O que diz (resumo) | Uso no Monitor |
| --- | --- | --- | --- |
| Fidelização: contrapartida e informação | RRC, art. 19.º, n.os 1 a 3 | Só com contrapartida para o cliente; referência expressa, separada e destacada à fidelização, à indemnização e à duração. | Fase 2. |
| Duração máxima | RRC, art. 19.º, n.º 4 | Com consumidores, no máximo 12 meses (texto confirmado na regra de gás; [H] confirmar o mesmo número para electricidade no consolidado). | Fase 2: assinalar fidelizações lidas com mais de 12 meses, para revisão. |
| Preço durante a fidelização | RRC, art. 19.º, n.º 5 (e art. 68.º, n.º 4) | Durante a fidelização, o comercializador não pode alterar as condições, incluindo o preço, salvo no interesse do cliente e com acordo expresso. | Fase 2: cruzar "preço subiu" com a data de fim da fidelização registada. |
| Fidelização e preço indexado/dinâmico | RRC, art. 19.º, n.º 7 | Com consumidores, a fidelização obsta à indexação do preço ou a preços dinâmicos. | Fase 2: assinalar a combinação "fidelização + indexado/dinâmico". |
| Indemnização por saída antecipada | RRC, art. 19.º, n.os 9 a 11 | Proporcionada; não pode exceder as perdas económicas directas do comercializador (investimentos, serviços agrupados). | **Sem fórmula** (ao contrário das telecomunicações). Nunca calcular automaticamente. |
| Alteração das condições | RRC, art. 68.º, n.os 1 a 3 e 5 | No fim de cada período contratual, o comercializador pode propor alterações; durante o período, com consumidores, só de forma fundamentada e se o contrato o previr; aviso com antecedência mínima de 30 dias. | Fase 1: só a recomendação "confirme se recebeu uma comunicação". |
| Denúncia | RRC, art. 81.º | O cliente pode denunciar a todo o tempo, sem encargos, salvo fidelização em vigor. | Fase 2 (custo de saída). |
| Leituras e estimativas | RRC, arts. 41.º e 42.º | Prevalece a leitura real mais recente (incluindo a comunicada pelo cliente); o cliente escolhe a metodologia de estimativa. | Fase 1: aviso de factura estimada com a sugestão de comunicar a leitura. |
| Periodicidade | RRC, art. 44.º | Facturação mensal, salvo acordo no interesse do cliente; se não for cumprida, fraccionamento a pedido. | Fase 2: detectar períodos longos sem factura. |
| Serviços adicionais | RRC, art. 17.º; Lei n.º 24/96, art. 9.º, n.º 4 | (Regras `ENE_SERVICOS_ADICIONAIS_17` e `CONS_NAO_SOLICITADO_9`.) | Fase 1: "Se não pediu este serviço, vale a pena confirmar". |
| Prescrição e caducidade | Lei n.º 23/96, art. 10.º | Prazos de 6 meses para a cobrança e para acertos (regras `SPE_PRESCRICAO_6M`, `SPE_ACERTO_6M`). | Fase 1 guarda o período do acerto; **não** o avalia. |
| Tarifas reguladas | Decisões tarifárias anuais da ERSE | As tarifas de acesso às redes mudam por decisão da ERSE; normalmente estão incluídas no preço por kWh. | As "causas possíveis" de uma subida de preço mencionam-nas. |

Fontes primárias: [ERSE — Regulamento de Relações Comerciais](https://www.erse.pt/atividade/regulamentos-eletricidade/relacoes-comerciais/), [Diário da República](https://diariodarepublica.pt/), [Simulador de preços da ERSE](https://simuladorprecos.erse.pt/), texto do RRC publicado ([cópia APREN](https://www.apren.pt/contents/legislation/regulamento-827-2023.pdf)).

## 3. Pontos para a advogada (antes de activar regras jurídicas)

1. **Subida do preço durante a fidelização (art. 19.º, n.º 5):** pode o Monitor, quando a data de fim da fidelização está registada e o preço por kWh ou o termo fixo sobe antes dela, sinalizá-lo ao revisor como "possível alteração durante a fidelização"? Que texto pode chegar ao cliente depois da revisão?
2. **Fidelização + tarifário indexado/dinâmico (art. 19.º, n.º 7):** confirmar que a combinação é proibida com consumidores em qualquer caso e validar a formulação do aviso.
3. **Aviso prévio de 30 dias (art. 68.º):** o Monitor não sabe se houve comunicação. Validar a recomendação actual ("Confirme se recebeu uma comunicação do comercializador sobre esta alteração") e se se pode acrescentar a referência ao prazo.
4. **Tarifas de acesso às redes num contrato de preço fixo:** quando é que a repercussão de uma alteração das tarifas reguladas conta como "alteração das condições" para efeitos do art. 68.º? Afecta a linguagem das subidas de preço.
5. **Acertos e prazos de 6 meses (Lei n.º 23/96, art. 10.º):** com o período do acerto lido, pode o Monitor assinalar ao revisor um acerto que inclua consumos com mais de 6 meses? Texto para o cliente.
6. **Serviços adicionais:** validar "Se não pediu este serviço, vale a pena confirmar com o comercializador".
7. **Custo de saída em energia (art. 19.º, n.os 9 a 11):** confirmar que a DoLado só deve mostrar o valor indicado pelo comercializador (sem estimativa própria) e com que ressalvas.
8. **Comparação de ofertas (Fase 2):** usar o simulador da ERSE como referência — confirmar as condições de utilização e a linguagem ("ofertas disponíveis", nunca "deve mudar").
9. **Texto consolidado:** confirmar os arts. 17.º, 19.º, 41.º, 42.º, 44.º, 68.º e 81.º depois do Regulamento n.º 8/2026 e de qualquer outro acto de 2026.
10. **Privacidade:** a Fase 1 guarda, por factura de energia, o consumo por período horário, a potência e os preços (dados que já constavam das facturas carregadas, agora estruturados). Confirmar que a Política `2026-10-03`/`2026-10-22` (serviços acompanhados, comparação de facturas, pseudónimos) cobre este detalhe ou se a secção 2 deve mencioná-lo; incluir no DPIA (pendente).

## 4. Impacto nas páginas de problemas e no conteúdo público

Não houve alteração legislativa nova identificada nesta auditoria; a verificação abaixo é a obrigatória para uma funcionalidade nova sobre o mesmo tema. Nenhuma página foi alterada.

| Página | URL | Conteúdo analisado | Estado | Alterações | SEO |
| --- | --- | --- | --- | --- | --- |
| Factura de electricidade muito alta | `/problemas/energia/fatura-muito-alta` (e `/en/…`) | "mais consumo, um acerto de leituras, uma mudança de preço ou um erro"; "comparar facturas, leituras e condições" | **Conforme** — coincide com a decomposição da Fase 1 | Nenhuma | — |
| Consumos estimados | `/problemas/energia/consumos-estimados` | Estimativas, leituras comunicadas, acertos e limites temporais | **Conforme** | Nenhuma | — |
| Protecção | `/protecao` (e `/en/protecao`) | "Comparamos cada factura que nos envia com as anteriores e, se nos enviar o contrato, com as condições contratadas"; revisão por uma pessoa | **Conforme** (genérico, sem prometer o que não fazemos) | Nenhuma obrigatória. **Recomendação** depois de ligar `MONITOR_ENERGIA_ATIVO`: acrescentar, em pt e en, uma frase sobre a electricidade e o gás ("Nas facturas de electricidade e gás, separamos o que mudou por causa do consumo do que mudou por causa dos preços"), sem prazos nem normas | Sem impacto (URL e metadata iguais) |
| Preçário | `/precario` | "Quero acompanhar as minhas facturas e contratos." | **Sem conteúdo relacionado** | — | — |
| Problemas de energia (categoria) | `/problemas/energia` | Exemplos de problemas | **Conforme** | — | — |

Página nova recomendada (não criada): nenhuma.
