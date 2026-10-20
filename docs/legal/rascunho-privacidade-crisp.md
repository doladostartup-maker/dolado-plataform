# Rascunho — Política de Privacidade: chat em direto (Crisp)

Estado: **rascunho, por validar pela advogada** (19/10/2026). O chat está no código mas desligado
(`CRISP_ATIVO`). Não ligar em produção antes de: (1) DPA com o Crisp; (2) nova versão da Política de
Privacidade com o texto abaixo (as versões publicadas não se editam — criar
`_versoes/vAAAA-MM-DD.tsx`, registar em `index.ts` e subir `PRIVACIDADE_VERSAO`); (3) Cookiebot com os
cookies do Crisp na categoria "Preferências".

## O que o código faz

- Widget do Crisp (Crisp IM SAS, França) só em `/`, `/precario` e `/simulador-elegibilidade` (pt e en),
  nunca no portal, backoffice, `/tratar-caso`, `/comprar`, checkout nem páginas de conta.
- O script (`client.crisp.chat/l.js`) só é inserido depois de o visitante aceitar a categoria
  **"Preferências"** no banner do Cookiebot. Sem resposta, sem Cookiebot ou com recusa, nada é carregado
  e nenhum pedido chega ao Crisp.
- Retirada do consentimento: os cookies e as chaves de localStorage `crisp-client/…` são apagados e a
  página é recarregada.
- A DoLado não envia ao Crisp nenhum dado da conta, de casos, contratos, faturas ou reclamações (sem
  `user:email`, `user:nickname`, `session:data`). Só segue o que o visitante escrever na conversa.
- Atendimento só humano (Thiago), sem IA nem respostas automáticas.

## Porquê consentimento (e não "estritamente necessário")

O Crisp diz que os seus cookies servem só a conversa e dispensam consentimento. Mas o script carrega em
todas as visitas, mesmo sem o visitante pedir o chat, e o Crisp recebe o IP, dados do browser e a página
visitada. Por prudência, e para manter a regra "falha fechada" da medição, o carregamento depende de
consentimento. Alternativa a discutir com a advogada: botão "Conversar" que só carrega o Crisp quando o
visitante clica (serviço pedido expressamente), que mostraria o chat também a quem recusa cookies.

## Dados tratados pelo Crisp

| Dado | Quando | Conservação (segundo o Crisp) |
|---|---|---|
| Cookies `crisp-client/…` (identificador da sessão do chat) | Ao carregar, com consentimento | 6 meses, renovado em cada visita |
| localStorage `crisp-client/session/<id>` e `…:e` (verificado a 19/10/2026) | Ao carregar, com consentimento | Até ser apagado (a retirada apaga-o) |
| Endereço IP | Ao carregar | ~30 min sem conversa; mais tempo se houver conversa (registo e anti-spam) |
| Browser, sistema, página atual, localização aproximada | Ao carregar | A validar |
| Mensagens e e-mail deixado pelo visitante | Só se escrever | A definir pela DoLado (proposta: 12 meses) |

## Texto proposto para a Política (nova versão)

**Secção 2 — Que dados tratamos** (acrescentar):

> **Chat em direto.** Se aceitar os cookies de preferências, algumas páginas do nosso site mostram um
> chat em direto. Se nos escrever, tratamos o conteúdo das mensagens e, se o indicar, o seu e-mail,
> para responder à sua pergunta. Para o chat funcionar, o nosso fornecedor recebe também o endereço IP,
> dados técnicos do browser e a página que está a ver. Não pedimos nem enviamos para o chat dados da sua
> conta, dos seus casos, contratos ou faturas. Não partilhe no chat documentos nem dados que não sejam
> necessários para a sua pergunta; para tratar um caso, use a plataforma.

**Secção 3 — Finalidades e fundamentos** (acrescentar):

> Responder a perguntas feitas no chat em direto — diligências pré-contratuais a pedido do titular
> (art. 6.º, n.º 1, al. b) do RGPD) ou interesse legítimo em responder a pedidos de informação
> (al. f)); colocação dos cookies do chat com o seu consentimento (art. 5.º, n.º 1, da Lei 41/2004).

**Secção 5 — Subcontratantes** (acrescentar):

> Crisp IM SAS (França) — chat em direto nas páginas públicas.

**Secção 6 — Conservação** (acrescentar):

> Conversas do chat em direto: [12 meses] após a última mensagem, salvo se derem origem a um caso.

**Cookies** (declarar no Cookiebot, categoria "Preferências"): `crisp-client/session/<id>` — sessão do
chat em direto, 6 meses; outros `crisp-client/…` — estado da ligação, sessão; localStorage
`crisp-client/session/<id>` — sessão do chat (persistente).

## Pontos a validar

1. DPA do Crisp, região de alojamento, subcontratantes ulteriores.
2. Categoria "Preferências" vs. botão de carregamento por clique (ver acima).
3. Prazo de conservação das conversas e configuração correspondente no Crisp.
4. Fundamento jurídico (b) ou (f) para responder às mensagens.
