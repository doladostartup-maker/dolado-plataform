# Plano — Acompanhamento de serviços (contrato + faturas)

Estado: **implementado localmente, à espera de validação de Thiago antes de push/deploy** (04/10/2026).
Decisões de Thiago (03/10/2026): tudo o que mereça atenção passa por revisão humana; os dados atuais do Monitor são de teste (migração mínima, sem releitura); nome "Serviços acompanhados".
Substitui/complementa a F2 (`F2_MONITOR_FATURAS.md`) no que toca à comparação de faturas.

Princípio: **contrato = o que foi contratado; fatura = o que aconteceu num período; comparação = código.**
A Proteção funciona com ou sem contrato. Uma fatura nunca altera dados contratuais.

---

## 1. Como contrato e fatura estão modelados hoje

| Tabela | Papel atual |
|---|---|
| `contratos_monitorizados` | Uma linha por "contrato" acompanhado. Colunas canónicas (fornecedor, mensalidade, datas de fidelização/promoção, cessação, CPE/CUI…). **É também o único "contentor" de faturas** — não existe a noção de serviço sem contrato. |
| `contratos_campos` | Proveniência por campo (`origem`: cliente, contrato, **fatura**, admin, calculado; `estado`: proposto, atual, em_conflito, substituido, rejeitado). |
| `documentos_monitor` | Ficheiros (fatura/contrato), `contrato_id` preenchido no upload (se carregado na página do contrato) ou pelo processamento. |
| `extracoes_documento` | Resultado bruto da Claude API (staging). |
| `faturas_monitor` | Fatura normalizada: emissão, período, total, recorrente, pontual, descontos, `linhas` (categorias: servico_base, servico_extra, equipamento, desconto, consumo, imposto, outro), cessação, fim de fidelização. `contrato_id` **obrigatório**. |
| `achados_monitor` | Situações F2/F4 para revisão humana; o cliente só vê as comunicadas. |
| `contratos_alertas_envios` | Alertas de datas (fidelização/promoção 60/30/fim). |

**Onde contrato e fatura estão misturados:**
1. A fatura propõe valores **para os campos do contrato**: `fornecedor`, `referencia_contrato`, `mensalidade_cents`, `data_fim_fidelizacao`, `cessacao_*` (`validarExtracaoFatura` → `registarPropostas` → `monitor_campo_propor`).
2. Sem contrato, o valor lido da fatura **passa a ser o "valor do contrato"** depois de o cliente carregar em "Correto" (`origem = fatura`, `estado = atual`).
3. `faturas_monitor` só existe dentro de um contrato.

## 2. Porque a fatura consegue competir com o contrato

`monitor_campo_propor()` trata a fatura como mais uma fonte do mesmo campo. Se o valor atual veio do cliente
ou foi confirmado, a proposta diferente fica `em_conflito` e o portal mostra **"Usar este / Manter o meu"**.
Ou seja: a regra "nunca substituir em silêncio" está a funcionar, mas o modelo assume que a fatura é uma
fonte válida de condições contratuais — que é o erro conceptual.

Agravante: o fornecedor proposto é normalizado para o nome comercial ("Vodafone") e o do contrato está com o
nome legal ("Vodafone Portugal, Comunicações Pessoais, S.A."), por isso **até uma fatura do mesmo cliente gera
conflito no fornecedor**.

**Caso real reproduzido nos dados de produção** — contrato `8877e1f4…` (Vodafone, 71,46 €, sem referência):
a fatura de outro cliente (ref. 315204142, mensalidade 53,96 €, período 16/07–15/08/2026) foi associada porque foi
carregada na página do contrato. Resultado: `fornecedor` e `mensalidade_cents` em conflito e `referencia_contrato` proposta.

## 3. Como funciona hoje o "matching"

- Carregado na página de um contrato → associado a esse contrato **sem nenhuma verificação**.
- Carregado na lista → `contratoParaDocumento()` procura um contrato do cliente com o **mesmo nome comercial de fornecedor**; senão cria um novo.
- Não são extraídos NIF, titular, número de cliente, conta nem número de serviço (a extração da fatura só tem `referencia_contrato`; a do contrato também não tem identificadores do titular).

## 4. Como funciona hoje o comparador (F2, `regrasFaturas.ts`)

Só telecom. Compara a fatura com a **anterior** pelo `recorrente_cents` (soma das linhas marcadas recorrentes):
aumento ≥ 1 € e ≥ 2 % → achado `aumento_nao_explicado` (explicado se houver fim de promoção registado no intervalo);
linha recorrente nova face às 3 anteriores → `linha_nova`; linhas iguais ou mesmo período → `possivel_dupla_faturacao`.
F4 compara o valor de cessação da fatura com a estimativa. Tudo vai para `achados_monitor` (revisão do admin);
**o cliente não vê nenhuma comparação mês a mês** — só documentos e dados do contrato.
Não existe comparação fatura × contrato (mensalidade, desconto), nem padrão observado, nem histórico.

## 5. Dados já estruturados

Em produção: 6 contratos (4 ativos, 3 contas), 5 documentos (3 contratos, 2 faturas), 2 faturas normalizadas, 39 campos, 0 achados.
Já temos por fatura: emissão, período, total, recorrente, pontual, descontos e **linhas categorizadas** — o suficiente para
separar mensalidade base, descontos, consumos, extras, equipamentos e impostos **sem nova chamada à IA**.

## 6. Dados que exigem nova extração

- **Identificação** (fatura e contrato): titular, NIF do titular, número de cliente, referência de conta, número de serviço (telefone/CPE/CUI), número da fatura.
- **Fatura**: indicação explícita de promoção/desconto com data de fim (nível 2).
- **Contrato**: desconto mensal da promoção, início da promoção, serviços incluídos.

Novo schema `fatura_v3` / `contrato_v4` (continua 1 chamada por documento). Os 5 documentos existentes podem ser relidos uma vez
(≈ 0,16 USD ao custo medido: contrato 0,041 USD, fatura 0,019 USD). Sem releitura, ficam com associação "por confirmar".

## 7. Alterações de schema recomendadas (todas aditivas)

Mantém-se o nome da tabela `contratos_monitorizados`, mas passa a significar **serviço acompanhado**
(renomear obrigaria a reescrever RLS, funções, Edge Function e testes sem ganho para o cliente).

1. **`servicos_identificadores`** (nova): `servico_id`, `tipo` (nif_titular, titular, numero_cliente, referencia_conta, referencia_contrato, numero_servico, cpe, cui), `valor_normalizado`, `origem` (contrato/fatura/cliente/admin), `documento_id`, `created_at`. Vários valores por serviço; só inserção.
2. **`documentos_monitor`** (+colunas): `associacao_estado` (`confirmada`, `possivel`, `conflito`, `novo_servico`, `manual`), `associacao_confianca`, `associacao_motivos` jsonb, `associacao_conflitos` jsonb, `associacao_servico_sugerido`, `associado_manualmente_por/em` (auditoria). Uma fatura com conflito ou possível **não** entra em `faturas_monitor` até ser resolvida.
3. **`faturas_monitor`** (+colunas): `numero_fatura`, `base_cents`, `descontos_cents` (já existe), `consumos_cents`, `extras_cents`, `equipamentos_cents`, `creditos_cents`, `impostos_cents`, `identificadores` jsonb, `confirmada_cliente_em`. Índice único parcial (`contrato_id`, fornecedor, `numero_fatura`) para duplicados.
4. **`contratos_versoes`** (nova): `servico_id`, `valido_desde`, `valido_ate`, `mensalidade_cents`, `desconto_cents`, `descricao_promocao`, `promocao_inicio`, `promocao_fim`, `servicos` text[], `documento_id`, `origem`, `motivo` (inicial, renegociação, alteração tarifária, nova promoção, mudança de pacote, correção), `created_at`. A versão em vigor espelha os campos atuais de `contratos_campos` (que continuam a ser a proveniência); ao aceitar uma alteração cria-se nova versão e fecha-se a anterior.
5. **`eventos_servico`** (nova, timeline): `servico_id`, `fatura_id` (nullable), `tipo` (`sem_alteracao_relevante`, `mensalidade_alterada`, `diferenca_preco_contrato`, `promocao_aplicada`, `promocao_em_falta`, `promocao_alterada`, `promocao_terminada`, `consumo_adicional`, `servico_extra`, `cobranca_recorrente_nova`, `cobranca_pontual`, `credito_aplicado`, `alteracao_impostos`, `alteracao_periodo`, `servico_alterado`, `diferenca_nao_explicada`, `servico_errado`, `dados_insuficientes`, `desconhecido`, e mais tarde `alerta_enviado`, `contrato_iniciado`…), `base` (`contrato` | `historico`), `periodo`, `montante_cents`, `severidade` (`ok`, `info`, `atencao`), `dados` jsonb (valores de origem), `confianca`, `versao_regra`, `contrato_versao_id`, `substituido_em`, `created_at`. Recalcular = marcar os anteriores `substituido_em` e inserir novos (nunca apagar).
6. **`contratos_campos`**: o processamento de faturas deixa de propor `fornecedor`, `mensalidade_cents` e `referencia_contrato`. Só continua a propor o que a fatura diz **explicitamente** sobre fidelização/cessação (nível 2), com origem "Lido da fatura", e nunca por cima de um valor de contrato — diferença = evento "Rever alteração", não "Usar este".

Padrões observados (mensalidade habitual, desconto habitual) **calculados na leitura** a partir de `faturas_monitor`, que é imutável — o histórico "até setembro 71,46 €, desde outubro 74,46 €" sai das próprias faturas, sem tabela extra nem risco de reescrita.

## 8. Acompanhamento sem contrato

Primeira fatura → associação (`novo_servico`) → cria `contratos_monitorizados` (setor, fornecedor com origem fatura apenas como **identificação**) + identificadores + `faturas_monitor` + evento `dados_insuficientes` ("Primeira fatura analisada"). A página mostra resumo observado, histórico e o convite discreto "Tem o contrato?".

## 9. Associação posterior de um contrato

Contrato carregado na página do serviço → extração `contrato_v4` → mesma lógica de associação (identificadores) → se confirmada: campos contratuais propostos ao cliente + versão inicial em `contratos_versoes` → reanálise. Se o contrato for de outro titular/serviço: mesmo ecrã de conflito das faturas.

## 10. Comparação retroativa

Sem IA: para cada fatura do serviço, escolhe a versão contratual válida no período (`valido_desde ≤ periodo_fim`) e recalcula os eventos (eventos anteriores ficam `substituido_em`). Corre em segundo plano (`after()`), igual ao processamento atual. Mensagem: "Encontrámos 6 faturas anteriores. Vamos compará-las com as condições do contrato."

## 11. Histórico

`src/lib/monitor/acompanhamento.ts` (código puro, testável): `compararFatura(atual, anteriores, versaoContrato | null) → Evento[]` e `fraseEvento(evento, comContrato) → string` (frases determinísticas; vocabulário "contratado/contratual" só quando `base = contrato`). A página lista por período (mais recente primeiro): total, símbolos ✓/ℹ/⚠ e frase. Ordem da página: resumo → histórico → situações → condições do contrato → padrões observados → documentos.

## 12. Integração com os alertas existentes

- Alertas de datas (`verificar-monitor-datas`) continuam a ler `data_fim_fidelizacao`/`data_fim_promocao` de `contratos_monitorizados` — sem alteração.
- Eventos `atencao` substituem as regras F2 atuais como origem dos `achados_monitor` (mesma revisão humana e mesmo e-mail `achadoMonitor.ts`); as versões de regra passam a `f2_*_v2`. Nada de novo sistema de envio.
- Ver decisão 1 abaixo sobre o que o cliente vê diretamente.

## 13. Impacto no consumo de IA

Mesmo número de chamadas (1 por documento). +~150 tokens de saída por documento (identificadores). Associação, comparação, frases e reanálise retroativa: **0 chamadas**. Releitura única dos 5 documentos existentes ≈ 0,16 USD (opcional).

## 14. Riscos de migração

| Dado em produção | O que o modelo novo exige | Risco |
|---|---|---|
| Contrato `8877e1f4…` com fatura de **outro cliente** associada (2 conflitos + 1 proposta pendentes) | Rejeitar as 3 propostas (ficam no histórico como `rejeitado`), retirar a fatura do serviço (`faturas_monitor` apagada — é derivada da extração, que fica) e pôr o documento em `associacao_estado = conflito` | Apagar 1 linha derivada; propostas mudam de estado |
| Serviço `f673771e…` só com fatura: `mensalidade_cents` 27,43 € e `referencia_contrato` com origem fatura e estado `atual` | Mensalidade passa a **observada**: linha fica `substituido` (motivo migração), coluna canónica `mensalidade_cents` a null; referência copiada para `servicos_identificadores` | Muda o que o cliente vê como "mensalidade do contrato" (passa a "mensalidade observada") |
| 4 contratos sem identificadores | Associação de novas faturas fica "possível" até haver identificadores (releitura ou primeira fatura confirmada) | Mais perguntas ao cliente no início |
| Alertas enviados, cessação, custo de saída | Inalterados | Nenhum |

Tudo o resto é aditivo (colunas/tabelas novas, funções novas). Nenhum `drop`.

---

## Testes previstos

Puros (`node --test`): A–R e S/T sobre `acompanhamento.ts`, `associacao.ts` e `processamento.ts`.
pgTAP: `supabase/tests/database/acompanhamento_servicos.test.sql` (RLS das tabelas novas, imutabilidade de eventos/identificadores, versões não sobrepostas, associação manual auditada).
Contrato (`npm run test:contrato`): cenário 40 (fatura Vodafone de outro cliente) contra as tabelas reais.
U/V: verificação local no browser (navegação e backoffice abertos durante o processamento).
