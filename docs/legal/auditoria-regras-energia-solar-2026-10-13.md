# Auditoria das regras jurídicas — Energia Solar / Autoconsumo (13/10/2026)

**Natureza:** diagnóstico e proposta para revisão (Thiago + advogada). Nada foi implementado: sem alterações a código, migrations, base de dados ou regras.

**Método**

- Leitura (só `SELECT`) da tabela `regras_juridicas` em produção a 13/10/2026: **157 regras, 153 ativas** (4 de Água inativas).
- Leitura do motor de seleção (`src/lib/rascunhoIA/regras.ts`, usado pela sugestão do texto e pela análise das respostas — `src/lib/analiseResposta/servidor.ts`).
- **Simulação real:** o `selecionarRegras()` do repositório foi executado contra as 157 regras de produção (script no scratchpad, fora do repositório). As listas abaixo são o resultado efetivo, não uma estimativa.
- Legislação confrontada com: texto publicado do DL 84/2021 (DR n.º 202, 18/10/2021) e versões consolidadas da PGDL (DL 15/2022 até ao DL 130/2026; Lei 24/96 até à Lei 28/2023). O que não foi possível confirmar no texto oficial está marcado **[a confirmar]**.

---

## A. Resumo executivo

**A DoLado não está pronta para aceitar casos de painéis solares com segurança jurídica — mas o que falta é sobretudo seleção, não base jurídica.**

1. **O direito material principal já existe e está revisto.** O regime da falta de conformidade (DL 84/2021), incluindo a regra exata "instalação incorreta = falta de conformidade" (`COMPRA_INSTALACAO_INCORRETA_9`), o atraso/falta de entrega, a reparação, a resolução e o reembolso, a livre resolução com os 30 dias para contratos no domicílio, as práticas comerciais desleais e as cláusulas contratuais gerais estão na base, ativos e revistos (06–08/10/2026).
2. **Mas um caso de Energia nunca as recebe.** As regras do DL 84/2021 mais completas têm `setor = 'Compras & Reembolsos'`, e o motor só envia regras do setor do caso ou gerais. A simulação mostra que, para **qualquer** tipo de problema de Energia, não chega uma única regra de conformidade, instalação, entrega ou garantia — e com "Outro" chegam 12 regras de fornecimento de eletricidade (cauções, cortes, tarifa social), todas inaplicáveis a um sistema solar.
3. **Pior do que faltar: chegam regras erradas.** Um caso solar classificado em Energia receberia regras da Lei 23/96 (serviços públicos essenciais) e dos Regulamentos de Relações Comerciais / Qualidade de Serviço da ERSE (prazos de resposta do comercializador, suspensão do corte, compensações), que regulam o **fornecimento de energia**, não a venda e instalação de equipamento. A regra 4 do "Uso de IA" (não concluir sem fundamento) fica em risco.
4. **Lacunas de direito material específicas de solar:** nada sobre o regime da UPAC no DL 15/2022 (controlo prévio, certificado de exploração, entidade instaladora, certificação de equipamentos, deveres do autoconsumidor) — e este diploma foi alterado em 2026 (DL 130/2026, de 29/06, e Lei 29/2026, de 23/06).
5. **Lacunas gerais (úteis também para outros setores):** âmbito do DL 84/2021 nas empreitadas e entrega na conclusão da instalação (arts. 3.º e 11.º, n.º 2), direito de recusar o pagamento do remanescente (art. 15.º, n.º 7), garantia comercial (art. 43.º), responsabilidade direta do produtor (art. 40.º), reparação de danos (Lei 24/96, art. 12.º) e crédito coligado (DL 133/2009) **[a confirmar]**.

---

## B. O que existe hoje

### B.1 Motor de seleção (`selecionarRegras`)

| Aspeto | Hoje |
|---|---|
| Campos usados | `setor` do caso e `problema_tipo` (chamado `categoria` no seletor). Mais nada: `subcategoria` e `palavras_chave` das regras **não** entram na seleção. |
| Filtro de setor | Regra com `setor` preenchido só vai a casos **desse** setor. `setor = null` → todos os setores, exceto regras da Lei 23/96 (só setores SPE: Telecom, Energia, Gás, Água). |
| Filtro de categoria | `CATEGORIAS_POR_PROBLEMA[problema_tipo]` + `CATEGORIAS_SEMPRE` (Reclamação, Resolução de conflitos, Prática comercial, Defesa do consumidor). "Outro" → todas as categorias. |
| Ordenação | setor do caso (+2) > categoria do problema (+1) > sempre (0); empate **por ordem alfabética do código**. |
| Limite | `MAX_REGRAS_POR_PEDIDO = 12`. O corte é alfabético, não por relevância. |
| Transversalidade | Uma regra geral (`setor = null`) é transversal a setores; uma regra serve vários tipos de problema se a sua categoria constar de vários mapeamentos. **Uma regra não pode pertencer a dois setores** (campo `setor` é um só valor). |
| Schema | `categoria` é texto livre (sem `check`): a categoria "Autoconsumo" pode ser criada sem migration. `casos.problema_tipo` não tem `check` na BD: um tipo de problema novo é só código (`PROBLEMAS_POR_SETOR`) e textos. |

### B.2 Seleção atual para casos de Energia (resultado real, 13/10/2026)

| Tipo de problema (Energia) | Regras enviadas (12) | Úteis para solar |
|---|---|---|
| Outro | ENE_ACEITACAO_EXPRESSA_20, ENE_ALT_CONTRATO_68, ENE_CAUCAO_CONSUMIDOR_23, ENE_CAUCAO_RESTITUICAO_27, ENE_CHAMADA_GRAVADA_243, ENE_CORTE_PREAVISO_79, ENE_CORTE_PRESCRICAO_78, ENE_CORTE_VULNERAVEL_30D_79, ENE_DADOS_CONSUMO_41, ENE_DIVIDA_MUDANCA_242, ENE_ELEC_REDUCAO_ANTES_CORTE_78, ENE_ELEC_TARIFA_SOCIAL_AUTO_201 | **0** — nenhuma regra geral chega (as 29 regras ENE_ ocupam tudo) |
| Cobrança indevida | 8 ENE_ de faturação/caução/medição, 3 ENE_ de reclamação (RQS), CONS_NAO_SOLICITADO_9 | 1 (parcial) |
| Cancelamento recusado | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, ENE_SERVICOS_ADICIONAIS_17, 3 ENE_ RQS, CCG_AMBIGUA_11, CCG_BOAFE_CONSUMIDOR, CCG_COMUNICACAO_5_8, CCG_FORMALIDADES_22, CCG_INFORMACAO_6_8, CCG_RENOVACAO_AUTO_22 | 5–6 de CCG; **DIST_LIVRE_RESOLUCAO é cortada pelo limite** (ordem alfabética) |
| Corte ou falha de serviço | 4 ENE_ de corte, ENE_QUALIDADE_COMPENSACAO_104, 3 ENE_ RQS, SPE_PREAVISO_CORTE_20D, CONS_INTERESSES_9, LRE_RESPOSTA_15DU, PCD_ACAO_ENGANOSA_7 | 3 |
| Fidelização / Aumento de mensalidade | ENE_ de fidelização, faturação e contrato + CCG | 0–3 |

Para comparação, um caso **Compras & Reembolsos / Produto com defeito** recebe hoje exatamente o conjunto certo para os casos A e D (COMPRA_CONFORMIDADE_5_7, COMPRA_INSTALACAO_INCORRETA_9, COMPRA_DIREITOS_CONFORMIDADE_15, COMPRA_REPARACAO_REGRAS_18, GAR_*…). Ou seja: um cliente que escolhesse "Compras & Reembolsos" teria hoje melhor cobertura do que em "Energia" — mas sem livre resolução, práticas comerciais nem regime da UPAC, e com regras escritas para "compra e venda de bem móvel".

---

## C. Matriz problema → regra

Legenda: **R** = reutilizável sem alterações · **A** = precisa de adaptação · **F** = falta · **⊘** = existe mas não chega a casos de Energia (setor Compras & Reembolsos).

| # | Problema | Regra(s) existente(s) | Diploma / artigo | Setor atual | Estado |
|---|---|---|---|---|---|
| 1 | Contratação de painéis (informação, forma) | DIST_INFO_PRE_4, DIST_CONFIRMACAO_6, CCG_COMUNICACAO_5_8, CCG_INFORMACAO_6_8, CONS_INTERESSES_9 | DL 24/2014 arts. 4.º e 6.º; DL 446/85 arts. 5.º, 6.º, 8.º; Lei 24/96 art. 9.º | geral | **R** |
| 2 | Instalação incompleta ou atrasada | COMPRA_ENTREGA_PRAZO_11, COMPRA_ENTREGA_REEMBOLSO_11 | DL 84/2021 art. 11.º, n.os 4–11 | Compras | **⊘ + A**: conteúdo serve, mas falta o art. 11.º, n.º 2 (com instalação a cargo do profissional, o bem só se considera entregue com a instalação concluída) e o art. 3.º, n.º 1, al. b) (empreitada) → **F** (regra geral nova, ver D) |
| 3 | Instalação incorreta | COMPRA_INSTALACAO_INCORRETA_9 | DL 84/2021 art. 9.º | Compras | **⊘** — é exatamente a regra do exemplo; não recriar |
| 4 | Sistema não funciona | COMPRA_CONFORMIDADE_5_7, COMPRA_DIREITOS_CONFORMIDADE_15, COMPRA_REJEICAO_30D_16; GAR_BEM_3ANOS_12, GAR_ONUS_2ANOS_13 | DL 84/2021 arts. 5.º–7.º, 12.º, 13.º, 15.º, 16.º | Compras / geral | **⊘** (Compras) + **R** (GAR_, mas só chegam com categoria "Garantia", que nenhum tipo de Energia pede) |
| 5 | Produção diferente do contratado | COMPRA_CONFORMIDADE_5_7 (características acordadas e declarações públicas/publicidade), PCD_ACAO_ENGANOSA_7, PCD_OMISSAO_9, PCD_DIREITOS_14 | DL 84/2021 arts. 6.º–7.º; DL 57/2008 arts. 7.º, 9.º, 14.º | Compras / geral | **⊘ + R**. Cautela para a advogada: estimativas de produção dependem de irradiação/sombreamento — saber se a estimativa é "característica acordada" exige análise humana (já é o tom das regras) |
| 6 | Inversor, bateria ou outro equipamento avariado | GAR_BEM_3ANOS_12, GAR_ONUS_2ANOS_13, GAR_REPARACAO_30D_18, COMPRA_DIREITOS_CONFORMIDADE_15 | DL 84/2021 arts. 12.º, 13.º, 15.º, 18.º | geral / Compras | **R / ⊘**. Inversor com app = "bem com elementos digitais" (art. 2.º, al. c), ii)) — as regras já ressalvam. **F**: responsabilidade direta do produtor (art. 40.º) — relevante quando o instalador não responde ou fechou |
| 7 | Falta de reparação | GAR_REPARACAO_30D_18, COMPRA_REPARACAO_REGRAS_18 (remoção e reinstalação a expensas do profissional — muito relevante em painéis no telhado), COMPRA_DIREITOS_CONFORMIDADE_15 (passagem à redução/resolução) | DL 84/2021 arts. 15.º, 18.º | geral / Compras | **R / ⊘** |
| 8 | Garantia (legal e comercial) | GAR_*, COMPRA_COMUNICACAO_PRAZOS_12_17 | DL 84/2021 arts. 12.º, 13.º, 17.º | geral / Compras | **R / ⊘**. **F**: garantia comercial (art. 43.º — vincula nos termos da declaração **e da publicidade**; prevalecem as condições mais favoráveis). Garantias de 10–25 anos de painéis/desempenho são comerciais |
| 9 | Danos provocados durante a instalação | — | Lei 24/96 art. 12.º, n.º 1 | — | **F** (regra geral nova) |
| 10 | Cobrança antes da conclusão da instalação | COMPRA_DIREITOS_CONFORMIDADE_15 (não refere o n.º 7); PAY_NAO_AUTORIZADO_112_114, PAY_REEMBOLSO_8S_118 (débitos); CCG_* | DL 84/2021 art. 15.º; DL 91/2018; DL 446/85 | Compras / geral | **F** para o essencial: art. 15.º, n.º 7–8 (recusar o pagamento do remanescente até à reposição da conformidade; não abrange prestações já em mora) |
| 11 | Valores diferentes dos acordados | CCG_ALT_UNILATERAL_22, CCG_AMBIGUA_11, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12, DIST_INFO_PRE_4 (preço total), PCD_ACAO_ENGANOSA_7 | DL 446/85 arts. 11.º, 22.º; Lei 24/96 art. 9.º, n.º 4; DL 57/2008 art. 12.º, al. f); DL 24/2014 art. 4.º | geral | **R** |
| 12 | Promessas comerciais ≠ contrato/instalado | PCD_ACAO_ENGANOSA_7, PCD_OMISSAO_9, PCD_DIREITOS_14, PCD_AGRESSIVA_11, COMPRA_CONFORMIDADE_5_7 | DL 57/2008 arts. 7.º, 9.º, 11.º, 14.º; DL 84/2021 art. 7.º | geral / Compras | **R / ⊘** |
| 13 | Cancelamento / resolução | Livre resolução (linha 15); COMPRA_DIREITOS_CONFORMIDADE_15 + COMPRA_RESOLUCAO_REEMBOLSO_20 (falta de conformidade); COMPRA_ENTREGA_PRAZO_11 (falta de entrega); CCG_FORMALIDADES_22 | DL 84/2021 arts. 11.º, 15.º, 20.º; DL 446/85 art. 22.º | Compras / geral | **⊘ + R**. **F** [a confirmar]: contrato de crédito coligado (painéis financiados) — DL 133/2009, art. 18.º |
| 14 | Contratação online, por telefone ou ao domicílio | DIST_INFO_PRE_4, DIST_CONFIRMACAO_6, DIST_TELEFONE_5, PCD_AGRESSIVA_11 | DL 24/2014 arts. 4.º–6.º; DL 57/2008 art. 11.º | geral | **R**. **F** [a confirmar]: requisitos de forma dos contratos fora do estabelecimento (DL 24/2014, art. 9.º) |
| 15 | Livre resolução | DIST_LIVRE_RESOLUCAO, DIST_EXCECOES_17, DIST_SERVICO_15, DIST_REEMBOLSO_12, CONS_RETRATACAO_INFO_8 (geral); COMPRA_LR_BENS_INICIO_10 (14/30 dias, contagem desde a posse física, 12 meses sem informação), COMPRA_LR_DEVOLUCAO_13_14, COMPRA_LR_REEMBOLSO_BENS_12 (Compras) | DL 24/2014 arts. 10.º–17.º; Lei 24/96 art. 8.º, n.º 4 | geral / Compras | **R / ⊘**. Nota: DIST_LIVRE_RESOLUCAO tem categoria "Contrato" (não "Livre resolução"). Atenção da advogada: as empresas tenderão a invocar o art. 17.º ("bens confecionados segundo especificações do consumidor") — a regra já obriga a análise humana |
| 16 | Registo UPAC / autoconsumo | — | DL 15/2022 arts. 11.º, 81.º, 81.º-A | — | **F** |
| 17 | Obrigações do instalador | COMPRA_INSTALACAO_INCORRETA_9 (só o efeito civil) | DL 15/2022 art. 84.º | Compras | **F** (obrigações próprias) |
| 18 | Certificação dos equipamentos | — | DL 15/2022 arts. 88.º e 96.º | — | **F** |
| 19 | Requisitos técnicos/administrativos | — | DL 15/2022 arts. 85.º (partes comuns), 88.º, 95.º (contagem) | — | **F** |
| 20 | Solar vendido pelo comercializador de energia (ex.: EDP) | ENE_SERVICOS_ADICIONAIS_17 | RRC (Reg. ERSE 827/2023) art. 17.º | Energia | **R** se a advogada confirmar que a venda de UPAC pelo comercializador é "serviço adicional" — distingue-o do fornecimento de energia |

**Regras que não devem chegar a casos solares** (chegariam hoje): todas as `SPE_*` (Lei 23/96 — a venda e instalação de painéis não é serviço público essencial), as ENE_/RQS de reclamação (prazos e compensações do comercializador), corte, caução, faturação de energia, mudança de comercializador e tarifa social. A fidelização do fornecimento (ENE_FIDELIZACAO_*) só se o contrato solar estiver ligado a um contrato de energia com fidelização — caso a tratar à mão.

---

## D. Verificação dos diplomas

| Diploma | Na base? | Verificação (13/10/2026) | Observações |
|---|---|---|---|
| **DL 84/2021** | Sim — 3 regras gerais (GAR_) e 12 regras de Compras & Reembolsos | Texto publicado no DR confirmado para os arts. 2.º, 3.º, 9.º, 11.º, 15.º, 19.º–21.º, 23.º, 40.º, 43.º. **[a confirmar]** versão consolidada (não foi possível abrir o consolidado; não se encontraram alterações referidas) | **Art. 3.º, n.º 1, al. b):** aplica-se "aos bens fornecidos no âmbito de um contrato de empreitada ou de outra prestação de serviços […] com as necessárias adaptações" — é a porta de entrada para "fornecimento e instalação". As condições das regras COMPRA_ dizem "compra e venda de bem móvel… não aplicar a imóveis": não estão erradas, mas não referem a empreitada. **Art. 11.º, n.º 2:** com instalação por conta do profissional, entrega = instalação concluída (conta para os 30 dias do art. 16.º, para os 2/3 anos e para a passagem do risco). **Art. 2.º, al. d):** "bens imóveis" = prédios urbanos habitacionais, com as coisas móveis ligadas com carácter de permanência — o regime de imóveis (arts. 22.º–25.º, 10/5 anos) é o da **compra e venda do imóvel**; um sistema instalado depois numa casa trata-se, em princípio, como bem fornecido em empreitada (arts. 3.º e 12.º). **Qualificação a validar pela advogada.** |
| **Lei 24/96** | Sim — CONS_INTERESSES_9 (art. 9.º, 1–3), CONS_NAO_SOLICITADO_9 (art. 9.º, 4), CONS_RETRATACAO_INFO_8 (art. 8.º, 4), RAL_REDUZIDO_VALOR_14 (art. 14.º); GIN_INFO_CONTRATUAL_8 só em Ginásios | Consolidado PGDL (11.ª versão, Lei 28/2023): art. 12.º confirmado (n.º 1 — indemnização dos danos patrimoniais e não patrimoniais do fornecimento de bens ou serviços defeituosos; n.º 2 — produtor). Art. 4.º **[a confirmar texto]** | Faltam: art. 12.º (danos) e, eventualmente, art. 4.º (qualidade de bens **e serviços** — útil para a parte de serviço, ex.: registo da UPAC). O dever de informação geral do art. 8.º, n.º 1 existe só como regra de Ginásios — não duplicar agora; se for preciso em geral, generalizar essa regra numa decisão própria |
| **DL 24/2014** | Sim — 8 regras gerais + 5 de Compras | Regras revistas a 06–08/10/2026 contra o DR. Alterações do diploma: Lei 47/2014, DL 78/2018, DL 9/2021, DL 109-G/2021 (30 dias no domicílio/deslocação organizada), Lei 16/2022, Lei 10/2023 | Cobertura suficiente. **[a confirmar]** art. 9.º (forma fora do estabelecimento) e exclusões do art. 2.º relativas a obras em imóveis (a Diretiva 2011/83 exclui construção de edifícios novos e conversões substanciais — uma instalação solar não o é, em princípio) |
| **DL 15/2022** | Só ENE_ELEC_TARIFA_SOCIAL_AUTO_201 (arts. 200.º–202.º) | Consolidado PGDL. Alterações: Retif. 11-A/2022, Lei 24-D/2022, DL 11/2023, DL 104/2023, Retif. 33/2023, **DL 99/2024**, Retif. 6/2025, **DL 69/2025**, **Lei 29/2026 (23/06)**, **DL 130/2026 (29/06)** | Nada sobre autoconsumo. Regime verificado: **art. 11.º** — ≤ 800 W sem injeção na RESP: isenta de controlo prévio; ≤ 30 kW: comunicação prévia; > 30 kW–1 MW: registo prévio + certificado de exploração; > 1 MW: licença. **Art. 81.º** (DL 130/2026) — títulos em nome do autoconsumidor (ou do condomínio/EGAC/comunidade). **Art. 81.º-A** (DL 99/2024) — certificado de exploração emitido automaticamente; DGEG pode auditar até 2 anos; irregularidade → 30 dias para corrigir, senão revogação. **Art. 84.º** (DL 130/2026) — UPAC > 800 W instalada por entidade instaladora de instalações elétricas de serviço particular ou técnico responsável (Lei 14/2015, DL 96/2017); exceção plug-and-play certificado < 1,5 kW; o instalador verifica a certificação dos equipamentos e se a UPAC está isenta, registada ou licenciada, e **declara cada UPAC na plataforma**. **Art. 85.º** — partes comuns: aviso de 60 dias ao administrador, oposição em 20 dias. **Art. 88.º** (DL 130/2026) — deveres do autoconsumidor (obter o título, garantir equipamentos certificados…); terceiros podem deter/gerir a UPAC, mas o autoconsumidor continua responsável pelos processos com a rede. **Art. 95.º** — contagem; > 4 kW, telecontagem; operador instala em 4 meses. **Art. 96.º** — o instalador demonstra na plataforma que os equipamentos estão certificados (organismo acreditado IPAC; normas CEN/CENELEC). **[a confirmar]**: data de produção de efeitos do DL 130/2026 (fonte não oficial fala em ~60 dias, fim de agosto de 2026) — define `em_vigor_desde` e o regime para contratos anteriores (limiar 700 W antes); conteúdo da Lei 29/2026 |
| **Regulamento do Autoconsumo da ERSE** (Reg. 815/2023, alterado pelo **Reg. 8/2026**, de 06/01) | Não | Identificado; texto não confrontado | Relações com o operador de rede, contagem e excedentes. Não é necessário para a v1 solar (os casos típicos são contra o vendedor/instalador). Nota lateral: o Reg. 8/2026 também alterou o RRC e o RQS — as regras ENE_/GAS_ foram revistas depois (06–08/10/2026), presumivelmente já com essa redação; confirmar na próxima revisão |
| **DL 133/2009** (crédito aos consumidores) | Não | **[a confirmar]** art. 18.º (contrato coligado) e estado da transposição da Diretiva (UE) 2023/2225 (aplicação prevista a partir de 20/11/2026) | Relevante quando o sistema é financiado (frequente): resolução da compra ↔ destino do crédito |
| Lei 14/2015 + DL 96/2017 (entidades instaladoras) | Não | Só citados pelo art. 84.º | Não criar regras próprias agora; o art. 84.º chega |

---

## E. Regras em falta (proposta — mesma estrutura das regras atuais)

Todas `ativa = false` até revisão; texto final só depois de confrontado com o DR pela advogada. Códigos são sugestões.

### E.1 Específicas — `setor = 'Energia'`, `categoria = 'Autoconsumo'` (categoria nova)

| Código | Problema | Diploma / artigo | Efeito jurídico | Provas necessárias | Resultado pretendido | Palavras-chave |
|---|---|---|---|---|---|---|
| UPAC_CONTROLO_PREVIO_11_81 | Registo/comunicação da UPAC não feito ou mal feito | DL 15/2022, arts. 11.º (n.os 2–5) e 81.º | A UPAC está sujeita a controlo prévio conforme a potência (isenção ≤ 800 W sem injeção; comunicação prévia ≤ 30 kW; registo + certificado de exploração até 1 MW); o título é do autoconsumidor. Se a empresa assumiu tratar do processo, o incumprimento é contratual — a lei não transfere o dever para a empresa por si só | Contrato/proposta (cláusula sobre "legalização"/"registo"); potência instalada; comprovativo de comunicação/registo ou a sua falta; comunicações da DGEG/E-REDES | Regularização do registo/comunicação a cargo da empresa, nos termos acordados; reparação de custos decorrentes | registo UPAC, comunicação prévia, DGEG, legalização, autoconsumo, certificado de exploração |
| UPAC_CERTIFICADO_EXPLORACAO_81A | Irregularidade detetada pela DGEG / certificado em risco | DL 15/2022, art. 81.º-A | DGEG pode auditar até 2 anos; irregularidade → 30 dias (prorrogáveis uma vez) para corrigir, sob pena de revogação | Notificação da DGEG; datas; contrato com o instalador | Correção pela empresa responsável dentro do prazo | auditoria DGEG, revogação, certificado de exploração, irregularidade |
| UPAC_INSTALADOR_84 | Instalador não habilitado / UPAC não declarada | DL 15/2022, art. 84.º | UPAC > 800 W tem de ser instalada por entidade instaladora/técnico responsável; o instalador verifica a certificação dos equipamentos e o título da UPAC e declara a UPAC na plataforma | Identificação da empresa/técnico; potência; comprovativo (ou falta) da declaração na plataforma | Declaração/regularização pelo instalador; reposição da conformidade | instalador, técnico responsável, entidade instaladora, plataforma, declaração |
| UPAC_EQUIPAMENTOS_96 | Equipamento sem certificação | DL 15/2022, arts. 96.º e 88.º (deveres do autoconsumidor) | Equipamentos da UPAC devem estar certificados por organismo acreditado; o instalador demonstra-o na plataforma; o autoconsumidor tem o dever de garantir equipamentos certificados (por isso tem interesse direto em exigir prova) | Fichas técnicas; certificados; lista pública da DGEG; fatura com modelos | Prova da certificação ou substituição por equipamento certificado (com DL 84/2021 se não conforme) | certificado, inversor, painel, bateria, homologação, IPAC |
| UPAC_DIREITOS_DEVERES_88 | Quem responde pelo quê (titular, terceiro gestor, instalador) | DL 15/2022, art. 88.º (+ art. 85.º, se partes comuns) | Direitos e deveres do autoconsumidor; terceiros podem deter/gerir a UPAC, mas o autoconsumidor continua responsável pelos processos com a rede. Ajuda a separar o que é da empresa por contrato do que é do cliente por lei | Contrato (modelo: compra, aluguer, "solar como serviço"); comunicações | Clarificação de responsabilidades e pedido dirigido à entidade certa | autoconsumidor, titular, gestão da UPAC, condomínio |

Opcional, só se aparecerem casos: contagem (art. 95.º) e partes comuns (art. 85.º) como regras próprias.

### E.2 Gerais — `setor = null` (servem solar e também Compras, Ginásios, etc.)

| Código | Problema | Diploma / artigo | Categoria | Efeito jurídico | Provas | Resultado pretendido | Palavras-chave |
|---|---|---|---|---|---|---|---|
| GAR_EMPREITADA_INSTALACAO_3_11 | Bens fornecidos e instalados (empreitada/serviço); quando conta a entrega | DL 84/2021, art. 3.º, n.º 1, al. b); art. 11.º, n.º 2 | Conformidade | O regime da conformidade aplica-se, com adaptações, a bens fornecidos em empreitada ou prestação de serviços; com instalação por conta do profissional, o bem só se considera entregue com a instalação concluída | Contrato/orçamento de fornecimento e instalação; data de conclusão (ou falta dela) | Contagem correta dos prazos; aplicação do regime da conformidade | fornecimento e instalação, empreitada, instalação concluída, entrega |
| GAR_RECUSA_PAGAMENTO_15_7 | Cobrança com o bem não conforme / instalação por concluir | DL 84/2021, art. 15.º, n.os 7 e 8 | Cobrança | O consumidor pode recusar o pagamento do remanescente do preço até o profissional cumprir; não abrange prestações já em mora | Plano de pagamentos; faturas; prova da falta de conformidade ou da instalação por concluir | Suspensão da cobrança do remanescente até à reposição | pagar antes, cobrança, remanescente, reter pagamento |
| GAR_COMERCIAL_43 | Garantia do fabricante/instalador (ex.: 10–25 anos, desempenho) | DL 84/2021, art. 43.º | Garantia | A garantia comercial vincula nos termos da declaração **e da publicidade**; havendo diferença, valem as condições mais favoráveis | Declaração de garantia; publicidade; ficha técnica | Cumprimento da garantia comercial | garantia do fabricante, garantia de desempenho, 25 anos, garantia comercial |
| GAR_PRODUTOR_DIRETO_40 | Vendedor/instalador não resolve ou deixou de existir | DL 84/2021, art. 40.º | Garantia | O consumidor pode exigir diretamente do produtor a reparação ou substituição, salvo as oposições do n.º 2 | Fatura; marca/modelo; comunicações sem resposta do vendedor | Reparação/substituição pelo produtor | fabricante, marca, instalador fechou, produtor |
| CONS_REPARACAO_DANOS_12 | Danos na casa durante a instalação | Lei 24/96, art. 12.º, n.º 1 | Danos (categoria nova) | Direito à indemnização dos danos patrimoniais e não patrimoniais resultantes do fornecimento de bens ou serviços defeituosos | Fotografias com data; orçamentos de reparação; comunicações; relatório técnico | Reparação dos danos ou indemnização | infiltração, telhado, danos, estragos |
| CONS_QUALIDADE_4 **[a confirmar texto]** | Serviço contratado não prestado (ex.: tratar do registo) | Lei 24/96, art. 4.º | Qualidade do serviço | Bens e serviços devem ser aptos aos fins a que se destinam e produzir os efeitos que se lhes atribuem (redação a confirmar) | Contrato/proposta com o serviço incluído; prova da falta | Prestação do serviço ou reparação | serviço incluído, não tratou, legalização |
| CRED_COLIGADO_18 **[a confirmar]** | Sistema financiado: o que acontece ao crédito se a compra cair | DL 133/2009, art. 18.º (e transposição da Dir. 2023/2225) | Cobrança | A confirmar pela advogada | Contrato de crédito; contrato de fornecimento | A confirmar | financiamento, crédito, prestações |
| DIST_FORA_ESTAB_FORMA_9 **[a confirmar]** | Contrato assinado em casa sem cópia/forma | DL 24/2014, art. 9.º | Livre resolução | A confirmar | Contrato e cópia entregue | A confirmar | porta a porta, cópia do contrato |

**Não criar** (já existem e chegam se a seleção for corrigida): instalação incorreta, conformidade, direitos do art. 15.º, reparação, resolução e reembolso, entrega, livre resolução (incluindo 30 dias no domicílio), práticas comerciais, cláusulas contratuais gerais, pagamentos, Livro de Reclamações e RAL.

**Adaptações de texto a ponderar (exigem nova revisão — o trigger retira a revisão ao alterar `condicoes_aplicabilidade`):** acrescentar às condições das COMPRA_ de conformidade/garantia "ou bens fornecidos e instalados no âmbito de empreitada ou prestação de serviços (art. 3.º, n.º 1, al. b))". Alternativa sem reabrir revisões: a regra nova GAR_EMPREITADA_INSTALACAO_3_11 enviada ao lado delas. Recomendo a alternativa para a v1 e a adaptação na próxima revisão das regras de Compras.

---

## F. Cenários de teste

"Hoje" = resultado real do seletor (tipo de problema mais provável em Energia). "Deveria" = conjunto juridicamente adequado.

| Caso | Hoje (Energia) | Deveria | Lacunas |
|---|---|---|---|
| **A** Instalação incorreta, quase não produz | "Corte ou falha de serviço": cortes, RQS, SPE_PREAVISO_CORTE_20D… — **nenhuma de conformidade** | COMPRA_INSTALACAO_INCORRETA_9, COMPRA_CONFORMIDADE_5_7, COMPRA_DIREITOS_CONFORMIDADE_15, COMPRA_REPARACAO_REGRAS_18, GAR_REPARACAO_30D_18, GAR_ONUS_2ANOS_13, GAR_BEM_3ANOS_12, GAR_EMPREITADA_INSTALACAO_3_11, PCD_ACAO_ENGANOSA_7 (se produção prometida), UPAC_INSTALADOR_84 | Seleção; regra de âmbito/entrega |
| **B** Equipamento entregue, instalação nunca concluída | "Outro": 12 ENE_ de fornecimento | COMPRA_ENTREGA_PRAZO_11, COMPRA_ENTREGA_REEMBOLSO_11, GAR_EMPREITADA_INSTALACAO_3_11, GAR_RECUSA_PAGAMENTO_15_7, COMPRA_LR_BENS_INICIO_10 (se fora do estabelecimento e ainda em prazo), CCG_* | Seleção; art. 11.º, n.º 2; art. 15.º, n.º 7 |
| **C** Promessas ≠ contrato/instalado | "Outro" ou "Cobrança indevida": nenhuma PCD_ (só chegariam por "sempre", cortadas pelo limite) | PCD_ACAO_ENGANOSA_7, PCD_OMISSAO_9, PCD_DIREITOS_14, COMPRA_CONFORMIDADE_5_7 (declarações públicas), GAR_COMERCIAL_43, DIST_INFO_PRE_4, CCG_COMUNICACAO_5_8 | Seleção; art. 43.º |
| **D** Avaria na garantia, empresa não resolve | "Corte ou falha de serviço"/"Outro": nenhuma GAR_ | GAR_*, COMPRA_DIREITOS_CONFORMIDADE_15, COMPRA_COMUNICACAO_PRAZOS_12_17, COMPRA_REPARACAO_REGRAS_18, COMPRA_RESOLUCAO_REEMBOLSO_20, GAR_PRODUTOR_DIRETO_40, GAR_COMERCIAL_43 | Seleção; arts. 40.º e 43.º |
| **E** Contrato em casa, quer cancelar | "Cancelamento recusado": 6 ENE_ + 6 CCG_ — **DIST_LIVRE_RESOLUCAO cortada pelo limite**; nenhuma regra com os 30 dias | DIST_LIVRE_RESOLUCAO, COMPRA_LR_BENS_INICIO_10 (30 dias no domicílio; 12 meses sem informação), DIST_INFO_PRE_4, DIST_EXCECOES_17, DIST_SERVICO_15, DIST_REEMBOLSO_12 / COMPRA_LR_REEMBOLSO_BENS_12, COMPRA_LR_DEVOLUCAO_13_14, PCD_AGRESSIVA_11, CRED_COLIGADO_18 | Seleção; crédito coligado e forma (a confirmar) |
| **F** Empresa assumiu o registo UPAC e falhou | "Outro": 12 ENE_ de fornecimento | UPAC_CONTROLO_PREVIO_11_81, UPAC_CERTIFICADO_EXPLORACAO_81A, UPAC_INSTALADOR_84, UPAC_DIREITOS_DEVERES_88, CONS_QUALIDADE_4 **[a confirmar]**, CCG_* (cláusula de "legalização") | **Base jurídica inexistente** + seleção |
| **G** Cobrado sem sistema operacional | "Cobrança indevida": 8 ENE_ de faturação/caução + 3 RQS + CONS_NAO_SOLICITADO_9 | GAR_RECUSA_PAGAMENTO_15_7, GAR_EMPREITADA_INSTALACAO_3_11, COMPRA_ENTREGA_PRAZO_11, PAY_* (débitos), CCG_ALT_UNILATERAL_22, CRED_COLIGADO_18 | Seleção; art. 15.º, n.º 7 |

---

## G. Alterações técnicas necessárias

| Nível | Necessário? | O quê |
|---|---|---|
| Nenhuma alteração | **Não chega** | Com a seleção atual, mesmo criando as regras novas em Energia, as do DL 84/2021 (Compras) continuam a não chegar e as de fornecimento continuam a ocupar os lugares |
| **Pequena alteração de seleção** | **Sim** | Em `src/lib/rascunhoIA/regras.ts`, um **perfil por tipo de problema** (o ficheiro já prevê "outra função com a mesma assinatura"): (1) categorias por ordem de prioridade; (2) setores adicionais de onde também se aceitam regras (aqui, "Compras & Reembolsos"); (3) para os tipos solares, das regras de Energia só a categoria "Autoconsumo" (e, se validado, ENE_SERVICOS_ADICIONAIS_17); (4) excluir regras da Lei 23/96; (5) limite próprio (~18) e ordenação pela prioridade da categoria, não alfabética. Os restantes tipos de problema ficam exatamente como hoje (teste de não regressão) |
| **Nova categoria/subsetor** | **Sim, sem schema** | Categoria "Autoconsumo" (e "Danos") nas regras — `categoria` é texto livre. Tipos de problema novos em Energia (`PROBLEMAS_POR_SETOR`, rótulos pt/en, Simulador se usar as mesmas opções). **Não é preciso campo `subsector`**: `problema_tipo` já é o subtipo e não tem `check` na BD |
| Alteração estrutural | **Não** | Não é preciso `setor` múltiplo (`text[]`), nem seleção por palavras-chave/IA, nem migration de schema |

Protótipo (no scratchpad, não no repositório) com o perfil proposto e as regras novas, limite 18:

- *Instalação, avaria ou garantia* → COMPRA_CONFORMIDADE_5_7, COMPRA_DIREITOS_CONFORMIDADE_15, COMPRA_INSTALACAO_INCORRETA_9, COMPRA_REJEICAO_30D_16, GAR_EMPREITADA_INSTALACAO_3_11, COMPRA_COMUNICACAO_PRAZOS_12_17, COMPRA_REPARACAO_REGRAS_18, GAR_BEM_3ANOS_12, GAR_ONUS_2ANOS_13, GAR_PRODUTOR_DIRETO_40, GAR_REPARACAO_30D_18, COMPRA_ENTREGA_PRAZO_11, …, GAR_RECUSA_PAGAMENTO_15_7, COMPRA_ENTREGA_REEMBOLSO_11 (A, B, D, G cobertos; danos e COMPRA_RESOLUCAO_REEMBOLSO_20 ficam no limite — afinar a ordem).
- *Contrato, cancelamento ou promessas* → livre resolução completa (incluindo DIST_LIVRE_RESOLUCAO e COMPRA_LR_BENS_INICIO_10), CCG_, DIST_INFO_PRE_4, DIST_TELEFONE_5, PCD_ACAO_ENGANOSA_7, PCD_AGRESSIVA_11, PCD_DIREITOS_14 (C, E cobertos).
- *Registo UPAC ou ligação à rede* → as 5 UPAC_, CONS_QUALIDADE_4, CCG_, DIST_INFO_PRE_4 (F coberto).

Observação lateral (não bloqueia): há pares gerais/Compras que dizem quase o mesmo e ocupam dois lugares (DIST_LIVRE_RESOLUCAO × COMPRA_LR_BENS_INICIO_10; DIST_REEMBOLSO_12 × COMPRA_LR_REEMBOLSO_BENS_12; GAR_REPARACAO_30D_18 × COMPRA_REPARACAO_REGRAS_18). Consolidar numa revisão futura.

---

## H. Recomendação final — conjunto mínimo para ativar Energia Solar / Autoconsumo

1. **Tipos de problema** em Energia (só código e textos pt/en; sem migration): "Painéis solares: instalação, avaria ou garantia", "Painéis solares: contrato, cancelamento ou promessas", "Painéis solares: registo ou ligação à rede". Três e não um, porque o limite de regras por pedido não comporta conformidade + livre resolução + práticas comerciais + UPAC no mesmo pedido.
2. **Perfil de seleção** para estes tipos (secção G) + testes: cada cenário A–G recebe as regras-chave; nenhum recebe `SPE_*` nem ENE_ de fornecimento; tipos existentes sem regressão.
3. **5 regras UPAC_** (DL 15/2022 na redação do DL 130/2026), `setor = 'Energia'`, `categoria = 'Autoconsumo'`, com `em_vigor_desde` confirmado.
4. **4 regras gerais do DL 84/2021 + 1 da Lei 24/96:** GAR_EMPREITADA_INSTALACAO_3_11, GAR_RECUSA_PAGAMENTO_15_7, GAR_COMERCIAL_43, GAR_PRODUTOR_DIRETO_40, CONS_REPARACAO_DANOS_12.
5. **Reutilizar sem alterar** todas as COMPRA_ de conformidade/garantia/entrega/livre resolução, DIST_, PCD_, CCG_, PAY_, GAR_ existentes.
6. **Antes de ligar, com a advogada:** (a) qualificação "fornecimento e instalação" como empreitada de consumo com o DL 84/2021 aplicável e prazo de 3 anos (vs. regime de imóveis); (b) produção de efeitos do DL 130/2026 e conteúdo da Lei 29/2026; (c) crédito coligado (DL 133/2009 + Dir. 2023/2225) e DL 24/2014 art. 9.º — podem entrar numa segunda vaga; (d) se a venda de UPAC pelo comercializador cabe em ENE_SERVICOS_ADICIONAIS_17; (e) se os Termos (secção 2: "contratos de… energia" e "compras de bens, incluindo… garantias") já cobrem estes casos sem nova versão.

Com 1–5 e a validação de 6(a)–(b), os casos A, B, C, D, E e G ficam cobertos sobretudo com regras que já existem; o F é o único que depende inteiramente de base jurídica nova.

---

### Fontes consultadas

- [DL 84/2021 — texto publicado no Diário da República](https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301) (arts. 2.º, 3.º, 9.º, 11.º, 15.º, 19.º–23.º, 40.º, 43.º)
- [DL 15/2022 — versão consolidada (PGDL)](https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=3536&tabela=leis) (arts. 11.º, 81.º–88.º, 95.º, 96.º; lista de alterações até ao DL 130/2026)
- [Lei 24/96 — versão consolidada (PGDL)](https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=726A0012&nid=726&tabela=leis&pagina=1&ficha=1&so_miolo=&nversao=) (art. 12.º)
- [Garrigues — alterações do DL 109-G/2021 (30 dias)](https://www.garrigues.com/pt/pt-PT/news/importantes-novidades-legais-defesa-dos-consumidores-sancoes-utilizacao-clausulas-abusivas)
- [ERSE — Regulamento do Autoconsumo](https://www.erse.pt/atividade/regulamentos-eletricidade/autoconsumo/)
- [Guia Explicativo do Autoconsumo (Poupa Energia/ADENE)](https://poupaenergia.pt/wp-content/uploads/2025/07/Guia_Explicativo_do_Autoconsumo.pdf)
- [JP Solar Solutions — UPAC em 2026](https://www.jpsolarsolutions.pt/upac-2026-registo-licenciamento-e-o-que-muda-com-a-potencia/) (fonte não oficial; usada só para sinalizar o DL 130/2026, depois confirmado na PGDL)
