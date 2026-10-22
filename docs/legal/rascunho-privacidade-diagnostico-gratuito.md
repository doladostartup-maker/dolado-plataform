# Rascunho — Política de Privacidade: diagnóstico gratuito sem registo

**Estado:** aprovado na íntegra pela advogada (confirmado por Thiago a 22/10/2026), incluindo as propostas dos pontos da secção 3 (fundamento do art. 6.º, n.º 1, al. b); aviso junto do botão sem passo intermédio; cookie estritamente necessário, também para a contagem por sessão; métricas por interesse legítimo; pedido de apagamento por e-mail; prazos de 7/30 dias e 13 meses). Publicado como Política de Privacidade `2026-10-22c`, com uma só alteração de palavra: «abusos do diagnóstico gratuito» em vez de «abusos do serviço gratuito» (a DoLado não é um serviço gratuito; um teste protege as versões em vigor contra essa frase).
**Parte de:** Política em vigor `2026-10-22b` (o Crisp, PR #168, foi publicado depois, como `2026-10-22d`, a partir da `2026-10-22c`). A versão publicada não se edita: cria-se uma versão nova.
**Funcionalidade:** o visitante carrega uma factura ou um contrato no site, sem criar conta, e vê logo um diagnóstico com o que está no documento. Código em `src/lib/diagnostico/`; migration `20261028090000_diagnostico_gratuito.sql`; secção "Diagnóstico gratuito sem registo" do CLAUDE.md.

## 1. O que é tratado

| Finalidade | Dados | Fundamento proposto | Conservação |
|---|---|---|---|
| Ler o documento e mostrar o diagnóstico pedido | O ficheiro carregado (factura ou contrato, com os dados que contiver: nome, NIF, morada, números de cliente, de contrato e de instalação, consumos, valores, datas) e o resultado da leitura | Diligências a pedido do titular (art. 6.º, n.º 1, al. b), RGPD) — **a validar**; alternativa: interesse legítimo | 7 dias; 30 dias se for associado a uma conta |
| Mostrar o resultado só a quem carregou o documento | Cookie `dolado_diagnostico` com um identificador aleatório da sessão e um segredo (na base de dados só fica o resumo criptográfico do segredo) | Estritamente necessário ao serviço pedido (Lei n.º 41/2004, art. 5.º, n.º 2) — **a validar** | 7 dias (cookie); o resumo do segredo é apagado com o documento |
| Guardar o resultado na conta e passá-lo à Protecção, se o titular o pedir | Ligação entre o diagnóstico e a conta | Execução do contrato (art. 6.º, n.º 1, al. b)) | Como acima; o documento passado à Protecção segue as regras do Monitor de Protecção |
| Prevenir abusos e controlar o custo | Endereço IP (só em memória, durante 10 minutos, nunca guardado); número de diagnósticos por dia | Interesse legítimo (segurança e custo do serviço gratuito) | 10 minutos (IP); contagem diária na base de dados |
| Saber como chegam as pessoas e onde desistem | Canal de origem (por exemplo, Google, Instagram, directo), parâmetros UTM da campanha, caminho da página de entrada, tipo de dispositivo (telemóvel ou computador), sector do documento e datas de cada passo (carregado, analisado, visto, cliques nos botões, conta criada) | Interesse legítimo — **a validar** (ver ponto 3) | 13 meses, já sem o documento, a leitura nem o segredo |

- **IA:** a leitura é feita pela Anthropic (Claude API), já na matriz de subcontratantes e na secção 5 da Política, nas mesmas condições do Monitor de Protecção: um documento de cada vez, por ligação temporária assinada (5 minutos), sem dados da conta. O NIF e o nome do titular lidos são substituídos por um pseudónimo antes de serem guardados.
- **Sem decisões nem conclusões:** o diagnóstico mostra só o que está no documento, contas simples (por exemplo, os dias que faltam para o fim da fidelização) e o que não foi possível confirmar. Não aponta erros, irregularidades nem poupanças (decisão de Thiago, 22/10/2026).
- **Sem fornecedores novos:** Supabase (UE), Clever Cloud (UE) e Anthropic.
- **Sem medição no browser:** o cookie não é usado pelo Google Analytics nem pelo Pixel da Meta. Os eventos de medição (`upload_clicked`, `upload_started`, `upload_completed`, `upload_failed`) só correm com consentimento no Cookiebot e não levam dados do documento.

## 2. Texto proposto para a Política de Privacidade (nova versão)

### Secção 2 — Que dados tratamos (novo parágrafo)

> **Diagnóstico gratuito.** Se carregar uma factura ou um contrato no nosso site para ver o diagnóstico gratuito, tratamos o documento que carregou e o resultado da sua leitura. O documento pode conter o seu nome, o NIF, a morada, números de cliente, de contrato ou de instalação, consumos, valores e datas. Não é preciso criar conta nem indicar o e-mail. Para lhe mostrarmos o resultado, guardamos no seu navegador um cookie com um identificador aleatório (ver secção 3). Registamos também a origem da visita (por exemplo, uma pesquisa no Google ou uma publicação no Instagram, e o nome da campanha, quando existe), a página por onde entrou, se usa um telemóvel ou um computador, o sector do documento e a data de cada passo (documento carregado, analisado e visto, e as opções que escolheu a seguir).

### Secção 3 — Para que usamos estes dados e com que fundamento (novo parágrafo)

> **Diagnóstico gratuito.** Usamos o documento para lhe mostrar o diagnóstico que pediu, a seu pedido e antes de qualquer contrato (artigo 6.º, n.º 1, alínea b), do RGPD). O cookie *dolado_diagnostico* é estritamente necessário para isso: guarda durante 7 dias um identificador aleatório que permite mostrar o resultado só no navegador onde o documento foi carregado e, se criar uma conta nesse navegador, associá-lo a essa conta. Não o identifica e não é usado para medição nem publicidade. Se pedir para continuar com a Protecção, o documento passa a fazer parte da sua Protecção. Usamos ainda, com base no nosso interesse legítimo, o endereço IP, só durante 10 minutos e sem o guardar, para evitar abusos do diagnóstico gratuito, e a origem da visita e as datas de cada passo, sem o documento, para sabermos que canais trazem pessoas e em que passo desistem.

### Secção 4 — Inteligência artificial (nova alínea na lista e novo parágrafo)

Na lista das situações em que a DoLado utiliza inteligência artificial:

> - no diagnóstico gratuito, para ler a factura ou o contrato carregado sem conta e extrair dele dados objectivos, como datas, valores, o nome do fornecedor e as condições do contrato;

Depois do parágrafo sobre o Monitor de Protecção:

> No diagnóstico gratuito, a inteligência artificial também só lê e estrutura o documento. As contas apresentadas, como os dias que faltam para o fim da fidelização, são feitas por programas com regras fixas. O diagnóstico descreve o que está escrito no documento; não é um parecer jurídico nem uma avaliação de que a empresa cumpriu ou não o contrato ou a lei. O prestador de inteligência artificial recebe o documento nas mesmas condições descritas para o Monitor de Protecção, sem dados de identificação ou de contacto.

### Secção 6 — Prazo de conservação (nova linha na tabela)

> **Diagnóstico gratuito** — O documento, o resultado da leitura e o identificador da sessão são apagados 7 dias depois do carregamento; se o diagnóstico for associado a uma conta, 30 dias depois dessa associação. Se o titular pedir para continuar com a Protecção, a cópia do documento passa a seguir os prazos do Monitor de Protecção. A origem da visita, o sector e as datas de cada passo, já sem o documento nem o resultado, são conservados durante 13 meses, para estatística.

### Secção 7 — Direitos do titular (frase nova)

> Como o diagnóstico gratuito não exige conta, podemos só conseguir identificar o seu pedido a partir do navegador onde carregou o documento. Se quiser que o apaguemos antes do fim do prazo, escreva para privacidade@dolado.pt a indicar o dia e a hora aproximados do carregamento e, se possível, faça o pedido a partir desse navegador.

### Secção 8 — Documentos com dados de terceiros (acrescentar)

> O mesmo se aplica aos documentos carregados no diagnóstico gratuito: só deve carregar documentos de que seja titular ou que esteja autorizado a utilizar.

## 3. Pontos para a advogada

- [x] **Fundamento da leitura:** diligências a pedido do titular (art. 6.º, n.º 1, al. b)) ou interesse legítimo, quando não há conta nem contrato?
- [x] **Informação antes do carregamento:** junto do botão "Analisar gratuitamente" aparece sempre: «O documento é lido por um sistema de inteligência artificial (Anthropic) só para lhe mostrar o resultado e é apagado ao fim de 7 dias, se não criar conta.», com ligação para a Política. O botão abre logo o selector de ficheiros. Basta, ou é preciso um passo antes (caixa ou ecrã intermédio)?
  - **Revisão de 22/10/2026 (reposicionamento do site), aprovada pela advogada (confirmado por Thiago a 22/10/2026):** o aviso passa a ter duas camadas. Junto do botão: «O seu documento é privado. Se não criar conta, a DoLado elimina o documento e o resultado ao fim de 7 dias.», com ligação para a Política. Em «Como tratamos o seu documento» (no cartão de análise) e na Política: a leitura automática pela Anthropic, fornecedor de inteligência artificial, a conservação até 30 dias do lado da Anthropic e a possível transferência para fora da UE. "Analisar documento" (navbar e outras páginas) leva sempre a este cartão, nunca abre o selector noutro sítio.
  - **Alteração de 22/10/2026 (decisão de Thiago):** a menção à Anthropic e à inteligência artificial sai também de «Como tratamos o seu documento»; no lugar, «A Política de Privacidade explica como é feita a leitura do documento, que fornecedores nos ajudam e por quanto tempo os dados são guardados.» A informação sobre o subcontratante de IA, os 30 dias e a transferência fica só na Política (versão em vigor `2026-10-22d`), acessível pela ligação junto do botão. **A validar com a advogada** (a versão aprovada tinha a Anthropic no detalhe do cartão).
- [x] **Cookie `dolado_diagnostico` como estritamente necessário:** só é criado quando a pessoa carrega um documento e serve para lhe mostrar o resultado. O identificador da sessão também agrupa, nas métricas internas, os documentos carregados no mesmo navegador (contagem de "sessões" no painel Aquisição e Conversão). Esse uso secundário, só com dados do próprio serviço e sem ferramentas de terceiros, mantém a isenção de consentimento? Se não, a contagem por sessão é retirada e conta-se só por documento.
- [x] **Métricas de conversão:** origem, UTM, página de entrada, dispositivo e datas de cada passo, por interesse legítimo e sem cookies de medição. É preciso teste de ponderação escrito?
- [x] **Dados de terceiros e categorias especiais:** a factura pode ter dados de outras pessoas do agregado; uma factura de saúde ou de serviços sociais pode revelar dados do art. 9.º. O diagnóstico só aceita facturas e contratos de telecomunicações, electricidade, gás e água (os outros falham sem resultado, mas o ficheiro fica guardado até ao fim do prazo). Basta o texto da secção 8?
- [x] **Exercício de direitos sem conta:** proposta de pedido por e-mail com dia e hora aproximados. Alternativa: um botão "Apagar este diagnóstico" na página do resultado (ainda não existe; posso construí-lo).
- [x] **Prazos:** 7 dias / 30 dias depois da associação / 13 meses para as contagens.
- [x] **DPIA:** incluir o tratamento sem conta (já está na lista de pendências).

## 4. Declaração no Cookiebot

| Campo | Valor |
|---|---|
| Nome | `dolado_diagnostico` |
| Fornecedor | DoLado (dolado.pt) |
| Categoria | Necessário (a confirmar no ponto 3) |
| Tipo | HTTP (httpOnly; o scanner pode não o encontrar, acrescentar à mão) |
| Validade | 7 dias |
| Domínio | `.dolado.pt` |
| Valor de exemplo (fictício) | `9b2f6c1e-4a7d-4c3b-8e21-6d5f0a9c3b17.3f8e2a91c4d07b6e5a1f9c28d4b3e70a6c5d1f8e2b9a47c03e6d5f1a8b2c9e40` |

Formato do valor: identificador da sessão (UUID aleatório) + "." + segredo (64 caracteres hexadecimais aleatórios). Não contém dados pessoais nem dados do documento.

Finalidade (pt): «Guarda um identificador aleatório da sessão do diagnóstico gratuito, para lhe mostrar o resultado do documento que carregou neste navegador e o associar à sua conta, se a criar. Não identifica a pessoa e não é usado para medição nem publicidade.»

Finalidade (en): «Stores a random identifier for the free check session, so that we can show you the result of the document you uploaded in this browser and link it to your account if you create one. It does not identify you and is not used for measurement or advertising.»

## 5. Depois da validação

1. Criar `src/app/[idioma]/(legal)/privacidade/_versoes/vAAAA-MM-DD.tsx` a partir da versão em vigor, com os textos acima; registar em `index.ts`; subir `PRIVACIDADE_VERSAO`.
2. Declarar o cookie no Cookiebot (secção 4).
3. Marcar os pontos em `docs/legal/pendencias-juridicas.md` com a data e a decisão.
4. Com a avaliação do Haiku feita, ligar `DIAGNOSTICO_GRATUITO_ATIVO=1` na Clever Cloud e fazer um novo deploy.
