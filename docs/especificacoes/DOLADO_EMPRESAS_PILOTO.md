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
| | 3 Bloqueios cruzados dos fluxos particulares | PR #191 (23/10/2026); migration `20261031090000` aplicada em produção a 23/10/2026 (cópia prévia em ~/dolado-backups/); merge por fazer |
| | 4 Registo, MFA de empresa, recuperação, aprovação | |
| 2 Produto | 5 Activação e ciclo de pagamento manual | |
| | 6 Monitor empresarial | |
| | 7 Portal empresarial | |
| | 8 Alertas e resumo mensal | |
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

## Dívida técnica: vários utilizadores por empresa

No piloto, uma conta = uma organização e o Monitor pertence ao `utilizador_id`. Vários utilizadores exigem: acrescentar `organizacao_id` às tabelas do Monitor lidas pelo cliente (cerca de 12), preenchê-lo a partir de `organizacoes_membros`, trocar as policies `utilizador_id = auth.uid()` por pertença à organização nas linhas de empresa e adaptar as funções `monitor_*`. Não se faz sem necessidade comercial. Um acordo que exija acessos por loja (ex.: RE/MAX, 11 lojas) é avaliado contra esta dívida antes de qualquer compromisso.

## Fora do piloto

Stripe empresarial; vários utilizadores, perfis, acessos por instalação, contabilistas; relatórios PDF e vários destinatários; gás automático, MT/BTE; MFA por SMS e códigos de recuperação próprios; sessões simultâneas; Google para empresas; inglês nas páginas de empresas; casos e reclamações para empresas; regras de consumo aplicadas a empresas; dashboards avançados; CRM.
