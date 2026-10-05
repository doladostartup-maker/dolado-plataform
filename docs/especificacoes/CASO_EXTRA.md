# Caso Extra — subscritores que já usaram o caso do mês (05/10/2026)

Um subscritor do **Caso + Proteção** que já usou o caso incluído no ciclo pode tratar mais um caso por **11,99 €** (preço normal do Avulso: 14,99 €, cerca de 20% de desconto), sem códigos a introduzir, sem mudar de plano e sem criar outra conta.

## Três formas de ter direito a tratar um caso

| | Caso mensal | Caso Extra | Avulso |
|---|---|---|---|
| Para quem | Caso + Proteção ativo | Caso + Proteção ativo (`active`/`trialing`) **sem casos disponíveis** | Quem não tem subscrição |
| Preço | Incluído (7,99 €/mês) | 11,99 € (pagamento único) | 14,99 € (pagamento único) |
| Origem em `case_credit_grants` | `invoice:<fatura>` (sem linha por caso consumido) | `checkout:<sessão>`, `produto = 'caso_extra'` | `checkout:<sessão>`, `produto = 'avulso'` |
| Conta em `avulso_credits` | Não | Sim (compra única por usar) | Sim |
| Limite de 4 | Sim (só os casos da subscrição) | Não | Não |
| Fim da subscrição | Congela 90 dias | **Fica disponível** (não congela, não desaparece) | Fica disponível |
| Conversão na 1.ª mensalidade | — | **Nunca** | Sim (se ainda por usar) |
| Reembolso total | — | Sai do saldo se ainda por usar | Sai do saldo se ainda por usar |

Proteção sozinha (sem casos incluídos) **não** dá direito ao Caso Extra: continua a ver o Avulso. Pagamento em atraso (`past_due`) também não dá o desconto. Se Thiago decidir alargar, a regra está num único sítio: `direitoCasoExtra()` em `src/lib/casoExtra.ts`.

## Ordem de consumo (inalterada)

`consumir_credito_caso(user, origem)`:

1. **Modo normal** (portal com casos disponíveis, "Usar um caso disponível"): primeiro os casos mensais; depois a compra única mais antiga (Avulso ou Caso Extra, por `concedido_em`).
2. **Modo vinculado** (pedido pago no Checkout): o pedido gasta o caso **dessa compra** — um pedido pago com um Caso Extra gasta esse Caso Extra, mesmo que entretanto tenha chegado um caso mensal (que fica por usar).

Não há regras implícitas: o Caso Extra é só mais uma compra única na via que já existia para o Avulso.

## Fluxo

1. "Os meus casos" mostra **Casos deste mês** (`0 de 1 utilizado` / `1 de 1 utilizado`, próximo caso incluído = `user_access.current_period_end`, gravado a partir do período da subscrição Stripe). Com o caso do mês usado e sem outros casos por usar: "Já utilizou o seu caso incluído neste mês" + oferta + CTA "Tratar um Caso Extra — 11,99 €". O painel ("O seu plano") mostra as mesmas linhas.
2. O CTA (e "Abrir novo caso", que já levava ao fluxo) abre `/tratar-caso`: o cliente descreve o caso; o formulário anuncia o Caso Extra (`entradaDoPedido` → `caso_extra`).
3. O pedido fica em `pedidos_caso` (rascunho → aguarda_pagamento). **Nada se perde no pagamento**: é o mesmo mecanismo do "Tratar o meu caso"; não há estados novos.
4. `/tratar-caso/modalidade` mostra só o Caso Extra (nunca o Avulso ao lado, que custaria mais pelo mesmo).
5. Modal `ConfirmarCompra` (fluxo `caso_extra`, plano `avulso`): Termos + início imediato; registo em `consentimentos_compra` (`tipo_compra = 'caso_extra'`).
6. `confirmarCompra` → `checkoutPedidoCaso` (sessão + posse do pedido) → `compraCasoExtra`:
   - `direitoCasoExtra(acesso)` com o acesso gravado pelo webhook;
   - confirmação na subscrição Stripe (`subscricaoStripeConfirmaCasoExtra`: ativa, Caso + Proteção, do Customer da conta);
   - Price ID do servidor (`STRIPE_PRICE_CASO_EXTRA_ID` ou `CASO_EXTRA.stripePriceId`); sem códigos promocionais;
   - Checkout com `customer` = Customer da conta (nunca `customer_creation`/`customer_email`);
   - metadata (sessão e PaymentIntent): `plano=caso_extra`, `tipo=extra_case`, `user_id`, `pedido_id`, `stripe_subscription_id`, `consentimento_compra_id`, `tipo_compra`;
   - `success_url` = `/tratar-caso/recebido?pedido=…` (área com sessão), `cancel_url` = modalidade. Nunca `/criar-conta`.
   - Sem direito → volta à modalidade com `erro=caso-extra-indisponivel`; **nunca cobra o Avulso no lugar dele**.
7. Webhook (fonte de verdade): `checkout.session.completed` / `async_payment_succeeded` → `conceder_credito_caso(user, 'checkout:<sessão>', null, 'caso_extra')` (idempotente pela chave primária `origem`) → `converter_pedido_em_caso(pedido, user, 'checkout:<sessão>')` → caso com `origem_credito = 'caso_extra'`, compra `consumido` com `caso_id`. Pagamento em `stripe_payments` com `plano = 'caso_extra'` e **sem** `stripe_subscription_id` (o fim da subscrição não o marca como cancelado). Plano, subscrição e Customer não são tocados.
   - `metadata.plano = 'caso_extra'` em modo subscrição ou sem `user_id` → `ignorado_modo_incoerente` (nunca cai no fluxo "compra sem conta").
   - Pagamento confirmado depois de a subscrição terminar: o caso pago é dado na mesma.
8. E-mail de confirmação (já obrigatório como suporte duradouro — não há e-mail novo): produto "Caso Extra (Benefício de subscritor — 20% de desconto)", valor pago, "A sua subscrição: continua ativa e não foi alterada", botão "Ver os meus casos". Sem passos de criar conta.

## Auditoria por crédito

| Pergunta | Onde |
|---|---|
| Origem | `case_credit_grants.origem` + `produto` |
| Data | `concedido_em`; mudança de estado em `estado_em` |
| Pagamento Stripe | `stripe_payments.stripe_session_id` = `origem` sem `checkout:` (plano `caso_extra`) |
| Usado ou não | `estado` (`disponivel` / `consumido` / `reembolsado`) |
| Caso em que foi usado | `case_credit_grants.caso_id`; e `casos.origem_credito` no caso |
| Consentimento | `consentimentos_compra` (`tipo_compra = 'caso_extra'`, ligado à sessão pelo webhook) |

Backoffice: o detalhe do caso mostra "origem comercial: Caso incluído na subscrição / Caso Extra (subscritor) / Avulso / sem registo".

## Correção incluída: limite de 4

Antes, o limite de 4 (conceder e restaurar) contava também as compras únicas por usar: 3 casos mensais + 1 Caso Extra (ou Avulso) = 4 → a renovação não dava nada. Agora o limite aplica-se **só aos casos da subscrição** (`case_credits - avulso_credits`). Também vale para o Avulso (a favor do cliente). Dois testes antigos que codificavam a regra anterior foram atualizados (`creditos_caso.test.sql`, `rls_isolamento.test.sql`).

## Métricas (gtag, só com consentimento; o portal não carrega medição)

`extra_case_offer_viewed` (modalidade), `extra_case_checkout_started` (modal), `extra_case_purchased` e `extra_case_used` (página "Recebemos o seu caso", quando o pedido foi pago com um Caso Extra — compra e uso acontecem juntos). Mantêm-se `modalidade_escolhida` (`plano: caso_extra`), `checkout_iniciado` e `pagamento_concluido`.

## Ativação em produção

1. Migration `20261005190000_caso_extra.sql` aplicada em produção a 05/10/2026 (`supabase db push --linked`, depois do `--dry-run`), antes do merge.
2. Produto "Caso Extra" criado no Stripe (live) a 05/10/2026: `price_1UNGPnBtJL9VeDPfJUIG2ZvK`, em `CASO_EXTRA.stripePriceId` (`STRIPE_PRICE_CASO_EXTRA_ID` na Clever Cloud pode substituí-lo).
3. Termos `2026-10-05` (Caso Extra nas secções 5, 6, 8, 9 e 10; limite de 4 só nos casos da subscrição), validados a 05/10/2026. A Política de Privacidade não nomeia produtos: sem nova versão.
4. Merge/deploy: a oferta fica ativa. Sem Price ID (vazio), a oferta não aparece e o fluxo continua com o Avulso.

## Ficheiros

- Migration: `supabase/migrations/20261005190000_caso_extra.sql`
- Regras: `src/lib/casoExtra.ts` (direito, casos do mês), `src/lib/stripe/casoExtra.ts` (parâmetros do Checkout), `src/lib/planos.ts` (`CASO_EXTRA`), `src/lib/stripe/planos.ts` (`PRECO_CASO_EXTRA_ID`)
- Checkout: `src/app/actions/stripe.ts` (`compraCasoExtra`), `src/lib/consentimentoCompra.ts` (fluxo `caso_extra`)
- Webhook: `src/lib/stripe/webhook.ts`, `src/lib/stripe/webhookDependencias.ts`; e-mail `src/lib/email/pagamento.ts`
- Interface: `src/components/portal/CasoExtra.tsx`, `src/app/portal/casos/page.tsx`, `src/app/portal/_components/PortalDashboard.tsx`, `src/app/tratar-caso/{page.tsx,modalidade/page.tsx,recebido/page.tsx,_components/FormularioCaso.tsx}`, `src/components/compra/{ConfirmarCompra,BotaoComprar}.tsx`, `src/app/backoffice/casos/[id]/page.tsx`
- Testes: `src/lib/casoExtra.test.mjs`, `src/lib/stripe/webhook.test.mjs` ("Caso Extra"), `src/lib/stripe/webhook.contrato.test.mjs` (cenário 14), `src/lib/email/pagamento.test.mjs`, `supabase/tests/database/creditos_caso.test.sql` (secção 13)
