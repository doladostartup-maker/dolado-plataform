# Rascunho — privacidade do programa de indicação

**Estado:** análise jurídica e técnica revista a 08/10/2026; retenção definida como limite interno de três anos, com revisão humana dos sinais de risco. Cookiebot configurado por Thiago. O utilizador autorizou preparar a publicação após esta validação.

## Tratamentos descritos

- Finalidade: atribuir uma indicação, aplicar os descontos anunciados, gerir a primeira compra e as recompensas e prevenir autoindicações e abuso do programa.
- Dados: código associado à conta que indica; id e data/hora da visita; relação entre quem indica e quem é indicado; primeira compra (produto, valor, desconto, data e identificadores Stripe); recompensas e histórico de estados e motivos.
- Os códigos e ids são pseudonimizados, não anónimos: tornam-se dados pessoais quando ligados a contas ou a informação que permita identificar as pessoas.
- O fluxo não lê nem usa o IP para atribuir ou avaliar indicações. A verificação de risco compara temporariamente fingerprints de cartão e débito direto SEPA obtidos da Stripe; a fingerprint não é guardada. Uma coincidência de fingerprint ou do mesmo Customer Stripe é apenas um sinal para revisão humana, nunca uma rejeição automática.

## Fundamentos e cookie

- A gestão da indicação, dos descontos e das recompensas: artigo 6.º, n.º 1, alínea b), do RGPD, na medida necessária à execução do programa pedido pelo participante e às diligências pré-contratuais do utilizador indicado.
- Prevenção de autoindicação/abuso e conservação limitada para revisão e defesa de direitos: artigo 6.º, n.º 1, alínea f), do RGPD. A ponderação de interesses e expectativas dos titulares tem de ser confirmada pela advogada e documentada antes da publicação.
- Armazenamento/consulta do cookie `dolado_indicacao`: exigir consentimento prévio para cookies de Marketing no Cookiebot, ao abrigo do artigo 5.º, n.º 3, da Diretiva 2002/58/CE e do artigo 5.º da Lei n.º 41/2004. Não se assume a exceção de cookie estritamente necessário.
- A rejeição automática por coincidência de Customer Stripe foi removida. O sinal é submetido a revisão por uma pessoa, que pode considerar o contexto antes de aprovar ou recusar a recompensa. Esta opção evita que a coincidência produza, por si só, uma decisão adversa exclusivamente automatizada; mantém-se o dever de informar o titular sobre o tratamento e o modo de pedir revisão.

## Conservação implementada em código, sujeita a aprovação

- Cookie e visita ainda não atribuída: 30 dias, iguais à janela de atribuição; rotina diária elimina visitas antigas.
- Relação entre as contas, compra, recompensa e histórico: enquanto a atribuição/recompensa estiver ativa ou em revisão; até 3 anos após a última decisão/estado final na relação ou recompensa; eliminação em cascata de relação, recompensa e histórico. A coluna `indicacoes.retencao_bloqueada` suspende a limpeza quando uma necessidade concreta de conservação for documentada.
- Os três anos são um limite interno de conservação, escolhido para minimização e defesa de direitos; não são um prazo geral de prescrição nem um prazo expresso no RGPD. O artigo 498.º do Código Civil respeita à responsabilidade extracontratual, enquanto o artigo 309.º estabelece o prazo ordinário de vinte anos, e nenhum deles determina automaticamente o prazo destes registos.

## Configuração e verificação manual do Cookiebot

Thiago confirmou que declarou `dolado_indicacao` no Cookiebot como cookie de **Marketing**, com fornecedor **DoLado**, duração **30 dias** e domínio **.dolado.pt**. O valor é um identificador aleatório de visita (UUID); o exemplo do painel não deve ser um identificador de cliente real. O fluxo apresenta a escolha no domínio `dolado.pt`, onde o Cookiebot está autorizado, e só depois envia a visita ao servidor.

Confirmar no painel a descrição do propósito (atribuir a indicação e gerir os descontos) e que o cookie aparece na declaração. Depois do consentimento, testar que o cookie chega a `portal.dolado.pt`; depois de recusar/retirar consentimento, testar que é apagado e não ocorre atribuição. A configuração foi feita por Thiago; estes testes nos dois domínios continuam a ser verificação manual de produção.

## Referências jurídicas consultadas

- RGPD, artigos 5.º, 6.º e 22.º: <https://eur-lex.europa.eu/eli/reg/2016/679/oj>
- Diretiva 2002/58/CE, artigo 5.º, n.º 3: <https://eur-lex.europa.eu/eli/dir/2002/58/oj>
- Lei n.º 41/2004, artigo 5.º, redação em vigor: <https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2004-34546475>
- CNPD, nota informativa sobre cookies: <https://www.cnpd.pt/media/x2zdus50/nota-informativa-cnpd_cookies_20210625.pdf>
- Cookiebot Developer Resources (verificação server-side de `CookieConsent`): <https://www.cookiebot.com/en/developer/>
- Cookiebot Support, declaração manual de cookies: <https://support.cookiebot.com/hc/en-us/articles/360018481879-Manually-adding-cookies-in-the-Cookiebot-Admin>

## Ficheiros técnicos

- Política: `src/app/(legal)/privacidade/_versoes/v2026-10-09.tsx`; índice em `src/app/(legal)/privacidade/_versoes/index.ts`; ponteiro em `src/lib/legal.ts`.
- Consentimento: `src/app/r/[codigo]/page.tsx`, `src/components/indicacoes/RegistarIndicacaoComConsentimento.tsx`, `src/app/api/indicacoes/visita/route.ts`, `src/lib/indicacoes/consentimento.ts` e `src/middleware.ts`.
- Conservação e revisão humana: migrations `supabase/migrations/20261008140000_indicacoes_consentimento_retencao.sql` e `supabase/migrations/20261008150000_indicacoes_retencao_tres_anos_revisao_humana.sql`.
