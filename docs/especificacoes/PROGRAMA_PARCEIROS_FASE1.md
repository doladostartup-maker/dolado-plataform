# Programa de Parceiros — Fase 1: auditoria e arquitectura

Estado (20/10/2026): **ligado em produção** — PR 1 (base de dados), PR 2 (acesso patrocinado), PR 3 (Parceiro de Indicação) e PR 4 (Termos e Política `2026-10-20`, validados pela advogada) entraram com o PR [#147](https://github.com/doladostartup-maker/dolado-plataform/pull/147); migration `20261021090000_programa_parceiros.sql` aplicada em produção; `PARCEIROS_ATIVO=1`, `ACESSOS_PATROCINADOS_ATIVO=1` e `PARCEIROS_CHAVE` na Clever Cloud (confirmado por Thiago). Testes `supabase/tests/database/programa_parceiros.test.sql` (113 verificações). Pendentes na secção 9.
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

5. ~~Comissão fixa e IVA~~ → **decidido por Thiago a 20/10/2026:** 5 € / 8 € são valores **sem IVA**; acresce o IVA à taxa legal quando o parceiro o cobra. A DoLado está no regime normal e deduz esse IVA, por isso o custo é sempre 5 € / 8 €. O registo do pagamento guarda o IVA da factura do parceiro (opcional, até 23 %), o n.º do documento e o valor transferido.
6. **Parceiros pessoa singular**: contabilidade/fiscalidade (recibo, retenção na fonte) e contrato de parceria — fora do código, mas condição para pagar.

## 4. Impacto jurídico (para a advogada; nada publicado automaticamente)

- **Política de Privacidade (nova versão):** candidaturas de parceiros; atribuição de clientes a parceiros (finalidade, base — interesse legítimo/consentimento do cookie); acessos patrocinados (a empresa sabe que entregou um código, a DoLado não lhe diz quem o activou); retenção.
- **Termos (nova versão):** secção sobre acessos patrocinados (duração, sem cobrança, fim automático, sem conversão automática), e transparência de que alguns clientes chegam por parceiros que recebem comissão.
- **Cookiebot:** a finalidade do `dolado_indicacao` passa a incluir parceiros comerciais — actualizar a declaração.
- **Acordos:** contrato-tipo de Parceiro de Indicação e de Distribuição (incluindo subcontratação? não — a empresa não trata dados dos beneficiários na DoLado).
- **Páginas públicas:** `/parceiros` nova; `/empresas` já existe e tem de ser alinhada (não duplicar). Páginas de problemas: sem impacto.

## 5. Plano de entrega (PRs pequenos)

1. ✅ Base de dados + testes pgTAP (parceiros, condições, códigos, atribuições, comissões, pacotes, acessos, `conta_tem_protecao`).
2. ✅ Acesso patrocinado: activação `/ativar-codigo`, `calcularAcesso`, manutenção, e-mails, backoffice de pacotes/códigos/relatório.
3. ✅ Parceiro de Indicação: `/parceiros` + candidatura, aprovação, `/r/` partilhado, webhook (faturas, comissões, reversões), backoffice de comissões e pagamentos, oportunidades B2B.
4. Documentos legais (depois da advogada) e ligação em produção por interruptor (`PARCEIROS_ATIVO=1`, desligado por omissão).

## 6. Notas de implementação (PR 1)

- **Escrita:** tudo pelas funções `parceiro_*` / `acesso_patrocinado_*` (só `service_role`). As tabelas mutáveis (`parceiros`, `parceiros_oportunidades`, `parceiros_pacotes`) também podem ser alteradas directamente pelo backoffice com a service role, desde que gravem `alterado_por`; o trigger de histórico regista quem alterou.
- **Códigos de parceiro:** 8 caracteres, mesmo alfabeto dos amigos; colisão com um código de amigo dá `23505`, como hoje, e o gerador tenta outro.
- **Códigos de acesso:** 12 caracteres `[A-HJ-NP-Z2-9]` (~60 bits), gerados no servidor; a base de dados guarda só o SHA-256 e os 4 últimos caracteres. Expiram pelo `ativacao_ate` do pacote; não há estado "expirado" guardado.
- **Limite de tentativas:** `limite_tentar(chave, máximo, janela)` — 10 activações por conta e por hora (contam também as válidas); 3 candidaturas por e-mail em 24 horas (chave com o HMAC do e-mail, nunca em claro). Sem IP.
- **Acesso patrocinado + Protecção gratuita em curso:** a activação termina o período gratuito e desliga os avisos dele (`protecao_gratuita_marco_atual` devolve null).
- **Comissão B2C:** criada na 1.ª fatura paga (> 0 €) da primeira subscrição; só essa subscrição conta, e uma nova não reabre uma comissão cancelada. Reembolso integral de uma mensalidade → recontagem (pode voltar a "pendente"); disputa → "em_validacao"; depois de paga → `ja_paga` (aviso ao admin, nada automático). Um parceiro suspenso continua a acumular as comissões das contas já atribuídas (decisão do admin no pagamento).
- **Comissão B2B:** `parceiro_b2b_recalcular()` cria a diferença ainda não aprovada/paga entre a percentagem × receita do 1.º ano (`contrato_inicio` + 12 meses, sem IVA, menos reembolsos) e o já fechado. Receita a descer depois de aprovada/paga → `ajuste_negativo` (decisão humana).
- **Manutenção:** pg_cron `acessos-patrocinados-manutencao` (`25 * * * *`, só SQL): termina os acessos, desactiva os dados sem outra Protecção, apaga as tentativas com mais de 2 dias, as visitas de parceiros com mais de 30 dias e as candidaturas rejeitadas há mais de 12 meses. Os e-mails (activação, 15 dias antes, fim) vão no PR 2, pela rota interna da Protecção gratuita.
- **Aplicar em produção:** `supabase db push --linked --dry-run` e depois `db push`, antes do merge do PR 2. Não muda o comportamento actual (nenhuma conta tem acesso patrocinado nem atribuição a parceiro).

## 7. Notas de implementação (PR 2 — Parceiro de Distribuição)

- **Interruptor:** `ACESSOS_PATROCINADOS_ATIVO=1` liga a activação (`/ativar-codigo`). Desligado por omissão — os Termos em vigor ainda não descrevem o acesso patrocinado. O backoffice funciona com o interruptor desligado (preparar parceiros, pacotes e códigos); os avisos de acessos já activados são sempre enviados.
- **Regras sem I/O:** `src/lib/acessoPatrocinado.ts` (códigos, normalização, acesso, período sem custo, relatório protegido); servidor `src/lib/acessoPatrocinadoServidor.ts`; job `src/lib/acessoPatrocinadoAvisos.ts` (corre na rota `/api/internal/protecao-gratuita`, de hora a hora); e-mails `src/lib/email/acessoPatrocinado.ts`; textos `src/i18n/mensagens/{pt-PT,en-GB}/acessoPatrocinado.ts`; aceitação registada `TEXTO_ACEITACAO_ACESSO_PATROCINADO` (`src/lib/legal.ts`).
- **Acesso:** `calcularAcesso(linha, gratuita, agora, patrocinado)` → `Acesso.acessoPatrocinado`; `temProtecao` inclui-o, `temSubscricao` não. Adesão à Protecção durante a oferta: 1.ª cobrança no fim do período sem custo que termina mais tarde (`periodoSemCusto`), com a mesma metadata `protecao_gratuita = "1"` (cobrança adiada) para o webhook; o modal `ConfirmarCompra` usa os textos da "Protecção oferecida".
- **Portal:** cartão `AcessoPatrocinadoPortal` no painel, em `/portal/subscricao` e em `/portal/contratos` (nome comercial do parceiro, datas, adesão voluntária). O código nunca vai no URL.
- **Backoffice:** `/backoffice/parceiros` (lista, novo Parceiro de Distribuição) e `/backoffice/parceiros/[id]` (estado, pacotes, confirmar pagamento, emitir códigos com descarga CSV única, alterar prazo de activação, anular código pelos 4 últimos caracteres, relatório exacto + CSV para a empresa com "menos de 5", histórico).
- **Verificado no browser (base local):** criar parceiro → activar → pacote de 50 → pagamento → 50 códigos (só hash na base de dados) → activação com código errado (recusada) e certo (minúsculas e espaços aceites) → Protecção activa sem linha em `user_access` → cartão e modal de adesão com a 1.ª cobrança no fim da oferta.

## 8. Notas de implementação (PR 3 — Parceiro de Indicação)

- **Interruptor:** `PARCEIROS_ATIVO=1` liga a página `/parceiros` (candidatura), as ligações `/r/<código>` de parceiros e o campo "Código de parceiro". Desligado por omissão — a Política em vigor não descreve as candidaturas nem a atribuição a parceiros. `/parceiros` fica `noindex`, fora do menu e do sitemap; desligado, leva a `/empresas`. `PARCEIROS_CHAVE` (opcional, ≥ 32 caracteres): HMAC do e-mail na chave do limite de candidaturas (sem ela, SHA-256 simples; apagada aos 2 dias).
- **Regras sem I/O:** `src/lib/parceiros/regras.ts`; servidor `src/lib/parceiros/servidor.ts`; webhook `src/lib/parceiros/webhook.ts`; e-mails `src/lib/email/parceiros.ts`; textos `src/i18n/mensagens/{pt-PT,en-GB}/parceiros.ts`; aceitação da candidatura `TEXTO_ACEITACAO_CANDIDATURA_PARCEIROS` / `CANDIDATURA_PARCEIROS_VERSAO` (`src/lib/legal.ts`).
- **Atribuição:** a visita de parceiro usa o mesmo cookie `dolado_indicacao` (só com consentimento de marketing), com o valor `p.<uuid>` — o programa de amigos nunca a lê. O código escrito no registo fica no metadado `codigo_parceiro` da conta. As duas chegam por `atribuirIndicacaoDoBrowser` (callback, modal, Checkout), que chama primeiro `atribuirParceiroDoBrowser` — também com o programa de amigos desligado. No modal `ConfirmarCompra`, o campo aparece só a contas sem nenhuma atribuição; `confirmarCompra` atribui antes do Checkout e só pára a compra com um código inexistente (ou do próprio parceiro).
- **Webhook:** `deps.parceiros` sempre ligado (contas já atribuídas continuam a contar). `invoice.paid` → `parceiro_registar_fatura` (valor pago, IVA de `total_taxes`, descontos, PaymentIntent por `invoicePayments`); reembolso integral → recontagem, parcial → aviso; disputa → em validação; `customer.subscription.deleted` (só o fim definitivo, nunca `unpaid`) → comissão por elegível cancelada; comissão já paga → aviso ao admin, nada automático.
- **Backoffice:** `/backoffice/parceiros` (visão geral, novo parceiro de indicação e/ou distribuição), `/backoffice/parceiros/candidaturas` (aprovar → parceiro activo, condições iniciais, código e e-mail; rejeitar com motivo) e, no detalhe, códigos/ligações, condições (novas versões), contas atribuídas (só contagens), comissões (validar, aprovar, cancelar), pagamentos (IVA e documento do parceiro opcionais, e-mail ao parceiro) e oportunidades B2B (estado, prorrogação com motivo, ganha com percentagem/autorização, receitas e recálculo).
- **E-mails:** candidatura recebida (candidato), aviso ao admin (sem o texto livre), aprovação com código e ligação, pagamento registado (valores e referência). Nunca dados de clientes.
- **Verificado no browser (base local):** candidatura em `/parceiros` → aprovação no backoffice (parceiro activo, 5 €/8 €/3 mensalidades, código) → registo com código inválido (recusado antes de criar a conta) e válido → atribuição ao abrir a compra → campo deixa de aparecer; modal com código inválido pára antes do Checkout.
- **Não testado localmente:** a ligação `/r/` de parceiro (o endpoint só aceita pedidos de `dolado.pt` com o Cookiebot); coberto pela lógica partilhada com os amigos e pelos testes de `regras.ts`.

## 9. Pendências (actualizado a 20/10/2026)

Estado: **em produção** desde 20/10/2026 (PR [#147](https://github.com/doladostartup-maker/dolado-plataform/pull/147) merged, migration aplicada, interruptores ligados). Por fazer: item 3. Feito a 23/10/2026 (decisões de Thiago): botão "Avisar primeiro contacto" nas oportunidades B2B (aviso do art. 14.º com prova em `parceiros_oportunidades_avisos`; texto por validar pela advogada) e `/parceiros` indexável (sitemap e rodapé).

1. ~~Esclarecer o que a advogada aprovou~~ → **as regras do programa** (Thiago, 20/10/2026).
2. **PR 4 — documentos legais:** ✅ redigidos a 20/10/2026 — Termos `2026-10-20` e Política `2026-10-20` (`TERMOS_VERSAO`/`PRIVACIDADE_VERSAO` já sobem neste ramo); texto validado pela advogada (Thiago, 20/10/2026). **Migration aplicada em produção a 20/10/2026** (`db push`). As condições comerciais ficam no contrato-tipo. Lista original:
   - Política de Privacidade (`_versoes/vAAAA-MM-DD.tsx` + `index.ts` + `PRIVACIDADE_VERSAO`): candidaturas (dados, finalidade, retenção de 12 meses das rejeitadas), atribuição de clientes a parceiros (ligação `/r/` com consentimento e código escrito; nunca dados do cliente ao parceiro), acessos patrocinados (a empresa só recebe contagens, "menos de 5"), registos financeiros das comissões, `limites_tentativas` (2 dias).
   - Termos (`TERMOS_VERSAO`): acesso patrocinado (meses de calendário, sem cobrança, fim automático, sem conversão automática, recusa a quem tem subscrição paga, conta como "já teve Protecção"); transparência de que alguns clientes chegam por parceiros com comissão.
   - Condições do Programa de Parceiros (texto aceite na candidatura; comissões sem IVA, "acresce IVA à taxa legal em vigor, quando aplicável"; 3 mensalidades; reversões; pagamento manual; mínimo 25 €; sem rendimentos garantidos).
   - Contratos-tipo de Indicação e Distribuição (fora do código).
3. **Fora do código (Thiago):** retenção na fonte de parceiros pessoa singular (contabilista); declaração do `dolado_indicacao` no Cookiebot a incluir parceiros; alinhar `/empresas` com `/parceiros`.
4. ✅ **Produção** (feito a 20/10/2026): `supabase db push --linked --dry-run` e depois `db push` da migration **antes** do merge; push do ramo e PR no GitHub (o CI corre `test:contrato` e `supabase test db`); depois dos textos aprovados, `PARCEIROS_ATIVO=1`, `ACESSOS_PATROCINADOS_ATIVO=1` e `PARCEIROS_CHAVE` (≥ 32 caracteres) na Clever Cloud; decidir se `/parceiros` passa a indexável.
5. ✅ **Limpeza local** (20/10/2026): configuração `parceiros-local` removida do `.claude/launch.json`, worktree `.claude/worktrees/parceiros` removido; as contas de teste locais já não existiam.
