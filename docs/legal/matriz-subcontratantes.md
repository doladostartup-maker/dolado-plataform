# Matriz de Subcontratantes e prestadores — DoLado

Documento interno (art. 28.º e 30.º do RGPD). Fonte única desta informação no repositório; o
`CLAUDE.md` só aponta para aqui. A secção 5 da Política de Privacidade em vigor (`PRIVACIDADE_VERSAO`
em `src/lib/legal.ts`) tem de ficar coerente com esta matriz: se um fornecedor, uma finalidade ou um
mecanismo de transferência mudar, rever a Política (nova versão — as publicadas não se editam).

- **Última revisão:** 02/10/2026 (Política de Privacidade `2026-10-02e` — Monitor de Proteção).
- **Fontes:** código e configuração do repositório, API da Supabase (região do projeto), `CLAUDE.md`
  e confirmação de Thiago (01/10/2026) de que os DPA estão obtidos.
- **"A validar"** = não se confirma pelo repositório; confirmar no DPA / conta do fornecedor e
  atualizar esta matriz. Nada marcado assim foi presumido.
- As cópias dos DPA não estão no repositório. Anotar onde estão arquivadas: **a validar**.

Destinatários da reclamação (empresa visada, Livro de Reclamações Eletrónico, reguladores) **não**
são subcontratantes e não entram nesta matriz (ver secção 5 da Política).

## Resumo

| Fornecedor | Finalidade | Papel | Região | Transferências fora do EEE | Mecanismo | DPA |
|---|---|---|---|---|---|---|
| Supabase | Base de dados, autenticação, armazenamento de documentos, funções agendadas | Subcontratante | UE — AWS `eu-west-3` (Paris) | Possíveis (empresa dos EUA) | SCCs (segundo o `CLAUDE.md`) — confirmar no DPA | Obtido |
| Clever Cloud | Alojamento e execução da aplicação Next.js | Subcontratante | UE — `par` (Paris) | Não previstas — a validar subcontratantes ulteriores | Não aplicável, salvo o que o DPA indicar | Obtido |
| Brevo | E-mail transacional | Subcontratante | UE (sede em França) | Não previstas — a validar subcontratantes ulteriores | A validar no DPA | Obtido |
| Anthropic | Claude API (leitura de faturas e contratos no Monitor de Proteção) | Subcontratante | A validar | Possíveis | A validar no DPA (SCCs, se aplicável) | Obtido |
| Stripe | Pagamentos, subscrições, faturação, reembolsos | Subcontratante; responsável autónomo para finalidades próprias | A validar (entidade contratante) | Possíveis | A validar no DPA (SCCs / DPF) | Obtido |
| Google | GA4, Tag Manager, Google Ads (com consentimento); início de sessão com Google | Subcontratante na medição; responsável autónomo para fins próprios e no início de sessão | A validar | Possíveis | A validar no DPA (SCCs / DPF) | Obtido |
| Cookiebot (Usercentrics) | Gestão do consentimento de cookies | Subcontratante | A validar | A validar | A validar | **Por confirmar** |

## Detalhe por fornecedor

### Supabase

- **Serviço / finalidade:** Postgres (todos os dados da plataforma), Supabase Auth (contas, palavra-passe
  em hash, início de sessão com Google, confirmação de e-mail), Supabase Storage (buckets privados
  `anexos-casos`, `documentos-monitor`, `comprovativos-casos`), Edge Functions
  (`novo-caso`, `verificar-monitor-datas`) e `pg_cron` / `pg_net`.
- **Categorias de dados:** identificação e contacto (nome, e-mail, telefone); dados da conta e
  credenciais; pedidos e casos (descrição em texto livre, empresa visada, versões do texto, autorizações,
  envios, comprovativos); documentos anexados (faturas, contratos, capturas de ecrã — podem conter dados
  de terceiros); dados das funcionalidades de proteção (alertas, faturas, comparações, setores
  subscritos); plano, estado da subscrição, casos disponíveis e identificadores da Stripe; registos de
  prova (consentimentos de compra, comunicações, cancelamentos, livre resolução); registos técnicos.
- **Natureza do tratamento:** armazenamento, autenticação, controlo de acesso (RLS), execução de funções
  agendadas e de triggers, cópias de segurança e registos técnicos geridos pela Supabase.
- **Localização:** projeto `eqsmzczjyrcrsbfqioxt` na região `eu-west-3` (AWS Paris), confirmado pela API
  da Supabase a 02/10/2026.
- **Transferências internacionais:** a Supabase é uma empresa dos EUA. Os dados ficam armazenados na UE,
  mas não se exclui o acesso a partir de fora do EEE (suporte, operação, subcontratantes ulteriores).
- **Mecanismo:** o `CLAUDE.md` (nota de soberania) aceita a Supabase "com DPA assinado e SCCs em vigor".
  **A validar:** confirmar no DPA o módulo das SCCs e a lista de subcontratantes ulteriores.
- **DPA:** obtido (confirmado por Thiago a 01/10/2026).
- **A validar:** em produção, os e-mails de confirmação de conta da Supabase Auth saem pelo SMTP próprio
  da Supabase ou por SMTP personalizado (ex.: Brevo)? O repositório só configura o template
  (`supabase/templates/confirmacao.html`), não o SMTP de produção.

### Clever Cloud

- **Serviço / finalidade:** alojamento e execução da aplicação Next.js (`dolado-plataform`; site público,
  área de cliente, backoffice, Server Actions, rotas `/api/*`, webhook da Stripe).
- **Categorias de dados:** tudo o que passa pela aplicação durante os pedidos — dados de conta e de caso,
  documentos carregados (em trânsito até à Supabase / Anthropic), sessões; registos técnicos da aplicação
  (endereço IP, pedidos HTTP, erros).
- **Natureza do tratamento:** execução de código, processamento em trânsito, registos de acesso/erro. A
  base de dados da aplicação **não** está na Clever Cloud (o addon PostgreSQL existente é residual e não
  é usado).
- **Localização:** região `par` (Paris).
- **Transferências internacionais:** não previstas (empresa francesa, alojamento em Paris). **A validar:**
  subcontratantes ulteriores indicados no DPA.
- **Mecanismo:** não aplicável, salvo o que o DPA indicar.
- **DPA:** obtido.
- **A validar:** prazo de conservação dos registos da aplicação na Clever Cloud.

### Brevo

- **Serviço / finalidade:** e-mail transacional por API (`src/lib/email/brevo.ts` e Edge Functions):
  e-mails do caso (boas-vindas, aviso de novo caso ao admin, ligações de revisão e autorização do texto),
  pagamentos e subscrições (webhook da Stripe), alertas de fim de fidelização e de promoção, Aviso
  Sectorial, Comparador de Faturas, confirmação de pedidos de livre resolução e formulário de contacto.
- **Categorias de dados:** e-mail e nome do destinatário; conteúdo do e-mail (pode incluir operadora,
  datas, setor, estado do caso, ligações com token, mensagem escrita no formulário de contacto);
  metadados e registos de entrega.
- **Natureza do tratamento:** envio de e-mails e registo do envio/entrega.
- **Localização:** sede em França (UE). **A validar:** localização dos servidores de envio.
- **Transferências internacionais:** não previstas. **A validar:** subcontratantes ulteriores no DPA.
- **Mecanismo:** a validar no DPA.
- **DPA:** obtido.
- **Nota:** ainda não há envio de e-mails comerciais (ver `CLAUDE.md`, "E-mails com novidades e ofertas");
  quando houver, rever esta linha.

### Anthropic (Claude API)

- **Serviço / finalidade:** extração factual por IA no Monitor de Proteção — datas, valores e fornecedor
  lidos das faturas e dos contratos carregados (`src/lib/monitor/claudeDocumentos.ts`), um documento por
  chamada, sem histórico nem ferramentas. Comparações e regras em código; revisão humana antes de comunicar
  qualquer situação detetada. Sem decisões automatizadas com efeitos jurídicos (secção 4 da Política;
  regras em "Uso de IA" no `CLAUDE.md`).
- **Categorias de dados:** o documento submetido pelo cliente (PDF ou imagem, enviado em base64), que
  pode conter nome, morada, NIF, número de cliente e dados de consumo. A DoLado não acrescenta nome,
  e-mail nem telefone da conta.
- **Natureza do tratamento:** análise do documento e devolução de dados extraídos.
- **Localização:** **a validar** (o código chama `api.anthropic.com`, sem região definida).
- **Transferências internacionais:** possíveis (empresa dos EUA).
- **Mecanismo:** a validar no DPA (SCCs, se aplicável).
- **DPA:** obtido.
- **A validar:** prazo de conservação das entradas/saídas pela Anthropic, segundo o DPA/termos comerciais.
- **Estado:** `ANTHROPIC_API_KEY` ainda por configurar (previsto 01/10/2026). Sem chave, não há envio de
  dados (fallback manual).

### Stripe

- **Serviço / finalidade:** Checkout, pagamentos únicos (Avulso), subscrições (Proteção, Caso + Proteção),
  faturas, reembolsos, conversão Avulso → subscrição, webhook.
- **Categorias de dados:** e-mail do cliente, identificador de cliente Stripe; metadata enviada pela
  DoLado (`user_id`, `pedido_id`, `consentimento_compra_id`, plano); dados do meio de pagamento,
  introduzidos diretamente na página da Stripe e nunca recebidos pela DoLado; montantes, datas e estado
  dos pagamentos.
- **Natureza do tratamento:** processamento de pagamentos, gestão de subscrições, faturação, reembolsos.
- **Papel:** subcontratante no que trata por conta da DoLado; responsável autónomo para finalidades
  próprias (prevenção de fraude, obrigações legais).
- **Localização:** **a validar** (entidade Stripe contratante da conta e região de tratamento).
- **Transferências internacionais:** possíveis.
- **Mecanismo:** a validar no DPA (SCCs / Data Privacy Framework).
- **DPA:** obtido. Produção usa chaves `live`.

### Google

- **Serviço / finalidade:** GA4, Google Tag Manager e Google Ads (conversões otimizadas com e-mail em
  hash SHA-256), só com consentimento; início de sessão com conta Google (Supabase Auth / OAuth).
- **Categorias de dados:** dados de navegação e eventos; e-mail em hash; identificadores de cookies; no
  início de sessão, dados da conta Google partilhados com a DoLado (e-mail, nome).
- **Papel:** subcontratante na medição por conta da DoLado; responsável autónomo para finalidades
  próprias e no início de sessão com Google.
- **Localização / transferências:** possíveis transferências internacionais. **Mecanismo:** a validar no
  DPA (SCCs / DPF). **DPA:** obtido.

### Cookiebot (Usercentrics)

- **Serviço / finalidade:** banner e registo do consentimento de cookies (`consent.cookiebot.com`).
- **Categorias de dados:** escolhas de consentimento, identificador do consentimento, endereço IP
  (segundo o funcionamento normal do serviço — a validar).
- **Papel:** subcontratante.
- **Localização, transferências, mecanismo:** **a validar**.
- **DPA:** **por confirmar** — único fornecedor sem DPA confirmado.

## Pontos a validar (resumo)

1. Onde estão arquivadas as cópias dos DPA.
2. Mecanismo de transferência efetivo em cada DPA (Supabase, Anthropic, Stripe, Google; Brevo e Clever
   Cloud para subcontratantes ulteriores).
3. SMTP usado em produção pela Supabase Auth (e-mails de confirmação de conta).
4. Região de tratamento e conservação de dados pela Anthropic.
5. Entidade Stripe contratante e região.
6. DPA, região e transferências da Cookiebot.
7. Prazo de conservação dos registos na Clever Cloud e na Brevo.
