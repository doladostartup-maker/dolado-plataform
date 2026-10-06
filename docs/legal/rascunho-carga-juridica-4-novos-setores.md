# Carga jurídica 4 — Gás, Compras & Reembolsos, Ginásios (relatório de validação)

Rascunho de 06/10/2026. Todas as regras entram com `ativa = false`, `revista_em = null` e `revista_por = null`, para revisão por Thiago/advogada.

**Estado (06/10/2026, depois das decisões de Thiago):** carga criada em `supabase/migrations/20261006140000_regras_juridicas_carga4.sql` (**45 regras**: 21 Gás, 15 Compras & Reembolsos, 7 Ginásios, 2 gerais), precedida de `20261006130000_regras_juridicas_colunas_producao.sql` (reconciliação do schema). Por aplicar em produção (`supabase db push --linked`). Alterações na validação final:

- **Contagem corrigida:** o relatório inicial dizia 20 regras de Gás / 44 no total; a lista sempre teve **21** de Gás (erro de contagem, nenhuma regra acrescentada). Total: 45.
- **`GAS_CORTE_PREAVISO_79`:** retirada a frase sobre o n.º 7 do art. 79.º (5 dias úteis "para os restantes") e o n.º 7 da lista de artigos — era interpretação, não redação; fica a dúvida 2 da secção 6.
- **Regras de apoio à análise:** a cautela ("necessita de análise concreta"; nas `GIN_CCG_*`, "não permite concluir que a cláusula é ilegal") passou também para o `resumo`, porque a IA recebe título, diploma, artigo, resumo e condições — não recebe `efeito_juridico`.
- **Gás:** todas as condições distinguem gás natural, GPL canalizado (só depois de confirmado o regime) e gás de garrafa (não aplicar), e pedem confirmação na revisão porque o formulário não distingue o tipo de gás.
- **Decisões aplicadas no código:** `isServicoPublicoEssencial()` (lista positiva) e exclusão das regras da Lei 23/96 fora desses setores; "Mudança de comercializador" e "Tarifa social" como tipos de problema só de Energia e Gás; formulário de regras do backoffice com as categorias reais das regras.
- **Reposição da revisão:** confirmado no dump de produção — **não existe** trigger nem função que limpe `revista_em`/`ativa` quando uma regra é alterada (só `set_updated_at`). Não alterado nesta carga.

Cada regra abaixo foi escrita a partir do texto oficial lido nesta data (DRE, ERSE). Onde a norma usa conceitos indeterminados, a regra está marcada **apoio à análise humana** e o efeito jurídico não conclui.

---

## 1. Auditoria da base existente

### 1.1 Estado da tabela em produção (lida em modo só de leitura, 06/10/2026)

- **108 regras, todas ativas e revistas a 06/10/2026** por Thiago Pereira: 36 gerais (`setor = null`), 34 Água, 29 Energia, 9 Telecomunicações. Nenhuma regra de Gás, Compras & Reembolsos ou Ginásios.
- As cargas 1–3 **não estão no repositório** (foram aplicadas fora das migrations). Também não estão no repositório as colunas `efeito_juridico`, `provas_necessarias`, `resultado_pretendido` (texto) e `palavras_chave` (`text[]`), que existem em produção (já registado em memória como drift de schema).
- O constraint de `setor` já aceita `Gás`, `Compras & Reembolsos` e `Ginásios` (`20261006120000_novos_setores.sql`).
- **Reposição da revisão ao editar:** não existe no repositório nenhum trigger nem código que limpe `revista_em`/`ativa` quando uma regra é alterada (o formulário do backoffice grava o que vier no formulário). Não consigo confirmar se existe um trigger em produção (o PostgREST não o mostra). **Ponto a confirmar por Thiago** antes de alterar qualquer regra existente.

### 1.2 Como as regras chegam a um caso (`src/lib/rascunhoIA/regras.ts`)

1. Só regras `ativa`, com `revista_em`, e em vigor na data do caso.
2. Do **setor exato** do caso ou gerais (`setor = null`). **Uma regra só tem um setor** — não há forma de uma regra valer para Energia e Gás ao mesmo tempo sem a tornar geral.
3. Da categoria ligada ao tipo de problema (`CATEGORIAS_POR_PROBLEMA`) ou das categorias sempre enviadas (Reclamação, Resolução de conflitos, Prática comercial, Defesa do consumidor). "Outro" recebe todas as categorias do setor.
4. Máximo de 12 regras, primeiro as do setor.

Consequências para esta carga:

- **As 29 regras de Energia nunca chegam a um caso de Gás.** Para o Gás funcionar é necessário criar regras com `setor = 'Gás'` (ver decisão D1).
- **A seleção não sabe como o contrato foi celebrado** (loja, online, telefone, domicílio) **nem se o vendedor é profissional.** O caso guarda setor, empresa, tipo de problema, descrição e "já reclamou". Logo, garantias como "livre resolução não se aplica a compras em loja" ou "não aplicar a vendas entre particulares" ficam nas **condições da regra** (que a IA recebe e o revisor vê) e na **revisão humana obrigatória** — não na seleção. Ver decisão D3.

### 1.3 Problemas encontrados nas cargas 1–3 (não corrigidos — decisão de Thiago)

| # | Problema | Efeito | Proposta |
|---|---|---|---|
| P1 | As 8 regras `SPE_*` (Lei 23/96, serviços públicos essenciais) são gerais (`setor = null`). | Num caso de **Compras** ou **Ginásios** com "Cobrança indevida", a IA recebe `SPE_PRESCRICAO_6M`, `SPE_PAGAMENTO_10DU`, `SPE_ONUS_PROVA`… que não se aplicam a uma loja nem a um ginásio. | Excluir no seletor as regras da Lei 23/96 dos setores que não são serviços públicos essenciais (alteração pequena em `regras.ts`, com teste). Não mexe nas regras revistas. |
| P2 | `ENE_GAS_TARIFA_SOCIAL_AUTO_6` (só gás natural) está em `setor = 'Energia'`. | Chega a casos de eletricidade e nunca a casos de Gás. | Criar `GAS_TARIFA_SOCIAL_DL101` (abaixo) e, depois de aprovada, desativar a de Energia. |
| P3 | Categorias `Mudança de comercializador`, `Tarifa social`, `Caução`… não estão em `CATEGORIAS_POR_PROBLEMA`. | `ENE_MUDANCA_*`, `ENE_DIVIDA_MUDANCA_242`, as de tarifa social só chegam a casos "Outro". O mesmo aconteceria às novas de Gás. | Decisão de produto: acrescentar "Mudança de comercializador" a "Cancelamento recusado"/"Cobrança indevida" e "Tarifa social" a "Aumento de mensalidade"/"Cobrança indevida", ou manter. |
| P4 | `DIST_LIVRE_RESOLUCAO` tem `categoria = 'Contrato'`. | Não é enviada em "Devolução ou reembolso em falta" (Compras), que pede "Livre resolução", "Reembolso", "Conformidade". | Mudar a categoria para "Livre resolução" (exige nova revisão) **ou** aceitar a regra específica `COMPRA_LR_BENS_INICIO_10` abaixo. |
| P5 | `ENE_ESTIMATIVA_ESCOLHA_42` cita "n.os 4 a 8" mas não refere as regras próprias do gás (n.os 6 e 7). | Sem efeito em Gás (nunca é selecionada lá). | Coberto por `GAS_LEITURA_ESTIMATIVA_42`. |
| P6 | Com o limite de 12, um caso de Gás "Cobrança indevida" terá ~14 regras candidatas (Gás + `SPE_*` + `CONS_*`/`PCD_*` + `PAY_*`); as últimas gerais por ordem alfabética ficam de fora. | Algumas gerais deixam de ser enviadas nesses casos. | Aceitar (as do setor têm prioridade) ou rever o limite. |

---

## 2. Fontes oficiais consultadas (06/10/2026)

| Diploma | Fonte | Vigência confirmada |
|---|---|---|
| Regulamento n.º 827/2023 (RRC dos Setores Elétrico e do Gás) | Versão consolidada ERSE: https://www.erse.pt/media/cw5fdm3i/regulamento-827-2023_consolidado.pdf · DRE: https://diariodarepublica.pt/dr/detalhe/regulamento/827-2023-216305857 | Retificado pela Declaração de Retificação n.º 830/2023. **1.ª alteração: Regulamento n.º 8/2026** — só adita o n.º 4 ao art. 131.º (pontos de entrega internos de mobilidade elétrica; entra em vigor 6 meses após 06/01/2026). **Nenhum artigo usado nesta carga foi alterado.** O art. 5.º confirma que todo o capítulo das relações com clientes se aplica a contratos de eletricidade **ou de gás**. |
| Regulamento n.º 8/2026, de 6 de janeiro | https://diariodarepublica.pt/dr/detalhe/regulamento/8-2026-994000577 | Lido na íntegra (alterações ao RAC, Guia de Medição elétrico, RQS art. 2.º kk) e 102.º, RRC art. 131.º). |
| Regulamento n.º 826/2023 (RQS dos Setores Elétrico e do Gás) | Consolidado ERSE "Janeiro 2026": https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf | 1.ª alteração: Diretiva n.º 21/2024 (arts. 98.º–100.º e Anexo I); 2.ª: Regulamento n.º 8/2026 (arts. 2.º e 102.º). Arts. 60.º, 61.º, 64.º, 67.º, 88.º–90.º sem alterações. |
| Lei n.º 23/96 (serviços públicos essenciais) | https://diariodarepublica.pt/dr/legislacao-consolidada/lei/1996-34491275 | Última alteração: Lei n.º 51/2019. Art. 1.º, n.º 2, c): abrange **gás natural e GPL canalizado** — não gás de garrafa. |
| Decreto-Lei n.º 101/2011 (tarifa social do gás natural) | https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2011-149738212 | Última alteração: DL n.º 100/2020. |
| Decreto-Lei n.º 84/2021 (compra e venda de bens) | https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301 | **Sem alterações sofridas** (DRE, "Modificações"). Em vigor desde 01/01/2022, aplica-se a contratos celebrados depois dessa data (arts. 53.º e 55.º). Revogou o DL 67/2003 e os arts. 9.º-B e 9.º-C da Lei 24/96. |
| Decreto-Lei n.º 24/2014 (contratos à distância e fora do estabelecimento) | https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-73222992 | Última alteração: Lei n.º 10/2023 (em vigor a 03/04/2023). |
| Lei n.º 24/96 (defesa do consumidor) | https://diariodarepublica.pt/dr/legislacao-consolidada/lei/1996-34491075 | Última alteração: Lei n.º 28/2023. Art. 8.º na redação do DL 109-G/2021. |
| Decreto-Lei n.º 446/85 (cláusulas contratuais gerais) | https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1985-34436475 | Última alteração: DL n.º 123/2023. Arts. 19.º, 20.º, 22.º sem alterações de redação recentes (art. 19.º j) pelo DL 108/2021). |
| Lei n.º 39/2012 (instalações de fitness) | https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2012-155873811 | Última alteração: DL n.º 9/2021. Art. 19.º na redação do DL 102/2017. |
| Decreto-Lei n.º 10/2009 (seguro desportivo) | https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2009-66413575 | Só confirmada a existência da versão consolidada; **conteúdo do art. 14.º não lido** — por isso não há regra própria sobre coberturas. |

Não foram usados blogs, escritórios, DECO, sites de empresas nem jurisprudência.

---

## 3. Decisões necessárias antes da carga

- **D1 — Gás sem duplicar Energia.** A arquitetura só permite um setor por regra. Opções:
  - **A (recomendada para esta carga):** regras `GAS_*` próprias, com texto do RRC/RQS aplicado ao gás (sem as partes só de eletricidade: BTN, 1,15 kVA, tarifa social elétrica). Zero alterações de código; as 29 regras de Energia ficam intactas e revistas. Custo: quando o RRC mudar, há duas regras a atualizar (a ERSE alterou o RRC uma vez desde 2023).
  - **B (mais tarde):** tabela `regras_juridicas_setores_extra (regra_id, setor, revista_em, revista_por)` — estender uma regra de Energia ao Gás com revisão própria, sem mexer na regra. Exige mudar o seletor, o backoffice, RLS e testes.
  - **Não proposto:** tornar regras de Energia gerais (`setor = null`) — passariam a chegar a Telecomunicações, Água, Compras e Ginásios.
- **D2 — Corrigir P1** (Lei 23/96 fora de Compras e Ginásios) no seletor, com teste. Recomendado antes de ativar qualquer regra de Compras/Ginásios.
- **D3 — Forma de contratação e vendedor.** Sem esses dados no caso, a não aplicação da livre resolução a compras em loja e das regras de Compras a vendas entre particulares depende das condições + revisão humana. Recomendação a prazo (fora desta carga): perguntar no "Tratar o meu caso" de Compras/Ginásios "Como fez a compra/adesão?" (loja/presencial · online · telefone · em casa ou noutro local) e "Comprou a uma empresa ou a um particular?".
- **D4 — Onde entra a carga.** Recomendo uma **migration** (`INSERT … ON CONFLICT (codigo) DO UPDATE`, como as cargas anteriores), que começa por `alter table … add column if not exists` das quatro colunas de produção — corrige o drift e permite testar a carga na base local e no CI. Em produção as colunas já existem, por isso esse passo não altera nada. Aplicação por Thiago com `supabase db push --linked` (com `--dry-run`).

---

## 4. Regras propostas

Legenda: **Det.** = determinística (a condição verifica-se com datas/valores); **Apoio** = apoio à análise humana (conceitos indeterminados ou factos a qualificar). Todas: `ativa = false`.

Prefixo comum das **condições de Gás**: *Contrato de fornecimento de gás natural por rede, entre comercializador e cliente. Não usar para gás de garrafa; para GPL canalizado confirmar primeiro o regime aplicável (não verificado nesta carga).*

Prefixo comum das **condições de Compras (DL 84/2021)**: *Compra e venda de bem móvel entre um consumidor (pessoa singular, para uso não profissional) e um profissional (quem vende no âmbito da sua atividade); contrato celebrado a partir de 01/01/2022. Não aplicar a vendas entre particulares, animais, bens vendidos em execução judicial, nem a imóveis (regime próprio, fora desta carga).* `em_vigor_desde = 2022-01-01`.

### 4.1 Gás (`setor = 'Gás'`) — 21 regras

**GAS_FIDELIZACAO_CONTRAPARTIDA_19** · Fidelização · Contrapartida e destaque · Nova (equivale a `ENE_FIDELIZACAO_CONTRAPARTIDA_19`) · Apoio
- Diploma: Regulamento n.º 827/2023 (RRC), na redação vigente · Art. 19.º, n.os 1 a 3
- Resumo: Num contrato de fornecimento de gás, a estipulação de um período de fidelização depende da existência de uma contrapartida para o cliente associada a essa vinculação. A proposta contratual deve referir de forma expressa, separada e destacada a eventual existência do período de fidelização, a indemnização aplicável em caso de incumprimento e a duração ou a data de cessação desse período. O incumprimento deste dever é invocável pelo cliente e determina a exclusão da cláusula de fidelização do contrato.
- Condições: existe cláusula de fidelização; a proposta contratual (ou gravação/ficha) está disponível; identificar a contrapartida concreta e a forma como a fidelização, a indemnização e a duração foram apresentadas.
- Efeito: se a proposta não referiu de forma expressa, separada e destacada estes elementos, o cliente pode invocar a exclusão da cláusula de fidelização. Saber se existiu uma contrapartida e se o destaque foi suficiente exige análise humana.
- Provas: proposta contratual; ficha contratual; contrato e condições particulares; gravação da contratação, se houver; faturas com a fidelização.

**GAS_FIDELIZACAO_MAX_12M_19** · Fidelização · Duração máxima · Nova (equivale a `ENE_FIDELIZACAO_MAX_12M_19`) · Det.
- Art. 19.º, n.º 4
- Resumo: O período de fidelização acordado com consumidores num contrato de fornecimento de gás não pode ter duração superior a 12 meses.
- Condições: cliente consumidor; duração ou datas de início e fim da fidelização conhecidas.
- Efeito: uma fidelização acordada com consumidor por mais de 12 meses contraria o limite regulamentar; pode contestar-se a aplicação de encargos baseados no período que excede esse limite.
- Provas: contrato; proposta; ficha contratual; datas de início e fim da fidelização.

**GAS_FIDELIZACAO_CONDICOES_19** · Alteração contratual · Alterações durante a fidelização · Nova (equivale a `ENE_FIDELIZACAO_PRECO_19`) · Apoio
- Art. 19.º, n.os 5 e 7; art. 68.º, n.º 4
- Resumo: Enquanto estiver em vigor um período de fidelização, o comercializador não pode alterar as condições contratuais, incluindo as relativas ao preço, exceto se a alteração for do interesse do cliente e houver acordo expresso. Nos contratos com consumidores, a definição de um período de fidelização obsta à estipulação de indexação das condições de preço ou de ofertas a preços dinâmicos.
- Condições: período de fidelização em vigor à data da alteração; identificar a alteração e se houve acordo expresso do cliente.
- Efeito: uma alteração de condições durante a fidelização sem acordo expresso do cliente pode ser contestada. Saber se a alteração é "do interesse do cliente" exige análise humana.
- Provas: contrato; comunicação da alteração; faturas antes e depois; prova de eventual acordo do cliente.

**GAS_FIDELIZACAO_RENOVACAO_19** · Fidelização · Nova fidelização · Nova (equivale a `ENE_FIDELIZACAO_SEM_RENOV_AUTO_19`) · Det.
- Art. 19.º, n.º 6
- Resumo: A estipulação de um novo período de fidelização pressupõe o cumprimento dos deveres de informação do artigo 19.º e não é suscetível de renovação automática.
- Condições: terminou um período de fidelização e o comercializador considera iniciado outro; verificar se houve nova manifestação de vontade com a informação exigida.
- Efeito: um novo período de fidelização não pode resultar apenas da renovação automática do contrato.
- Provas: contrato inicial; data de fim da fidelização anterior; comunicações de renovação; eventual nova aceitação.

**GAS_FIDELIZACAO_INDEMNIZACAO_19** · Fidelização · Indemnização e informação na fatura · **Nova (não existe nem em Energia)** · Apoio (valor) / Det. (fatura)
- Art. 19.º, n.os 9 a 11
- Resumo: O incumprimento da cláusula de fidelização pelo cliente obriga-o a indemnizar o comercializador nos termos contratuais. Essa indemnização deve ser proporcionada e não pode exceder as perdas económicas diretas resultantes da cessação do contrato, incluindo os custos de investimentos ou serviços agrupados já prestados no âmbito do contrato. A fatura deve incluir a data do termo do período de fidelização.
- Condições: fidelização válida em vigor; cessação antecipada pelo cliente; valor exigido e respetiva justificação conhecidos.
- Efeito: permite pedir a justificação do valor e contestar uma indemnização que exceda as perdas económicas diretas; a fatura sem a data do termo da fidelização não cumpre o artigo. A proporcionalidade do valor exige análise humana.
- Provas: contrato; cálculo da indemnização; fatura final; faturas anteriores (data do termo).
- Nota: os n.os 9 a 11 também faltam na base de Energia; pode criar-se `ENE_FIDELIZACAO_INDEMNIZACAO_19` igual, se Thiago quiser.

**GAS_DENUNCIA_SEM_ENCARGOS_81** · Cancelamento · Denúncia pelo cliente e oposição do comercializador · **Nova (não existe em Energia)** · Det.
- Art. 81.º, n.º 1, alínea b), e n.os 2 a 4
- Resumo: O cliente pode denunciar o contrato de fornecimento ou opor-se à sua renovação a todo o tempo, sem encargos, salvo se estiver vigente um período de fidelização. O comercializador não pode denunciar o contrato durante a sua vigência, sem prejuízo do artigo 19.º. Nos contratos com consumidores, o comercializador só pode opor-se à renovação se tiverem ocorrido pelo menos três incumprimentos de pagamento tempestivo nos doze meses anteriores ou se pretender cessar a atividade ou não celebrar de forma generalizada novos contratos, com pré-aviso mínimo de 45 dias e indicação expressa de que, sem nova contratação, haverá interrupção do fornecimento.
- Condições: identificar se existe fidelização em vigor; quem pôs termo ao contrato; datas e pré-aviso.
- Efeito: fora de um período de fidelização, a denúncia pelo cliente não pode gerar encargos; a oposição à renovação pelo comercializador fora destes casos ou sem o pré-aviso pode ser contestada.
- Provas: contrato; pedido de denúncia e data; comunicação do comercializador; faturas com encargos de cessação.

**GAS_ALT_CONTRATO_68** · Alteração contratual · Aviso de 30 dias · Nova (equivale a `ENE_ALT_CONTRATO_68`) · Det. (prazo) / Apoio (fundamentação)
- Art. 68.º, n.os 1 a 3 e 5
- Resumo: No fim de cada período contratual o comercializador pode propor a alteração das condições para o período seguinte; durante um período contratual, com consumidores, só pode propô-la de forma fundamentada e quando o contrato o preveja. As novas condições devem ser enviadas com antecedência mínima de 30 dias, com indicação expressa do direito do cliente a denunciar o contrato ou a opor-se à renovação, sem encargos, se não as aceitar. Existindo previsão contratual expressa, variações de preço que decorram apenas da alteração das tarifas de acesso às redes ou das tarifas do comercializador de último recurso aprovadas pela ERSE podem ser comunicadas na primeira fatura que as aplique.
- Condições: alteração por iniciativa do comercializador; data da comunicação e data de aplicação; verificar se é a exceção do n.º 5.
- Efeito: alteração aplicada sem os 30 dias ou sem a indicação do direito de sair sem encargos pode ser contestada; o cliente que não aceita pode sair sem encargos.
- Provas: comunicação da alteração; contrato; faturas antes e depois; data de receção.

**GAS_ACEITACAO_EXPRESSA_20** · Contrato · Aceitação expressa · Nova (equivale a `ENE_ACEITACAO_EXPRESSA_20`) · Det. (há ou não registo)
- Art. 20.º
- Resumo: A aceitação da proposta de fornecimento depende de declaração expressa do cliente, enquanto titular do contrato, registada em suporte duradouro. O registo deve ser conservado por três anos ou pela duração do contrato acrescida do prazo de caducidade ou prescrição, se for superior.
- Condições: o cliente contesta ter celebrado ou alterado o contrato (ex.: mudança não autorizada).
- Efeito: sem registo duradouro da declaração expressa do titular, o comercializador não demonstra a aceitação; há fundamento para contestar a contratação.
- Provas: pedido do registo da aceitação; contrato; gravação; confirmações recebidas.

**GAS_CAUCAO_23_27** · Cobrança · Caução · Nova (equivale a `ENE_CAUCAO_CONSUMIDOR_23` + `ENE_CAUCAO_RESTITUICAO_27`) · Det.
- Arts. 23.º, n.os 1, 2, 5 e 6, e 27.º
- Resumo: Se o cliente for consumidor, o comercializador só pode exigir caução no restabelecimento do fornecimento após interrupção por incumprimento contratual imputável ao cliente (as instalações eventuais ou provisórias têm regime próprio). O consumidor pode evitar a caução, com a dívida regularizada, optando pela transferência bancária como meio de pagamento. A caução é restituída sem pedido no fim do contrato, atualizada pelo índice de preços no consumidor e deduzidos os montantes em dívida; é também restituída se o cliente passar a pagar por transferência bancária ou cumprir continuadamente durante dois anos.
- Condições: cliente consumidor; motivo da exigência; existência de interrupção e restabelecimento; data de cessação ou histórico de pagamentos.
- Efeito: caução exigida a consumidor fora desta situação é contestável; a não restituição nos casos indicados é contestável.
- Provas: pedido de caução; comprovativo do valor; histórico de interrupções e pagamentos; fatura final.

**GAS_LEITURA_ESTIMATIVA_42** · Faturação · Leituras e estimativas no gás · Nova (equivale a `ENE_LEITURA_REAL_PREVALECE_42` + `ENE_ESTIMATIVA_ESCOLHA_42`, com as regras próprias do gás) · Apoio
- Art. 42.º, n.os 3 a 7
- Resumo: Na faturação de gás deve prevalecer, sempre que existente, a informação de consumo mais recente obtida por leitura direta, incluindo a comunicada pelo cliente. Para estimativas, o cliente tem direito a escolher a metodologia entre as opções do Guia de Medição, Leitura e Disponibilização de Dados, devendo o comercializador registar essa opção. As estimativas são expressas na unidade do contador, mas a faturação de gás é feita em kWh, com indicação obrigatória dos fatores de conversão quando aplicável. No setor do gás, o comercializador só pode estimar consumos para períodos não abrangidos pelos dados ou estimativas do operador de rede e usando a metodologia escolhida pelo cliente.
- Condições: fatura com consumos estimados ou acerto; leituras reais (incluindo autoleituras) e datas conhecidas.
- Efeito: pode fundamentar o recálculo de faturas baseadas em estimativa quando havia leitura real mais recente, quando a metodologia não é a escolhida ou quando faltam os fatores de conversão.
- Provas: faturas; autoleituras e comprovativo de envio; fotografia do contador; histórico de leituras; metodologia escolhida.

**GAS_FATURACAO_PERIODICIDADE_44** · Faturação · Faturação mensal e fracionamento · Nova (equivale a `ENE_FATURACAO_MENSAL_44` + `ENE_FATURA_ATRASO_FRACIONAR_44`) · Det.
- Art. 44.º
- Resumo: Salvo acordo em contrário no interesse do cliente, as faturas são mensais. Se a periodicidade acordada não for cumprida, o cliente pode pedir o pagamento fracionado em prestações mensais, considerando o período faturado, sem prejuízo da prescrição e caducidade, e o comercializador deve informá-lo previamente desse direito. Se o atraso não for imputável ao cliente, não podem acrescer juros às prestações.
- Condições: fatura que acumula um período superior ao acordado; causa do atraso.
- Efeito: direito a fracionar o valor em prestações mensais e, se o atraso não for imputável ao cliente, sem juros.
- Provas: fatura acumulada; histórico de faturas; contrato.

**GAS_FATURA_PAPEL_45** · Faturação · Fatura em papel sem custo · Nova (equivale a `ENE_FATURA_PAPEL_GRATIS_45`) · Det.
- Art. 45.º, n.º 1
- Resumo: A fatura de gás é enviada preferencialmente em suporte eletrónico, mas o cliente pode optar por recebê-la em papel, sem que daí resulte qualquer acréscimo de despesa.
- Condições: cobrança associada à fatura em papel.
- Efeito: o custo pela fatura em papel não é devido.
- Provas: fatura com o encargo; contrato; preçário.

**GAS_CORTE_PREAVISO_79** · Suspensão · Causas e pré-aviso da interrupção · Nova (equivale a `ENE_CORTE_PREAVISO_79` + `ENE_CORTE_VULNERAVEL_30D_79`) · Det. (prazos) / Apoio (causa)
- Arts. 78.º, n.º 1, e 79.º, n.os 1 a 3, 6 e 12
- Resumo: O fornecimento de gás só pode ser interrompido por facto imputável ao cliente nas situações do artigo 78.º, n.º 1 (entre outras: falta de pagamento no prazo, a pedido do comercializador; falta de caução quando exigível; impossibilidade de acesso ao contador). Salvo cedência não autorizada a terceiros e incumprimento de regras de segurança, a interrupção exige pré-aviso escrito com o motivo, os meios para a evitar, as condições e preços de restabelecimento e o dia a partir do qual pode ocorrer. Na falta de pagamento e nos restantes casos do n.º 3, a antecedência mínima é de 20 dias; para clientes economicamente vulneráveis, 30 dias.
- Condições: identificar a causa invocada, a data de envio/receção do pré-aviso, o seu conteúdo e a data da interrupção; condição de cliente economicamente vulnerável, se aplicável.
- Efeito: interrupção sem pré-aviso, com antecedência inferior ou sem os elementos obrigatórios pode ser contestada.
- Provas: pré-aviso; comprovativo de data; faturas em dívida; data efetiva do corte; prova de cliente vulnerável.
- Nota: a frase sobre o n.º 7 (prazo de agendamento) foi retirada na validação final — ver dúvida 2.

**GAS_CORTE_PRESCRICAO_78** · Suspensão · Dívida prescrita ou caducada · Nova (equivale a `ENE_CORTE_PRESCRICAO_78`) · Apoio
- Art. 78.º, n.º 2
- Resumo: A falta de pagamento não permite a interrupção do fornecimento de gás quando seja invocada a prescrição ou a caducidade, nos termos e pelos meios previstos na lei.
- Condições: a dívida invocada está abrangida por prescrição ou caducidade e estas foram invocadas.
- Efeito: impede a interrupção com base nessa dívida.
- Provas: faturas e períodos de consumo; comunicação de cobrança; invocação da prescrição; aviso de corte.

**GAS_CORTE_DIA_UTIL_79** · Suspensão · Dias em que não pode haver corte · **Nova (específica do gás)** · Det.
- Art. 79.º, n.º 11
- Resumo: Para clientes com consumo anual de gás inferior ou igual a 10 000 m³(n), a interrupção do fornecimento por facto imputável ao cliente não pode ocorrer no último dia útil da semana nem na véspera de um feriado, salvo nos casos de cedência não autorizada de gás a terceiros ou de incumprimento das regras de segurança.
- Condições: consumo anual até 10 000 m³(n); data da interrupção; causa da interrupção.
- Efeito: interrupção nesses dias, fora das duas exceções, contraria o regulamento.
- Provas: data e hora do corte; faturas com o escalão/consumo anual; pré-aviso.

**GAS_RESTABELECIMENTO_RQS_90** · Suspensão · Prazos de restabelecimento · **Nova (específica do gás)** · Det.
- Diploma: Regulamento n.º 826/2023 (RQS), na redação vigente · Arts. 88.º, n.os 3 e 4, 89.º e 90.º, n.os 1, alínea b), 2, 3 e 7
- Resumo: Depois de sanada a situação que levou à interrupção (havendo pagamentos, após boa cobrança), o comercializador deve comunicá-lo ao operador de rede no prazo máximo de 30 minutos. Se for necessária deslocação, o operador de rede de gás deve chegar à instalação em 12 horas para consumidores, 8 horas para os restantes clientes ou 4 horas se o cliente pedir e pagar o restabelecimento urgente; a contagem suspende-se das 0h00 às 8h00, exceto para clientes prioritários. Estes prazos aplicam-se quando o restabelecimento envolve ações simples. O incumprimento destes prazos confere ao cliente direito a compensação.
- Condições: situação sanada (data e hora do pagamento confirmado); data e hora do restabelecimento; tipo de cliente.
- Efeito: atraso no restabelecimento além destes prazos dá direito a compensação nos termos do RQS.
- Provas: comprovativo e hora do pagamento; comunicações; hora do restabelecimento.

**GAS_RECLAMACAO_PRAZO_RQS_60** · Reclamação · Prazo de resposta e compensação · Nova (equivale a `ENE_RECLAMACAO_PRAZO_60` + `ENE_RECLAMACAO_COMPENSACAO_61`) · Det.
- RQS, arts. 60.º e 61.º
- Resumo: O operador de rede de distribuição responde às reclamações em 15 dias úteis; o comercializador, no prazo contratual, nunca superior a 15 dias úteis (15 dias úteis para quem não é cliente). Se não puder cumprir por factos que não lhe sejam imputáveis, deve informar o reclamante, nesse prazo e por escrito, das diligências, do motivo, do prazo expectável e de um contacto. A resposta é escrita quando a reclamação foi escrita ou quando o reclamante o pede. O incumprimento destes prazos ou do conteúdo da comunicação, por facto não imputável ao reclamante, dá direito a compensação.
- Condições: data de receção da reclamação; entidade reclamada; prazo contratual; respostas recebidas.
- Efeito: falta de resposta no prazo ou sem a comunicação exigida dá direito a compensação nos termos do RQS.
- Provas: reclamação e comprovativo de receção; contrato (prazo); respostas e datas.

**GAS_RECLAM_FAT_CORTE_RQS_64** · Reclamação · Reclamação de faturação e corte · Nova (equivale a `ENE_RECLAM_FAT_SUSPENDE_CORTE_64`) · Apoio
- RQS, art. 64.º, n.os 1 a 4
- Resumo: Numa reclamação de faturação, o comercializador deve, no prazo de resposta, esclarecer os valores faturados e as leituras e dar o resultado, ou propor reunião ou contacto telefónico. A reclamação de faturação suspende eventuais ordens de interrupção por falta de pagamento da fatura reclamada até à sua apreciação (e, se for pedida a intervenção da ERSE, até à resposta desta), desde que acompanhada de informações concretas e objetivas que evidenciem a possibilidade de erro, sem prejuízo do pagamento atempado dos valores não reclamados.
- Condições: reclamação sobre a faturação com elementos concretos de possível erro; ordem ou aviso de interrupção relacionado com a fatura reclamada.
- Efeito: suspende a interrupção relativa à fatura reclamada enquanto a reclamação é apreciada. Saber se a reclamação tem "informações concretas e objetivas" exige análise humana.
- Provas: reclamação; fatura; leituras; aviso de corte; pagamentos dos valores não reclamados.

**GAS_RECLAM_CARACTERISTICAS_RQS_67** · Qualidade de serviço · Características do gás e pressão · **Nova (específica do gás)** · Apoio
- RQS, art. 67.º
- Resumo: A reclamação sobre as características do gás fornecido ou da pressão deve descrever factos que indiciem que estão fora das tolerâncias regulamentares. O operador de rede deve, em 15 dias úteis (contados da reclamação, ou do pedido do comercializador, que tem 3 dias úteis para o fazer), informar por escrito as razões e as ações corretivas ou verificar a instalação. Confirmando-se a não conformidade, deve informar o período de fornecimento deficiente e as ações corretivas; não se confirmando, deve descrever as diligências feitas.
- Condições: problema de pressão ou qualidade do gás; datas da reclamação e das respostas.
- Efeito: obriga o operador de rede a responder com estes conteúdos e prazos; o incumprimento dos n.os 3 e 4 dá direito a compensação (art. 61.º).
- Provas: reclamação; descrição dos factos; respostas; relatórios de visita.

**GAS_MUDANCA_COMERCIALIZADOR_242** · Mudança de comercializador · Mudança, dívidas e fatura final · Nova (equivale a `ENE_MUDANCA_GRATUITA_3S_242` + `ENE_MUDANCA_FATURA_FINAL_6S_242` + `ENE_DIVIDA_MUDANCA_242`) · Det.
- RRC, art. 242.º, n.os 3, 4, 11, 12, 13, 15 e 16
- Resumo: A mudança de comercializador de gás é isenta de encargos e deve ocorrer no prazo máximo de três semanas a contar do pedido, salvo data específica acordada com o novo comercializador. O comercializador cessante deve enviar uma única fatura com o acerto final no prazo máximo de seis semanas após a mudança. Valores em dívida a um comercializador não impedem a mudança; constitui objeção um plano de pagamento fracionado em vigor (salvo cessão de créditos, assunção da dívida ou antecipação do pagamento) e impede-a a dívida vencida e não contestada a um comercializador de último recurso.
- Condições: data do pedido e da efetivação; existência e natureza de dívida; data da fatura final.
- Efeito: encargos pela mudança, atraso além de três semanas, bloqueio fora das objeções previstas ou fatura final fora de prazo são contestáveis.
- Provas: pedido de mudança; comunicações dos comercializadores; fatura final; plano de pagamentos, se houver.
- Nota: a categoria "Mudança de comercializador" só é enviada em casos "Outro" (problema P3).

**GAS_TARIFA_SOCIAL_DL101** · Tarifa social · Tarifa social do gás natural · Nova (substitui, depois de aprovada, `ENE_GAS_TARIFA_SOCIAL_AUTO_6` — problema P2) · Apoio
- Diploma: Decreto-Lei n.º 101/2011, de 30 de setembro, na redação vigente · Arts. 2.º, 5.º e 6.º
- Resumo: Podem beneficiar da tarifa social do gás natural os clientes finais economicamente vulneráveis (entre outros, beneficiários do complemento solidário para idosos, do rendimento social de inserção, de prestações de desemprego, do 1.º escalão do abono de família ou da pensão social de invalidez / complemento da prestação social para a inclusão) que sejam titulares do contrato, usem o gás exclusivamente para uso doméstico em habitação permanente, estejam em baixa pressão e no escalão de consumo anual até 500 m³, num único ponto de ligação. A identificação é feita pela DGEG com a segurança social e a tarifa é atribuída automaticamente se o beneficiário não se opuser em 30 dias; o beneficiário pode também apresentar ao comercializador o comprovativo da prestação.
- Condições: gás natural (não GPL); todas as condições do art. 5.º; prestação social do art. 2.º, n.º 2.
- Efeito: o cliente elegível tem direito à aplicação da tarifa social; pode apresentar o comprovativo ao comercializador.
- Provas: contrato; faturas (escalão, pressão); comprovativo da prestação social; comunicações da DGEG/comercializador.

**Regras de Energia não reutilizadas para Gás** (só eletricidade): `ENE_ELEC_REDUCAO_ANTES_CORTE_78` (BTN, 1,15 kVA), `ENE_ELEC_TARIFA_SOCIAL_AUTO_201`.
**Não reproduzidas nesta carga** (texto não relido hoje): `ENE_DADOS_CONSUMO_41`, `ENE_CHAMADA_GRAVADA_243`, `ENE_QUALIDADE_COMPENSACAO_104`, `ENE_SERVICOS_ADICIONAIS_17` (lido, mas de menor utilidade — pode entrar depois).
**Gerais já existentes que servem o Gás** (Lei 23/96 abrange gás natural e GPL canalizado): `SPE_*` (8), `LRE_RESPOSTA_15DU`, `RAL_*`, `CCG_*`, `CONS_*`, `PCD_*`, `DIST_*`, `PAY_*`.

### 4.2 Compras & Reembolsos (`setor = 'Compras & Reembolsos'`) — 15 regras

**COMPRA_CONFORMIDADE_5_7** · Conformidade · Requisitos de conformidade · Nova · Apoio
- Diploma: Decreto-Lei n.º 84/2021, de 18 de outubro · Arts. 5.º a 7.º
- Resumo: O profissional deve entregar bens conformes. São conformes os bens que correspondem à descrição, tipo, quantidade e qualidade previstos no contrato, servem a finalidade específica acordada e vêm com os acessórios, instruções e atualizações estipulados. Devem ainda ser adequados ao uso habitual de bens do mesmo tipo, corresponder à amostra ou modelo apresentado e ter a quantidade, qualidades, durabilidade, funcionalidade e segurança habituais e expectáveis, atendendo também a declarações públicas do profissional ou do produtor (publicidade, rotulagem), salvo as exceções do art. 7.º, n.º 2. Não há falta de conformidade se o consumidor foi inequivocamente informado, na celebração, de que uma característica se desviava e aceitou esse desvio de forma separada, expressa e inequívoca.
- Condições: prefixo Compras; identificar o requisito concreto alegadamente não cumprido (incluindo "produto diferente do encomendado").
- Efeito: se houver falta de conformidade, o consumidor tem os direitos do art. 15.º. Qualificar a falta de conformidade exige análise humana.
- Provas: fatura/recibo; confirmação da encomenda; descrição/anúncio do produto; fotografias; comunicações com o vendedor.

**COMPRA_INSTALACAO_INCORRETA_9** · Conformidade · Instalação incorreta · Nova · Apoio
- Art. 9.º
- Resumo: Há falta de conformidade quando resulta de instalação incorreta assegurada pelo profissional ou feita sob a sua responsabilidade, ou, quando feita pelo consumidor, se a instalação incorreta se dever a deficiências nas instruções fornecidas pelo profissional.
- Condições: prefixo Compras; quem instalou; instruções fornecidas.
- Efeito: a instalação incorreta nestas condições é tratada como falta de conformidade.
- Provas: fatura com o serviço de instalação; instruções; fotografias; relatório técnico.

**COMPRA_ENTREGA_PRAZO_11** · Entrega · Prazo de entrega e resolução por atraso · Nova · Det. (datas) / Apoio (prazo essencial)
- Art. 11.º, n.os 4 a 8 e 11
- Resumo: O profissional deve entregar os bens na data ou no período especificado pelo consumidor, salvo convenção em contrário; sem data fixada, sem demora injustificada e até 30 dias após a celebração do contrato. Se não entregar no prazo, o consumidor pode pedir a entrega num prazo adicional adequado e, se este não for cumprido, resolver o contrato. Pode resolver de imediato, sem prazo adicional, se o profissional recusar entregar, se o prazo era essencial atendendo às circunstâncias, ou se o consumidor tinha informado antes da celebração de que a data era essencial. Cabe ao profissional provar o cumprimento destas obrigações.
- Condições: prefixo Compras; data do contrato; data ou prazo acordado; data de entrega (ou falta dela); pedido de prazo adicional.
- Efeito: atraso dá direito a fixar prazo adicional e, sem entrega, a resolver o contrato; resolução imediata só nos três casos indicados. Se o prazo era "essencial" exige análise humana.
- Provas: confirmação da encomenda (data, prazo); comunicações; pedido de prazo adicional; tracking; declaração de resolução.

**COMPRA_ENTREGA_REEMBOLSO_11** · Reembolso · Reembolso após resolução por falta de entrega · Nova · Det.
- Art. 11.º, n.os 9 a 11
- Resumo: Resolvido o contrato por falta de entrega, o profissional deve restituir a totalidade do montante pago até 14 dias após a resolução. Se não o fizer, o consumidor tem direito à devolução em dobro do montante pago, sem prejuízo de indemnização por danos patrimoniais e não patrimoniais.
- Condições: resolução válida nos termos do art. 11.º; data da resolução; reembolso (ou falta dele).
- Efeito: reembolso integral em 14 dias; passado o prazo, direito à devolução em dobro.
- Provas: declaração de resolução e data; comprovativo do pagamento; extratos.

**COMPRA_RISCO_TRANSPORTE_11** · Entrega · Entrega e risco no transporte · Nova · Det.
- Art. 11.º, n.os 1, 12 e 13
- Resumo: O bem considera-se entregue quando o consumidor, ou um terceiro por ele indicado que não seja o transportador, adquire a posse física do bem. Quando o profissional envia os bens, o risco de perda ou dano só passa para o consumidor nesse momento. Se o consumidor confiou o transporte a pessoa diferente da proposta pelo profissional, o risco passa com a entrega ao transportador.
- Condições: prefixo Compras; quem escolheu o transportador; se e quando houve posse física.
- Efeito: encomenda perdida ou danificada no transporte escolhido pelo profissional, antes da posse física, continua a ser responsabilidade do profissional; o consumidor reclama ao vendedor, não ao transportador.
- Provas: confirmação da encomenda (modo de envio); tracking; fotografias da embalagem e do bem; comunicações com o vendedor.

**COMPRA_DIREITOS_CONFORMIDADE_15** · Conformidade · Reparação, substituição, redução e resolução · Nova · Apoio
- Arts. 15.º e 19.º
- Resumo: Perante falta de conformidade, o consumidor tem direito à reposição da conformidade (reparação ou substituição), à redução proporcional do preço ou à resolução do contrato, nas condições da lei. Escolhe entre reparação e substituição, salvo se a escolhida for impossível ou impuser custos desproporcionados face à outra; o profissional pode recusar ambas se forem impossíveis ou desproporcionadas. Só pode escolher entre redução do preço e resolução se o profissional não reparou nem substituiu (ou não o fez nos termos do art. 18.º), recusou, declarou ou é evidente que não o fará em prazo razoável ou sem grave inconveniente, se a falta reapareceu ou surgiu nova falta, ou se a gravidade justificar a redução ou resolução imediata. Não há resolução se o profissional provar que a falta de conformidade é mínima. A redução é proporcional à diminuição do valor.
- Condições: prefixo Compras; falta de conformidade; histórico de pedidos e respostas.
- Efeito: identifica o direito exercível na fase em que o caso está. **Não há livre escolha entre os quatro direitos.** Desproporção, gravidade, prazo razoável e "falta mínima" exigem análise humana.
- Provas: fatura; prova da falta de conformidade; pedidos ao vendedor e respostas; relatórios de reparação.

**COMPRA_REJEICAO_30D_16** · Conformidade · Direito de rejeição (30 dias) · Nova · Det. (prazo) / Apoio (falta de conformidade)
- Art. 16.º
- Resumo: Se a falta de conformidade se manifestar no prazo de 30 dias após a entrega do bem, o consumidor pode pedir a imediata substituição do bem ou a resolução do contrato.
- Condições: prefixo Compras; existe falta de conformidade; manifestou-se até 30 dias após a entrega. **Não confundir com a livre resolução de compras à distância** (que não exige defeito) — este direito exige falta de conformidade e vale também para compras em loja.
- Efeito: nesse período, o consumidor pode pedir logo a substituição ou a resolução, sem passar primeiro pela reparação.
- Provas: data de entrega; data em que o defeito surgiu e foi comunicado; prova do defeito.

**COMPRA_REPARACAO_REGRAS_18** · Garantia · Regras da reparação e substituição · Nova (complementa `GAR_REPARACAO_30D_18`, que cobre os n.os 2 e 3) · Det.
- Art. 18.º, n.os 1 e 4 a 7
- Resumo: Para reparação ou substituição, o consumidor disponibiliza os bens a expensas do profissional. Cada reparação dá ao bem reparado um prazo de garantia adicional de seis meses, até ao limite de quatro reparações, e o profissional deve informar disso na entrega. Se for preciso retirar um bem instalado, a remoção e a nova instalação são a cargo do profissional. Na substituição, o profissional responde pelo bem substituto nos termos do art. 12.º e não pode cobrar qualquer custo pela utilização normal do bem substituído.
- Condições: prefixo Compras; reparação ou substituição pedida ou feita.
- Efeito: custos de envio, remoção, reinstalação ou de "uso" cobrados ao consumidor são contestáveis; prazo de garantia acrescido por cada reparação.
- Provas: guias de reparação; datas; faturas de custos cobrados.

**COMPRA_RESOLUCAO_REEMBOLSO_20** · Reembolso · Resolução por falta de conformidade · Nova · Det. (prazos) / Apoio (fundamento)
- Art. 20.º
- Resumo: A resolução por falta de conformidade exerce-se por declaração ao profissional, por qualquer meio suscetível de prova. O consumidor devolve os bens a expensas do profissional; o profissional reembolsa todos os pagamentos, incluindo os custos de entrega, no prazo de 14 dias a contar da declaração, pelo mesmo meio de pagamento (salvo acordo expresso sem custos para o consumidor), podendo reter o reembolso enquanto não receber os bens ou a prova do seu envio, salvo se lhe couber recolhê-los. Se a falta respeitar só a parte dos bens, a resolução pode limitar-se a essa parte (ou abranger os adquiridos em conjunto, se não for razoável manter só os conformes).
- Condições: fundamento de resolução nos termos do art. 15.º; data da declaração; devolução ou prova de envio.
- Efeito: obrigação de reembolso integral em 14 dias e devolução a expensas do profissional.
- Provas: declaração de resolução; comprovativo de envio/devolução; comprovativo de pagamento.

**COMPRA_BENS_USADOS_12_13** · Garantia · Bens usados e recondicionados · Nova (complementa `GAR_BEM_3ANOS_12` e `GAR_ONUS_2ANOS_13`) · Det.
- Arts. 12.º, n.º 3, e 13.º, n.os 3 e 4
- Resumo: Nos bens móveis usados, e só por acordo entre as partes, o prazo de responsabilidade de três anos pode ser reduzido para 18 meses, exceto se o bem for anunciado como recondicionado (com essa menção obrigatória na fatura), caso em que se mantêm os três anos. Havendo essa redução, a presunção de que a falta de conformidade já existia na entrega vale durante um ano (em vez de dois). Depois do prazo da presunção, cabe ao consumidor provar que a falta já existia na entrega.
- Condições: prefixo Compras; bem usado ou recondicionado; existência de acordo de redução; menção na fatura.
- Efeito: sem acordo de redução, ou se anunciado como recondicionado, aplica-se o prazo normal de três anos.
- Provas: anúncio; fatura (menção "recondicionado"); contrato/condições com o acordo de redução.

**COMPRA_COMUNICACAO_PRAZOS_12_17** · Garantia · Comunicação da falta e prazos para agir · Nova · Det.
- Arts. 12.º, n.os 4 e 5, e 17.º
- Resumo: A falta de conformidade comunica-se por carta, correio eletrónico ou outro meio suscetível de prova. O prazo de responsabilidade suspende-se desde a comunicação até à reposição da conformidade, devendo o consumidor pôr o bem à disposição do profissional sem demora injustificada. Os direitos do art. 15.º caducam dois anos após a comunicação da falta de conformidade; este prazo suspende-se enquanto o bem está com o profissional para reparação ou substituição e durante a tentativa de resolução extrajudicial do litígio.
- Condições: prefixo Compras; data da comunicação; períodos de reparação; data de início da mediação/arbitragem.
- Efeito: permite calcular se o consumidor ainda está em prazo e registar que a reclamação suspende prazos.
- Provas: comunicação da falta (com data); guias de reparação; comprovativo de pedido de mediação/arbitragem.

**COMPRA_LR_BENS_INICIO_10** · Livre resolução · Prazo para bens comprados à distância · Nova (complementa `DIST_LIVRE_RESOLUCAO`, de categoria "Contrato" — problema P4) · Det. (prazo) / Apoio (forma de contratação)
- Diploma: Decreto-Lei n.º 24/2014, de 14 de fevereiro, na redação vigente · Art. 10.º, n.º 1, alínea b), e n.os 2 a 4; art. 11.º, n.os 1 a 3 e 5
- Resumo: Num contrato de compra e venda celebrado à distância ou fora do estabelecimento comercial, o consumidor pode resolvê-lo sem indicar motivo no prazo de 14 dias (30 dias em contratos celebrados no domicílio do consumidor ou durante uma deslocação organizada pelo vendedor), contados do dia em que o consumidor, ou um terceiro por ele indicado que não seja o transportador, adquire a posse física do bem; se vários bens de uma encomenda forem entregues separadamente, do último bem. Se o vendedor não informou sobre o direito de livre resolução, o prazo é prolongado por 12 meses a contar do fim do prazo inicial (ou termina 14/30 dias depois de a informação ser prestada). O direito exerce-se pelo formulário legal ou por qualquer declaração inequívoca enviada dentro do prazo; cabe ao consumidor provar que o exerceu. As partes podem acordar um prazo mais longo.
- Condições: prefixo Compras, mas **só se a compra foi à distância (online, telefone, catálogo, sem presença física simultânea) ou fora do estabelecimento**; verificar exceções (`DIST_EXCECOES_17`) e exclusões do art. 2.º, n.º 3. Não exige falta de conformidade.
- Efeito: dentro do prazo, o consumidor pode desistir da compra sem motivo, com as obrigações dos arts. 12.º a 14.º. **Não se aplica a compras presenciais na loja.**
- Provas: confirmação da encomenda; data de entrega; informação pré-contratual sobre a livre resolução; declaração de resolução e data de envio.

**COMPRA_LR_REEMBOLSO_BENS_12** · Reembolso · Reembolso na livre resolução de bens · Nova (complementa `DIST_REEMBOLSO_12`, que cobre os n.os 1 e 2) · Det.
- DL 24/2014, art. 12.º, n.os 3 a 6
- Resumo: Na livre resolução, o vendedor não tem de reembolsar os custos adicionais de entrega se o consumidor escolheu expressamente uma modalidade de entrega mais cara do que a modalidade comum e menos onerosa proposta. Salvo se se oferecer para recolher os bens, só pode reter o reembolso até os receber ou até o consumidor provar que os devolveu. Bens entregues no domicílio num contrato fora do estabelecimento que, pela natureza ou dimensão, não possam ser devolvidos por correio são recolhidos a custo do vendedor. Se não reembolsar no prazo de 14 dias, o vendedor fica obrigado a devolver em dobro, no prazo de 15 dias úteis, sem prejuízo de indemnização.
- Condições: livre resolução validamente exercida; data da declaração; data do envio dos bens; reembolso (ou falta dele).
- Efeito: retenção do reembolso para lá da prova de envio, ou reembolso fora de prazo, são contestáveis; direito à devolução em dobro.
- Provas: declaração de resolução; comprovativo de envio/devolução; extratos; comunicações.

**COMPRA_LR_DEVOLUCAO_13_14** · Livre resolução · Obrigações do consumidor ao devolver · Nova · Det. (prazos/custos) / Apoio (manipulação)
- DL 24/2014, arts. 13.º e 14.º
- Resumo: Na livre resolução, se o vendedor não se oferecer para recolher o bem, o consumidor deve devolvê-lo no prazo de 14 dias a contar da comunicação da resolução e conservá-lo de modo a poder restituí-lo em devidas condições de utilização. O custo da devolução é do consumidor, salvo se o vendedor aceitou suportá-lo ou não o informou previamente de que esse custo era seu. O consumidor pode inspecionar o bem com o cuidado habitual numa loja; só responde pela depreciação se a manipulação exceder essa, e nunca responde se não foi informado do direito de livre resolução.
- Condições: livre resolução exercida; data da comunicação e da devolução; informação prévia sobre custos de devolução e sobre o direito.
- Efeito: define quem paga a devolução e quando o vendedor pode deduzir depreciação. Saber se a manipulação excedeu a normal exige análise humana.
- Provas: comunicação de resolução; comprovativo de envio e custo; informação pré-contratual; fotografias do estado do bem.

**COMPRA_LOJA_SEM_LR_2** · Livre resolução · Compra em loja física por mudança de ideias · Nova · Apoio
- DL 24/2014, art. 2.º, n.º 1, e art. 3.º (definições de contrato à distância e fora do estabelecimento)
- Resumo: O direito de livre resolução do Decreto-Lei n.º 24/2014 aplica-se apenas a contratos celebrados à distância ou fora do estabelecimento comercial. Numa compra feita presencialmente no estabelecimento do vendedor, este regime não confere ao consumidor o direito de devolver um bem conforme apenas por ter mudado de ideias. Uma política de trocas ou devoluções da loja é uma condição comercial voluntária: pode ser invocada nos termos em que foi anunciada, mas não é um direito legal geral.
- Condições: compra presencial no estabelecimento; o bem não tem falta de conformidade (se tiver, aplicar `COMPRA_DIREITOS_CONFORMIDADE_15` / `COMPRA_REJEICAO_30D_16`). Atenção ao art. 3.º, alínea i), subalínea i): contrato celebrado na loja imediatamente após o consumidor ter sido contactado pessoal e individualmente fora dela conta como "fora do estabelecimento".
- Efeito: impede tratar a mudança de ideias numa compra em loja como direito legal de livre resolução; a política comercial anunciada é facto a provar.
- Provas: talão/fatura; política de trocas anunciada (cartaz, talão, site); circunstâncias da compra.

### 4.3 Ginásios (`setor = 'Ginásios'`) — 7 regras

Prefixo comum das **condições de Ginásios**: *Contrato entre consumidor e entidade que explora instalação de fitness (ginásio, academia, health club). Ter o contrato, as condições gerais e o regulamento interno sempre que possível.*

**GIN_INFO_CONTRATUAL_8** · Contrato · Dever de informação na adesão · Nova · Apoio
- Diploma: Lei n.º 24/96, de 31 de julho, na redação vigente · Art. 8.º, n.º 1, alíneas a), b), c), f), g), h) e l), e n.º 5
- Resumo: Na negociação e na celebração do contrato, o prestador deve informar o consumidor de forma clara, objetiva e adequada, entre outros, sobre as características principais do serviço, a sua identidade e contactos, o preço total, as modalidades de pagamento, o sistema de tratamento de reclamações e a arbitragem aplicável, o período de vigência do contrato ou, se for de duração indeterminada ou de renovação automática, as condições de denúncia ou não renovação e as respetivas consequências, incluindo o regime de contrapartidas pela cessação antecipada de contratos com períodos mínimos, e as consequências do não pagamento. O prestador que viole o dever de informar responde pelos danos que causar.
- Condições: identificar a informação concreta que faltou ou foi incorreta (ex.: período mínimo, renovação, encargo de saída) e o momento em que foi dada.
- Efeito: fundamenta o pedido de esclarecimento e a responsabilidade por danos. **Não conclui automaticamente pela nulidade** de nenhuma cláusula — para isso ver as regras de cláusulas contratuais gerais.
- Provas: contrato; condições gerais; anúncio/oferta comercial; comprovativo de adesão; comunicações.

**GIN_DIRETOR_TECNICO_4** · Qualidade do serviço · Diretor técnico e técnicos de exercício · Nova · Det. (existência/afixação) / Apoio (diligência)
- Diploma: Lei n.º 39/2012, de 28 de agosto, na redação vigente · Arts. 4.º, 8.º e 16.º
- Resumo: Cada instalação de fitness deve ter pelo menos um diretor técnico, responsável pelas atividades desportivas, e técnicos de exercício físico responsáveis pela orientação e condução do exercício. A identificação do diretor técnico e o seu horário de permanência devem estar afixados em local bem visível. O diretor técnico e os técnicos devem atuar com diligência, assegurando qualidade, segurança e defesa da saúde dos praticantes.
- Condições: instalação abrangida (não se aplica, entre outras, a instalações de hotéis reservadas a hóspedes nem a instalações recreativas sem enquadramento técnico — art. 2.º); facto concreto (falta de técnico, acidente, orientação inadequada).
- Efeito: permite pedir a identificação do diretor técnico e invocar a falta destes requisitos numa reclamação sobre funcionamento ou segurança; não regula o cancelamento do contrato.
- Provas: fotografias da receção (afixação); descrição do incidente; testemunhas; comunicações.

**GIN_SEGURO_17** · Qualidade do serviço · Seguro e afixação · Nova · Det.
- Lei n.º 39/2012, art. 17.º
- Resumo: As instalações de fitness devem dispor de seguro nos termos do artigo 14.º do Decreto-Lei n.º 10/2009, de 12 de janeiro, e a informação sobre a existência desse seguro deve estar afixada em local visível para os utentes.
- Condições: acidente ou lesão nas instalações, ou falta da informação afixada. As coberturas do seguro não estão descritas nesta regra (DL 10/2009 não analisado nesta carga).
- Efeito: permite pedir a identificação do seguro e invocar a falta de seguro ou de afixação.
- Provas: fotografias; relatório do acidente; comunicações com o ginásio.

**GIN_REGULAMENTO_INTERNO_19** · Qualidade do serviço · Regulamento interno · Nova · Det.
- Lei n.º 39/2012, art. 19.º
- Resumo: As instalações de fitness devem ter um regulamento interno elaborado pelo proprietário ou explorador, com as normas de utilização e de segurança para os utentes, assinado pelo diretor técnico (salvo se emitido pela plataforma eletrónica prevista no DL 102/2017), afixado em local visível na receção e na zona de acesso às áreas de atividade e de apoio.
- Condições: o ginásio invoca uma regra de utilização ou segurança; verificar se consta do regulamento interno e se este está afixado.
- Efeito: permite pedir o regulamento e confrontar a conduta do ginásio com ele. Regras de utilização do regulamento não substituem as cláusulas do contrato de adesão.
- Provas: regulamento interno (cópia/fotografia); contrato; comunicações.

**GIN_CCG_PRAZO_VIGENCIA_22** · Contrato · Prazo de vigência ou de denúncia possivelmente excessivo · Nova (alínea ainda não existente na base) · **Apoio — nunca concluir**
- Diploma: Decreto-Lei n.º 446/85, de 25 de outubro, na redação vigente · Arts. 20.º e 22.º, n.º 1, alínea a)
- Resumo: Nas relações com consumidores são proibidas, consoante o quadro negocial padronizado, as cláusulas contratuais gerais que prevejam prazos excessivos para a vigência do contrato ou para a sua denúncia.
- Condições: contrato de adesão com cláusulas pré-elaboradas; cláusula concreta de período mínimo, duração ou pré-aviso de denúncia identificada.
- Efeito: **possível cláusula abusiva — necessita de análise concreta.** O que é "excessivo" depende do quadro negocial; a regra dá o fundamento, não a conclusão.
- Provas: contrato e condições gerais; cláusula concreta; anúncio da oferta.

**GIN_CCG_CLAUSULA_PENAL_19** · Cancelamento · Penalização possivelmente desproporcionada · Nova · **Apoio — nunca concluir**
- DL 446/85, arts. 19.º, alínea c), e 20.º
- Resumo: São proibidas, consoante o quadro negocial padronizado, as cláusulas contratuais gerais que consagrem cláusulas penais desproporcionadas aos danos a ressarcir; esta proibição aplica-se nas relações com consumidores.
- Condições: cláusula de penalização por cessação antecipada identificada; valor exigido e forma de cálculo.
- Efeito: **possível cláusula abusiva — necessita de análise concreta** da proporção entre a penalização e os danos.
- Provas: contrato; cláusula; cálculo do valor exigido; pedido de cancelamento; extratos.

**GIN_CCG_AUMENTO_PRECO_22** · Alteração contratual · Aumentos de preço · Nova · **Apoio — nunca concluir**
- DL 446/85, art. 22.º, n.º 1, alíneas e) e f)
- Resumo: Nas relações com consumidores são proibidas, consoante o quadro negocial padronizado, as cláusulas contratuais gerais que permitam elevações de preços, em contratos de prestações sucessivas, dentro de prazos manifestamente curtos ou, para além desse limite, elevações exageradas, e as que impeçam a denúncia imediata do contrato quando as elevações de preço a justifiquem.
- Condições: aumento de mensalidade com base numa cláusula do contrato; datas e montantes.
- Efeito: **possível cláusula abusiva — necessita de análise concreta**; complementa `CCG_ALT_UNILATERAL_22` (já existente).
- Provas: contrato; cláusula; comunicação do aumento; mensalidades antes e depois.

**Gerais já existentes reutilizadas nos Ginásios:** `CCG_COMUNICACAO_5_8`, `CCG_INFORMACAO_6_8`, `CCG_AMBIGUA_11`, `CCG_BOAFE_CONSUMIDOR`, `CCG_RENOVACAO_AUTO_22`, `CCG_FORMALIDADES_22`, `CCG_ALT_UNILATERAL_22`; `DIST_INFO_PRE_4`, `DIST_CONFIRMACAO_6`, `DIST_LIVRE_RESOLUCAO`, `DIST_SERVICO_15` (pedido expresso, pagamento proporcional, sem custos sem pedido), `DIST_TELEFONE_5`; `CONS_*`, `PCD_*`, `PAY_*`, `LRE_RESPOSTA_15DU`, `RAL_*`. **Não foi criada** `GINASIO_LIVRE_RESOLUCAO_DISTANCIA`: duplicaria `DIST_LIVRE_RESOLUCAO` + `DIST_SERVICO_15`.

### 4.4 Gerais novas (`setor = null`) — 2 regras

**DIST_EXCECOES_17** · Livre resolução · Exceções ao direito de livre resolução · Nova · Det. (exceção identificada) / Apoio (qualificação)
- DL 24/2014, art. 17.º
- Resumo: Salvo acordo em contrário, não há direito de livre resolução, entre outros, em: serviços integralmente prestados após consentimento prévio e expresso do consumidor com reconhecimento da perda do direito; bens feitos segundo especificações do consumidor ou manifestamente personalizados; bens que por natureza não possam ser reenviados ou se deteriorem rapidamente; bens selados abertos após a entrega e não devolvíveis por razões de saúde ou higiene; bens inseparavelmente misturados com outros; gravações áudio/vídeo ou software selados abertos após a entrega; jornais e revistas (exceto assinaturas); hasta pública; alojamento não residencial, transporte de bens, aluguer de automóveis, restauração ou atividades de lazer com data ou período de execução específicos; conteúdos digitais sem suporte material com início de execução consentido; reparação ou manutenção no domicílio a pedido do consumidor (salvo serviços ou bens além dos pedidos).
- Condições: contrato abrangido pelo DL 24/2014; identificar a alínea concreta.
- Efeito: **impede a aplicação automática da livre resolução** quando a exceção se verifica. Se a exceção não for clara, análise humana.
- Provas: confirmação da encomenda; descrição do bem/serviço; estado do selo/embalagem; consentimento expresso para início do serviço.

**CONS_RETRATACAO_INFO_8** · Livre resolução · Retratação por falta de informação · Nova · **Apoio — nunca concluir**
- Lei n.º 24/96, art. 8.º, n.º 4
- Resumo: Quando falte informação, ou esta seja insuficiente, ilegível ou ambígua de forma que comprometa a utilização adequada do bem ou do serviço, o consumidor goza do direito de retratação do contrato no prazo de sete dias úteis a contar da receção do bem ou da celebração do contrato de prestação de serviços.
- Condições: falha de informação concreta; prova de que compromete a utilização adequada; datas.
- Efeito: possível direito de retratação; saber se a falta de informação "compromete a utilização adequada" exige análise humana. Aplica-se também a compras em loja.
- Provas: documentação entregue (instruções, contrato); datas de entrega/celebração; comunicação de retratação.

---

## 5. Ficaram de fora (fundamento insuficiente ou fora do âmbito)

- **Ginásios:** "doença, gravidez, desemprego ou mudança de residência permitem cancelar", "fidelização acima de X meses é ilegal", "cancelamento a qualquer momento sem custo" — **não há norma geral que o diga** para ginásios (a Lei 16/2022 só se aplica a comunicações eletrónicas e a Lei 39/2012 não regula o contrato). Também fora: Lei 39/2012, art. 20.º (acesso e permanência), títulos profissionais (arts. 9.º–15.º).
- **Compras:** DL 24/2014, art. 19.º (encomenda indisponível; reembolso em 30 dias, em dobro) — sobrepõe-se ao art. 11.º do DL 84/2021 (14 dias); qual prevalece numa compra online de bens é **dúvida jurídica** (ver abaixo). Garantia comercial (art. 43.º), responsabilidade direta do produtor (art. 40.º), mercados em linha (art. 44.º), conteúdos e serviços digitais, imóveis, viagens, crédito, seguros, veículos.
- **Gás:** Regulamentos n.os 131-A/2026 e 175-A/2026 (medidas extraordinárias da tempestade Kristin) — temporários e territoriais, sobretudo eletricidade; não servem para regra geral. Inspeção periódica das instalações de gás, GPL em garrafa (regulamento próprio da ERSE, não lido).

## 6. Dúvidas jurídicas para validação humana

1. **GPL canalizado e gás de garrafa:** a Lei 23/96 abrange GPL canalizado; não confirmei se o RRC (Regulamento 827/2023) se aplica a GPL canalizado. Até confirmar, as regras `GAS_*` dizem "gás natural por rede".
2. **RRC, art. 79.º, n.º 7** (5 dias úteis "para os restantes"): confirmar a leitura para clientes domésticos de gás.
3. **Compra online de bens não entregue:** DL 84/2021, art. 11.º (resolução + reembolso em 14 dias) vs. DL 24/2014, art. 19.º (indisponibilidade + reembolso em 30 dias). Qual usar, ou ambos?
4. **Ginásios e a exceção da alínea k) do art. 17.º do DL 24/2014** ("serviços relacionados com atividades de lazer se o contrato previr uma data ou período de execução específicos"): uma mensalidade de ginásio contratada online cai nesta exceção? Não assumir — por isso a regra fica em apoio à análise.
5. **Ginásio contratado na receção depois de abordagem na rua/centro comercial:** pode ser "fora do estabelecimento" (art. 3.º, alínea i), subalínea i)). Caso a caso.
6. **Cláusulas abusivas (GIN_CCG_*)**: confirmar que a advogada aceita estas três alíneas como fundamento a sugerir (sempre "possível cláusula abusiva").
7. **CCG_BOAFE_CONSUMIDOR** (existente) diz "Cláusulas proibidas são nulas" como efeito; está correto (art. 12.º), mas a IA pode lê-lo como conclusão. Considerar reformular numa revisão futura.

## 7. Testes previstos (depois da aprovação)

Em `src/lib/rascunhoIA/rascunhoIA.test.mjs` (seleção) e num novo `supabase/tests/database/regras_carga4.test.sql`:

1. Regras `GAS_*` chegam a casos de Gás; `ENE_*` nunca chegam a Gás; `ENE_ELEC_*` nunca chegam a Gás.
2. Regras gerais continuam disponíveis em todos os setores (e, com D2, as `SPE_*` deixam de chegar a Compras/Ginásios).
3. Regras `COMPRA_*` só chegam a Compras & Reembolsos; as condições de todas as `COMPRA_*` (DL 84/2021) referem "profissional" e excluem vendas entre particulares.
4. `COMPRA_LR_BENS_INICIO_10` e `DIST_LIVRE_RESOLUCAO` têm condições "à distância ou fora do estabelecimento"; `COMPRA_LOJA_SEM_LR_2` existe para compras em loja; `DIST_EXCECOES_17` é enviada com as de livre resolução.
5. `COMPRA_REJEICAO_30D_16` (exige falta de conformidade) tem categoria e texto distintos da livre resolução.
6. As `GIN_CCG_*` têm efeito "possível cláusula abusiva — necessita de análise concreta" e nunca "nula"/"ilegal".
7. Regras de ginásio de contratação à distância são só as `DIST_*` gerais, com a condição de forma de contratação.
8. **Todas as novas entram com `ativa = false`, `revista_em` e `revista_por` nulos**, e nenhuma é selecionada enquanto não for revista.
9. Todas têm `diploma`, `artigo` e `fonte_url` (https) preenchidos.
10. As seleções dos testes existentes (cargas 1–3) não mudam.
11. `supabase test db` e `npm test` na stack local.
