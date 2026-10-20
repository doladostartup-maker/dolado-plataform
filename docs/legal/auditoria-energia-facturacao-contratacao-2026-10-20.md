# Auditoria — Reclamações de Energia: facturação, cobrança e contratação (20/10/2026)

Estado: **auditoria e plano de correcções. Nada foi alterado** — nem código, nem regras jurídicas, nem páginas, nem dados de produção. A base de dados de produção foi lida só com `SELECT` (tabela `regras_juridicas`).

Convenções: **[F]** facto confirmado (código, base de dados ou fonte oficial); **[H]** hipótese a confirmar; **[R]** recomendação.

---

## 0. Ponto de partida — os números da ERSE

[F] Confirmado no relatório original: *Qualidade de Serviço Comercial dos Sectores Eléctrico e do Gás 2025 — Atendimento, pedidos de informação e reclamações* (ERSE, divulgado a 14/10/2026), figura 11.2-6, p. 69 ([PDF](https://www.erse.pt/media/glip3iw0/meios-de-atendimento_pi_rec_cne_2025.pdf); [destaque](https://www.erse.pt/comunicacao/destaques/erse-publica-relatorios-da-qualidade-de-servico-comercial-2025/)).

- **Universo:** reclamações apresentadas **junto dos comercializadores**, electricidade e gás em conjunto, ano de 2025. Não inclui as reclamações apresentadas aos operadores de rede (ORD). Nos ORD, "Facturação e cobrança" vale só 6,8% e "Contratação" 0,02% (figura 11.2-7). Aí dominam a qualidade de fornecimento (44,2%) e as infra-estruturas (27,7%).
- **Valores:** facturação e cobrança 49,6%; contratação 35,1%. Somados dão 84,7%. Seguem-se serviços (5,3%), marketing e campanhas (3,5%), atendimento (2,3%) e leituras e equipamentos de medição (1,2%).
- **Categorias:** o relatório não define o conteúdo de cada tema. São os temas que os comercializadores reportam à ERSE. Por isso, "leituras" (1,2%) aparece separado de "facturação", embora muitos erros de facturação nasçam de leituras ou estimativas.
- Contexto adicional: 19,3 reclamações por 1000 clientes nos comercializadores; 93,6% respondidas a tempo; tempo médio de 6 dias úteis.

**Conclusão:** os dados justificam a auditoria. O canal relevante para a DoLado é o comercializador, que é a quem a DoLado dirige a reclamação.

---

## A. Resumo executivo

**A DoLado está parcialmente preparada.** A base jurídica de Electricidade e Gás é boa: 29 regras de Energia e 22 de Gás, todas activas e revistas, mais as regras gerais da Lei 23/96, do DL 24/2014, da Lei 24/96 e do DL 57/2008. Os textos que verifiquei são prudentes e não encontrei fundamentação errada nem legislação revogada (**sem P0**).

O problema principal está entre a base jurídica e o caso concreto:

1. **[F] A selecção de regras corta fundamentos essenciais.** O limite é de 12 regras por pedido. A ordem é: regras do sector primeiro, incluindo as genéricas de "Reclamação"; depois as gerais, por **ordem alfabética do código**. Num caso de Energia → "Cobrança indevida", a IA recebe as duas regras da caução, mas **não recebe** a prescrição de 6 meses (`SPE_PRESCRICAO_6M`), a caducidade do acerto (`SPE_ACERTO_6M`), a devolução do excesso (`SPE_ACERTO_EXCESSO`) nem o ónus da prova (`SPE_ONUS_PROVA`). Numa factura de acerto, são precisamente os fundamentos mais fortes do consumidor. No contexto de "Cancelamento recusado" em Energia, nenhuma regra do DL 24/2014 (livre resolução, contratação por telefone, fora do estabelecimento) chega à IA.
2. **[F] A triagem não tem tipos de problema para os dois grandes temas da ERSE.** Não há "factura alta, estimativa ou acerto" nem "contrato não autorizado / condições diferentes das anunciadas". As páginas `/problemas/energia/fatura-muito-alta` e `/consumos-estimados` mandam o cliente escolher "O que aconteceu?" sem correspondência. Em geral o cliente acaba em "Cobrança indevida" ou "Outro". Em "Outro", as 12 regras são as primeiras do alfabeto (ENE_A… a ENE_E…).
3. **[F] A triagem não pergunta o canal de contratação** fora dos casos de painéis solares. A pergunta e o campo (`detalhes_caso.forma_contratacao`) já existem, mas só para Autoconsumo. Sem essa pergunta, a revisão humana tem de descobrir se se aplicam o DL 24/2014 e o art. 5.º, n.º 8 (telefone).
4. **[F] Faltam em Energia duas regras que já existem em Gás**, embora o regulamento seja o mesmo (RRC, comum aos dois sectores): a indemnização por incumprimento da fidelização (art. 19.º, n.os 9 a 11) e a denúncia sem encargos (art. 81.º).

A revisão humana obrigatória e o prompt do rascunho mitigam o risco: o prompt usa só regras enviadas, não cita regras sem condições verificadas e lista o que falta em `missing_information`. Por isso, a falha produz **reclamações mais fracas**, não reclamações enganadoras. Afecta, porém, os 85% de casos mais frequentes.

---

## B. Cobertura funcional

### B.1 Percurso verificado

| Etapa | Estado | Notas |
|---|---|---|
| Simulador (`src/lib/elegibilidade/regras.ts`) | [F] Funciona | Só avalia o âmbito (sector, titular, problema, momento). Por desenho, não distingue fundamento jurídico. Os tipos de problema vêm de `pedidoCaso.ts`, e as lacunas de B.2 repetem-se aqui. |
| Criação do caso (`/tratar-caso`) | [F] Funciona | 5 perguntas: sector/empresa, tipo de problema, descrição livre, já reclamou?, um documento opcional. Perguntas específicas só nos casos solares. |
| Triagem (backoffice) | [F] Humana | Próxima acção, prazos e prioridade (`triagem.ts`); pedidos de informação ao cliente (`casos_pedidos_cliente`). |
| Regras jurídicas (`src/lib/rascunhoIA/regras.ts`) | [F] **Lacuna P1** | Ver A.1 e a secção C.2. |
| Geração (`prompt.ts`) | [F] Prudente | Só regras enviadas, `missing_information`, `warnings`, sem concluir responsabilidade. |
| Revisão e autorização | [F] Intacta | Versão `ia` nunca sai sem `revisto_em`; autorização presa a versão e hash. |
| Acompanhamento | [F] Funciona | Recepção de respostas, análise, decisões A–E. |

### B.2 Facturação e cobrança — matriz de cobertura

Tipos de problema existentes para Energia/Gás: Aumento de mensalidade · Cobrança indevida · Fidelização ou penalização · Corte ou falha de serviço · Cancelamento recusado · Mudança de comercializador · Tarifa social · (solar ×3) · Outro.

| Situação | Tipo de problema que o cliente escolhe | Regra existente | Chega à IA? | Avaliação |
|---|---|---|---|---|
| Factura inesperadamente elevada | nenhum adequado → "Cobrança indevida"/"Outro" | ENE_LEITURA_REAL_PREVALECE_42, ENE_ESTIMATIVA_ESCOLHA_42, SPE_ACERTO_6M | Só as ENE; SPE não | **P1** |
| Erros de leitura / estimativas | idem | ENE_*_42, ENE_DADOS_CONSUMO_41, GAS_LEITURA_ESTIMATIVA_42 | Sim (ENE/GAS) | OK, menos SPE |
| Acertos de facturação | idem | SPE_ACERTO_6M, SPE_ACERTO_EXCESSO, ENE_FATURA_ATRASO_FRACIONAR_44 | Fraccionamento sim; SPE não (Energia) | **P1** |
| Cobranças duplicadas ou indevidas | Cobrança indevida | CONS_NAO_SOLICITADO_9, PAY_*, SPE_ONUS_PROVA | Parcial | P2 |
| Alterações de tarifas e preços | Aumento de mensalidade | ENE_ALT_CONTRATO_68, ENE_FIDELIZACAO_PRECO_19 (+ tarifas CUR inactivas) | Sim | OK |
| Fim de descontos/campanhas | Aumento de mensalidade | ENE_ALT_CONTRATO_68; PCD_ACAO_ENGANOSA_7 | PCD não | P2 |
| Serviços adicionais sem consentimento | Cobrança indevida | ENE_SERVICOS_ADICIONAIS_17, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12 | Só CONS (ENE_17 é "Contrato") | **P1** |
| Erro na potência contratada | nenhum | **sem regra** | — | P2 (regra a redigir após leitura do RRC) |
| Facturação após cancelamento/mudança | "Cobrança indevida" (não há "Cobrança após cancelamento" em Energia/Gás) | ENE_MUDANCA_FATURA_FINAL_6S_242, GAS_MUDANCA_COMERCIALIZADOR_242 | Não (só em "Mudança de comercializador") | **P1** |
| Dívidas contestadas | Cobrança indevida / Corte | SPE_PRESCRICAO_6M, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_CORTE_PRESCRICAO_78 | Em "Corte" sim; em "Cobrança" a SPE não | **P1** |
| Ameaça/interrupção por dívida | Corte ou falha de serviço | ENE_CORTE_*, SPE_PREAVISO_CORTE_20D, ENE_RECLAM_FAT_SUSPENDE_CORTE_64 | Sim | **OK** |
| Falta de emissão de facturas | Cobrança indevida / Outro | ENE_FATURACAO_MENSAL_44, ENE_FATURA_ATRASO_FRACIONAR_44 | Sim | OK |
| Reembolsos e notas de crédito | Cobrança indevida | SPE_ACERTO_EXCESSO, ENE_CAUCAO_RESTITUICAO_27 | Caução sim; SPE não | P1 (resolvido com a selecção) |

### B.3 Contratação — matriz de cobertura

| Situação | Regras existentes | Chegam à IA? | Avaliação |
|---|---|---|---|
| Contrato sem consentimento válido | ENE_ACEITACAO_EXPRESSA_20, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12 | Em "Mudança de comercializador": só a ENE | **P1** |
| Mudança de comercializador não autorizada | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243 | Sim; DIST_TELEFONE_5 não | P1 |
| Condições diferentes das anunciadas / proposta ≠ contrato | PCD_ACAO_ENGANOSA_7, PCD_OMISSAO_9, CCG_COMUNICACAO_5_8 | PCD não chega em "Aumento"/"Fidelização" | P2 |
| Informação pré-contratual | DIST_INFO_PRE_4, CCG_INFORMACAO_6_8; **sem regra RRC própria** | DIST não chega em Energia | P1 (selecção) + P2 (regra RRC [H]) |
| Serviços adicionais não solicitados | ENE_SERVICOS_ADICIONAIS_17 | Só em tipos com "Contrato" | P1 (selecção) |
| Fidelização contestada | ENE_FIDELIZACAO_CONTRAPARTIDA_19, _MAX_12M_19, _SEM_RENOV_AUTO_19 | Sim | OK |
| Penalização por cessação | **sem regra ENE** (Gás tem GAS_FIDELIZACAO_INDEMNIZACAO_19) | — | **P1** |
| Alteração unilateral | ENE_ALT_CONTRATO_68, CCG_ALT_UNILATERAL_22 | ENE sim | OK |
| Dificuldades de cancelamento | **sem regra ENE de denúncia** (Gás tem GAS_DENUNCIA_SEM_ENCARGOS_81) | — | **P1** |
| Contratação telefónica | DIST_TELEFONE_5, ENE_CHAMADA_GRAVADA_243 | DIST não | P1 |
| À distância / fora do estabelecimento | DIST_LIVRE_RESOLUCAO, DIST_FORA_ESTAB_FORMA_9, DIST_SERVICO_15, DIST_CONFIRMACAO_6 | Nunca em Energia/Gás (cortadas) | **P1** |
| Falta de disponibilização do contrato | DIST_CONFIRMACAO_6, DIST_FORA_ESTAB_FORMA_9 | Não | P1 |

**Canal de contratação:** [F] não é perguntado fora dos casos solares. [R] Reutilizar a pergunta "Como foi feito o contrato?" (`FORMAS_CONTRATACAO`, com "Não sei") nos tipos de contratação de Energia e Gás. Tem as vantagens seguintes:

- não cria campos novos;
- os valores fechados são validados por `detalhes_caso_valido()`;
- é a mesma regra de minimização: não decide acesso nem preço.

Precisa de uma migration que alargue a validação de `detalhes_caso` aos novos tipos.

**Regras sectoriais vs. gerais:** [F] a separação está bem feita. Regras ENE/GAS do RRC/RQS; regras gerais com setor `null`; a Lei 23/96 limitada a sectores de serviço público essencial. As regras de Gás avisam correctamente que não se aplicam a GPL/gás de garrafa.

---

## C. Cobertura jurídica

### C.1 Fontes e vigência

| Diploma | Estado verificado | Observação |
|---|---|---|
| RRC — Regulamento n.º 827/2023 | [F] em vigor; rectificado pela Declaração de Rectificação n.º 830/2023; **alterado pelo Regulamento n.º 8/2026 (6/1/2026)** | As regras de Gás (revistas a 08/10/2026) citam o consolidado da ERSE. As regras ENE (06/10/2026) citam só a página genérica da ERSE. [H] Os números de artigo das ENE coincidem com os das GAS (19.º, 20.º, 42.º, 44.º, 45.º, 68.º, 78.º, 79.º, 242.º), o que sugere que estão actualizados. **Confirmar no consolidado posterior ao Reg. 8/2026.** |
| RQS — Regulamento n.º 826/2023 | [F] em vigor; também alterado pelo Reg. 8/2026; consolidado 2026 citado nas regras GAS | Artigos 60.º, 61.º e 64.º idênticos nas regras ENE e GAS. |
| Lei n.º 23/96 | [F] em vigor | O art. 10.º exclui o fornecimento de electricidade em **alta tensão**. As condições de `SPE_PRESCRICAO_6M`/`SPE_ACERTO_6M` não o dizem (P3: os clientes da DoLado são em BT). As medidas da pandemia que alargaram o prazo já não se aplicam. |
| DL n.º 24/2014 | [F] em vigor | O art. 15.º menciona expressamente água, gás e electricidade. O regime aplica-se a contratos de energia celebrados à distância ou fora do estabelecimento. |
| Lei n.º 24/96 | [F] em vigor | Art. 9.º, n.º 4 (não solicitado) e art. 8.º, n.º 4 (retratação) existem como regras. |
| DL n.º 57/2008 | [F] em vigor | PCD_ACAO_ENGANOSA_7, PCD_OMISSAO_9, PCD_NAO_SOLICITADO_12, PCD_AGRESSIVA_11. |

Não verifiquei artigo a artigo o texto do Regulamento n.º 8/2026: o Diário da República não devolveu o texto consolidado nesta sessão. **Não declaro a vigência das regras ENE como confirmada artigo a artigo.**

### C.2 Lacunas e correcções

| # | Problema concreto | Norma | Fonte oficial | Regra existente | Correcção necessária | Prior. | Testes |
|---|---|---|---|---|---|---|---|
| J1 | Selecção ordena as gerais pelo alfabeto. Em Energia/Gás → "Cobrança indevida" corta SPE_PRESCRICAO_6M, SPE_ACERTO_6M, SPE_ACERTO_EXCESSO e SPE_ONUS_PROVA; em "Cancelamento recusado" e "Mudança de comercializador" corta todas as DIST_*. | Lei 23/96, arts. 10.º, 11.º, 12.º; DL 24/2014, arts. 4.º, 5.º, 9.º, 10.º | DR | sim | Prioridades por tipo de problema, no padrão de `perfilAutoconsumo.ts` (prioridade antes do limite); as regras gerais da categoria do problema passam à frente das sectoriais "sempre enviadas" (Reclamação). Ver C.3. | **P1** | Novo `energia.test.mjs` com os cenários F1–C6 sobre `regras-producao-*.json` |
| J2 | Energia sem regra de indemnização da fidelização. | RRC, art. 19.º, n.os 9 a 11 | [consolidado ERSE](https://www.erse.pt/media/cw5fdm3i/regulamento-827-2023_consolidado.pdf) | GAS_FIDELIZACAO_INDEMNIZACAO_19 (Gás) | Nova `ENE_FIDELIZACAO_INDEMNIZACAO_19`, criada **inactiva**, com o texto da regra de Gás adaptado; revisão por Thiago/advogada. | **P1** | pgTAP: inactiva e por rever |
| J3 | Energia sem regra de denúncia sem encargos. | RRC, art. 81.º | idem | GAS_DENUNCIA_SEM_ENCARGOS_81 | Nova `ENE_DENUNCIA_SEM_ENCARGOS_81`, inactiva. | **P1** | idem |
| J4 | `ENE_GAS_TARIFA_SOCIAL_AUTO_6` (tarifa social de gás natural) está no sector **Energia** e chega a casos de tarifa social de electricidade; duplica `GAS_TARIFA_SOCIAL_DL101`. | DL 101/2011 | DR | sim | Desactivar (`ativa = false`) por decisão de Thiago. Basta desligar, sem alterar o conteúdo, por isso não retira a revisão. | P2 | Teste de selecção: não aparece em Energia |
| J5 | Faturação após cancelamento ou mudança sem tipo de problema, por isso as regras 242.º não chegam. | RRC, art. 242.º, n.º 11 | consolidado ERSE | sim | Tipo de problema novo (ver G) ou acrescentar "Mudança de comercializador" às categorias de "Cobrança indevida" em Energia/Gás. | P1 | selecção |
| J6 | Erro na potência contratada: sem regra. | RRC (artigo a identificar no consolidado — **não indico número sem leitura**) | consolidado ERSE | não | Redigir após leitura; não inventar. | P2 | — |
| J7 | Informação pré-contratual sectorial (RRC) sem regra própria; só DL 24/2014 e CCG. | RRC (artigo a identificar) | consolidado ERSE | parcial | Avaliar se acrescenta algo ao DL 24/2014/CCG antes de criar. | P3 | — |
| J8 | `SPE_PRESCRICAO_6M` e `SPE_ACERTO_6M` não indicam a exclusão da alta tensão nem que o prazo para a acção de cobrança é tratado num número próprio do art. 10.º. | Lei 23/96, art. 10.º | DR | sim | Acrescentar às condições, com nova data de revisão. Alterar as condições retira a revisão se não vier com nova data — trigger de 06/10/2026. | P3 | `regras_revisao_ao_alterar` já cobre |
| J9 | Regras ENE com fonte genérica (página da ERSE). | — | — | sim | Actualizar `fonte_url` para o consolidado, como nas GAS, com nova data de revisão. | P3 | — |

Correcções às regras: **nenhuma aplicada**. As regras novas devem nascer inactivas e só ser activadas após revisão, como em 13/10/2026.

### C.3 Proposta concreta para a selecção (J1)

Reutilizar o mecanismo do Autoconsumo, sem duplicar fluxos:

1. **Prioridade antes do limite** para Energia e Gás (`PRIORIDADES_POR_PROBLEMA`).
   - "Cobrança indevida": SPE_PRESCRICAO_6M, SPE_ACERTO_6M, SPE_ACERTO_EXCESSO, SPE_ONUS_PROVA, *_LEITURA_REAL/ESTIMATIVA_42, *_RECLAM_FAT_SUSPENDE_CORTE_64 e ENE_SERVICOS_ADICIONAIS_17.
   - "Mudança de comercializador": ACEITACAO_EXPRESSA_20, CHAMADA_GRAVADA_243, DIST_TELEFONE_5, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12, MUDANCA_GRATUITA_3S_242.
   - "Cancelamento recusado": *_DENUNCIA_81, DIST_LIVRE_RESOLUCAO, DIST_FORA_ESTAB_FORMA_9, DIST_SERVICO_15.
2. As regras gerais de categoria do problema passam à frente das sectoriais "sempre enviadas" (Reclamação, compensações).
3. Desempate final pelo código, como hoje.

O resto do fluxo não muda: validação, auditoria e revisão humana. Os outros sectores ficam iguais, com um teste de não-regressão sobre o fixture de produção, como no Autoconsumo.

---

## D. Documentação e provas

[F] Hoje: um único documento opcional no formulário ("a factura em causa, o contrato ou um e-mail da empresa"). Os restantes pedem-se depois, no backoffice, em `casos_pedidos_cliente`. As páginas de problema têm listas "O que verificar". Não há pedido de documentos por tipo de problema no fluxo.

[R] Sem nova recolha nem armazenamento: só **texto de orientação por tipo de problema** no passo 4 ("Tem algum documento?"). O backoffice usa a mesma lista ao fazer o pedido de informação.

| Tipo | Indispensável | Recomendado | Opcional |
|---|---|---|---|
| Factura alta / estimativa / acerto | factura reclamada | facturas dos meses anteriores (≥ 3); fotografia do contador com data | autoleituras comunicadas; reclamações anteriores |
| Cobrança indevida / serviço adicional | factura com a linha cobrada | contrato ou proposta; comprovativo de pagamento | comunicações do comercializador |
| Cobrança após cancelamento/mudança | factura posterior | comprovativo do pedido de cancelamento ou da data da mudança | leitura na data de saída |
| Dívida contestada / aviso de corte | aviso de corte ou carta de cobrança | facturas da dívida; comprovativos de pagamento | reclamação já apresentada |
| Mudança não autorizada | primeira factura do novo comercializador | registo do contacto (data, canal, quem ligou) | SMS/e-mails recebidos |
| Fidelização / penalização | factura com o valor exigido | proposta/contrato com a cláusula | campanha publicitada |
| Fora do estabelecimento / telefone | o que tiver assinado ou recebido | data do contrato e do início do fornecimento | — |

Minimização: [F] o preenchimento de NIF, morada e n.º de cliente já é feito a partir dos documentos, sem campos novos e só na revisão. Nada disto muda. [R] Não acrescentar campos de NIF, CPE/CUI nem número de contrato ao formulário.

---

## E. Conteúdo público

Verificadas em `src/i18n/mensagens/pt-PT/` (e equivalentes `en-GB`): `problemas.ts` (Energia: `fatura-muito-alta`, `cobranca-indevida`, `consumos-estimados`; categoria Energia), `perguntas.ts`, `mudanca.ts`, `simulador.ts`, `inicio.ts`, `marketing.ts`, `paginas.ts`, `institucional.ts`.

| Página | Resultado |
|---|---|
| `/problemas/energia/fatura-muito-alta` | **Conteúdo público verificado. Não foram identificadas alterações necessárias.** Prudente ("pode depender", "pode haver"), sem prazos nem artigos; coerente com ENE_LEITURA/ESTIMATIVA_42 e ENE_ALT_CONTRATO_68. |
| `/problemas/energia/cobranca-indevida` | Verificado. Correcto. Uma melhoria P3: ver abaixo. |
| `/problemas/energia/consumos-estimados` | Verificado. Correcto, mas incompleto num ponto relevante: ver abaixo (P2). |
| `/perguntas-frequentes` | **Conteúdo público verificado. Não foram identificadas alterações necessárias.** Só descrições gerais do serviço. |
| `/mudanca-de-casa` | **Conteúdo público verificado. Não foram identificadas alterações necessárias.** Leituras com fotografia e data e comprovativos: coerente com ENE_LEITURA_REAL_PREVALECE_42. |
| Simulador, homepage, Protecção | Verificado; sem afirmações jurídicas sobre energia. Nada a alterar. |
| Contratação de energia (mudança não autorizada, porta-a-porta, telefone, fidelização) | **Não foi identificado conteúdo público correspondente ao tema.** |
| Gás (qualquer problema) | **Não foi identificado conteúdo público correspondente ao tema** (categoria sem páginas, decisão de 12/10/2026). |

### Correcções propostas

| Campo | Informação |
|---|---|
| Página | `/problemas/energia/consumos-estimados` — `src/i18n/mensagens/pt-PT/problemas.ts` |
| Secção | "Pode contestar?" (`contestar`, 2.º parágrafo) |
| Texto actual | "Pode haver fundamento para contestar quando as estimativas se afastam muito do consumo real, quando as leituras que comunicou não foram consideradas ou quando o acerto não é claro. Depende do histórico de leituras e do seu caso concreto." |
| Problema | Omite o ponto que mais muda o resultado de um acerto: os limites temporais à cobrança de consumos antigos. Pode levar o consumidor a pagar um acerto sem verificar as datas. |
| Fundamento | Lei n.º 23/96, art. 10.º (prescrição e caducidade); regras SPE_PRESCRICAO_6M e SPE_ACERTO_6M |
| Novo texto | "Pode haver fundamento para contestar quando as estimativas se afastam muito do consumo real, quando as leituras que comunicou não foram consideradas ou quando o acerto não é claro. Num acerto que inclua consumos antigos, as datas também contam: a lei prevê limites temporais para a cobrança de alguns valores. Depende do histórico de leituras, das datas e do seu caso concreto." |
| Novo texto (en-GB) | "There may be grounds to dispute it when the estimates are far from your real consumption, when the readings you submitted were not taken into account or when the adjustment is unclear. In an adjustment that includes older consumption, the dates also matter: the law sets time limits on charging for some amounts. It depends on your reading history, the dates and your specific case." |
| Prioridade | P2 |

Mantém a regra das páginas de problema: sem artigos nem prazos concretos.

| Campo | Informação |
|---|---|
| Página | `/problemas/energia/cobranca-indevida` |
| Secção | "O que verificar" (`verificar`) |
| Texto actual | (lista de 5 itens, sem comprovativos de pagamento) |
| Problema | Em cobranças em duplicado ou dívidas contestadas, o comprovativo de pagamento é a prova principal. |
| Fundamento | Lei 23/96, art. 11.º (ónus da prova do prestador); coerência com a secção D |
| Novo texto | Acrescentar o item: "Os comprovativos de pagamento das facturas em causa" (en-GB: "Proof of payment for the bills concerned") |
| Prioridade | P3 |

**Página nova — só se for aprovada:** `/problemas/energia/mudanca-de-comercializador-nao-autorizada`. A utilidade é demonstrável: a contratação vale 35,1% das reclamações aos comercializadores e não há nenhuma página sobre o tema. Deve seguir as regras do catálogo: prudente, sem marcas nem artigos, com o CTA do Simulador. O `problemaCaso` correspondente seria "Mudança de comercializador" ou o tipo novo. **P2.** Não redigida nesta fase.

---

## F. Resultados dos testes

Execução segura: a selecção de regras real (`selecionarRegras`) correu localmente sobre os metadados das 157 regras de produção a 13/10/2026 (`fixtures/regras-producao-2026-10-13.json`), mais as 17 regras solares, com data 20/10/2026. Os textos das regras foram lidos em produção só com `SELECT`.

**O texto da reclamação não foi gerado:** exigiria chamar a Claude API com a chave de produção, o que é custo real e fora do âmbito "sem alterar produção". A coluna "texto" descreve o comportamento esperado pelo prompt (`prompt.ts`) com as regras observadas. Não é um resultado observado.

Perguntas apresentadas, em todos os cenários não solares: sector, empresa, tipo de problema, descrição livre, "já reclamou?" e um documento opcional. Documentos pedidos: o mesmo texto genérico em todos.

| # | Cenário | Categoria seleccionada | Regras esperadas (essenciais) | Regras observadas (12) | Texto (esperado pelo prompt) | Resultado | Falhas |
|---|---|---|---|---|---|---|---|
| F1 | Electricidade: factura de acerto com 9 meses de estimativas; o cliente comunicou leituras (fundamentado) | Energia / Cobrança indevida | SPE_ACERTO_6M, SPE_PRESCRICAO_6M, ENE_LEITURA_REAL_PREVALECE_42, ENE_RECLAM_FAT_SUSPENDE_CORTE_64 | ENE_CAUCAO_CONSUMIDOR_23, ENE_CAUCAO_RESTITUICAO_27, ENE_DADOS_CONSUMO_41, ENE_ESTIMATIVA_ESCOLHA_42, ENE_FATURA_ATRASO_FRACIONAR_44, ENE_FATURA_PAPEL_GRATIS_45, ENE_FATURACAO_MENSAL_44, ENE_LEITURA_REAL_PREVALECE_42, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_RECLAMACAO_COMPENSACAO_61, ENE_RECLAMACAO_PRAZO_60, CONS_NAO_SOLICITADO_9 | Pede a correcção com base na leitura real; **sem invocar a caducidade do acerto** | **Falha** | J1: SPE cortadas; caução sem relação com o caso |
| F2 | Electricidade: factura alta por consumo real maior (inverno); sem erro (sem fundamento) | Energia / Outro (a página não tem correspondência) | Regras de facturação + aviso de falta de fundamento | ENE_ACEITACAO_EXPRESSA_20 … ENE_ELEC_TARIFA_SOCIAL_AUTO_201 (as 12 primeiras do alfabeto: caução, corte, chamada gravada, tarifa social…) | `warnings`/`missing_information` esperados; a revisão humana decide não avançar | **Parcial** | Selecção arbitrária em "Outro"; sem tipo de problema para facturas altas |
| F3 | Electricidade: seguro de assistência facturado sem ter sido pedido | Energia / Cobrança indevida | ENE_SERVICOS_ADICIONAIS_17, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12, ENE_ACEITACAO_EXPRESSA_20 | igual a F1 (só CONS_NAO_SOLICITADO_9 é relevante) | Fundamenta com a Lei 24/96, art. 9.º, n.º 4; omite o RRC art. 17.º | **Parcial** | J1 (ENE_17 está na categoria "Contrato") |
| F4 | Electricidade: aviso de corte por dívida já reclamada por escrito | Energia / Corte ou falha de serviço | ENE_CORTE_PREAVISO_79, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_CORTE_PRESCRICAO_78, SPE_PREAVISO_CORTE_20D | ENE_CORTE_PREAVISO_79, ENE_CORTE_PRESCRICAO_78, ENE_CORTE_VULNERAVEL_30D_79, ENE_ELEC_REDUCAO_ANTES_CORTE_78, ENE_QUALIDADE_COMPENSACAO_104, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_RECLAMACAO_COMPENSACAO_61, ENE_RECLAMACAO_PRAZO_60, SPE_PREAVISO_CORTE_20D, CONS_INTERESSES_9, LRE_RESPOSTA_15DU, PCD_ACAO_ENGANOSA_7 | Pede a suspensão da ordem de corte até à apreciação | **OK** | — |
| F5 | Gás natural: facturas do comercializador antigo 3 meses depois da mudança | Gás / Cobrança indevida | GAS_MUDANCA_COMERCIALIZADOR_242, SPE_PRESCRICAO_6M | GAS_CAUCAO_23_27, GAS_FATURA_PAPEL_45, GAS_FATURACAO_PERIODICIDADE_44, GAS_LEITURA_ESTIMATIVA_42, GAS_RECLAM_FAT_CORTE_RQS_64, GAS_RECLAMACAO_PRAZO_RQS_60, CONS_NAO_SOLICITADO_9, PAY_NAO_AUTORIZADO_112_114, PAY_REEMBOLSO_8S_118, PCD_NAO_SOLICITADO_12, SPE_ACERTO_6M, SPE_ACERTO_EXCESSO | Sem a regra da factura final única em 6 semanas | **Falha** | J1/J5 |
| F6 | Electricidade: contrato terminado; caução e crédito a favor não devolvidos | Energia / Cobrança indevida | ENE_CAUCAO_RESTITUICAO_27, SPE_ACERTO_EXCESSO | igual a F1 | Fundamenta a caução; o crédito fica sem fundamento | **Parcial** | J1 |
| C1 | Electricidade: mudança de comercializador após chamada do novo comercializador; o cliente nada assinou (fundamentado) | Energia / Mudança de comercializador | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, DIST_TELEFONE_5, CONS_NAO_SOLICITADO_9 | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, ENE_DIVIDA_MUDANCA_242, ENE_ESTIMATIVA_ESCOLHA_42, ENE_FATURA_ATRASO_FRACIONAR_44, ENE_FATURA_PAPEL_GRATIS_45, ENE_FATURACAO_MENSAL_44, ENE_FIDELIZACAO_CONTRAPARTIDA_19, ENE_FIDELIZACAO_MAX_12M_19, ENE_FIDELIZACAO_SEM_RENOV_AUTO_19, ENE_LEITURA_REAL_PREVALECE_42, ENE_MUDANCA_FATURA_FINAL_6S_242 | Pede a gravação e a prova da aceitação; sem o regime da contratação por telefone | **Parcial** | J1; canal de contratação não perguntado |
| C2 | Electricidade: contrato assinado em casa há 10 dias; quer desistir | Energia / Cancelamento recusado | DIST_LIVRE_RESOLUCAO, DIST_FORA_ESTAB_FORMA_9, DIST_SERVICO_15 | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, ENE_SERVICOS_ADICIONAIS_17, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_RECLAMACAO_COMPENSACAO_61, ENE_RECLAMACAO_PRAZO_60, CCG_AMBIGUA_11, CCG_BOAFE_CONSUMIDOR, CCG_COMUNICACAO_5_8, CCG_FORMALIDADES_22, CCG_INFORMACAO_6_8, CCG_RENOVACAO_AUTO_22 | **Sem livre resolução**: o texto não invoca o direito mais simples do consumidor | **Falha** | J1 (nenhuma DIST); canal não perguntado; J3 |
| C3 | Electricidade: penalização por sair de uma fidelização de 24 meses (fundamentado) | Energia / Fidelização ou penalização | ENE_FIDELIZACAO_MAX_12M_19, ENE_FIDELIZACAO_CONTRAPARTIDA_19, indemnização (19.º, n.os 9–11) | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, ENE_FIDELIZACAO_CONTRAPARTIDA_19, ENE_FIDELIZACAO_MAX_12M_19, ENE_FIDELIZACAO_SEM_RENOV_AUTO_19, ENE_SERVICOS_ADICIONAIS_17, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_RECLAMACAO_COMPENSACAO_61, ENE_RECLAMACAO_PRAZO_60, CCG_AMBIGUA_11, CCG_BOAFE_CONSUMIDOR, CCG_COMUNICACAO_5_8 | Invoca o limite de 12 meses; sem a proporcionalidade da indemnização | **Parcial** | J2 |
| C4 | Electricidade: preço aumentado durante a fidelização, sem aviso de 30 dias | Energia / Aumento de mensalidade | ENE_FIDELIZACAO_PRECO_19, ENE_ALT_CONTRATO_68 | ENE_ACEITACAO_EXPRESSA_20, ENE_ALT_CONTRATO_68, ENE_CHAMADA_GRAVADA_243, ENE_ESTIMATIVA_ESCOLHA_42, ENE_FATURA_ATRASO_FRACIONAR_44, ENE_FATURA_PAPEL_GRATIS_45, ENE_FATURACAO_MENSAL_44, ENE_FIDELIZACAO_PRECO_19, ENE_LEITURA_REAL_PREVALECE_42, ENE_SERVICOS_ADICIONAIS_17, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_RECLAMACAO_COMPENSACAO_61 | Fundamentado correctamente | **OK** | — |
| C5 | Electricidade: preço diferente do anunciado na campanha (depende de prova da campanha) | Energia / Aumento de mensalidade | PCD_ACAO_ENGANOSA_7, CCG_COMUNICACAO_5_8; `missing_information` = prova da campanha | igual a C4 | Trata como alteração contratual; sem prática comercial enganosa | **Parcial** | J1; falta um tipo de problema de contratação |
| C6 | Electricidade: quer sair a meio de uma fidelização de 12 meses com desconto destacado na proposta (sem fundamento para não pagar) | Energia / Fidelização ou penalização | ENE_FIDELIZACAO_CONTRAPARTIDA_19 + regra de indemnização para verificar só a proporcionalidade; `warnings` | igual a C3 | Sem a regra da indemnização, o rascunho pode contestar a fidelização em si; a revisão humana tem de travar | **Parcial** | J2 (risco de reclamação mais fraca, não enganadora, por causa da revisão) |

**Totais:** 2 OK · 7 parciais · 3 falhas. Nenhuma falha produz texto juridicamente errado, porque o prompt só cita regras recebidas e com condições verificadas. Todas resultam em fundamentos **em falta**, que a revisão humana tem de completar à mão.

---

## G. Backlog priorizado

| Prioridade | Problema | Componente | Acção necessária | Complexidade |
|---|---|---|---|---|
| P1 | Selecção corta Lei 23/96 e DL 24/2014 em Energia/Gás | `src/lib/rascunhoIA/regras.ts` | Prioridades por tipo de problema antes do limite (padrão `perfilAutoconsumo.ts`); gerais da categoria acima das sectoriais "sempre enviadas"; testes F1–C6 + não-regressão | Média |
| P1 | Sem tipos de problema para facturas altas/acertos e contratação não autorizada | `pedidoCaso.ts` (+ `CATEGORIAS_POR_PROBLEMA`, `rotulos.ts` pt/en, `catalogo.ts`) | Acrescentar a Energia e Gás: "Factura alta, estimativa ou acerto", "Contrato ou condições que não aceitei" e "Cobrança após cancelamento" (este último já existe em Ginásios: reutilizar o valor). Mapear `fatura-muito-alta`/`consumos-estimados` | Baixa–média |
| P1 | Energia sem indemnização da fidelização e sem denúncia | `regras_juridicas` (migration) | `ENE_FIDELIZACAO_INDEMNIZACAO_19`, `ENE_DENUNCIA_SEM_ENCARGOS_81`, inactivas, para revisão | Baixa |
| P1 | Canal de contratação não perguntado | `/tratar-caso` passo 2, `detalhes_caso` | Reutilizar `forma_contratacao` nos tipos de contratação de Energia/Gás; usá-la para decidir as regras DIST, como no solar; migration de `detalhes_caso_valido()` | Média |
| P2 | Regras ENE sem confirmação face ao Regulamento n.º 8/2026 | `regras_juridicas` | Confrontar os artigos citados com o RRC/RQS consolidados; actualizar `fonte_url` com nova data de revisão | Média (jurídica) |
| P2 | Tarifa social de gás no sector Energia | `regras_juridicas` | Desactivar `ENE_GAS_TARIFA_SOCIAL_AUTO_6` | Baixa |
| P2 | Sem regra sobre potência contratada | `regras_juridicas` | Identificar a norma no RRC e redigir (inactiva) | Média (jurídica) |
| P2 | Orientação de documentos genérica | `tratarCaso.ts` passo 4 (pt/en) | Texto de ajuda por tipo de problema (tabela D); sem novos dados | Baixa |
| P2 | `consumos-estimados` omite os limites temporais | `problemas.ts` pt/en | Texto da secção E | Baixa |
| P2 | Sem página sobre contratação não autorizada | `catalogo.ts`, `problemas.ts` | Página nova, se aprovada | Baixa–média |
| P3 | Condições SPE sem a exclusão da alta tensão | `regras_juridicas` | Completar as condições com nova data de revisão | Baixa |
| P3 | `cobranca-indevida` (energia) sem comprovativos de pagamento | `problemas.ts` pt/en | Acrescentar o item | Baixa |
| P3 | Informação pré-contratual RRC | `regras_juridicas` | Avaliar se acrescenta algo ao DL 24/2014 | Baixa |

### As três melhorias mais importantes

1. **Corrigir a selecção de regras para Energia e Gás (J1).** Afecta quase todos os casos de facturação e contratação, que são 85% das reclamações. Hoje as reclamações saem sem os fundamentos mais fortes: a prescrição e caducidade de 6 meses, a livre resolução e a contratação por telefone. O risco jurídico é baixo, porque só reordena regras já revistas. A correcção é uma alteração de código com testes, sem migration.
2. **Acrescentar à triagem os tipos de problema e a pergunta do canal de contratação.** O cliente passa a encontrar o seu problema, as páginas `fatura-muito-alta`/`consumos-estimados` passam a pré-preencher o formulário e a IA recebe as regras certas. Reutiliza componentes que já existem (perfil e `detalhes_caso` do solar).
3. **Criar, inactivas, as regras de Energia em falta: indemnização da fidelização e denúncia sem encargos.** Os textos de Gás, já revistos, servem de base. Fecham a lacuna das penalizações e cancelamentos, um dos temas com mais reclamações em contratação.

---

## Fontes

- ERSE, relatório 2025 (figura 11.2-6, p. 69): https://www.erse.pt/media/glip3iw0/meios-de-atendimento_pi_rec_cne_2025.pdf
- ERSE, destaque de 14/10/2026: https://www.erse.pt/comunicacao/destaques/erse-publica-relatorios-da-qualidade-de-servico-comercial-2025/
- RRC consolidado (ERSE): https://www.erse.pt/media/cw5fdm3i/regulamento-827-2023_consolidado.pdf
- RQS consolidado 2026 (ERSE): https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf
- Regulamento n.º 8/2026 (lista de actos da ERSE): https://www.erse.pt/biblioteca/atos-e-documentos-da-erse/?page=4
- Lei n.º 23/96 (consolidada): https://diariodarepublica.pt/dr/legislacao-consolidada/lei/1996-34491275
- DL n.º 24/2014 (consolidado): https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-73222992

## Regra permanente — sincronização jurídica e conteúdo público

A regra pedida (secção 8 do pedido de auditoria) foi aplicada nesta auditoria: regras → triagem → páginas de problema → restante conteúdo → relatório de impacto. Proposta para a tornar permanente: acrescentar ao `CLAUDE.md` uma secção curta com os 7 passos e as duas frases-padrão. **A aguardar aprovação.**

---

## H. Implementação das três melhorias prioritárias (20/10/2026)

Aprovadas por Thiago a 20/10/2026. Ramo `feat/energia-facturacao-contratacao`.

**1. Selecção das regras (J1).** `src/lib/rascunhoIA/perfilEnergia.ts` (novo) e um desvio em `selecionarRegras()` (`regras.ts`). Funciona em Energia e Gás, nos tipos Factura alta/estimativa/acerto, Cobrança indevida, Cobrança após cancelamento, Contrato ou condições que não aceitei, Mudança de comercializador, Cancelamento recusado, Fidelização ou penalização e Aumento de mensalidade.

A ordem passa a ser:
1. essenciais do tipo;
2. regras do sector nas categorias do tipo;
3. regras gerais nas categorias do tipo;
4. regras "sempre enviadas";
5. só no fim, o limite de 12.

As regras do DL 24/2014 seguem a forma de contratação. A filtragem é a de sempre: regras em vigor e revistas, do sector, e a Lei 23/96 só nos serviços públicos essenciais. Ficam iguais o corte e as falhas de serviço, a tarifa social, "Outro", os painéis solares e os outros sectores (teste de não-regressão no `autoconsumo.test.mjs`).

**2. Triagem.** Tipos novos em Energia e Gás: "Factura alta, estimativa ou acerto", "Contrato ou condições que não aceitei" e "Cobrança após cancelamento" (rótulos em pt-PT e en-GB). A pergunta "Como foi feito o contrato (ou a mudança de comercializador)?" aparece em três tipos: contrato não aceite, mudança de comercializador e cancelamento recusado.
- A pergunta é obrigatória, tem a opção "Não sei" e, à distância, uma nota para indicar quem fez a chamada.
- Grava só `forma_contratacao` em `detalhes_caso` e pode ser corrigida no backoffice.
- Vai para o contexto da IA (`contexto_v4`).
- As páginas `fatura-muito-alta` e `consumos-estimados` passam a pré-preencher o tipo novo.

**3. Regras novas (J2, J3).** A migration `20261020140000_energia_fidelizacao_denuncia.sql` cria `ENE_FIDELIZACAO_INDEMNIZACAO_19` (RRC, art. 19.º, n.os 9 a 11) e `ENE_DENUNCIA_SEM_ENCARGOS_81` (art. 81.º, n.º 1, als. b) e c), e n.os 2 a 4), **inactivas e por rever**. O texto foi lido no PDF da ERSE (publicação de 2023). **Antes de as activar, confirmar no RRC consolidado posterior ao Regulamento n.º 8/2026.**

### Selecção observada depois da implementação

Regras de produção a 13/10/2026; as 2 regras novas ainda inactivas.

| # | Caso | Regras enviadas (12, por ordem) | Antes |
|---|---|---|---|
| F1 | Energia / Factura alta, estimativa ou acerto | SPE_ACERTO_6M, SPE_PRESCRICAO_6M, ENE_LEITURA_REAL_PREVALECE_42, ENE_ESTIMATIVA_ESCOLHA_42, SPE_ACERTO_EXCESSO, ENE_FATURA_ATRASO_FRACIONAR_44, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, SPE_ONUS_PROVA, ENE_DADOS_CONSUMO_41, ENE_FATURA_PAPEL_GRATIS_45, ENE_FATURACAO_MENSAL_44, ENE_RECLAMACAO_COMPENSACAO_61 | Falha |
| F2 | Energia / Cobrança indevida | SPE_ONUS_PROVA, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12, ENE_SERVICOS_ADICIONAIS_17, SPE_PRESCRICAO_6M, SPE_ACERTO_EXCESSO, SPE_ACERTO_6M, SPE_PAGAMENTO_PARCIAL, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, ENE_LEITURA_REAL_PREVALECE_42, ENE_CAUCAO_CONSUMIDOR_23, ENE_CAUCAO_RESTITUICAO_27 | Parcial |
| F5 | Gás / Cobrança após cancelamento | GAS_MUDANCA_COMERCIALIZADOR_242, GAS_DENUNCIA_SEM_ENCARGOS_81, SPE_PRESCRICAO_6M, SPE_ACERTO_EXCESSO, SPE_ONUS_PROVA, GAS_CAUCAO_23_27, CONS_NAO_SOLICITADO_9, GAS_RECLAM_FAT_CORTE_RQS_64, … | Falha |
| F6 | Energia / Cobrança após cancelamento | ENE_MUDANCA_FATURA_FINAL_6S_242, SPE_PRESCRICAO_6M, SPE_ACERTO_EXCESSO, SPE_ONUS_PROVA, ENE_CAUCAO_RESTITUICAO_27, CONS_NAO_SOLICITADO_9, ENE_RECLAM_FAT_SUSPENDE_CORTE_64, … (com a denúncia depois da revisão) | Parcial |
| C1 | Energia / Mudança de comercializador (à distância) | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, DIST_TELEFONE_5, ENE_MUDANCA_GRATUITA_3S_242, ENE_MUDANCA_FATURA_FINAL_6S_242, ENE_DIVIDA_MUDANCA_242, CONS_NAO_SOLICITADO_9, DIST_LIVRE_RESOLUCAO, … | Parcial |
| C2 | Energia / Cancelamento recusado (em casa) | DIST_LIVRE_RESOLUCAO, DIST_FORA_ESTAB_FORMA_9, DIST_SERVICO_15, DIST_REEMBOLSO_12, CCG_FORMALIDADES_22, … (sem DIST_TELEFONE_5; com a denúncia depois da revisão) | Falha |
| C3 | Energia / Fidelização ou penalização | ENE_FIDELIZACAO_CONTRAPARTIDA_19, ENE_FIDELIZACAO_MAX_12M_19, ENE_FIDELIZACAO_SEM_RENOV_AUTO_19, ENE_FIDELIZACAO_PRECO_19, … (com a indemnização depois da revisão) | Parcial |
| C4 | Energia / Aumento de mensalidade | ENE_ALT_CONTRATO_68, ENE_FIDELIZACAO_PRECO_19, PCD_ACAO_ENGANOSA_7, CCG_ALT_UNILATERAL_22, … | OK |
| C5 | Energia / Contrato ou condições que não aceitei (não sei) | ENE_ACEITACAO_EXPRESSA_20, ENE_CHAMADA_GRAVADA_243, DIST_TELEFONE_5, CONS_NAO_SOLICITADO_9, PCD_NAO_SOLICITADO_12, DIST_LIVRE_RESOLUCAO, DIST_INFO_PRE_4, DIST_FORA_ESTAB_FORMA_9, DIST_CONFIRMACAO_6, PCD_ACAO_ENGANOSA_7, ENE_SERVICOS_ADICIONAIS_17, DIST_SERVICO_15 | Parcial |

**Activação (20/10/2026):** Thiago reviu e mandou activar as 2 regras (`20261020140100_ativar_regras_energia_fidelizacao_denuncia.sql`, `revista_por = 'Thiago Pereira'`). As duas migrations foram aplicadas em produção com `supabase db push --linked`. O texto do Regulamento n.º 8/2026 não foi lido: o objecto declarado é a mobilidade eléctrica. Confirmar na próxima revisão que não alterou os artigos 19.º e 81.º.

### Pendente (não incluído)
- Backlog P2/P3 (secção G): tarifa social de gás no sector Energia, potência contratada, ajuda de documentos por tipo, texto de `consumos-estimados`, página sobre contratação não autorizada, condições SPE e fontes ENE.
