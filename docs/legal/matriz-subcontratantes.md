# Matriz de Subcontratantes e prestadores — DoLado

Documento interno (art. 28.º e 30.º do RGPD). Fonte única desta informação no repositório; o
`CLAUDE.md` só aponta para aqui. A secção 5 da Política de Privacidade em vigor (`PRIVACIDADE_VERSAO`
em `src/lib/legal.ts`) tem de ficar coerente com esta matriz: se um fornecedor, uma finalidade ou um
mecanismo de transferência mudar, rever a Política (nova versão — as publicadas não se editam).

- **Última revisão:** 19/10/2026 (Política de Privacidade `2026-10-19` — Pixel da Meta).
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
| Brevo | E-mail transacional (envios) | Subcontratante | UE (sede em França) | Não previstas — a validar subcontratantes ulteriores | A validar no DPA | Obtido |
| Resend (Plus Five Five, Inc.) | Receção das respostas das empresas (respostas.dolado.pt) | Subcontratante (responsável autónomo só pelos dados da conta e de utilização do serviço) | EUA (tratamento principal) | Sim | SCCs 2021/914 (Módulo 2) no DPA + certificação EU-U.S. DPF | Obtido (06/10/2026) |
| Anthropic | Claude API (leitura de faturas e contratos no Monitor de Proteção; primeira proposta do texto da reclamação; análise preliminar das respostas das empresas) | Subcontratante | A validar | Possíveis | A validar no DPA (SCCs, se aplicável) | Obtido |
| Stripe | Pagamentos, subscrições, faturação, reembolsos | Subcontratante; responsável autónomo para finalidades próprias | A validar (entidade contratante) | Possíveis | A validar no DPA (SCCs / DPF) | Obtido |
| Google | GA4, Tag Manager, Google Ads (com consentimento); início de sessão com Google | Subcontratante na medição; responsável autónomo para fins próprios e no início de sessão | A validar | Possíveis | A validar no DPA (SCCs / DPF) | Obtido |
| Meta (Meta Platforms Ireland Limited) | Pixel da Meta em dolado.pt (só `PageView`), só com consentimento de marketing: medição das campanhas e publicidade a quem visitou o site | Responsável conjunta na recolha e transmissão (art. 26.º; acórdão *Fashion ID*); responsável autónoma no tratamento posterior | UE (Irlanda) | Sim (Meta Platforms, Inc., EUA) | EU-U.S. DPF + SCCs | **Por aceitar** (Meta Business Tools Terms + Controller Addendum no Events Manager) |
| Cookiebot (Usercentrics) | Gestão do consentimento de cookies | Subcontratante | A validar | A validar | A validar | **Por confirmar** |
| Crisp (Crisp IM SAS) — **ligado em produção desde, pelo menos, 21/10/2026 sem cobertura legal** (Política `2026-10-23` por validar) | Chat em direto nas páginas públicas (homepage, preçário, simulador), só com consentimento de preferências | Subcontratante | UE (sede em França) — região de alojamento a validar | A validar (subcontratantes ulteriores) | A validar no DPA | **Obtido** (22/10/2026) |

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
- **Nota (06/10/2026):** a receção das respostas das empresas **não** passa pela Brevo (o inbound da Brevo
  exige um plano pago) — ver Resend, abaixo.

### Resend (06/10/2026)

- **Serviço / finalidade:** só **receção** dos e-mails enviados para os endereços dos casos
  (`*@respostas.dolado.pt`, MX para o Resend): avisa a DoLado (webhook `email.received`, assinado) e a
  DoLado obtém o conteúdo e os anexos pela API (`src/lib/comunicacoes/`). Não envia e-mails.
- **Categorias de dados:** conteúdo das respostas das empresas (pode incluir dados do cliente e de
  trabalhadores da empresa), anexos, cabeçalhos, resultados SPF/DKIM/DMARC; também e-mails sem caso (spam).
- **Entidade:** Plus Five Five, Inc., 2261 Market Street #5039, San Francisco, CA 94114 (contacto: privacy@resend.com).
- **Localização / transferências:** segundo o DPA (versão de 31/12/2025, assinado pelo Resend a 14/01/2026,
  cópia assinada guardada por Thiago fora do repositório e disponível no dashboard do Resend), o tratamento
  principal decorre nos **EUA** — há transferência internacional.
- **Mecanismo:** cláusulas contratuais-tipo da Comissão (Decisão 2021/914), Módulo 2 (responsável →
  subcontratante), incorporadas no DPA (lei e foro da Irlanda), com medidas suplementares (secção 6.6);
  e certificação no **EU-U.S. Data Privacy Framework** (secção 11). **DPA:** obtido (06/10/2026).
- **Conservação do lado do Resend:** enquanto o contrato estiver ativo; apagamento até 90 dias depois do fim
  da conta. A DoLado obtém o conteúdo pela API e guarda-o na Supabase.
- **Subcontratantes ulteriores:** lista em https://resend.com/legal/subprocessors (aviso prévio de 14 dias,
  com direito de oposição).
- **Papel:** subcontratante; responsável autónomo só pelos dados da conta DoLado no Resend e pelos dados de
  utilização do serviço (secção 9 do DPA).
- Política de Privacidade `2026-10-06` (secção 5) publicada com esta informação.

### Anthropic (Claude API)

- **Serviço / finalidade:** extração factual por IA no Monitor de Proteção — datas, valores e fornecedor
  lidos das faturas e dos contratos carregados (`src/lib/monitor/claudeDocumentos.ts`), um documento por
  chamada, sem histórico nem ferramentas. Comparações e regras em código; revisão humana antes de comunicar
  qualquer situação detetada. Sem decisões automatizadas com efeitos jurídicos (secção 4 da Política;
  regras em "Uso de IA" no `CLAUDE.md`).
  Desde a Política `2026-10-05`: **primeira proposta do texto da reclamação** (`src/lib/rascunhoIA/`), uma
  chamada por geração, sem histórico nem ferramentas, sempre revista por uma pessoa da DoLado antes de ser
  mostrada ao cliente; fundamentação só com regras da base jurídica da DoLado (`regras_juridicas`). Só
  corre com `RASCUNHO_IA_ATIVO=1`.
- **Categorias de dados:**
  - Monitor: o documento submetido pelo cliente (PDF ou imagem, por URL assinada de curta duração), que
    pode conter nome, morada, NIF, número de cliente e dados de consumo. A DoLado não acrescenta nome,
    e-mail nem telefone da conta.
  - Proposta do texto: setor, empresa visada, tipo de problema, descrição do cliente (com e-mails,
    telefones, números longos, IBAN, códigos postais e o nome do cliente retirados por regras — melhor
    esforço, não é anonimização), contacto anterior com a empresa, data do pedido e, se existir no
    Monitor um serviço da mesma empresa, as condições registadas e os valores das faturas recentes. Nunca:
    nome, e-mail, telefone, NIF, referências de cliente/contrato, CPE/CUI, notas internas, anexos do caso.
- **Natureza do tratamento:** análise do documento e devolução de dados extraídos; redação de uma
  proposta de texto a partir dos dados do caso e das regras jurídicas enviadas.
- **Localização:** **a validar** (o código chama `api.anthropic.com`, sem região definida).
- **Transferências internacionais:** possíveis (empresa dos EUA).
- **Mecanismo:** a validar no DPA (SCCs, se aplicável).
- **DPA:** obtido.
- **A validar:** prazo de conservação das entradas/saídas pela Anthropic, segundo o DPA/termos comerciais.
- **Proposto (06/10/2026, a validar):** **análise preliminar das respostas das empresas**
  (`src/lib/analiseResposta/`), interna e sempre revista por uma pessoa; dados: problema descrito, última
  comunicação enviada, até 3 comunicações anteriores e a resposta recebida (com contactos, números e o nome
  do cliente retirados — melhor esforço), domínio do remetente e tipo dos anexos. Só corre com
  `ANALISE_RESPOSTA_IA_ATIVO=1`, depois da nova versão da Política.
- **Estado:** `ANTHROPIC_API_KEY` configurada na Clever Cloud a 03/10/2026 (Monitor). A proposta do texto
  só corre com `RASCUNHO_IA_ATIVO=1`. Sem chave ou desligada, não há envio de dados (fallback manual).

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

### Meta (Meta Platforms Ireland Limited) — ligado a 19/10/2026

- **Serviço / finalidade:** Pixel da Meta (`connect.facebook.net/…/fbevents.js`, ID
  `1432203388349553`) em todas as páginas públicas de dolado.pt, só depois do consentimento de
  "Marketing" no Cookiebot (`MedicaoComConsentimento`). Medir as visitas vindas das campanhas no
  Facebook e no Instagram e mostrar publicidade da DoLado a quem visitou o site. Não corre em
  portal.dolado.pt.
- **Categorias de dados:** página visitada e página de origem (evento `PageView`), endereço IP, dados
  técnicos do browser, cookie `_fbp` (90 dias) e, se o visitante tiver sessão Meta nesse browser, os
  cookies da Meta que permitem associar a visita a uma conta Facebook/Instagram. A DoLado não envia
  nome, e-mail, telefone, nem dados da conta, de casos, contratos ou faturas (sem eventos de conversão
  nem correspondência avançada).
- **Papel:** responsável conjunta com a DoLado na recolha e transmissão (art. 26.º do RGPD; acórdão do
  TJUE *Fashion ID*, C-40/17); responsável autónoma no tratamento posterior (publicidade, perfis).
- **Localização / transferências / mecanismo:** Meta Platforms Ireland Limited (UE); transferências para
  a Meta Platforms, Inc. (EUA) com base no EU-U.S. Data Privacy Framework e em SCCs.
- **Acordo:** **por aceitar** — Meta Business Tools Terms, com o *Controller Addendum* e os *Data
  Processing Terms*, aceites no Events Manager (não há DPA à parte para assinar). Anotar a data de
  aceitação. Desligar também a correspondência automática avançada (*Automatic Advanced Matching*).
- **Política:** `2026-10-19` (secções 2, 3, 5, 6 e 7); rascunho validado em
  `docs/legal/rascunho-privacidade-meta-pixel.md`.

### Cookiebot (Usercentrics)

- **Serviço / finalidade:** banner e registo do consentimento de cookies (`consent.cookiebot.com`).
- **Categorias de dados:** escolhas de consentimento, identificador do consentimento, endereço IP
  (segundo o funcionamento normal do serviço — a validar).
- **Papel:** subcontratante.
- **Localização, transferências, mecanismo:** **a validar**.
- **DPA:** **por confirmar** — único fornecedor sem DPA confirmado.

### Crisp (Crisp IM SAS) — ligado sem cobertura legal (actualizado a 21/10/2026)

- **Estado verificado a 21/10/2026:** `CRISP_ATIVO=1` na Clever Cloud e o chat presente na homepage publicada
  (só carrega com consentimento de "preferências"), sem DPA, sem secção na Política em vigor (`2026-10-22b`)
  e sem declaração no Cookiebot confirmada. Decisão de Thiago (21/10/2026): manter o Crisp e completar o
  DPA, a Política (`2026-10-23`, por validar pela advogada) e o Cookiebot.

- **Serviço / finalidade:** chat em direto nas páginas públicas `/`, `/precario` e
  `/simulador-elegibilidade` (`client.crisp.chat`), atendido só por Thiago, sem IA nem respostas
  automáticas. Só carrega com consentimento de "preferências" no Cookiebot (`src/lib/crisp.ts`);
  desligado por omissão (`CRISP_ATIVO`).
- **Categorias de dados:** o que o visitante escrever na conversa (e o e-mail, se o deixar quando a
  conversa está offline); endereço IP (guardado pelo Crisp ~30 min sem conversa, mais tempo com
  conversa); dados técnicos do browser, página visitada e localização aproximada pelo IP (funcionamento
  normal do serviço — a validar); cookies `crisp-client/…` (6 meses). A DoLado não envia ao Crisp
  dados da conta, de casos, contratos ou faturas.
- **Papel:** subcontratante.
- **Localização / transferências / mecanismo:** **a validar** no DPA (empresa francesa; confirmar região
  de alojamento e subcontratantes ulteriores).
- **DPA:** **obtido** (confirmado por Thiago a 22/10/2026). Falta anotar aqui a região de alojamento, os
  subcontratantes ulteriores e onde está arquivada a cópia. Rascunho da Política:
  `docs/legal/rascunho-privacidade-crisp.md`.

## Pontos a validar (resumo)

1. Onde estão arquivadas as cópias dos DPA.
2. Mecanismo de transferência efetivo em cada DPA (Supabase, Anthropic, Stripe, Google; Brevo e Clever
   Cloud para subcontratantes ulteriores).
3. SMTP usado em produção pela Supabase Auth (e-mails de confirmação de conta).
4. Região de tratamento e conservação de dados pela Anthropic.
5. Entidade Stripe contratante e região.
6. DPA, região e transferências da Cookiebot.
7. Prazo de conservação dos registos na Clever Cloud e na Brevo.
8. Crisp: região de alojamento, subcontratantes ulteriores e prazo de conservação das conversas (DPA obtido a 22/10/2026).
9. Meta: data de aceitação dos Business Tools Terms (Controller Addendum) e correspondência automática
   avançada desligada no Events Manager.
