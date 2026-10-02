# DoLado — Plataforma v1

Este ficheiro é lido automaticamente pelo Claude Code no início de cada sessão nesta pasta. Contém o contexto completo do projecto — não é preciso repetir isto em cada conversa.

## Contexto do negócio

A DoLado é uma plataforma portuguesa de acompanhamento de reclamações de consumo (telecomunicações, energia, água). Está em fase de validação com dois canais em paralelo:

1. **B2C directo** — clientes que chegam via Google Ads / formulário público, processo hoje 100% manual (email, Google Sheet)
2. **Piloto B2B2C** — parceria gratuita com a Remax Duplo Prestígio (75 colaboradores), sem data de lançamento fixa, ~10-20 casos/mês esperados

Este repositório constrói a **v1 da plataforma**, que substitui o processo manual (Google Sheet + email) por um backoffice e um portal do cliente simples. **Não é a especificação completa do produto final** — funcionalidades como autenticação CMD/eIDAS, RPA para o Livro de Reclamações, e dashboards avançados ficam deliberadamente fora desta v1. O uso de IA (Claude API) passou a estar em escopo a partir de 25/09/2026, sob as regras descritas em "Uso de IA" — não é mais uma exclusão geral. Pagamentos/Stripe passaram a estar em escopo a partir de 25/09/2026, só para o canal B2C directo — ver "Pagamentos (Stripe)" abaixo.

## Quem constrói e opera

- Construído por Thiago com apoio do Claude Code
- Operado por Thiago sozinho (sem equipa) — o backoffice é uso interno dele, não de vários utilizadores admin

## Stack técnica (decisão final: 16/09/2026)

- **Frontend/Backend:** Next.js (App Router) — um único projecto para site público + portal cliente + backoffice
- **Base de dados + Auth:** Supabase (Postgres + Auth nativo, Google OAuth e email/senha)
  - **✅ Já configurado:** o projecto Supabase foi criado na região **UE (Paris/eu-west-3)**. Se alguma vez for necessário criar um novo projecto Supabase (ex.: ambiente de staging), manter sempre região europeia — nunca aceitar a região por omissão, que normalmente não é europeia. Isto é um requisito de conformidade RGPD, não uma preferência.
- **Storage de documentos (dossiê):** Supabase Storage, mesmo projecto, mesma região UE
- **Deploy/Hosting:** Clever Cloud (empresa francesa, 100% europeia) — já configurado
- **Email transacional:** Brevo (conta criada, API key gerada, sede em França — nativamente UE). Não sugerir Resend/Postmark — decisão já fechada.

**Porquê esta stack:** zero custo fixo até haver volume real, tudo num só projecto, soberania de dados equilibrada com velocidade de desenvolvimento (ver nota abaixo).

## Infraestrutura já configurada (16/09/2026) — não recriar do zero

Toda a infraestrutura abaixo já está montada e ligada. O Claude Code deve usar estas contas/configurações existentes, nunca criar novas contas ou sugerir alternativas sem perguntar primeiro a Thiago.

- **Supabase:** organização `dolado-startup`, projecto `DoLado`, região `eu-west-3` (AWS Paris; confirmado pela API da Supabase a 02/10/2026), PostgreSQL activo, Auth com Google OAuth + Email/Password configurado, Storage activo, RLS (Row Level Security) automático em novas tabelas
- **Clever Cloud:** app `dolado-platform` (Node.js), região `par (Paris)`, ligada por webhook ao GitHub (git push → deploy automático). **Nota importante:** existe um addon PostgreSQL na Clever Cloud ligado a esta app, mas é residual — **não usar**. A única base de dados é a Supabase. Se o addon Postgres da Clever Cloud não for necessário, pode ser removido para simplificar e evitar custo duplicado (confirmar com Thiago antes de remover).
- **Repositório:** GitHub `doladostartup-maker/dolado-plataform` (primeiro commit da Fase 1 já enviado)
- **Brevo:** conta e API key prontas para o email transacional
- **Google Cloud:** projecto `dolado-forms`, OAuth 2.0 Client "Cliente Web 1" já criado e ligado à Supabase (redirect URI `https://eqsmzczjyrcrsbfqioxt.supabase.co/auth/v1/callback` autorizado em 16/09/2026)

Variáveis de ambiente a configurar no Clever Cloud durante a Fase 1: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BREVO_API_KEY` (esta última só é necessária a partir da Fase 4, mas pode ser configurada desde já).

`ANTHROPIC_API_KEY` (Claude API) ainda não está contratada — previsto 01/10/2026. As funcionalidades que dependem dela (ver "Uso de IA") já estão construídas e em produção, mas caem em modo manual/revisão até a chave ser configurada em `.env.local` e nos secrets das Supabase Edge Functions relevantes. O modelo de extração vem de `ANTHROPIC_DOCUMENT_MODEL` (por omissão `claude-sonnet-5-5`); parâmetros e leitura da resposta partilhados em `src/lib/claude.ts` — a resposta começa com blocos de raciocínio, nunca ler `content[0]`.

## Contactos institucionais (decisão: 30/09/2026)

- **contacto@dolado.pt** — contacto institucional geral: página Contacto, Termos, footer, questões comerciais, reclamações sobre a própria DoLado, e Reply-To dos e-mails transacionais.
- **privacidade@dolado.pt** — privacidade/RGPD: Política de Privacidade, exercício de direitos (acesso, retificação, apagamento, oposição, limitação, portabilidade), perguntas frequentes sobre dados pessoais. Nunca usar como contacto geral.
- **thiago.pereira@dolado.pt não é usado como contacto público.** Continua como destino interno de notificações ao admin (`ADMIN_EMAIL`) e é hoje o remetente Brevo (`BREVO_SENDER_EMAIL`).
- No código, usar sempre as constantes `CONTACTO_EMAIL` / `PRIVACIDADE_EMAIL` de `src/lib/site.ts` (nas Edge Functions, que não importam de `src/`, a constante está repetida no próprio ficheiro).
- Estado: e-mails criados; publicação no site, documentos legais, perguntas frequentes e Reply-To dos e-mails concluída nesta alteração. **Pendente (fora do código):** verificar `contacto@dolado.pt` como remetente na Brevo e trocar `BREVO_SENDER_EMAIL` no Clever Cloud, nos secrets da Supabase e em `.env.local` — até lá, os clientes continuam a ver o e-mail pessoal como remetente.

## Segurança da base de dados (auditoria RLS: 30/09/2026)

Estado implementado:

- **RLS ativo em todas as tabelas de `public`**, com posse explícita (`utilizador_id`/`user_id = auth.uid()`) e acesso total do admin via `is_admin()` (lê `utilizadores.role`, que o cliente não consegue alterar). Não há views nem RPCs próprias além de `is_admin()`.
- **Storage:** os buckets (`anexos-casos`, `documentos-monitor`, `comprovativos-casos`) são privados e só o admin lê/escreve pelo RLS. O cliente faz upload só por URL assinada gerada no servidor, com o caminho decidido pelo servidor (`<user.id>/<uuid>-…` ou `pendentes/<uuid>-…`).
- **Privilégios mínimos** (`20260930130000_seguranca_privilegios_minimos.sql`): anon só tem SELECT; anon e authenticated sem TRUNCATE/TRIGGER/REFERENCES; `handle_new_user()` não é chamável pela API.
- **Criação de casos** (`20261001220000_pedidos_caso_antes_do_pagamento.sql`, substitui `20260930130100_…`): o cliente já não cria casos pela API em nenhuma situação. Casos novos só pelo servidor depois de gastar um caso disponível pago (`converter_pedido_em_caso()` / `consumir_credito_caso`, service_role) ou pelo admin. Pedidos não pagos vivem em `pedidos_caso` (cliente só lê os próprios; escrita só pelo servidor). Testes em `supabase/tests/database/pedidos_caso.test.sql`.
- **Elegibilidade e faturas** (`20260930140000_…`): o cliente só lê as próprias linhas; quem grava são as Server Actions, com service role e dono tirado da sessão — `estado_final`, sugestão da IA e resultado da fatura não são forjáveis pelo cliente.
- **Plano verificado no servidor e na base de dados** (`20260930160000_…`): as Server Actions e as rotas `/api/internal/*` das funcionalidades de proteção usam `temProtecao()` (`src/lib/auth.ts`), e as policies de criar/editar alertas exigem `public.tem_protecao()`. O gating das páginas sozinho não protege uma ação chamada diretamente.
- **Webhook `novo-caso`** (`20260930150000_…`): trigger `notificar_novo_caso` em migration, com segredo no Vault (`novo_caso_webhook_secret`) igual à secret `NOVO_CASO_WEBHOOK_SECRET` da Edge Function (`verify_jwt = false`, valida `x-webhook-secret`). Substitui o webhook do Dashboard, que tinha a chave service_role embutida.
- **Service role** (`createAdminClient`) ignora RLS: só em código de servidor, e cada Server Action/Route Handler que a usa tem de validar a sessão e a posse (ou o papel admin) **antes** de a usar.
- **Testes:** `supabase/tests/database/rls_isolamento.test.sql` (pgTAP). Correr com `supabase start` + `supabase test db` — sempre na stack local, nunca em produção. Obrigatório voltar a correr depois de cada migration que crie ou altere tabelas, policies, grants ou funções, e acrescentar testes para qualquer tabela nova.

Regras para tabelas novas: RLS com policies por operação (USING para ler/alterar, WITH CHECK para criar/alterar), posse validada por `auth.uid()` e nunca só por `auth.role()`; campos internos nunca preenchíveis pelo cliente; `SECURITY DEFINER` só com justificação e `search_path` fixo.

- **Alertas do portal** (01/10/2026; Monitor de Proteção desde 02/10/2026): o destinatário é sempre o e-mail atual e confirmado da conta — o Monitor não guarda nenhum e-mail de envio, e a Edge Function `verificar-monitor-datas` usa `monitor_alertas_pendentes()` (só `service_role`; só contas com Proteção ativa) . O conteúdo dos e-mails é montado em `supabase/functions/_shared/emailAlertas.ts`, com escape de HTML e assunto saneado; qualquer novo e-mail com texto do cliente tem de fazer escape, com `escaparHtml`/`textoParaAssunto` de `supabase/functions/_shared/textoSeguro.ts` (o e-mail de novo caso usa-as em `_shared/emailNovoCaso.ts`). A regra "só e-mail confirmado" depende da confirmação de e-mail estar ativa na Supabase (Authentication → Providers → Email) — confirmada ativa por Thiago a 01/10/2026; não a desativar.

Pendente: rotação da chave service_role legada depois de o novo webhook estar em produção.

## Gestão de custo — regra durante a fase de piloto

O piloto Remax é gratuito (sem receita ainda). Prioridade: **ficar nos tiers gratuitos o máximo de tempo possível.**

- Supabase free tier pausa automaticamente por inactividade — este risco é aceite conscientemente por Thiago durante o piloto, não é um bug a corrigir
- Não sugerir upgrade para planos pagos (Supabase Pro, Clever Cloud XS, etc.) sem que Thiago peça explicitamente — mesmo que o tier gratuito tenha limitações
- Se uma funcionalidade exigir um plano pago para funcionar bem, sinalizar isso claramente a Thiago em vez de simplesmente activar o upgrade

**Nota de soberania de dados:** o hosting é 100% europeu (Clever Cloud). A Supabase é uma empresa americana, aceite conscientemente por agora desde que os dados fiquem fisicamente na UE — com DPA assinado e SCCs em vigor. Não sugerir Vercel nem outra alternativa americana de hosting sem confirmar primeiro com Thiago.

## Idioma e tom

- Todo o texto visível na aplicação (UI, mensagens, emails) em português europeu, segundo o Acordo Ortográfico de 1990 (ex.: "fatura", "direção", "ação" — não "factura", "direcção", "acção")
- Comentários de código podem ser em português ou inglês, à escolha, mas texto orientado ao utilizador é sempre português europeu

## Regras de escrita (obrigatórias em todo o texto visível ao utilizador)

Aplicam-se a páginas, botões, mensagens de erro, e-mails transacionais, templates da Brevo, textos de consentimento e qualquer outro texto que o cliente leia.

1. Português europeu, segundo o Acordo Ortográfico de 1990 (ex.: "fatura", "direção", "ação"). Nunca português do Brasil. Evitar construções brasileiras como "em até", "a gente", "você", "tela" (usar "ecrã"), "celular" (usar "telemóvel"), "arquivo" (usar "ficheiro"), "cadastro" (usar "registo").
2. Escrever sempre "e-mail" e "e-mails", com hífen. Nunca "email".
3. A marca é "a DoLado": feminino e com L maiúsculo. Ex.: "A DoLado trata…", "da DoLado", "na DoLado", "com a DoLado", "Autorizo a DoLado…". Nunca "o DoLado" nem "Dolado".
4. O cliente é tratado na terceira pessoa ("por si", "consigo", "a sua", "Preencha", "Conte-nos"). Nunca por "tu" ("preenche", "conta-nos", "o teu").
5. Prazos de resposta escrevem-se "no prazo máximo de 48 horas úteis".

Antes de terminar qualquer tarefa que altere texto visível, rever o texto contra estas regras e corrigir.

## Regra de ouro: construir por fases, nunca tudo de uma vez

Este projecto está dividido em 4 fases sequenciais. **Nunca avançar para a fase seguinte sem confirmação explícita de Thiago de que a fase actual está testada e a funcionar.** Se pedir "constrói a plataforma toda" ou for ambíguo sobre que fase quer, perguntar antes de avançar.

### FASE 1 — Fundação
Objectivo: autenticação e estrutura de dados prontas.

- Setup do projecto Next.js + Supabase (região UE!)
- Schema da base de dados:
  - `casos` (id, nome, email, telefone, empresa_parceira, sector, tipo_problema, descricao, status, tipo_abc, data_fim_fidelidade, minutos, disposicao_pagar, valor_indicado, notas, dossie_url, created_at, updated_at)
  - `utilizadores` (via Supabase Auth: id, email, nome, role — cliente/admin)
  - `templates` (id, nome, sector, tipo_problema, texto, created_at)
- Autenticação: login via Google OAuth + login via email/senha (registo simples, sem confirmação por SMS)
- Distinção de perfis: cliente (colaborador Remax/B2C) vs admin (Thiago)

### FASE 2 — Backoffice interno
Objectivo: substituir a Google Sheet actual.

- Painel de casos (admin): tabela com todos os casos, filtros por status/sector/empresa parceira, ordenação por prazo mais próximo de expirar
- Fila de urgência: vista destacada só com casos a <15 dias do prazo
- Fila de revisão: casos com status "Novo" ou "Aguardando decisão"
- Detalhe do caso: editar todos os campos; botões "Cliente aceitou oferta" (→ status Resolvido, Tipo A) e "Cliente recusou oferta" (→ status Bloqueado/Escalada, Tipo B); campo para colar link do dossiê
- **Não construir:** gestor de parceiros dedicado (usa o campo `empresa_parceira` como texto simples com 1 parceiro); CRM próprio (HubSpot já cobre isso)

### FASE 3 — Portal do cliente
Objectivo: colaborador Remax (ou cliente B2C) vê o próprio caso.

- Formulário de abertura de caso (mesmos campos do HubSpot actual + campo "Empresa parceira" + checkbox de autorização)
- Painel de casos do cliente: só os próprios casos, estado actual, datas
- Decisão do cliente: quando status = "Aguardando decisão", mostra a oferta e botões "Aceito" / "Não aceito, quero avançar"
- Link do dossiê disponível quando preenchido no backoffice

### FASE 4 — Extras e automação
Fases 1-3 confirmadas por Thiago em 24/09/2026 — Fase 4 em curso.

Já construído e em produção:
- **Monitor de Proteção** (`/portal/contratos`, 02/10/2026) — substitui o Alerta de fim de fidelização, o Alerta de fim de promoção e o Comparador de Faturas; ver "Monitor de Proteção" abaixo
- Aviso Sectorial (`/portal/perfil` + `/backoffice/avisos`) — sem IA, admin avisa por e-mail os clientes que subscreveram o setor
- Simulador de Elegibilidade — **público e gratuito desde 01/10/2026** (`/simulador-elegibilidade`, ver "Simulador de Elegibilidade público" abaixo); já não é funcionalidade do portal nem da Proteção

Ainda por construir:
- Templates de texto (CRUD simples, substituição de variáveis `{{}}`, sem IA) — os textos-base já existem, pedir a Thiago o documento `templates-texto-reclamacoes.md`
- Gerador de carta grátis público (reutiliza os mesmos templates)
- Geração de dossiê em PDF, guardado no Supabase Storage
- Email automático em mudança de estado (só email por agora, sem SMS — volume não justifica)

## Explicitamente fora de escopo — não construir sem decisão nova de Thiago

- Autenticação CMD/eIDAS
- RPA para o Livro de Reclamações
- Dashboard Metabase / analytics avançado
- Apple Sign In
- Multi-idioma
- Hosting fora da Clever Cloud

O simulador de elegibilidade e o uso de IA em geral **saíram** desta lista em 25/09/2026 — ver "Uso de IA" abaixo para as regras que passaram a aplicar-se em vez de uma exclusão total. Pagamentos/Stripe **saiu** desta lista na mesma data — ver "Pagamentos (Stripe)" abaixo.

## Pagamentos (Stripe) — decisão: 25/09/2026

A exclusão geral de pagamentos da v1 foi revista, só para o canal B2C directo. O piloto B2B2C com a Remax é gratuito para o colaborador (decisão de 01/10/2026): o colaborador subscreve **Caso + Proteção** no preçário e aplica o cupão `duploprestigio26` no Stripe Checkout. O cupão tem de estar configurado no Stripe como 100%, duração "forever" e limitado ao produto Caso + Proteção — com isso, o fluxo normal (webhook, faturas a 0 €) dá acesso total e 1 caso por mês até 4, sem código específico do piloto (testes em `src/lib/stripe/webhook.test.mjs`, "piloto Remax"). Contas criadas pelo `/registo` livre, sem compra, não têm proteção nem casos disponíveis (criar conta ≠ direito ao tratamento de um caso).

- **Três planos** (revisto a 01/10/2026 — substitui o modelo antigo de dois planos "Avulso / Assinatura Mensal"). Todos os preços são apresentados com **IVA incluído**:
  - **Proteção** — 4,99 €/mês, `price_1ULUUeBtJL9VeDPfWuDk5XCo`. Funcionalidades de proteção disponíveis; não inclui casos.
  - **Caso + Proteção** — 7,99 €/mês, `price_1UJYnPBtJL9VeDPfnQTlVwsq`. Proteção + 1 caso por mês, acumulável até 4, sem período de carência.
  - **Avulso** — 14,99 € por caso, pagamento único, `price_1UJYwzBtJL9VeDPfrAiguI1Z`. 1 caso; não dá proteção.
- **Fonte única:** `src/lib/planos.ts` (nomes, preços, o que incluem, Price IDs). Não repetir preços nem nomes noutros ficheiros. O browser só envia o identificador interno (`protecao` / `caso_protecao` / `avulso`); o Price ID é escolhido no servidor (`src/lib/stripe/planos.ts`, que aceita override por `STRIPE_PRICE_*`) e o acesso só é dado pelo webhook.
- **Fluxo "Tratar o meu caso"** (decisão de 01/10/2026, CTA principal da homepage): `/tratar-caso` (formulário; grava um **pedido** em `pedidos_caso`, nunca um caso) → `/tratar-caso/conta` (conta + confirmação do e-mail por código/ligação, ou Google — a sessão fica aberta em portal.dolado.pt antes do pagamento) → `/tratar-caso/modalidade` (Avulso ou Caso + Proteção, ou usar um caso disponível já pago) → Stripe Checkout (fluxo `pedido_caso`, `metadata.pedido_id`) → webhook confirma → `converter_pedido_em_caso()` cria o caso → `/tratar-caso/recebido` ("Recebemos o seu caso.", só lê o estado gravado pelo webhook). Regras em `src/lib/pedidoCaso.ts`. O Avulso do preçário leva a este fluxo.
- **Fluxo das subscrições pelo preçário:** preçário da homepage (`/#precario`) → Stripe Checkout → `/criar-conta` (cria a conta Supabase e liga o pagamento) → `/portal`. Gating por `user_access.subscription_plan` / `subscription_status` / `case_credits` (regras em `src/lib/acesso.ts`); `nivel_acesso` já não é usado.
- **Gating:** sem Proteção ativa, as funcionalidades de proteção ficam esbatidas no painel com badge "Incluído na Proteção" e abrem um modal com as duas subscrições. Abrir um caso gasta sempre um caso disponível (Avulso ou Caso + Proteção). Contas sem linha em `user_access` (`/registo` livre, sem compra) não abrem casos: `/portal/casos/novo` leva a "Tratar o meu caso".
- **Portal:** o painel mostra "O seu plano" (plano real, estado da subscrição, próxima renovação, casos disponíveis) e os estados de pagamento/reembolso com texto neutro, sem mensagens técnicas do Stripe.
- **Terminologia na interface:** usar sempre "Proteção", "Caso + Proteção", "Avulso", "subscrição" e "casos disponíveis". Nunca "Assinatura"/"Assinatura Mensal" como nome de plano, "créditos" para casos, "saldo" nem "mês grátis".
- **Casos Avulso vs. casos da subscrição** (`20261001235000_creditos_avulso_disponiveis.sql`, 01/10/2026): `case_credits` é o total; `avulso_credits` é a parte de Avulsos ainda por usar (`case_credit_grants.estado`: disponivel / consumido / convertido / reembolsado). Gastar um caso usa sempre `consumir_credito_caso(user, origem)`: modo normal (sem origem) gasta primeiro a subscrição e depois o Avulso mais antigo; modo vinculado (`20261002090000_avulso_vinculado_conversao_anulada.sql`) — um pedido pago com um Avulso gasta o Avulso dessa compra (`converter_pedido_em_caso(pedido, user, 'checkout:<sessão>')`), nunca um caso da subscrição. `devolver_credito_caso()` repõe o mesmo tipo. O congelamento usa `case_credits - avulso_credits`; nunca contar compras históricas. Só Avulsos por usar são convertíveis, verificado ao abrir o Checkout e de novo no webhook antes de aplicar a subscrição: se o caso foi usado entretanto, a conversão fica `anulada` (com motivo), a subscrição é cancelada no Stripe (1.ª fatura a 0 €) e não há plano, casos nem reembolso — automático, sem intervenção. A conversão e o reembolso total retiram o caso (`retirar_credito_avulso`); reembolso parcial não mexe nos casos (só aviso ao admin). Pagamento `reembolsado` é final e nunca dá crédito. Testes: `supabase/tests/database/creditos_caso.test.sql`.
- **Conversão Avulso → subscrição** (implementada e validada — não refazer): parte do Avulso cobre a 1.ª mensalidade (cupão 100% só na 1.ª fatura) e o restante é reembolsado para o método de pagamento original — 10,00 € na Proteção, 7,00 € no Caso + Proteção. Sem Customer Balance nem crédito para meses seguintes. Lógica em `src/lib/stripe/conversao.ts` e no webhook; intervenções manuais em `/backoffice/conversoes`.
- **Chaves:** a produção (Clever Cloud) já usa chaves `live` — qualquer checkout, cupão ou reembolso criado em produção é real. Validar fluxos Stripe só com testes locais (`npm test`, dependências falsas) ou num ambiente de teste pedido a Thiago.
- **Gestão de Subscrição** (`/portal/subscricao`, 01/10/2026): o cliente cancela no portal (sem Stripe Customer Portal) com `cancel_at_period_end = true` — proteção e casos disponíveis mantêm-se até ao fim do período pago, sem reembolso proporcional; "Manter subscrição" retira o agendamento na mesma subscrição. No fim efetivo a conta fica **sem subscrição** (`subscription_plan = 'none'`), nunca "Avulso" (Avulso é um produto, não um estado). Os casos disponíveis do Caso + Proteção ficam congelados 90 dias (`case_credit_freezes`; os casos Avulso comprados não congelam) e voltam com nova subscrição Caso + Proteção nesse prazo, até 4. Auditoria em `subscricao_cancelamentos`. Livre resolução e cancelamentos imediatos excecionais (cobrança duplicada/indevida, erro técnico) são tratados pela DoLado no Stripe Dashboard, à parte — o webhook sincroniza o resultado. Lógica em `src/lib/gestaoSubscricao.ts` e `src/lib/stripe/webhook.ts`.
- **Alertas no fim da subscrição** (`20261002180000_alertas_desativados_fim_subscricao.sql`, 02/10/2026): quando a conta perde a Proteção (qualquer alteração de `user_access`: `deleted`, `unpaid`, manual), o trigger `user_access_alertas_seguir_protecao` **desativa** os contratos e documentos do Monitor de Proteção e os setores do aviso sectorial (`desativado_em` = início dos 6 meses; nunca reescrito, nunca alterável pelo cliente). Nada é apagado de imediato e nada é enviado: `monitor_alertas_pendentes()` e `avisos_setor_destinatarios()` só devolvem dados ativos de contas com Proteção. Voltar à Proteção dentro dos 6 meses reativa a configuração. Aos 6 meses: `limpar_alertas_desativados()` (pg_cron `limpar-alertas-desativados`, 03:45 UTC) apaga; os documentos do Monitor são apagados pela Edge Function `verificar-monitor-datas` (ficheiro no Storage primeiro, `monitor_documentos_expirados()`), e só depois o contrato; os ficheiros carregados e nunca registados são apagados ao fim de 24 horas (`monitor_ficheiros_orfaos()`). O cancelamento avisa o cliente antes da confirmação; nunca perguntar "Quer manter o alerta?". Testes: `supabase/tests/database/alertas_retencao.test.sql`. Decisões de Thiago (02/10/2026): desativação no fim do período pago (não no clique em "Cancelar"); Aviso Sectorial só para contas com subscrição ativa; reativação automática se o cliente voltar dentro dos 6 meses. Migration e Edge Function aplicadas em produção a 02/10/2026.
- **Confirmação da compra e prova legal** (01/10/2026): nenhum Checkout abre sem o modal `ConfirmarCompra` (`src/components/compra/`), com duas checkboxes obrigatórias e não pré-selecionadas (Termos; pedido expresso de início imediato) e só ligação para a Política de Privacidade (nunca checkbox). A única Server Action de checkout é `confirmarCompra` (`src/app/actions/stripe.ts`): valida no servidor, grava `consentimentos_compra` (versões e texto exato, campos de prova imutáveis por trigger) e só depois cria a sessão com `consentimento_compra_id` na metadata; o webhook completa sessão/pagamento/subscrição. Textos e versões legais só em `src/lib/legal.ts` (`TERMOS_VERSAO`, `PRIVACIDADE_VERSAO`, `CONSENTIMENTO_INICIO_IMEDIATO_VERSAO`). Termos e Política versionados: nunca editar uma versão publicada — criar `_versoes/vAAAA-MM-DD.tsx` (segunda versão no mesmo dia: sufixo de letra, ex. `2026-10-01b`), registar em `index.ts` e subir `TERMOS_VERSAO`/`PRIVACIDADE_VERSAO`. Livre resolução ≠ cancelamento: exercida pela função online em `/livre-resolucao` ("Resolver o contrato aqui" → "Confirmar a livre resolução", prova em `pedidos_livre_resolucao`, confirmação por e-mail só a clientes conhecidos) ou por `contacto@dolado.pt`; decidida caso a caso, sem reembolsos nem cancelamentos automáticos.
- **Webhook:** configurar o endpoint no Stripe Dashboard directamente para `https://portal.dolado.pt/api/stripe/webhook` (não `dolado.pt` — o middleware redirecciona esse domínio e o Stripe não segue redirects de forma fiável).

## Páginas legais, Livro de Reclamações e RAL (01/10/2026)

- Em vigor: Termos `2026-10-02` (secção 10: só Avulso com o caso por usar converte; secção 8: ordem de utilização dos casos) e Política de Privacidade `2026-10-02e` (desde a `2026-10-02e`, secções 2–6 com o Monitor de Proteção; desde a `2026-10-02d`, secção 6: alertas desativados no fim da subscrição, conservados 6 meses; desde a `2026-10-02c`, secção 5 alinhada com a matriz de subcontratantes a 02/10/2026; desde a `2026-10-02b`, sem o alerta gratuito sem conta, retirado a 02/10/2026: `/por-que-assinar` redireciona para `/#precario` e os pedidos foram apagados e a tabela `alertas_fidelizacao` foi removida a 02/10/2026; os alertas da Proteção vivem no Monitor de Proteção); `/livre-resolucao` (regime legal, função online, modelo de formulário do DL 24/2014); `/resolucao-de-litigios` (contacto, Livro de Reclamações Eletrónico, entidades RAL). Rodapés (homepage, páginas legais, `/entrar`, homepage antiga) com Termos, Privacidade, Livre resolução, Resolução de litígios e Livro de Reclamações.
- Identificação da entidade (nome, NIPC, morada) só em `src/lib/site.ts` (`ENTIDADE_LEGAL`, `NIPC`, `MORADA_SEDE`). Livro de Reclamações, entidades RAL, prazo e modelo de livre resolução só em `src/lib/legal.ts`. Não referir a plataforma europeia RLL/ODR (encerrada a 20/07/2025).
- As caixas de confirmação dos formulários (abrir caso, alertas) registam o pedido do cliente — não são "consentimento" RGPD. Consentimento só para cookies/medição e comunicações opcionais.
- **E-mails com novidades e ofertas** (`20261002140000_consentimentos_comunicacoes.sql`, 02/10/2026): a caixa opcional do "Tratar o meu caso" pede autorização para e-mails da DoLado com novidades e ofertas (texto e versão só em `src/lib/legal.ts`: `TEXTO_CONSENTIMENTO_COMUNICACOES` / `CONSENTIMENTO_COMUNICACOES_VERSAO`; mudar o texto = nova versão). Não promete alertas — os alertas são da Proteção. O servidor grava versão e texto no pedido; um trigger regista a autorização na conta (`consentimentos_comunicacoes`, prova imutável, 1 ativa por conta) quando o pedido fica ligado a uma conta. Retirada no Perfil do portal. Só enviar e-mails comerciais a contas com autorização ativa (`retirado_em is null`) e ao e-mail confirmado da conta; **cada e-mail tem de ter forma de deixar de receber** (ainda não há envio — construir isto antes do primeiro). Os `consentimento_alertas` anteriores a esta data (texto antigo) não valem para e-mails comerciais. Testes: `supabase/tests/database/consentimentos_comunicacoes.test.sql`.
- **Pendência da nova sede** — a sede está em processo de alteração; manter a morada atual até a nova estar oficialmente registada. Quando estiver: (1) `MORADA_SEDE` em `src/lib/site.ts` (alimenta Termos, Privacidade e o modelo de livre resolução) e criar novas versões dos Termos e da Política (as publicadas não se editam); (2) "Lisboa" no rodapé de `src/components/landing/Homepage.tsx` e "Lisboa, Portugal" em `src/components/landing/Landing.tsx`; (3) rever `ENTIDADES_RAL` em `src/lib/legal.ts` (a entidade RAL de referência depende da localização); (4) fora do código: morada da conta Stripe (recibos/faturas), registo na plataforma do Livro de Reclamações Eletrónico, remetente/rodapé da Brevo, Google (Ads/Analytics) e DPAs que identifiquem a morada.

## Texto para envio: revisão e autorização do cliente (01/10/2026)

DoLado prepara o texto → e-mail ao cliente com dois links (rever e autorizar / pedir alterações) → o cliente autoriza ou pede alterações numa página da DoLado (sem login; GET nunca muda nada, só o POST explícito) ou no portal → a DoLado regista o envio. Regras na base de dados (`20261001180000_textos_caso_revisao_autorizacao.sql`): versões imutáveis depois de mostradas ao cliente (`casos_textos`, hash SHA-256 calculado pela BD), autorização presa a uma versão e a um hash, envio só da versão atual autorizada (`texto_registar_envio` + triggers), tabelas de prova só de inserção, links guardados só como hash (`casos_textos_links`, validade em `VALIDADE_LINKS_REVISAO_DIAS`). O estado do texto não vive em `casos.status`. Nunca criar ação de admin para autorizar ou "marcar como aprovado". Testes: `supabase/tests/database/textos_caso.test.sql` e `src/lib/textoCaso.test.mjs`.

**Pós-envio** (`20261001190000_comprovativos_pos_envio.sql`): o texto enviado é a versão apontada por `casos_textos_envios` (nunca a mais recente) — secção "Reclamação enviada" no portal e no backoffice. Comprovativo de submissão em `casos_comprovativos` (ficheiro e/ou identificador; corrigir = novo registo, o anterior fica substituído), ficheiros no bucket privado `comprovativos-casos` (admin só lê; upload pelo servidor), servidos só por `/api/comprovativos/[id]` (sessão → RLS → URL assinada de 60 s). O cliente não lê `storage_path` nem `nota` (permissões por coluna). `dossie_url` continua separado. Na copy, nunca "acesso permanente" — usar "fica disponível no seu caso no portal".

## Simulador de Elegibilidade público (01/10/2026)

Ferramenta gratuita de aquisição/qualificação, antes da compra — responde a "a DoLado pode ajudar-me com este caso?". Não é funcionalidade do portal nem de nenhum plano.

- `/simulador-elegibilidade` (página de marketing, indexável, sem sessão). Entradas: link "Simulador" no `SiteHeader`, link secundário no hero da homepage ("Ver se a DoLado pode ajudar") e cartão em Funcionalidades. CTA principal da homepage continua "Tratar o meu caso". `/portal/elegibilidade` redireciona (em `next.config.ts`) para a página pública.
- 4 perguntas de escolha (setor, contrato pessoal, o que aconteceu, já reclamou) → resultado **positivo / incerto / negativo**, sempre indicativo e só sobre o âmbito do serviço. Regras em `src/lib/elegibilidade/regras.ts` (testes em `regras.test.mjs`); as opções são as de `src/lib/pedidoCaso.ts`.
- Corre só no browser: sem login, sem e-mail/nome/telefone, sem gravação na base de dados, sem e-mails, sem Claude API. Não cria conta, caso, pedido nem acesso.
- Positivo e incerto têm o mesmo CTA, "Tratar o meu caso" (decisão de 01/10/2026: sem análise humana gratuita antes da compra, nem texto que a sugira), e levam a `/tratar-caso?origem=/simulador-elegibilidade&setor=…&problema=…&momento=…`; a página só aceita valores das listas fechadas para pré-preencher. Negativo não tem CTA comercial.
- Medição (gtag, só com consentimento): `simulador_iniciado`, `simulador_concluido` (`resultado`), `simulador_resultado_{positivo|incerto|negativo}`, `simulador_clique_tratar_caso` (`resultado`), `click_hero_simulador`. Só a categoria do resultado, nunca as respostas. A conversão relaciona-se por `pedidos_caso.origem = '/simulador-elegibilidade'`.
- Âmbito (decisão de 01/10/2026): só consumidores particulares; contratos em nome de empresa/profissional dão resultado negativo, com explicação simples.
- **Dados antigos** (`20261001230000_elegibilidade_retencao.sql`, decisão de 01/10/2026): `casos_elegibilidade_portal` é legado — sem escritas (nem `service_role`), o cliente já não lê, o admin só lê/apaga. Registos decididos apagam-se aos 30 dias (`limpar_casos_elegibilidade_antigos()`, job `pg_cron` `limpar-elegibilidade-antiga`, diário 03:30 UTC); `em_revisao` mantém-se. Não havia revisões pendentes a 01/10/2026, por isso `/backoffice/elegibilidade` foi retirado. Sem agregados guardados. **Pendente:** quando a tabela estiver vazia (a partir de 31/10/2026), remover tabela, função e job numa migration própria. Testes: `supabase/tests/database/elegibilidade_retencao.test.sql`. Os clientes deixam de ver o histórico antigo no portal; não é migrado.
- Política de Privacidade `2026-10-02e` (e as anteriores desde a `2026-10-01c`) descreve o simulador público (sem recolha, só o tipo de resultado na medição com consentimento).
- Nunca usar no simulador: "tem direito", "não tem direito", "a empresa está errada", "a lei garante", "vai ganhar", "não pode reclamar", "descubra se tem direito".

## Calculadora de Cancelamento pública (02/10/2026)

Ferramenta gratuita de aquisição, como o Simulador: estima o encargo **máximo** de um cancelamento antecipado de um contrato de **telecomunicações** por iniciativa do cliente, quando não exista motivo legal ou contratual para cancelar sem encargos (nota obrigatória antes do resultado). Não avalia esse motivo nem é parecer jurídico.

- `/calculadora-cancelamento` (pública, sem sessão; nas duas listas de `src/middleware.ts`). Menu: `SiteHeader` tem "Como funciona" isolado e o dropdown **Ferramentas** (Simulador de Elegibilidade + Calculadora de Cancelamento).
- Corre só no browser: sem login, sem e-mail, sem IA, sem gravação; não cria conta, caso, pedido nem acesso. CTA "Tratar o meu caso" → `/tratar-caso?origem=/calculadora-cancelamento&setor=Telecomunicações&problema=Fidelização ou penalização`. Sem eventos gtag próprios (só os já existentes).
- Regras e validação em `src/lib/calculadoraCancelamento/regras.ts` (`calcularEncargoCancelamento`), testes em `regras.test.mjs`. A = V × R/D (em dias); B = M × N × 50% (1.º ano) ou 30% (2.º ano), sempre 30% em refidelização sem nova instalação/alteração do lacete local; resultado = MIN(A, B). Fidelização terminada → 0 €. Antes de 14/11/2022: refidelização sem nova instalação → MIN(A, M × N × 30%) (confirmado pela ANACOM, decisão de 02/10/2026); restantes → só A. Textos da Calculadora e resumo da regra por validar pela advogada (não bloqueia). Equipamento subsidiado nunca entra no valor (só aviso). Valores em cêntimos.

## Guia de Mudança de Casa público (02/10/2026)

F3 de `docs/especificacoes/F3_MUDANCA_CASA_PUBLICA.md`: página pública e estática de aquisição/educação, não funcionalidade da Proteção.

- `/mudanca-de-casa` (sem sessão; nas duas listas de `src/middleware.ts`; no dropdown **Ferramentas** do `SiteHeader`). Componente `src/components/landing/MudancaDeCasa.tsx`.
- Quatro momentos (antes, dia da saída, casa nova, depois) × telecomunicações, eletricidade, gás e água; CPE e CUI explicados; "Quando a DoLado pode ajudar" (a DoLado não trata atos operacionais de rotina); perguntas frequentes.
- Sem login, sem formulários, sem IA, sem gravação. CTAs "Tratar o meu caso" → `/tratar-caso?origem=/mudanca-de-casa` (no cartão de telecomunicações também `setor=Telecomunicações`). Medição (gtag, só com consentimento): `mudanca_casa_clique_tratar_caso` (`local`).
- Não criar conteúdo diferente para parceiros (Remax): os parceiros podem divulgar esta página e não recebem dados.

## Monitor de Proteção (02/10/2026)

Especificação em `docs/especificacoes/` (F1/F2/F4 e Claude API); plano e decisões em `docs/especificacoes/PLANO_MONITOR_FASE1.md`. Princípio: **IA lê e estrutura; código calcula e aplica regras; humano revê exceções.**

- **Dados** (`20261003090000_monitor_protecao_base.sql`): `contratos_monitorizados` (valores atuais) + `contratos_campos` (proveniência por campo, nunca reescrita), `documentos_monitor` (bucket privado `documentos-monitor`, hash único por cliente), `extracoes_documento`, `faturas_monitor`, `achados_monitor` + `achados_revisoes`, `contratos_alertas_envios`, `uso_api_claude`. O cliente **só lê** os próprios dados; toda a escrita é do servidor pelas funções `monitor_*` (só `service_role`). Uma extração nunca substitui em silêncio um valor do cliente: fica `em_conflito` e o cliente decide. Testes: `supabase/tests/database/monitor_protecao.test.sql`.
- **Portal** `/portal/contratos` (lista, detalhe com confirmação/correção dos dados, `novo` sem documento, "Deixar de acompanhar" apaga tudo). As rotas antigas `/portal/alertas`, `/portal/promocoes`, `/portal/faturas` e `/backoffice/faturas` redirecionam (`next.config.ts`). Backoffice `/backoffice/monitor` (documentos por tratar, custo da API, correções com origem "admin").
- **Leitura de documentos** (`src/lib/monitor/`): uma chamada por documento com o SDK `@anthropic-ai/sdk`, structured outputs, sem ferramentas nem dados da conta; schema e prompt versionados (`fatura_v1`, `contrato_v1`); validação de domínio antes de gravar. Faturas de todos os setores; o valor de cessação só em telecom. Falhas (sem chave, API em baixo, orçamento) deixam o documento `pendente`, sem erro para o cliente, com aviso ao admin.
- **Orçamento da API:** `ANTHROPIC_ORCAMENTO_USD` (5 USD, decisão de 02/10/2026), avisos a 50/75/90%; no teto, nada é processado automaticamente.
- **Alertas:** Edge Function `verificar-monitor-datas` (pg_cron `verificar-monitor-datas-diario`, 08:00 UTC; `20261003100000_monitor_cron.sql`) a 60 e 30 dias e na data, para fidelização e promoção; reserva antes de enviar (`monitor_reservar_alerta`), nunca em duplicado. Os agendamentos `verificar-alertas-*` foram removidos.
- **Conservação:** documentos guardados enquanto o contrato é acompanhado; fim da Proteção desativa contratos e documentos e apaga-os 6 meses depois (decisão de 02/10/2026). Política de Privacidade `2026-10-02e`.
- **Removido** (`20261003110000_monitor_remover_antigo.sql`): `alertas_fidelizacao_portal`, `alertas_promocao_portal`, `comparacoes_fatura_portal`, `alertas_*_pendentes()`, as Edge Functions `verificar-alertas-*` e as policies dos buckets `faturas-comparador` e `contratos-promocao` (vazios; **pendente:** apagar os dois buckets no Dashboard da Supabase e as Edge Functions antigas com `supabase functions delete`).
- **Situações detetadas (F2, `src/lib/monitor/regrasFaturas.ts`):** depois de cada fatura de telecomunicações, o código compara com o histórico — aumento do valor recorrente não explicado pelos dados do contrato (um fim de promoção registado entre as faturas explica-o), cobrança recorrente nova e possível cobrança em duplicado — e grava `achados_monitor` (regra versionada, chave de idempotência). **Revisão humana sempre:** `/backoffice/monitor/achados` mostra faturas, dados e evidência; "Confirmar e comunicar" (texto editável, nunca uma conclusão sobre a lei) mostra no portal e envia e-mail ao e-mail confirmado da conta (`src/lib/email/achadoMonitor.ts`); descartar exige motivo. Tudo fica em `achados_revisoes`.
- **Custo de saída (F4, `src/lib/monitor/custoSaida.ts`, telecomunicações):** a mesma regra da Calculadora pública, com os dados do contrato (campos `tipo_fidelizacao`, `nova_instalacao`, `equipamento_subsidiado` — `20261003120000_monitor_achados_custo_saida.sql`); cartão no detalhe do contrato com estimativa hoje e a 3 meses e o valor indicado na fatura. Diferença acima de 2 € / 5% → achado `cessacao_divergente` para revisão (não se compara com equipamento subsidiado).
- **Pendente:** eletricidade e gás (cláusulas de fidelização, regras F2 próprias), encaminhamento de faturas por e-mail, dataset de avaliação da extração (20 faturas telecom, etc.) antes de alargar.

## Uso de IA (decisão: 25/09/2026)

A exclusão geral de IA da v1 foi revista. A Claude API está agora em escopo, mas só dentro destas regras — não é uma autorização em aberto para qualquer uso de IA sem mais:

1. **Extracção factual (datas, valores) — sem gate de revisão obrigatório.** Ler uma data ou um valor de um documento é uma tarefa factual, não uma decisão de aplicação da lei. Usado em: Monitor de Proteção (datas e valores lidos de faturas e contratos). O cliente confirma antes de os valores passarem a ser usados (exceto o valor de cessação indicado na fatura, aceite com confiança alta), sem revisão do Thiago por documento. Situações detetadas na comparação de faturas (F2) caem na regra 2: revisão humana sempre.
2. **Interpretação/classificação de um caso individual — gate de revisão humana sempre obrigatório, sem excepção.** Isto é a linha entre "apoio administrativo" (permitido) e "aconselhamento jurídico individualizado" (proibido sem supervisão), validada com a advogada RGPD: mínimo de revisão humana real por caso antes de qualquer contacto com o cliente. Nenhuma funcionalidade em produção usa IA para isto desde 01/10/2026: o Simulador de Elegibilidade passou a ser só regras, no browser. A tabela antiga `casos_elegibilidade_portal` já não tem área de revisão (ver "Simulador de Elegibilidade público").
3. **Fallback manual sempre silencioso.** Chave não configurada, API indisponível, resposta inválida ou confiança baixa nunca podem gerar um erro visível ao cliente nem bloquear o fluxo — caem sempre no caminho manual/revisão que já existia antes de haver IA.
4. **Nunca gerar texto que conclua responsabilidade jurídica de terceiro** (ex.: "a empresa violou a lei"), mesmo em sugestões internas — o padrão é sempre: descrever o facto, citar a norma legal objectivamente, formular o pedido concreto.
5. **Medir custo real** nos primeiros 10-15 casos de cada funcionalidade e anotar em `custos-fixos-e-break-even.md` (ainda por criar) — o piloto está em tier gratuito, um custo por chamada de API é uma excepção a essa regra que vale a pena vigiar.

Qualquer uso de IA fora destas 5 regras (ex.: geração de texto de reclamação, decisão automática sem revisão) continua a exigir decisão nova de Thiago.

## Antes de qualquer submissão real a um operador

Os templates de texto de reclamação são **rascunhos** pendentes de revisão por advogado. Nunca gerar nem sugerir texto que conclua responsabilidade jurídica de terceiro (ex.: "a empresa violou a lei") — o padrão é sempre: descrever o facto, citar a norma legal objectivamente, formular o pedido concreto.

## Checklist de compliance RGPD antes de produção real (fora do âmbito de código, mas relevante ter presente)

Estes itens não são tarefas de desenvolvimento, mas devem ser lembrados a Thiago se o tema surgir:

- [x] DPA (Data Processing Agreement) assinado com a Supabase — confirmado por Thiago a 01/10/2026
- [x] DPA assinado com a Clever Cloud — confirmado por Thiago a 01/10/2026
- [x] DPA assinado com a Brevo — confirmado por Thiago a 01/10/2026
- [x] DPA com a Anthropic (Claude API) — confirmado por Thiago a 01/10/2026
- [x] DPA com a Stripe (pagamentos/subscrições) — confirmado por Thiago a 01/10/2026
- [x] DPA com a Google (Analytics / Tag Manager / Ads) — confirmado por Thiago a 01/10/2026
- [ ] DPA com a Cookiebot (Usercentrics) — por confirmar (não estava na lista anterior)
- [ ] Anotar na matriz (`docs/legal/matriz-subcontratantes.md`) o mecanismo de transferência previsto em cada DPA (SCCs, Data Privacy Framework…), onde está arquivada a cópia e os restantes pontos "a validar"
- [x] Política de Privacidade versão 2026-10-02e (prazos de conservação por categoria, bases jurídicas, direitos, dados de terceiros, Monitor de Proteção com conservação de 6 meses depois do fim da subscrição) — validada pela advogada, confirmado por Thiago a 02/10/2026
- [ ] Registar a empresa na plataforma do Livro de Reclamações Eletrónico (obrigatório para prestadores com atividade online; responder em 15 dias úteis)
- [ ] DPIA (Data Protection Impact Assessment) formal completo

### Matriz de Subcontratantes e prestadores

Fonte única: **`docs/legal/matriz-subcontratantes.md`** (revista a 02/10/2026) — finalidade, categorias de dados, natureza do tratamento, região, transferências, mecanismo, DPA e papel de cada fornecedor (Supabase, Clever Cloud, Brevo, Anthropic, Stripe, Google, Cookiebot), com os pontos ainda "a validar". Não repetir a tabela aqui. Qualquer fornecedor novo ou mudança de finalidade/região: atualizar a matriz e a secção 5 da Política de Privacidade (nova versão). DPA obtido para todos exceto a Cookiebot (por confirmar). Destinatários da reclamação (empresa visada, Livro de Reclamações Eletrónico, reguladores) **não** são subcontratantes.
