# E-book «Está a pagar mais do que devia?» — revisão jurídica

**Data da revisão:** 20 de Outubro de 2026 (data impressa na última página do PDF).
**Fonte editável:** [guia-facturas.html](guia-facturas.html) · **PDF:** `public/guias/guia-facturas-dolado.pdf` (16 páginas A4) · **Gerar de novo:** `node scripts/conteudos/gerar-guia-facturas.mjs`.

O guia é informação geral para consumidores. Segue as mesmas regras das páginas `/problemas`: diz «pode depender», «em regra» e «é necessário verificar», não promete resultados, não conclui que uma empresa violou a lei e não indica qual é a entidade competente. As afirmações jurídicas foram confrontadas com as **regras jurídicas activas e revistas da plataforma** (`regras_juridicas`, lidas em produção a 20/10/2026) e, quando a regra não existia, com a fonte oficial.

## 1. Afirmações jurídicas e fontes

| Pág. | Afirmação do guia | Fonte | Regra da plataforma |
|---|---|---|---|
| 7 | Telecomunicações: fidelização até 24 meses; também ofertas sem fidelização | Lei n.º 16/2022 (LCE), art. 129.º | — (confirmado na fonte; ver ponto A1) |
| 7 | Telecomunicações: encargos de saída antecipada com limites legais; situações sem encargos (mudança de residência, desemprego, incapacidade) | LCE, arts. 133.º e 136.º | `TEL_CESSACAO_ENCARGOS_136`, `TEL_MUDANCA_RESIDENCIA_133`, `TEL_DESEMPREGO_133`, `TEL_INCAPACIDADE_133` |
| 7 | Depois da prorrogação automática: denúncia a qualquer momento, pré-aviso máximo de um mês, sem custos | LCE, art. 132.º | `TEL_PRORROGACAO_132` |
| 7 | Electricidade e gás: fidelização ≤ 12 meses, com contrapartida, sem renovação automática; indemnização proporcional, sem exceder as perdas directas | RRC (Reg. ERSE n.º 827/2023), art. 19.º | `ENE_FIDELIZACAO_MAX_12M_19`, `ENE_FIDELIZACAO_CONTRAPARTIDA_19`, `ENE_FIDELIZACAO_SEM_RENOV_AUTO_19`, `ENE_FIDELIZACAO_INDEMNIZACAO_19` |
| 8 | Energia: serviços adicionais independentes do fornecimento; informação clara | RRC, art. 17.º | `ENE_SERVICOS_ADICIONAIS_17` |
| 9 | Energia: prevalece a leitura mais recente, incluindo a comunicada pelo cliente | RRC, art. 42.º, n.º 3 | `ENE_LEITURA_REAL_PREVALECE_42` |
| 9 | Facturação mensal; factura acumulada → pagamento em prestações, sem juros quando o atraso não é imputável ao cliente | RRC, art. 44.º; RRCAR (Reg. ERSAR n.º 594/2018), art. 97.º | `ENE_FACTURACAO_MENSAL_44`, `ENE_FATURA_ATRASO_FRACIONAR_44`, `AGUA_FAT_MENSAL_97`, `AGUA_FAT_ACUMULADA_97` |
| 9 | Prazos de seis meses que limitam a cobrança de valores antigos, incluindo diferenças de um acerto | Lei n.º 23/96, art. 10.º, n.os 1 e 2 | `SPE_PRESCRICAO_6M`, `SPE_ACERTO_6M` |
| 10 | Telecomunicações: aviso em suporte duradouro com pelo menos um mês; resolução sem custos se a alteração tiver efeito negativo; excepções | LCE, art. 135.º; Directiva (UE) 2018/1972, art. 105.º, n.º 4 | `TEL_ALT_CONTRATO_135` |
| 10 | Energia: novas condições comunicadas com pelo menos 30 dias, direito de denunciar sem encargos; sem alterações durante a fidelização, salvo no interesse do cliente e com acordo expresso | RRC, arts. 68.º e 19.º, n.os 5 e 7 | `ENE_ALT_CONTRATO_68`, `ENE_FIDELIZACAO_PRECO_19` |
| 10 | Água: tarifários a 1 de Janeiro, publicitados, informação na 1.ª factura seguinte; alterações do contrato por escrito com 30 dias | RRCAR, arts. 83.º e 71.º, n.º 8 | `AGUA_TARIFA_PUBLICIDADE_83`, `AGUA_ALT_CONTRATO_30D_71` |
| 11 | Telecomunicações: discrepância significativa e continuada do desempenho → medidas, incluindo resolução sem custos | LCE, art. 130.º | `TEL_FALHA_DESEMPENHO_130` |
| 12 | Pagar em separado um serviço público essencial facturado com outros | Lei n.º 23/96, art. 6.º | `SPE_PAGAMENTO_PARCIAL` |
| 12 | Telecomunicações: reclamação escrita sobre a dívida, até à data da suspensão, impede a suspensão por esses valores | LCE, art. 128.º, n.º 4 | `TEL_FATURA_RECLAMADA_128` |
| 12 | Energia: reclamação de facturação com informação concreta suspende a interrupção relativa a essa factura | RQS (Reg. ERSE n.º 826/2023), art. 64.º | `ENE_RECLAM_FAT_SUSPENDE_CORTE_64` |
| 12 | Livro de Reclamações: resposta em 15 dias úteis | DL n.º 156/2005 (Livro de Reclamações) | — (ver ponto A2) |

Ligações oficiais usadas na última página do PDF: Lei n.º 16/2022 e Lei n.º 23/96 (consolidada) e Reg. n.º 827/2023 no Diário da República; Directiva 2018/1972 no EUR-Lex; ERSE, ERSAR, Portal do Consumidor da ANACOM, Direcção-Geral do Consumidor e Livro de Reclamações Electrónico (os endereços responderam a 20/10/2026).

## 2. Pontos para validação adicional (advogada)

- [ ] **A1 — LCE, art. 129.º:** confirmar a redacção «as operadoras têm de disponibilizar também ofertas sem fidelização» (e, se for o caso, de 6 e 12 meses). Não há regra revista na plataforma para este artigo.
- [ ] **A2 — Livro de Reclamações:** confirmar que o prazo de 15 dias úteis se aplica às reclamações do livro físico e do electrónico, e se convém dizer que é o prazo de resposta ao consumidor.
- [ ] **A3 — Actualizações de preço previstas no contrato (telecomunicações):** o guia diz que «podem ter um enquadramento diferente», sem mais. Confirmar se esta cautela chega ou se convém explicar.
- [ ] **A4 — Água sem fidelização:** o guia diz «normalmente sem períodos de fidelização». Confirmar.
- [ ] **A5 — Modelo de pedido de esclarecimento (pág. 12):** pede «a correcção e a devolução do montante pago a mais» se o valor não tiver fundamento. Confirmar a formulação.

## 3. Impacto nas páginas de problemas e no conteúdo público

Esta secção é obrigatória por regra do CLAUDE.md. Não foi feita nenhuma alteração ao conteúdo público existente.

| Página e URL | Conteúdo analisado | Estado | Alterações | SEO |
|---|---|---|---|---|
| Aumento de preço — `/problemas/telecomunicacoes/aumento-preco` (pt/en) | Alteração de preço durante a fidelização, aviso prévio, verificar o contrato | Conforme (prudente, sem prazos; coerente com o art. 135.º) | Nenhuma | — |
| Cancelar durante a fidelização — `/problemas/telecomunicacoes/cancelar-fidelizacao` | Encargos com limites, situações sem encargos, Calculadora | Conforme | Nenhuma | — |
| Cobrança indevida — `/problemas/telecomunicacoes/cobranca-indevida` | Serviços e valores não reconhecidos | Conforme | Nenhuma | — |
| Consumos estimados — `/problemas/energia/consumos-estimados` | Estimativas, acertos, limites temporais | Conforme (já menciona os limites temporais desde 20/10/2026) | Nenhuma | — |
| Factura muito alta — `/problemas/energia/fatura-muito-alta` | Causas de aumento | Conforme | Nenhuma | — |
| Calculadora de Cancelamento — `/calculadora-cancelamento` | Regra de cálculo do encargo máximo | Sem conteúdo contraditório | Nenhuma (o guia liga para ela) | — |
| Página nova `/guia-facturas` (pt/en) | Resumo do guia, sem afirmações jurídicas próprias | Nova | Criada | Indexável, canonical, hreflang, imagem de partilha |

**Recomendação (não implementada):** acrescentar o guia em `/ferramentas-gratuitas` e uma ligação discreta nas páginas `/problemas` de telecomunicações e energia, depois de a página entrar em produção.

## 4. Revisão periódica

- [ ] Rever o guia quando mudarem a LCE, o RRC/RQS da ERSE (incluindo o Regulamento n.º 8/2026), o RRCAR ou a Lei n.º 23/96. Depois de rever, mudar a data da última página, gerar o PDF de novo e actualizar este documento.
