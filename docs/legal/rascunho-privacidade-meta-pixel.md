# Rascunho — Política de Privacidade: Pixel da Meta

Estado: **validado pela advogada (19/10/2026)**; texto da Política `2026-10-19` (em vigor com o próximo deploy). O Pixel está **ligado em produção desde
19/10/2026** (PR #135, `NEXT_PUBLIC_META_PIXEL_ID` no Clever Cloud), só com consentimento de marketing.
A Política em vigor (`2026-10-18`) não refere a Meta. Depois da validação: nova versão
(`_versoes/v2026-10-19.tsx` ou a data da publicação), registar em `index.ts`, subir `PRIVACIDADE_VERSAO`
e atualizar `docs/legal/matriz-subcontratantes.md`. Se o texto do Crisp
(`rascunho-privacidade-crisp.md`) estiver validado na mesma altura, as duas alterações podem entrar na
mesma versão.

## O que o código faz

- Pixel da Meta (Meta Platforms Ireland Limited), ID `1432203388349553`, em todas as páginas públicas de
  `dolado.pt` (pt e en). Não corre em `portal.dolado.pt` (portal, `/tratar-caso`, `/comprar`, checkout,
  contas, backoffice): o Cookiebot só existe em dolado.pt e, sem consentimento, o Pixel não carrega.
- O script (`connect.facebook.net/en_US/fbevents.js`) só é inserido depois de o visitante aceitar a
  categoria **"Marketing"** no banner do Cookiebot. Sem resposta, sem Cookiebot ou com recusa, nada é
  carregado e nenhum pedido chega à Meta. Não há a imagem `<noscript>` do código oficial (sem
  JavaScript não há consentimento).
- Evento enviado: só `PageView` (página visitada), em cada página. **Nenhum evento de conversão**
  (`Lead`, `Purchase`…), nenhuma correspondência avançada (*advanced matching*) e nenhum dado da conta,
  e-mail, nome, telefone, caso, contrato ou fatura é enviado pela DoLado.
- Retirada do consentimento: `fbq('consent', 'revoke')` — o Pixel deixa de enviar eventos. Os cookies
  já criados pela Meta (`_fbp`) não são apagados pelo código (expiram no prazo definido pela Meta; o
  visitante pode apagá-los no browser) — **ponto a decidir** (ver dúvida 4).
- A Meta recebe, com cada evento: endereço IP, *user agent* (browser e sistema), URL da página e
  página de origem, identificador `_fbp` (cookie primário, 90 dias) e, se o visitante tiver sessão
  iniciada no Facebook/Instagram nesse browser, o cookie `c_user`/`fr` do domínio da Meta, o que lhe
  permite associar a visita a uma conta Meta.

## Enquadramento proposto (a confirmar)

- **Controladores conjuntos** na recolha e transmissão dos dados à Meta (acórdão do TJUE *Fashion ID*,
  C-40/17, 29/07/2019): a DoLado decide inserir o Pixel e beneficia da medição/publicidade; a Meta
  define os meios. Acordo: *Meta Controller Addendum* (aceite nos Meta Business Tools Terms, no Events
  Manager). Para o tratamento posterior (publicidade, perfis, melhoria dos seus produtos), a Meta é
  **responsável autónoma**. Para a medição e relatórios entregues à DoLado, os *Data Processing Terms*
  podem aplicar-se (Meta como subcontratante) — a confirmar.
- **Fundamento:** consentimento (art. 6.º, n.º 1, al. a) do RGPD) e art. 5.º, n.º 1, da Lei n.º 41/2004
  (acesso ao equipamento). Não usar interesse legítimo.
- **Transferências:** Meta Platforms Ireland Limited é a entidade contratante na UE; os dados podem ser
  transferidos para a Meta Platforms, Inc. (EUA), certificada no EU-U.S. Data Privacy Framework, com
  cláusulas contratuais-tipo.

## Texto proposto para a Política (nova versão)

**Secção 2 — Que dados tratamos** (substituir o ponto "Dados de navegação e medição"):

> **Dados de navegação e medição**, apenas com consentimento dado no banner de cookies: dados de
> utilização do site recolhidos via Google Analytics (GA4), designadamente páginas visitadas e eventos
> como a submissão de formulários, e dados de medição de conversões do Google Ads, incluindo o e-mail
> indicado no formulário sob a forma de hash irreversível (SHA-256); e, com consentimento para
> marketing, as páginas do site visitadas, recolhidas pelo Pixel da Meta juntamente com o endereço IP,
> dados técnicos do navegador e um identificador guardado num cookie. Não enviamos à Meta o seu nome,
> e-mail, telefone, nem dados da sua conta, dos seus casos, contratos ou faturas.

**Secção 3 — Finalidades e fundamentos** (no ponto do consentimento, substituir o primeiro item):

> dados de navegação e de medição (Google Analytics, Google Ads e Pixel da Meta), só recolhidos depois
> de consentimento explícito no banner de cookies, para medir a utilização do site, medir a eficácia das
> nossas campanhas publicitárias e mostrar publicidade da DoLado a pessoas que visitaram o site. O
> acesso ou armazenamento de informação no equipamento é feito com consentimento prévio quando exigido
> pelo artigo 5.º, n.º 3, da Diretiva ePrivacy, transposto pela Lei n.º 41/2004;

**Secção 5 — Destinatários** (acrescentar depois da Google):

> **Meta** (Meta Platforms Ireland Limited — Pixel da Meta, para medir as visitas ao site vindas das
> campanhas da DoLado no Facebook e no Instagram e para mostrar publicidade da DoLado a quem visitou o
> site, apenas com consentimento para marketing dado no banner de cookies). Na recolha e transmissão
> destes dados à Meta, a DoLado e a Meta são responsáveis conjuntas pelo tratamento, nos termos de um
> acordo celebrado entre ambas, que define que a DoLado informa o Utilizador e obtém o seu
> consentimento e que a Meta responde aos pedidos de exercício de direitos relativos aos dados que
> trata. O tratamento posterior desses dados é feito pela Meta como responsável pelo tratamento
> autónomo, nos termos da sua Política de Privacidade (https://www.facebook.com/privacy/policy).
> Se tiver uma conta Facebook ou Instagram, a Meta pode associar a visita a essa conta. Este tratamento
> pode implicar transferências internacionais de dados para a Meta Platforms, Inc., nos Estados Unidos,
> certificada no Quadro de Privacidade de Dados UE-EUA (EU-U.S. Data Privacy Framework), e com base nas
> cláusulas contratuais-tipo aprovadas pela Comissão Europeia.

**Secção 6 — Prazo de conservação** (na linha "Medição…", acrescentar ao prazo):

> O cookie do Pixel da Meta (_fbp) é conservado durante, no máximo, 90 dias, e deixa de ser utilizado
> quando o consentimento para marketing é retirado. Os dados recebidos pela Meta são conservados pela
> Meta nos termos da sua Política de Privacidade.

**Secção 7 — Direitos do titular** (acrescentar):

> Pode retirar o consentimento para marketing a qualquer momento, nas definições de cookies do site
> (ligação "Definições de cookies" no rodapé). Quanto aos dados tratados pela Meta, pode também exercer os seus
> direitos diretamente junto da Meta e gerir as preferências de publicidade na sua conta Facebook ou
> Instagram.

## Dúvidas para a advogada

1. Controladores conjuntos na recolha/transmissão + Meta responsável autónoma no tratamento posterior —
   é este o enquadramento a usar? Basta a aceitação dos Meta Business Tools Terms e do *Controller
   Addendum* no Events Manager como "acordo" do art. 26.º do RGPD?
2. A finalidade "mostrar publicidade a quem visitou o site" (*retargeting*) fica coberta pelo
   consentimento da categoria "Marketing" do Cookiebot, ou é preciso descrevê-la no banner?
3. É preciso mencionar a Meta também na secção 4 (decisões automatizadas/perfis), dado que a Meta faz
   perfis para publicidade?
4. Retirada: chega deixar de enviar eventos (`revoke`) ou o código deve também apagar o cookie `_fbp`?
5. **Hoje não existe** uma ligação permanente para reabrir o banner (verificado no código a 19/10/2026:
   só o fluxo de indicação chama `Cookiebot.renew()`). Retirar o consentimento deve ser tão fácil como
   dá-lo (art. 7.º, n.º 3, do RGPD). Proposta: acrescentar "Definições de cookies" ao rodapé V2
   (`Cookiebot.renew()`) antes de publicar esta versão — o texto da secção 7 assume que existe.

## Fora do código (Thiago)

- Aceitar os Meta Business Tools Terms (com o *Controller Addendum* e os *Data Processing Terms*) no
  Events Manager e guardar cópia/data — é o "DPA" da Meta; não há documento para assinar à parte.
- Cookiebot: confirmar que `_fbp` e os pedidos a `facebook.com/tr` aparecem na categoria
  **"Marketing"** (a próxima análise automática do Cookiebot deve detetá-los).
- Matriz de subcontratantes: linha "Meta" (papel: responsável conjunta/autónoma; região: Irlanda, com
  transferências para os EUA; mecanismo: DPF + SCCs; acordo: Business Tools Terms aceites em …).
- **Importante:** no Events Manager, desligar a correspondência automática avançada (*Automatic
  Advanced Matching*), que vem ligada por omissão em pixels novos. Ligada, o próprio script da Meta lê
  e envia (em hash) e-mails e telefones escritos em campos das páginas — o texto proposto acima diz que
  isso não acontece.
