# Programa de Parceiros — Fase 1: auditoria e arquitectura

Estado: **proposta para decisão de Thiago (20/10/2026)**. Nada implementado ainda.
Origem: prompt "Programa de Parceiros DoLado" (Parceiro de Indicação + Parceiro de Distribuição).

---

## 1. Auditoria — o que já existe e o que se reutiliza

| Área | O que existe (confirmado no repositório) | Reutilização |
|---|---|---|
| Indicações de amigos | `indicacoes_codigos` (1 código/conta, 8 caracteres `[A-HJ-NP-Z2-9]`), `indicacoes_visitas`, `indicacoes` (1 indicação por conta indicada, `referrer_user_id → utilizadores`), `indicacoes_recompensas` + histórico só de inserção; funções `indicacao_*` só `service_role`; rota `/r/<código>` com consentimento de marketing (Cookiebot) → cookie `dolado_indicacao` (id da visita, 30 dias, `.dolado.pt`) | **Rota `/r/`, consentimento, cookie, gerador de códigos, padrão "decisão atómica na BD chamada pelo webhook"**. Não se reutiliza a tabela `indicacoes`: exige que quem indica seja uma conta e mistura recompensas de 20% com comissões em dinheiro |
| Webhook Stripe | `src/lib/stripe/webhook.ts`: idempotência por evento (`stripe_webhook_events`), `invoice.paid` (com `billing_reason`, `amount_paid`), `refund.*`, `charge.dispute.created`; ganchos opcionais `deps.indicacoes` | **Novo gancho `deps.parceiros`** com o mesmo desenho (dependências injetáveis, testes `node --test`) |
| Proteção gratuita 30 dias | `protecao_gratuita` (estado interno, sem Stripe), `conta_tem_protecao(user)` = subscrição **ou** período em curso — usada por `tem_protecao()`, alertas, aviso sectorial, resumo mensal, trigger de `user_access`; `protecao_gratuita_manutencao()` termina períodos e desactiva dados (6 meses); avisos com reserva → envio → conclusão; adesão durante o período com `trial_end` (`adesao()` em `src/app/actions/stripe.ts`) | **É exactamente o modelo do acesso patrocinado.** Basta acrescentar uma segunda fonte a `conta_tem_protecao()` e a `calcularAcesso()` (`src/lib/acesso.ts`) |
| Acesso na aplicação | `Acesso.temProtecao` (subscrição ou período) vs. `Acesso.temSubscricao` (só paga — bloqueia 2.º Checkout, cancelamento) | Acrescentar `acessoPatrocinado` sem tocar em `temSubscricao` |
| Backoffice | V2 (`src/components/backoffice/`), páginas `/backoffice/indicacoes`, `/backoffice/protecao-gratuita`, padrão Server Action + `createAdminClient` depois de validar admin | Nova secção `/backoffice/parceiros` no mesmo padrão |
| E-mails | Brevo, `emailV2`, dicionário `emails` pt/en, escape `escaparHtml` | Reutilizar |
| Piloto Remax | Cupão Stripe `duploprestigio26` (100%, forever, Caso + Proteção) — sem código próprio | **Não mexer.** O mockup `parceiros-mockup/` (Duplo Prestígio) é só visual; usa "tu", que não é o tom da DoLado |
| Limitação de tentativas | **Não existe** infraestrutura de rate limiting | **A construir** (tabela de tentativas na BD) |
| Pagamentos registados | `stripe_payments` (sessões), `stripe_subscriptions` (estado), sem tabela de faturas | Para "3 mensalidades pagas" é preciso **registar as faturas pagas** relevantes (nova tabela, só para subscrições atribuídas a um parceiro) |

---

## 2. Arquitectura proposta

### 2.1. Princípio

Duas peças independentes, ligadas só por uma tabela comum `parceiros`:

```
parceiros ─┬─ parceiros_codigos ── parceiros_visitas ── parceiros_atribuicoes ── parceiros_comissoes ── parceiros_pagamentos
           ├─ parceiros_oportunidades (B2B) ─────────────────────────────────────┘
           └─ parceiros_pacotes ── parceiros_codigos_acesso ── acessos_patrocinados
```

Programa de amigos (`indicacoes*`) fica intacto.

### 2.2. Parceiro de Indicação

**Tabelas (todas RLS; cliente nunca lê; só admin lê; escrita só por funções `parceiro_*` com `service_role`):**

- `parceiros_candidaturas` — nome, e-mail, empresa, tipo pretendido, descrição, versão/texto aceite, estado (`pendente`/`aprovada`/`rejeitada`), motivo. Retenção: rejeitadas apagadas aos 12 meses (a decidir).
- `parceiros` — id, tipo (`indicacao` | `distribuicao` | ambos), nome, contacto administrativo, NIF/IBAN **não** guardados na Fase 1 (ficam na contabilidade), estado (`em_negociacao`/`ativo`/`suspenso`/`encerrado`), `user_id` opcional (para detectar auto-indicação), histórico de alterações (tabela só de inserção).
- `parceiros_condicoes` — versões das condições comerciais por parceiro (valor fixo por produto, % B2B, mínimo de pagamento, validade). **Valores na BD, não no código**: Proteção 500, Caso + Proteção 800 (cêntimos), B2B 10% (até 20% com autorização).
- `parceiros_codigos` — código do parceiro no **mesmo espaço** dos códigos de amigos (índice único sobre a união garantido por trigger), para servir em `/r/<código>`.
- `parceiros_visitas` / `parceiros_atribuicoes` — como em `indicacoes`, uma atribuição por conta, first-touch, 30 dias.
- `parceiros_faturas_pagas` — `invoice.id` (único), subscrição, valor pago sem IVA (`amount_paid - tax`), descontos, data. Só para subscrições de contas atribuídas.
- `parceiros_comissoes` — uma por atribuição (B2C) ou por oportunidade ganha (B2B); estados `pendente → em_validacao → elegivel → aprovada → paga` e `cancelada`/`revertida`; histórico só de inserção.
- `parceiros_pagamentos` — pagamento manual (data, referência, aprovado por, lista de comissões); comissão só pode estar num pagamento (índice único).

**Precedência com o programa de amigos (regra única):** a **primeira** atribuição válida da conta ganha (amigo **ou** parceiro) e nunca muda. Uma conta atribuída a um parceiro nunca recebe o desconto de 20% de amigos, e vice-versa. Garantido na BD (trigger cruzado nas duas tabelas de atribuição).

**Ciclo B2C:**
1. Visita `/r/<código>` → consentimento de marketing → visita gravada (o mesmo componente decide se o código é de amigo ou de parceiro).
2. Atribuição nos mesmos pontos de hoje (`/auth/callback`, modalidade, Checkout).
3. Webhook `invoice.paid` com `amount_paid > 0` → regista a fatura; comissão `pendente`.
4. 3.ª fatura paga > 0 € da **mesma** subscrição → `elegivel` (com sinais de risco → `em_validacao`).
5. Reembolso/disputa de uma das 3 faturas antes de paga → `revertida`; depois de paga → aviso ao admin (nada automático).
6. Cancelamento antes da 3.ª → fica `pendente` e é `cancelada` quando a subscrição termina.
7. Avulso e Caso Extra: nunca comissão. Proteção gratuita (0 €) e cupão 100% (Remax): não contam como mensalidades.

**Ciclo B2B:** `parceiros_oportunidades` (parceiro, entidade, contacto opcional, data, estado `nova…ganha/perdida`, validade 90 dias + prorrogação com motivo, valor contratual, %). Ganha → admin regista receita recebida (sem IVA, menos reembolsos) → comissão calculada sobre o recebido no 1.º ano.

**Pagamento:** resumo mensal no backoffice (elegíveis por parceiro, mínimo acumulado 25 €) → aprovar → registar pagamento manual. Sem transferências automáticas.

### 2.3. Parceiro de Distribuição

- `parceiros_pacotes` — parceiro, serviço (`protecao` só na Fase 1), quantidade, duração em meses (3), valor acordado, validade para activação, estado do pagamento (`por_pagar`/`pago` — confirmado pelo admin), condições.
- `parceiros_codigos_acesso` — código de 12 caracteres (`crypto.randomBytes`, ~60 bits) guardado **só como hash** (como os links de revisão); estado `emitido`/`ativado`/`anulado`/`expirado`; emitido_em, ativado_em, `user_id` do beneficiário. Os códigos em claro só existem uma vez, no momento da geração → exportação CSV descarregada uma única vez.
- `acessos_patrocinados` — user_id, pacote, código, `inicio_em`, `termina_em` (meses de calendário, `inicio + interval '3 months'`), estado (`ativo`/`terminado`/`convertido`), prova da aceitação (versão + texto). Imutável como `protecao_gratuita`.
- `parceiros_tentativas_codigo` — limitação: N tentativas falhadas por conta/hora (sem IP, como o resto do projecto).

**Acesso:** `conta_tem_protecao(user)` passa a ser *subscrição* **ou** *Proteção gratuita* **ou** *acesso patrocinado em curso*. Tudo o que já usa a função (alertas, aviso sectorial, resumo mensal, RLS de criar alertas, trigger do fim da Proteção) passa a funcionar sem mais alterações. Na aplicação, `calcularAcesso()` ganha `acessoPatrocinado`; `temSubscricao` não muda.

**Sem Stripe:** activação não cria Customer, subscrição nem fatura. Fim → manutenção (pg_cron, reaproveitando o job da Proteção gratuita) termina o acesso e desactiva os dados se não houver outra Proteção. Avisos ao beneficiário: activação, 15 dias antes, fim. Adesão voluntária durante o período → 1.ª cobrança no fim do acesso patrocinado (`trial_end`, mesma lógica da Proteção gratuita).

**Relatório da empresa:** só agregados (adquiridos, emitidos, activados, disponíveis, expirados, taxa, activos agora); nunca nomes, e-mails nem actividade. Com menos de 5 activações, mostrar "menos de 5".

### 2.4. Segurança e RGPD

- RLS: nenhuma das tabelas novas é legível pelo cliente, excepto `acessos_patrocinados` (o próprio).
- Parceiros nunca têm conta nem acesso na Fase 1 → impossível consultarem dados de clientes.
- Os e-mails aos parceiros (aprovação, resumo de comissões, pagamento) só levam contagens e valores.
- Testes pgTAP novos (`parceiros.test.sql`, `acessos_patrocinados.test.sql`) e de contrato no webhook.

---

## 3. Decisões

Decididas por Thiago a 20/10/2026:

1. **Beneficiário que já tem subscrição paga** e insere um código → **recusado**; o código fica por usar e a subscrição não é tocada.
2. **Proteção gratuita de 30 dias depois de um acesso patrocinado** → **não**: o acesso patrocinado conta como "já teve Proteção" (`protecao_gratuita_ja_teve_subscricao`).
3. **Cliente indicado por parceiro** → **sem desconto**; só o parceiro recebe comissão.
4. **Atribuição sem consentimento de marketing** → além de `/r/<código>`, campo opcional **"Código de parceiro"** no registo e antes do Checkout (acto expresso do cliente, sem cookie; mesma regra first-touch).

Ainda em aberto:

5. **Comissão fixa (5 €/8 €)** sobre valor com IVA — confirmar que é um valor fixo, independente do IVA (as % B2B são sem IVA).
6. **Parceiros pessoa singular**: contabilidade/fiscalidade (recibo, retenção na fonte) e contrato de parceria — fora do código, mas condição para pagar.

## 4. Impacto jurídico (para a advogada; nada publicado automaticamente)

- **Política de Privacidade (nova versão):** candidaturas de parceiros; atribuição de clientes a parceiros (finalidade, base — interesse legítimo/consentimento do cookie); acessos patrocinados (a empresa sabe que entregou um código, a DoLado não lhe diz quem o activou); retenção.
- **Termos (nova versão):** secção sobre acessos patrocinados (duração, sem cobrança, fim automático, sem conversão automática), e transparência de que alguns clientes chegam por parceiros que recebem comissão.
- **Cookiebot:** a finalidade do `dolado_indicacao` passa a incluir parceiros comerciais — actualizar a declaração.
- **Acordos:** contrato-tipo de Parceiro de Indicação e de Distribuição (incluindo subcontratação? não — a empresa não trata dados dos beneficiários na DoLado).
- **Páginas públicas:** `/parceiros` nova; `/empresas` já existe e tem de ser alinhada (não duplicar). Páginas de problemas: sem impacto.

## 5. Plano de entrega (PRs pequenos)

1. Base de dados + testes pgTAP (parceiros, condições, códigos, atribuições, comissões, pacotes, acessos, `conta_tem_protecao`).
2. Acesso patrocinado: activação `/ativar-codigo`, `calcularAcesso`, manutenção, e-mails, backoffice de pacotes/códigos/relatório.
3. Parceiro de Indicação: `/parceiros` + candidatura, aprovação, `/r/` partilhado, webhook (faturas, comissões, reversões), backoffice de comissões e pagamentos, oportunidades B2B.
4. Documentos legais (depois da advogada) e ligação em produção por interruptor (`PARCEIROS_ATIVO=1`, desligado por omissão).
