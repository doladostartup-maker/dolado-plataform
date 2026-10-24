# DoLado Empresas — piloto

Plano aprovado por Thiago a 23/10/2026 (auditoria técnica → plano → revisão final com as decisões D1–D7 e as correcções de segurança). Este documento é a referência do piloto; o CLAUDE.md resume-o.

## Oferta (decidido)

- **Protecção Empresas — 49 €/mês + IVA**, sem fidelização. Até 2 instalações, 5 serviços/contratos activos, 15 facturas PDF analisadas por mês. Configuração inicial com o contrato e até 3 facturas históricas por serviço (não contam para a quota). Alertas, resumo mensal, gráficos básicos.
- Primeiras cinco empresas: configuração incluída e preço garantido durante 6 meses. Empresas maiores: proposta personalizada.
- Análise gratuita: uma factura por empresa durante o piloto, sem registo nem e-mail quando o processamento automático funciona.
- Sectores da análise automática: electricidade em BTN, água, telecomunicações. Gás só depois de testes próprios. Média tensão, BTE e contratos complexos ficam fora da análise automática.
- Pagamento manual por transferência, confirmado no backoffice; vence no aniversário da activação. Sem Stripe empresarial.

## Arquitectura (decidido)

- Uma aplicação Next.js, o mesmo projecto Supabase, a mesma Clever Cloud.
- **Contas separadas:** `utilizadores.tipo_conta` (`particular` | `empresa`), gravado só pelo servidor. E-mails distintos, credenciais independentes, sem selector de contexto, sem Google para empresas, MFA TOTP obrigatório (dois factores). Uma sessão por browser (cookies host-only em `portal.dolado.pt`).
- **Rotas:** `dolado.pt/empresas` (marketing, só pt) e `/empresas/beneficios` (página antiga, bilingue); `/empresas/entrar`, `/empresas/registo`… em `portal.dolado.pt`; portal em `portal.dolado.pt/empresa/…`.
- **Guardas:** `requireParticular()`, `requireEmpresa()`, `requireAdmin()` com aal2. `requireUser()` não muda.
- **Dados:** uma conta de empresa = uma organização no piloto; o Monitor mantém a pertença por `utilizador_id`; as tabelas novas usam pertença por organização. A instalação fica no serviço (`contratos_monitorizados.instalacao_id`).
- **Acesso:** `empresa_tem_acesso(org)` → `total` | `consulta` | `nenhum`, separado de `conta_tem_protecao()` (que não muda).
- **Interruptor `EMPRESAS_ATIVO`**, desligado por omissão até ao fim do Marco 4.

## Decisões D1–D7

- **D1** Só pt-PT (ortografia tradicional) nas páginas e no portal de empresas; excepção à regra bilingue. Os particulares continuam bilingues.
- **D2** Atraso → aviso → 7 dias → `suspensa` (sem novas análises; consulta e exportação) → 30 dias → `cancelada` → eliminação dos documentos operacionais em até 90 dias. Cancelamento voluntário: activa até ao fim do período → 30 dias só exportação → eliminação em até 90 dias.
- **D3** Revisão humana obrigatória nos primeiros 30 dias a contar da activação de cada empresa; depois, por excepção.
- **D4** Cinco vagas = organizações `ativa`, `pagamento_em_atraso` ou `suspensa`. Aprovadas sem pagamento não contam; sem vaga → lista de espera.
- **D5** Exportação em ZIP: PDFs, CSV de serviços e de facturas, análises, alertas, informação contratual — só da organização autorizada.
- **D6** 15 facturas analisadas com resultado por mês; erros técnicos e configuração inicial não contam; excepções do admin registadas; sem cobrança de excedentes.
- **D7** Identificação fiscal na análise gratuita por texto do PDF (sem IA); destinatário distinto do fornecedor; na dúvida, confirmação ou revisão; a presença no documento não prova titularidade.

## Chaves de pseudonimização (rotação controlada)

Formato `hmac:v<N>:<hex>` + coluna da versão. Chaves em `EMPRESAS_IDENTIFICADORES_CHAVES` (JSON `{"v1": …}`), activa em `EMPRESAS_IDENTIFICADORES_CHAVE_ATIVA`, retiradas em `EMPRESAS_IDENTIFICADORES_CHAVES_RETIRADAS`. Escrita com a activa; comparação com todas as não retiradas; actualização oportunista quando o identificador volta a aparecer; organizações recalculadas a partir do NIF guardado. Exposição só da chave: rodar e manter a antiga só para comparar. Chave e base de dados expostas: incidente RGPD (avaliar notificação em 72 h). Configuração inválida = falha fechada.

## Migrations: activação segura

O esquema de cada fase tem de servir o código anterior e o novo (deploy na Clever Cloud e revert correm código antigo sobre esquema novo).

- **A — aditiva:** migration antes do merge.
- **B — muda comportamento existente:** ordem justificada no PR; assinaturas e tipos de retorno não mudam (função nova se for preciso).
- **C — contracção:** nunca na mesma publicação (expandir → publicar → contrair noutro PR).
- **pg_cron, templates de Auth, Redirect URLs, variáveis:** jobs só depois de a rota estar publicada; templates servem as duas versões.
- **CI `compatibilidade-esquema`:** aplica as migrations do PR e corre os testes do ramo base (pgTAP não alterados pelo PR + contrato) — `scripts/compatibilidade-esquema.mjs`.
- **Publicação:** cópia local (`supabase db dump --linked`) → `db push --dry-run` → `db push` → verificação com o código antigo → merge → deploy → verificação com o código novo. Depois de haver dados empresariais reais, migrations só para a frente.

## Fases

| Marco | Fase | Estado |
|---|---|---|
| 1 Segurança e contas | 1A MFA do admin: inscrição e recuperação | Feita (PR #189, 23/10/2026); ensaio da recuperação por Thiago pendente |
| | 1B Exigir aal2 no backoffice (código → migration) | Depois do ensaio |
| | 2 Fundação do modelo de dados | Feita (PR #190; `20261030090000` aplicada em produção a 23/10/2026) |
| | 3 Bloqueios cruzados dos fluxos particulares | Feita (PR #191; `20261031090000` aplicada em produção a 23/10/2026) |
| | 4 Registo, MFA de empresa, recuperação, aprovação | Feita (PR #192; `20261101090000` aplicada em produção a 23/10/2026; `EMPRESAS_ATIVO=1` ligado por Thiago para ensaio controlado) |
| 2 Produto | 5 Activação e ciclo de pagamento manual | Feita (PR #194; `20261103090000` aplicada em produção a 23/10/2026; segredo dos avisos configurado) |
| | 6 Monitor empresarial | Feita (PRs #195 e #196; `20261104090000` e `20261105090000` aplicadas em produção, cópias prévias em ~/dolado-backups/) |
| | 7 Portal empresarial | Feita (PR #197, sem migration) |
| | 8 Alertas e resumo mensal | Em PR (`20261106090000`, tipo A) |
| 3 Conversão e dados | 9 Exportação e eliminação | |
| | 10 Análise gratuita empresarial | |
| | 11 Páginas públicas | |
| 4 Lançamento | 12 Métricas e lançamento | |

## Fase 2 — o que existe (20261030090000)

- `utilizadores.tipo_conta` + trigger de imutabilidade (só `empresa_marcar_conta()`, particular → empresa).
- `empresa_marcar_conta(user)` (service_role): só contas criadas há menos de 15 minutos, não admin, sem nenhum histórico particular (user_access, casos, pedidos, Monitor, Protecção gratuita, acessos patrocinados, pagamentos, consentimentos de compra, indicações, parceiros, diagnósticos). A confirmação de que o signUp criou a conta (identities não vazio) é do servidor (Fase 4).
- `organizacoes` (estado, limites, preço sem IVA, pseudónimo com versão), `organizacoes_membros` (um administrador por organização, uma organização por conta, só contas de empresa), `instalacoes`, `empresa_periodos`, `empresa_documentos` (instalação e quota), `empresa_quota_excecoes`, `empresa_revisoes` (minutos, tipo de erro), `empresa_ocorrencias`, `organizacoes_historico` (trigger).
- `contratos_monitorizados.instalacao_id` + trigger de coerência (só corre com instalação).
- `conta_empresa()`, `sessao_aal2()`, `e_membro_organizacao()`, `empresa_tem_acesso()`.
- RLS: membros só com aal2; admin lê tudo; nenhuma escrita do cliente. Policies **restritivas** em 11 tabelas do Monitor: contas de empresa só com aal2; particulares sem alteração.
- Testes: `supabase/tests/database/empresas_fundacao.test.sql`.

## Fase 3 — o que existe (20261031090000, aplicada em produção a 23/10/2026)

- **Guardas** (`src/lib/auth.ts`): `requireParticular(contexto)`, `utilizadorParticularAtual(contexto)`, `contaParticularComEmailConfirmado(contexto)` — como os genéricos, mas uma conta de empresa é registada (`empresa_ocorrencias`, tipo `guarda_recusado`, só a rota) e encaminhada para `/empresas/entrar?motivo=conta_empresa` (página da Fase 4). `requireProtecao()` assenta em `requireParticular()`. `requireUser()`, `utilizadorAtual()` e `contaComEmailConfirmado()` não mudam, mas nenhum ficheiro de `src/app` os usa (teste). Falha fechada: um erro ao ler o perfil lança erro, nunca passa por particular.
- **Sessões criadas em percursos particulares** (`recusarSessaoDeEmpresa`, `src/lib/empresas/contaServidor.ts`): `/login`, `/auth/callback` (antes de indicação, origem e diagnóstico) e "Tratar o meu caso" (código e palavra-passe) terminam a sessão de uma conta de empresa; com entrada pelo Google tentam retirar a identidade Google — o contexto da ocorrência diz `:google_retirada` ou `:google_por_retirar` (a retirada pela sessão exige a ligação manual de identidades na Supabase, que está **desligada** — confirmado por Thiago a 23/10/2026; por isso fica sempre `:google_por_retirar`. Decisão para a Fase 4: retirar a identidade no servidor, por uma função da base de dados só para a service role sobre `auth.identities`, sem ligar a opção).
- **Webhook Stripe:** `contaEmpresa()` nas dependências; um Checkout pago de uma conta de empresa não aplica nada (`ignorado_conta_empresa`) e avisa o admin uma vez; nada é cancelado nem reembolsado.
- **Base de dados:** trigger `recusar_conta_empresa` (42501, também à service role) em `user_access`, `case_credit_grants`, `casos`, `pedidos_caso`, `protecao_gratuita`, `acessos_patrocinados`, `indicacoes`, `indicacoes_codigos`, `parceiros_atribuicoes`, `parceiros_area_acessos`, `associacoes_compra`, `preferencias_setor`, `diagnosticos_gratuitos` — cobre as funções existentes sem lhes mudar assinatura nem corpo. Tipo B (compatível: ainda não há contas de empresa). O Monitor continua aberto às contas de empresa.
- **Inventário da service role** (`src/lib/empresas/inventarioServiceRole.ts`): cada ficheiro com `createAdminClient` classificado (admin, particular, sem_sessao, rls, sistema, empresa); o teste falha com um ficheiro novo por classificar, um ponto de entrada particular sem guarda ou uma acção de admin sem verificação.
- **Testes:** `src/lib/empresas/inventarioServiceRole.test.mjs`, `src/lib/stripe/webhook.test.mjs` ("DoLado Empresas"), `supabase/tests/database/empresas_bloqueios.test.sql`.
- **Publicação:** cópia local → `db push --dry-run` → `db push` → merge (migration antes do merge).

## Fase 4 — o que existe (20261101090000)

- **Páginas** (só pt, D1; `/en/empresa*` e `/en/empresas/<conta>` → 308 sem prefixo; sem `EMPRESAS_ATIVO` → 404): `/empresas/registo`, `/empresas/entrar`, `/empresas/verificar` (segundo factor), `/empresas/recuperar-palavra-passe`, `/empresas/redefinir-palavra-passe`, `/empresas/recuperacao-assistida`, `/empresa` (estado da conta; o portal é a Fase 7) e `/empresa/seguranca` (dois factores). Sem Google em nenhuma.
- **Guarda** `requireEmpresa(contexto, { mfa })` (`src/lib/auth.ts`): sem sessão → entrada; conta particular → entrada com aviso; estado acertado por `empresa_sincronizar_estado()`; `completo` = dois factores e aal2, `inscricao` = página de segurança, `nenhum` = desafio do segundo factor. Uma sessão particular aberta nas entradas das empresas tem aviso e botão para a terminar.
- **Registo:** validação (NIPC 5/6/9 para sociedades, NIF 1/2/3 para empresários em nome individual e profissionais independentes, dígito de controlo) → NIPC em uso → `signUp` → `empresa_registar()` (marca + organização + pertença numa transacção). E-mail já usado: a Supabase devolve um utilizador sem identidades → a mesma resposta de um registo novo, nada gravado. Sem aceitação de Termos B2B nesta fase (revisão jurídica pendente; o interruptor continua desligado).
- **Estados antes da aprovação:** `email_por_confirmar → mfa_por_configurar` (e-mail confirmado) `→ a_aguardar_aprovacao` (dois TOTP verificados; e-mail «pedido recebido» e aviso à equipa uma vez). `/auth/callback` leva uma conta de empresa confirmada para `/empresa`, antes de qualquer atribuição particular; pelo Google → sessão terminada e identidade retirada no servidor (`empresa_retirar_identidade_google()`; V3: a ligação manual de identidades está desligada).
- **Palavra-passe:** recuperação por e-mail com as regras dos particulares e ligação para `/empresas/redefinir-palavra-passe`; a alteração exige também o código TOTP (sessão aal2) e termina todas as sessões.
- **Recuperação assistida:** pedido sem sessão (resposta genérica, armadilha para robôs) → `empresa_pedidos_recuperacao` + aviso à equipa → `/backoffice/empresas`: validação pelos contactos oficiais → `empresa_mfa_reposicao()` (factores e sessões apagados; histórico com a nota; e-mail ao cliente) ou recusa com motivo.
- **Backoffice** `/backoffice/empresas`: pedidos de recuperação, à espera de decisão (aprovar → `aprovada` ou, sem vaga D4, `lista_espera`; rejeitar com motivo interno e mensagem opcional ao cliente), todas as organizações com contagens por estado e tempo médio até à decisão.
- **E-mails** (`src/lib/email/empresas.ts`, `emailV2`, só pt): pedido recebido, aprovado, lista de espera, não aprovado, MFA reposto. **Templates de Auth sem alteração** (o texto actual serve as duas contas) — nada a colar no Dashboard.
- **Configuração externa (Thiago), antes de ligar `EMPRESAS_ATIVO`:** Redirect URLs da Supabase com `https://portal.dolado.pt/empresas/redefinir-palavra-passe` (e `http://localhost:3000/empresas/redefinir-palavra-passe`). Sem ela, a ligação cai na raiz do portal e segue para a página dos particulares.
- **Testes:** `src/lib/empresas/registo.test.mjs`, `registo.contrato.test.mjs` (Auth real: registo → aal1 sem acesso → dois factores → aal2 → aprovação; palavra-passe com o segundo factor; reposição), `supabase/tests/database/empresas_registo.test.sql`.
- **Por decidir/pendente:** retenção de `empresa_pedidos_recuperacao` (sem limpeza automática); pseudónimo HMAC do NIPC (`identificador_hmac`) fica para a Fase 10.

## Fase 5 — o que existe (20261103090000)

- **Activação** (`empresa_activar`, ficha `/backoffice/empresas/[id]`): só de `aprovada`, com a referência da factura emitida (fora da plataforma — V11) e a transferência confirmada; vaga D4 verificada com o mesmo lock da aprovação (sem vaga → `lista_espera`, nada criado). Grava `activada_em`, `ciclo_ancora` (data em Lisboa), revisão obrigatória 30 dias (D3), preço garantido 6 meses para as cinco primeiras activadas, e o 1.º período pago.
- **Períodos:** n-ésimo período = âncora + (n-1) meses … âncora + n meses (o Postgres ajusta o dia 31 sem deriva — `empresa_fim_periodo`); vence no início. Valores sem IVA.
- **Ciclo diário** (`empresa_ciclo_diario`, pg_cron `empresas-ciclo-diario` 05:30 UTC, só SQL, idempotente, recupera dias perdidos): activa → período seguinte 7 dias antes (um por pagar de cada vez; aviso) → vencido sem pagamento: `pagamento_em_atraso` → 7 dias: `suspensa` (consulta) → mais 30 dias: `cancelada` por falta de pagamento (sem acesso; eliminação prevista em 90 dias, Fase 9). Prazos num só sítio: `empresa_prazos()` (espelho `PRAZOS_CICLO`).
- **Pagamento** (`empresa_confirmar_pagamento`): marca o período pago com a referência; sem mais vencidos por pagar, volta a `ativa`.
- **Cancelamento pelo cliente** em `/empresa` (confirmação explícita; `empresa_pedir_cancelamento`/`empresa_retirar_cancelamento`): activa até ao fim do período pago, sem mais mensalidades → `cancelada` com 30 dias de consulta → `encerrada` (eliminação prevista em 90 dias). Pode ser retirado enquanto activa.
- **Admin** (`empresa_admin_transicao`, sempre com motivo no histórico): suspender, reactivar (só sem mensalidades vencidas por pagar), cancelar (30 dias de consulta).
- **Avisos por e-mail** (`empresa_avisos`, um por organização, período e tipo; textos em `src/lib/email/empresas.ts`): saem pela rota `/api/internal/empresas-avisos` (pg_cron `empresas-avisos` de hora a hora, segredo `EMPRESAS_AVISOS_CRON_SECRET` = Vault `empresas_avisos_cron_secret`) e logo a seguir às acções; reserva antes do envio, até 3 tentativas, avisos com mais de 3 dias não saem. Sem o segredo: 401 e os avisos esperam (as transições correm na mesma).
- **Medição** na ficha: mensalidades pagas, receita sem IVA, dias de atraso acumulados.
- Nada toca em `user_access` nem no Stripe.
- **Testes:** `src/lib/empresas/ciclo.test.mjs`, `ciclo.contrato.test.mjs` (Brevo simulada), `supabase/tests/database/empresas_ciclo.test.sql` (31/01 → 28/02 → 31/03, atraso, 7 e 30 dias, cancelamento, vagas).
- **Configuração (Thiago):** `EMPRESAS_AVISOS_CRON_SECRET` na Clever Cloud e o mesmo valor no Vault da Supabase (`empresas_avisos_cron_secret`).
- **Pendente jurídico:** Termos B2B (vencimento, suspensão, cancelamento, prazos de consulta e eliminação) antes de clientes reais.

## Fase 6A — o que existe (20261104090000)

A Fase 6 foi dividida em dois PRs para reduzir o risco no pipeline dos particulares: **6A** (carregamento, quota, associação estrita, âmbito, orçamento) e **6B** (revisão humana D3, classificação dos resultados, fila no backoffice, medição).

- **Instalações** (`/empresa/instalacoes`, `empresa_criar_instalacao`): até `limite_instalacoes`, nomes únicos, só com a organização activa ou em atraso.
- **Carregamento** (`/empresa/documentos`, `empresa_registar_documento`, atómica): instalação e tipo obrigatórios; caminho do ficheiro decidido no servidor e verificado pela base de dados; documento em `documentos_monitor` (o Monitor de sempre) + `empresa_documentos` (instalação e quota).
- **Quota (D6):** 15 facturas por mês (+ excepções do admin, `empresa_conceder_excecao`); contam as reservadas e as consumidas do período em curso; contratos e configuração inicial não contam (configuração inicial: só nos primeiros 30 dias, até 3 facturas por serviço do plano). No fim do processamento: factura registada com total e período → consumida; repetida, erro técnico, ilegível, fora do âmbito, limite de serviços → libertada; à espera da decisão do cliente → reservada. O portal lê a quota com a sessão (`empresa_quota_sessao`, aal2).
- **Pipeline** (`src/lib/monitor/servidor.ts`): o ramo de empresa é escolhido pela linha em `empresa_documentos`; uma conta de empresa sem ela fica para revisão (`empresa_sem_contexto`), nunca segue o caminho dos particulares. Orçamento próprio `ANTHROPIC_ORCAMENTO_EMPRESAS_USD` (3 USD por omissão) dentro do geral; `uso_api_claude.funcionalidade = 'monitor_empresa'`. Sem custo de saída nem achado `cessacao_divergente`.
- **Associação estrita** (`escolherServicoEmpresa`, `identificacao.ts`): só automática com CPE/CUI, número do serviço ou número de conta coincidente **e** o serviço na instalação escolhida; fornecedor e NIPC nunca chegam. Identificador de outra instalação ou sem identificador → «possível» e a empresa escolhe em `/empresa/documentos/[id]` (só serviços da mesma instalação, serviço novo nessa instalação ou retirar). Sem candidato na instalação → serviço novo nessa instalação (`contratos_monitorizados.instalacao_id`), dentro de `limite_servicos` (`empresa_pode_criar_servico`).
- **Âmbito automático** (`src/lib/empresas/ambito.ts`): telecomunicações, água e electricidade em BTN (potência lida ≤ 41,4 kVA). Gás, sector desconhecido, electricidade sem potência ou acima da BTN → análise manual (`a_rever`, aviso à equipa, quota libertada). Facturas de electricidade só têm a potência com a leitura `fatura_v4` (`MONITOR_ENERGIA_ATIVO=1`); sem ela, ficam todas para análise manual.
- **Testes:** `src/lib/empresas/monitorEmpresa.test.mjs`, `monitorEmpresa.contrato.test.mjs` (pipeline real: duas lojas com o mesmo fornecedor e NIPC, quota, repetida, gás, limite de serviços, conta sem instalação), `supabase/tests/database/empresas_monitor.test.sql`; regressão dos particulares em `acompanhamento.contrato.test.mjs` e `energia.contrato.test.mjs` sem alterações.
- **Por fazer (6B):** revisão obrigatória nos primeiros 30 dias e por excepção depois (`empresa_revisoes`, minutos e tipo de erro), classificação («facto confirmado por evidência documental», «requer verificação», «informação insuficiente»), fila e filtro por organização em `/backoffice/monitor`, excepções de quota no backoffice, medição (custo por organização, documentos, quota, minutos, erros). V6 (precisão da leitura em facturas empresariais) por medir antes do Marco 4.

## Fase 6B — o que existe (20261105090000)

- **Revisão humana (D3):** `empresa_documentos.revisao_necessaria`, `revisao_motivos`, `revisto_em`. Depois de cada registo, o pipeline grava os motivos (`src/lib/empresas/revisao.ts` → `empresa_marcar_revisao`): primeiros 30 dias desde a activação; depois, só por excepção — confiança baixa num campo usado, serviço escolhido pela empresa, diferença potencial (achado desta factura), sector ou fornecedor sem outro documento da empresa, total ≠ soma das linhas, primeira factura do serviço; sem registo e para revisão → análise manual. Uma revisão registada nunca volta a ser marcada.
- **Registo** (`empresa_registar_revisao`, admin): minutos (0–600), resultado (confirmado/corrigido/descartado) e, numa correcção, o tipo de erro; fica em `empresa_revisoes` (só inserção).
- **Classificação** (`src/lib/empresas/classificacao.ts`, sem I/O): «Facto confirmado por evidência documental», «Requer verificação», «Informação insuficiente»; provisório enquanto a revisão necessária não estiver registada e, sem contrato, nas verificações contratuais. Nunca uma conclusão sobre a lei. Usada pelo portal da Fase 7 (`classificarFatura`).
- **Portal:** `/empresa/documentos` mostra «Registado — em verificação pela DoLado» enquanto a revisão estiver pendente.
- **Backoffice:** `/backoffice/empresas/revisao` (fila: documento, empresa, instalação, motivos, ligação para `/backoffice/monitor/[id]`, registo da revisão); aviso com a contagem em `/backoffice/empresas`; na ficha da organização, secção «Monitor» com a quota do mês, excepção de quota (`empresa_conceder_excecao`), documentos por estado da quota, custo estimado da IA, revisões e minutos, erros por tipo e ocorrências técnicas.
- **Ocorrências:** erros de leitura (`erro_extracao`) e técnicos (`erro_tecnico`) dos documentos de empresa em `empresa_ocorrencias` (só o motivo, sem conteúdo). Documento marcado ilegível pelo admin liberta a quota.
- **Testes:** `src/lib/empresas/revisao.test.mjs`, `monitorEmpresa.contrato.test.mjs` (revisão D3 no pipeline real), `supabase/tests/database/empresas_revisao.test.sql`.
- **Fica para o lançamento:** V6 (precisão da leitura em facturas empresariais, com valores anotados à mão) registada em `docs/` antes do Marco 4; filtro por organização na lista geral `/backoffice/monitor` (a fila de revisão das empresas já separa).

## Fase 7 — o que existe (sem migration)

- **Portal** (`src/components/empresas/PortalEmpresa.tsx`, tema `.tema-empresas` — verde mais escuro que o dos particulares; só pt, D1): navegação Painel (`/empresa`), Instalações, Contratos e serviços (`/empresa/servicos`), Facturas e análises (`/empresa/documentos`), Alertas (`/empresa/alertas`), Histórico (`/empresa/historico`) e Definições (`/empresa/definicoes`: dados da empresa, plano e limites, mensalidades, segurança e cancelamento — saíram da página `/empresa`).
- **Acesso:** `portalEmpresa()` (`src/lib/empresas/portalSessao.ts`) = `requireEmpresa()` (aal2) + `empresa_tem_acesso`; sem acesso, volta a `/empresa`, que mostra o estado da conta. Em consulta (suspensa, cancelada no período de consulta) tudo se lê e nada se carrega; aviso do estado no topo de cada página (`avisoDoEstado`).
- **Painel:** facturas do mês (quota), documentos em análise/por confirmar, próximo prazo, despesas por mês (12 meses, gráfico SVG sem dependências), evolução entre os dois últimos meses **completos** (sem dois: «histórico ainda insuficiente»), distribuição por sector, comparação entre instalações, próximos prazos (90 dias) e diferenças potenciais (facturas em verificação + situações comunicadas — nunca as por rever).
- **Regras** (`src/lib/empresas/painel.ts`, sem I/O): mês da factura = início do período (ou emissão); mês completo = já terminou e todos os serviços activos nesse mês (entre a primeira e a última factura de cada um) têm factura. **IVA (V7):** a leitura só traz os impostos somados, por isso todos os valores são totais «com IVA» e dizem-no.
- **Facturas e análises:** cada factura com a classificação da Fase 6B (`classificarFatura`) e «provisório» enquanto a revisão D3 estiver pendente.
- **Leitura:** sempre com a sessão (RLS, aal2) — teste estático: nenhuma página de `/empresa` usa a service role. **Backoffice:** secção «Despesas» na ficha da organização com as mesmas funções (`carregarDadosPortal` + `painel.ts`) e a sessão do admin — os números são os mesmos do portal.
- **Testes:** `src/lib/empresas/painel.test.mjs` (meses incompletos, sem histórico, base do IVA, prazos, classificação, regras estáticas).

## Fase 8 — o que existe (20261106090000)

- **Desvio ao plano (para reduzir o risco nos particulares):** os alertas das empresas **não** passam pela Edge Function `verificar-monitor-datas` nem por `monitor_alertas_pendentes()` — ambas ficam exactamente como estavam (teste: a lista dos particulares é a mesma e nunca inclui empresas). Saem pela rota interna das empresas (`/api/internal/empresas-avisos`, pg_cron `empresas-avisos` de hora a hora, segredo da Fase 5), em `src/lib/empresas/alertasServidor.ts`. O resumo usa uma tabela própria (`empresa_resumos_mensais`, por organização) em vez de `protecao_resumos_mensais`, para não misturar as métricas dos particulares.
- **Destinatários:** `empresa_destinos_alertas()` — organização activa ou com pagamento em atraso (acesso total), conta de empresa, e-mail confirmado. Em consulta (suspensa, cancelada) só os avisos do estado da conta.
- **Prazos** (`empresa_alertas_pendentes`): fidelização e promoção a 60 e 30 dias e na data; o primeiro aviso da fidelização sai a max(60, pré-aviso + 30) dias. Pré-aviso (`contratos_monitorizados.preaviso_dias`) indicado pela empresa em «Contratos e serviços» (`empresa_definir_preaviso`). Reserva em `contratos_alertas_envios` (`monitor_reservar_alerta`, a mesma dos particulares); falha → libertada.
- **Factura em falta** (`empresa_facturas_em_falta`): pelo menos 2 facturas, sem factura nova depois de 1,5 × o intervalo médio entre emissões (intervalos de 20 a 400 dias; última há menos de um ano); um lembrete por serviço e por mês (`empresa_alertas_envios`, reserva → enviado; falha → libertada).
- **Situações comunicadas** (aumentos e outras diferenças): já nasciam no pipeline (decomposição da comparação no achado) e só saem depois da revisão humana em `/backoffice/monitor/achados`; para contas de empresa, o e-mail usa o modelo das empresas (ligação a `/empresa/alertas`, sem «Tratar o meu caso»).
- **Resumo mensal** (`resumo_empresa_v1`, `src/lib/empresas/alertas.ts`): dias 1 a 5 a partir das 9h (Lisboa), do mês anterior; quem tem acesso total e um período pago que cobre parte do mês. Despesas do mês com IVA (incompleto assinalado; comparação só com os dois meses completos), por instalação, facturas analisadas, situações comunicadas (só contagens), facturas em verificação (nunca «não encontrámos» com uma em verificação) e prazos dos próximos 90 dias. Reserva → envio → `enviado` imutável; depois de o e-mail sair, nunca repete. Portal: `/empresa/resumos` e `/empresa/resumos/AAAA-MM` (conteúdo gravado; RLS com aal2).
- **Horas:** alertas entre as 8h e as 21h (Lisboa); cada parte da rota falha sozinha.
- **Medição:** e-mails enviados por organização na ficha do backoffice (ciclo, prazos, facturas em falta, resumos).
- **Testes:** `src/lib/empresas/alertas.test.mjs`, `alertas.contrato.test.mjs`, `supabase/tests/database/empresas_alertas.test.sql`.
- **Fica de fora:** decomposição consumo/preço no próprio e-mail (vai no texto revisto pela DoLado); pré-aviso lido dos contratos pela IA (o schema da leitura está no limite).

## Dívida técnica: vários utilizadores por empresa

No piloto, uma conta = uma organização e o Monitor pertence ao `utilizador_id`. Vários utilizadores exigem: acrescentar `organizacao_id` às tabelas do Monitor lidas pelo cliente (cerca de 12), preenchê-lo a partir de `organizacoes_membros`, trocar as policies `utilizador_id = auth.uid()` por pertença à organização nas linhas de empresa e adaptar as funções `monitor_*`. Não se faz sem necessidade comercial. Um acordo que exija acessos por loja (ex.: RE/MAX, 11 lojas) é avaliado contra esta dívida antes de qualquer compromisso.

## Fora do piloto

Stripe empresarial; vários utilizadores, perfis, acessos por instalação, contabilistas; relatórios PDF e vários destinatários; gás automático, MT/BTE; MFA por SMS e códigos de recuperação próprios; sessões simultâneas; Google para empresas; inglês nas páginas de empresas; casos e reclamações para empresas; regras de consumo aplicadas a empresas; dashboards avançados; CRM.
