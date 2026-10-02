# Plano — Monitor de Proteção, fase 1 (telecom)

**Data:** 02/10/2026 · **Estado:** aprovado por Thiago a 02/10/2026 (decisões na secção 7)
**Base:** `F_MONITOR_PROTECAO_INTEGRACAO.md`, `F1`, `F2`, `F4`, `CLAUDE_API_MONITORIZACAO.md`

Decisões já tomadas (02/10/2026):
- Monitor antes dos itens que faltam da Fase 4.
- **Migrar já**: alertas de fidelização, alertas de promoção e Comparador de Faturas passam para o novo modelo; as tabelas antigas são removidas.
- **Revisão humana** obrigatória antes de comunicar ao cliente qualquer resultado da F2.

## 1. O que existe hoje em produção (contagem de 02/10/2026)

| Tabela | Linhas | Ativas |
|---|---|---|
| `alertas_fidelizacao_portal` | 3 | 1 |
| `alertas_promocao_portal` | 1 | 0 (desativado) |
| `comparacoes_fatura_portal` | 0 | — |

A migração é pequena. O risco está no código e nas regras que dependem destas tabelas, não nos dados: 2 Edge Functions de cron, o trigger de retenção `alertas_seguir_protecao`, `alertas_*_pendentes()`, 3 páginas do portal, a fila `/backoffice/faturas` e os testes `alertas_retencao` e `rls_isolamento`.

## 2. Modelo de dados (nomes em português, como o resto do projeto)

| Tabela | Papel | Quem escreve |
|---|---|---|
| `contratos_monitorizados` | Contrato do cliente. Valores atuais "canónicos": setor, fornecedor, referência, mensalidade, fim de fidelização, fim de promoção (+ descrição), vantagem, valor de cessação indicado pelo operador, CPE/CUI. Estado `parcial` / `completo` / `a_confirmar` / `terminado`. `desativado_em` com a mesma regra dos 6 meses. | Só servidor (service role); o cliente só lê os próprios |
| `contratos_campos` | Proveniência por campo: valor, origem (`cliente` / `contrato` / `fatura` / `admin`), documento, página, extração, confiança (`high`/`medium`/`low`/`not_found`/`ambiguous`), confirmado pelo cliente/admin, substituído em. Nunca se apaga nem se reescreve: uma correção cria uma linha nova. Um valor confirmado pelo cliente nunca é substituído por uma extração nova. | Só servidor |
| `documentos_monitor` | Ficheiro carregado (fatura ou contrato): bucket privado novo `documentos-monitor`, upload por URL assinada, `sha256` único por cliente (idempotência), estado `pendente` / `processado` / `a_rever` / `ilegivel`. | Só servidor |
| `extracoes_documento` | Cada chamada à Claude API: modelo, versão do schema e do prompt, tokens, custo estimado, latência, tentativas, resultado estruturado. Única por (documento, modelo, schema, prompt). | Só servidor; o cliente não lê |
| `faturas_monitor` | Fatura normalizada (data, período, total, recorrente, pontual, descontos, linhas, valor de cessação, fim de fidelização). Uma por documento. | Só servidor |
| `achados_monitor` | Findings da F2/F4: tipo, estado `detetado` / `em_revisao` / `confirmado` / `descartado` / `comunicado`, evidência, versão da regra, chave de idempotência única. O cliente só vê `comunicado`. | Só servidor/admin |
| `achados_revisoes` | Prova da revisão humana (decisão, alterações, revisor, data). Só inserção. | Só admin |
| `contratos_alertas_envios` | Um registo por alerta enviado (contrato + regra + data-alvo, único). Substitui as colunas `alerta_60d_enviado_em` etc. e garante que o mesmo alerta nunca sai duas vezes. | Só service role |

RLS em todas, com posse por `auth.uid()` e admin por `is_admin()`. Testes pgTAP novos (`monitor_protecao.test.sql`) e atualização de `rls_isolamento` e `alertas_retencao`.

## 3. Migração dos dados atuais

Em dois passos, para nunca haver um momento em que o código em produção aponte para tabelas que já não existem:

1. **Migration A** cria as tabelas novas e copia os 4 alertas. Cada alerta passa a ser um contrato `parcial`, com os campos de origem `cliente` (data manual) ou `contrato` (data extraída do contrato). Preserva `desativado_em` e os envios já feitos. A tabela de faturas antiga está vazia e não há nada a copiar. O código antigo continua a funcionar.
2. **PR com o código novo** (portal, backoffice, Edge Function e trigger de retenção a apontar para as tabelas novas).
3. **Migration B**, depois do deploy do passo 2: remove as 3 tabelas antigas, as funções `alertas_*_pendentes()` e o bucket `faturas-comparador` (vazio). O ficheiro de contrato do alerta de promoção desativado fica referenciado no bucket antigo `contratos-promocao` até ser apagado pela regra dos 6 meses.

## 4. Portal e backoffice

- **`/portal/contratos`**: "Os meus contratos". Lista com a próxima data relevante e um botão principal "Carregar uma fatura". Também é possível carregar um contrato ou introduzir dados à mão.
- **Detalhe do contrato**: mensalidade, fim de promoção, fim de fidelização, valor de cessação da última fatura, origem de cada dado, "Corrigir", histórico de faturas e "Tratar o meu caso".
- **Confirmação** depois de cada extração: "Encontrámos estes dados no documento. Confirme antes de começarmos a acompanhar." Mostra só os campos críticos.
- `/portal/alertas`, `/portal/promocoes` e `/portal/faturas` redirecionam para `/portal/contratos`, e o painel do portal passa a ter um único cartão "Monitor de Proteção".
- **Backoffice**: `/backoffice/faturas` passa a `/backoffice/monitor`, com a fila de extrações a rever e (no passo seguinte) a fila de achados, mais o custo acumulado da API.

## 5. Claude API

- Uma chamada por documento, sem ferramentas, com structured outputs (`output_config.format`), schema `telecom_invoice_v1` e `telecom_contract_v1`. O prompt de sistema trata o documento como dados, nunca como instruções.
- Nada da conta (nome, e-mail, NIF) entra no prompt.
- O resultado passa por validação de domínio (datas, valores negativos, formato de CPE/CUI, total vs. linhas) antes de ir para staging. Nunca vai diretamente para os dados canónicos.
- No máximo 2 tentativas, e só por erro técnico. Confiança baixa ou ambígua vai para revisão, sem repetir a chamada.
- **Orçamento do piloto**: soma de `extracoes_documento.custo_estimado_usd`, comparada com `ANTHROPIC_ORCAMENTO_USD`. Avisos ao `ADMIN_EMAIL` a 50/75/90%. Ao atingir o teto, os documentos ficam `pendente` (o upload nunca se perde) e o cliente não vê nenhum erro (regra 3 do "Uso de IA").

## 6. Ordem de entrega (PRs)

| PR | Conteúdo | Visível ao cliente? |
|---|---|---|
| **A** | Migration A, RLS, testes pgTAP, `src/lib/monitor/` (regras puras de datas, fusão de campos e idempotência, com testes) | Não |
| **B** | Upload, extração, confirmação, `/portal/contratos`, Edge Function única `verificar-monitor-datas`, trigger de retenção, redirecionamentos, backoffice | Sim, **só depois da nova Política de Privacidade** |
| **C** | Migration B (remover o que é antigo) | Não |
| **D** | F2: 3 regras (aumento não explicado, linha nova, possível dupla faturação), cruzamento com F1, fila de revisão, comunicação ao cliente. F4 privado telecom: estimativa com `calcularEncargoCancelamento` e comparação com o valor da fatura (`termination_amount_mismatch`) | Sim |

## 7. Decisões de Thiago (02/10/2026)

1. **Alertas de promoção:** passam de 30, 7 e 1 dia para **60 e 30 dias e na data**, como a fidelização.
2. **Conservação dos documentos carregados:** o PDF fica guardado **enquanto o contrato é acompanhado e é apagado 6 meses depois de a Proteção terminar** (mesma regra dos alertas).
3. **Teto de orçamento da API:** **5 USD** (`ANTHROPIC_ORCAMENTO_USD=5`), com avisos a 50/75/90%.
4. **Política de Privacidade:** nova versão redigida **em paralelo com o PR A**, para validação pela advogada antes do PR B chegar aos clientes.

## 8. Fora desta fase

Eletricidade e gás (schemas próprios, cláusulas de fidelização), encaminhamento de faturas por e-mail, regras F2 futuras (consumo anómalo, estimativas consecutivas…) e a migração para um modelo mais barato.
