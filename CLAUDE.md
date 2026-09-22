# DoLado — Plataforma v1

Este ficheiro é lido automaticamente pelo Claude Code no início de cada sessão nesta pasta. Contém o contexto completo do projecto — não é preciso repetir isto em cada conversa.

## Contexto do negócio

A DoLado é uma plataforma portuguesa de acompanhamento de reclamações de consumo (telecomunicações, energia, água). Está em fase de validação com dois canais em paralelo:

1. **B2C directo** — clientes que chegam via Google Ads / formulário público, processo hoje 100% manual (email, Google Sheet)
2. **Piloto B2B2C** — parceria gratuita com a Remax Duplo Prestígio (75 colaboradores), sem data de lançamento fixa, ~10-20 casos/mês esperados

Este repositório constrói a **v1 da plataforma**, que substitui o processo manual (Google Sheet + email) por um backoffice e um portal do cliente simples. **Não é a especificação completa do produto final** — funcionalidades como autenticação CMD/eIDAS, RPA para o Livro de Reclamações, IA para geração/extracção de texto, e dashboards avançados ficam deliberadamente fora desta v1.

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

- **Supabase:** organização `dolado-startup`, projecto `DoLado`, região `eu-west-1 (Paris)`, PostgreSQL activo, Auth com Google OAuth + Email/Password configurado, Storage activo, RLS (Row Level Security) automático em novas tabelas
- **Clever Cloud:** app `dolado-platform` (Node.js), região `par (Paris)`, ligada por webhook ao GitHub (git push → deploy automático). **Nota importante:** existe um addon PostgreSQL na Clever Cloud ligado a esta app, mas é residual — **não usar**. A única base de dados é a Supabase. Se o addon Postgres da Clever Cloud não for necessário, pode ser removido para simplificar e evitar custo duplicado (confirmar com Thiago antes de remover).
- **Repositório:** GitHub `doladostartup-maker/dolado-plataform` (primeiro commit da Fase 1 já enviado)
- **Brevo:** conta e API key prontas para o email transacional
- **Google Cloud:** projecto `dolado-forms`, OAuth 2.0 Client "Cliente Web 1" já criado e ligado à Supabase (redirect URI `https://eqsmzczjyrcrsbfqioxt.supabase.co/auth/v1/callback` autorizado em 16/09/2026)

Variáveis de ambiente a configurar no Clever Cloud durante a Fase 1: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BREVO_API_KEY` (esta última só é necessária a partir da Fase 4, mas pode ser configurada desde já).

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
5. Prazos de resposta escrevem-se "no prazo máximo de 24 horas úteis".

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
Só depois de Fases 1-3 validadas e a funcionar.

- Templates de texto (CRUD simples, substituição de variáveis `{{}}`, sem IA) — os textos-base já existem, pedir a Thiago o documento `templates-texto-reclamacoes.md`
- Gerador de carta grátis público (reutiliza os mesmos templates)
- Geração de dossiê em PDF, guardado no Supabase Storage
- Email automático em mudança de estado (só email por agora, sem SMS — volume não justifica)
- Alerta de fim de fidelidade por email, X dias antes

## Explicitamente fora de escopo — não construir sem decisão nova de Thiago

- Autenticação CMD/eIDAS
- RPA para o Livro de Reclamações
- Dashboard Metabase / analytics avançado
- Simulador de elegibilidade com tabela de regras legais automática
- Qualquer uso de IA (geração de texto, extracção de documentos, classificação)
- Pagamentos/Stripe (piloto é gratuito)
- Apple Sign In
- Multi-idioma
- Hosting fora da Clever Cloud

## Antes de qualquer submissão real a um operador

Os templates de texto de reclamação são **rascunhos** pendentes de revisão por advogado. Nunca gerar nem sugerir texto que conclua responsabilidade jurídica de terceiro (ex.: "a empresa violou a lei") — o padrão é sempre: descrever o facto, citar a norma legal objectivamente, formular o pedido concreto.

## Checklist de compliance RGPD antes de produção real (fora do âmbito de código, mas relevante ter presente)

Estes itens não são tarefas de desenvolvimento, mas devem ser lembrados a Thiago se o tema surgir:

- [ ] DPA (Data Processing Agreement) assinado com a Supabase
- [ ] DPA assinado com a Clever Cloud
- [ ] DPA assinado com a Brevo
- [ ] Matriz de Subcontratantes actualizada com os três (nome, região de processamento, finalidade)
- [ ] Política de Privacidade actualizada com os subcontratantes
- [ ] DPIA (Data Protection Impact Assessment) formal completo
