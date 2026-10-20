# Custos fixos e break-even

Registo dos custos reais da plataforma durante o piloto, para vigiar as excepções à regra "ficar nos tiers gratuitos" (CLAUDE.md, "Gestão de custo") e a regra 5 do "Uso de IA": medir o custo real nos primeiros 10–15 casos de cada funcionalidade com IA.

Valores sempre com a data da medição. Campos "a preencher" ainda não foram medidos — nunca estimar sem fonte.

## 1. Custos fixos mensais

| Fornecedor | Serviço | Plano | Custo mensal | Fonte / data |
|---|---|---|---|---|
| Supabase | Base de dados, Auth, Storage | Gratuito (pausa por inactividade aceite) | 0 € | CLAUDE.md |
| Clever Cloud | Hosting `dolado-platform` (runtime XS fixa, build em instância S) | Pago | a preencher | factura da Clever Cloud |
| Clever Cloud | Addon PostgreSQL residual (não usado) | a confirmar | a preencher | factura da Clever Cloud |
| Brevo | E-mail transaccional | a confirmar | a preencher | painel da Brevo |
| Resend | Recepção de e-mails (`respostas.dolado.pt`) | a confirmar | a preencher | painel do Resend |
| Cookiebot | Consentimento (1 domínio) | Gratuito | 0 € | CLAUDE.md |
| Domínio | `dolado.pt` | Anual | a preencher | registador |
| **Total** | | | **a preencher** | |

## 2. Custos variáveis

| Fornecedor | Base de custo | Notas |
|---|---|---|
| Stripe | Comissão por pagamento | a preencher com as taxas do contrato |
| Anthropic (Claude API) | Por chamada (tokens) | Orçamento cumulativo `ANTHROPIC_ORCAMENTO_USD` = 8 USD (12/10/2026); ver secção 3 |

## 3. Claude API — custo real por funcionalidade

Fonte: tabela `uso_api_claude` (uma linha por chamada, com `funcionalidade` e `custo_estimado_usd`). O orçamento é partilhado por todas as funcionalidades.

### 3.1 Sugestão do texto da reclamação (`rascunho_reclamacao`)

Ligada em produção desde 05/10/2026. Consulta: [`scripts/sql/custo-sugestao-texto-ia.sql`](../scripts/sql/custo-sugestao-texto-ia.sql) (SQL Editor da Supabase, cada bloco à parte; casos de contas admin excluídos). O mesmo registo junta a primeira reclamação e as novas comunicações — o bloco 3 dá também a média só da reclamação.

| Medição | Casos | Média por caso | Mediana | Máximo | Só reclamação | % do Avulso sem IVA | % do Caso + Proteção sem IVA | Gasto total da API | Orçamento restante | Câmbio USD→EUR |
|---|---|---|---|---|---|---|---|---|---|---|
| a preencher | | | | | | | | | | |

Conclusão: a preencher depois dos primeiros 10–15 casos.

### 3.2 Leitura de documentos do Monitor de Proteção

a preencher (`funcionalidade` do Monitor em `uso_api_claude`).

### 3.3 Análise das respostas das empresas (`analise_resposta`)

a preencher (ligada em produção desde 06/10/2026).

## 4. Break-even

Preços com IVA incluído (`src/lib/planos.ts`; IVA 23%):

| Produto | Preço | Sem IVA |
|---|---|---|
| Protecção | 4,99 €/mês | 4,06 € |
| Caso + Protecção | 7,99 €/mês | 6,50 € |
| Avulso | 11,99 € | 9,75 € |
| Caso Extra | 9,59 € | 7,80 € |

Cálculo: a preencher quando a secção 1 estiver completa (custos fixos ÷ margem por cliente, depois das comissões do Stripe e do custo da IA por caso).
