# Revisão da comunicação pública — 17/10/2026

Branch: `feat/comunicacao-publica`. Este documento acompanha as alterações: o que mudou, a matriz de requisitos, os textos antes e depois, as verificações e os pontos que dependem de uma decisão de Thiago ou da advogada.

Materiais relacionados nesta pasta:

- [`guiao-video-fundador.md`](guiao-video-fundador.md) — guião curto para um futuro vídeo (não publicado).
- [`guiao-testes-pessoas.md`](guiao-testes-pessoas.md) — guião e grelha para testar com cinco pessoas (**os testes ainda não foram feitos**).
- [`entradas-por-origem.md`](entradas-por-origem.md) — percursos por origem da visita, proposta para flyers e estrutura para parcerias (sem condições publicadas).
- [`capturas/`](capturas/) — capturas de computador (1440 px) e telemóvel (390 px).

## 1. Resumo do que foi implementado

1. **Página inicial reorganizada:** abertura revista (preparação, envio autorizado e acompanhamento, sem garantir resultado) → **6 situações concretas**, cada uma ligada à página existente mais próxima → **duas formas de ajudar** (tratar um problema / acompanhar faturas e contratos) → um só bloco "Como funciona", com um **excerto fictício de reclamação** → **resumo de preços** dos três serviços → ferramentas gratuitas → origem do fundador → **dúvidas práticas** (8 perguntas novas ou revistas) → CTA final coerente com o destino (Simulador).
2. **Removidas repetições** da página inicial: as secções "Tratamento do seu caso" e "Depois de resolver o problema" (com dois painéis ilustrativos) deram lugar ao bloco "Duas formas de ajudar". O mockup decorativo do topo fica escondido no telemóvel para as situações aparecerem logo a seguir à abertura.
3. **Proteção como serviço autónomo:** nova página pública **`/protecao`** (pt e en) com as três perguntas (o que acompanhamos, que avisos recebe, o que precisa de nos dar), dois exemplos fictícios (aviso de fim de promoção e alteração de fatura), o que a Proteção **não** é (não é seguro, não acede às contas, não deteta tudo, não renegoceia, não inclui reclamações) e a comparação com o Caso + Proteção. Ligada a partir do menu, rodapé, página inicial e preçário. Adesão pelo mesmo percurso de sempre (`/comprar?plano=protecao` → `ConfirmarCompra`).
4. **Navegação:** "Problemas que tratamos" e "Proteção" no menu (computador e telemóvel). No computador, rótulos curtos ("Problemas", "Ferramentas") e menu completo a partir de 1280 px; "Empresas" passa para o menu do telemóvel e para o rodapé.
5. **Preçário:** necessidades com a formulação pedida; nova secção **"Como funcionam os pagamentos"** (caso isolado vs. subscrição, renovação e cancelamento, "1 caso por mês", fim da subscrição, Caso Extra, passagem de Avulso para subscrição com os valores de reembolso calculados a partir de `src/lib/planos.ts`); ligação "O que é a Proteção?". Resumos dos cartões revistos. Preços, produtos, Price IDs e regras **não** foram alterados.
6. **Contacto:** retirada a frase "Reclamações enviadas por e-mail ou por este formulário são ignoradas" e o termo "fluxo guiado"; o aviso explica com respeito que uma mensagem não abre um caso nem contrata o serviço, com botão direto para o formulário passo a passo. Texto do WhatsApp com os limites claros (só mensagem, sem análise de casos nem receção de documentos).
7. **Como funciona:** os 7 passos seguem agora o fluxo real (formulário → conta e pagamento → contacto no prazo de 2 dias úteis → preparação → revisão e autorização → envio pelo canal adequado → acompanhamento e conclusão/encaminhamento). Removidos "mérito do caso", "resposta substantiva", "escalada", "estratégia legal", "Livro de Reclamações como canal único" e o prazo legal concreto de telecomunicações.
8. **Transparência e Sobre nós:** canais de envio harmonizados; "acompanhamos o prazo / sabemos exatamente quando termina" substituído pelo que o sistema faz (prazo registado quando aplicável); afirmação categórica sobre advogado em arbitragem suavizada; "até à sua resolução" retirado.
9. **Problemas que tratamos:** Ginásios acrescentado como área (setor já aceite no formulário e no Simulador), com ligação direta a "Tratar o meu caso", como Gás e Água.
10. **Formulário de contratação:** o contador interno passou de "Passo 1 de 5" (confundível com as 4 etapas) para **"O seu caso · pergunta 1 de 5: Empresa"**; ligação discreta às perguntas frequentes num separador novo (não apaga o que foi preenchido); exemplos de documentos no passo opcional.
11. **Linguagem:** Calculadora com "valor máximo a pagar por cancelar" nos títulos e na descrição (as notas jurídicas mantêm o termo "encargo"); "portal" → "área de cliente" nos textos públicos alterados; correção de formas que podiam ler-se como "tu" (o teste de regras de escrita apanhou "preenche").
12. **Fundador:** episódio real reescrito para se perceber sem contexto (ver secção 7, ponto 3).
13. **Empresas:** a Proteção aparece como serviço à parte, útil depois de uma mudança de casa, nos dois públicos e na pergunta "Que tipo de apoio presta a DoLado?". Sem preços, poupanças, logótipos nem acesso a casos individuais.
14. **Acessibilidade:** foco de teclado visível (contorno verde) também nas páginas públicas (`.tema-v2`); exemplos legíveis como texto (não imagem); barra de progresso do formulário marcada como decorativa (o texto do progresso já a descreve).
15. **SEO:** `/protecao` em `PAGINAS_BILINGUES` (sitemap com hreflang), nas duas listas do middleware, com canonical e alternates (verificado no browser). Títulos e descrições da página inicial, Como funciona, Contacto e Calculadora atualizados.

## 2. Páginas e componentes alterados

| Área | Ficheiros |
|---|---|
| Página inicial | `src/components/homepage-v2/HomepageV2.tsx`, `src/i18n/mensagens/{pt-PT,en-GB}/inicio.ts` |
| Exemplos fictícios (novo) | `src/components/marketing-v2/Exemplos.tsx`, `marketing.ts` (chave `exemplos`) |
| Proteção (novo) | `src/app/[idioma]/protecao/page.tsx`, `src/components/protecao-v2/ProtecaoV2.tsx`, `paginas.ts` (chave `protecao`) |
| Navegação | `NavbarV2.tsx`, `FooterV2.tsx`, `rotas.ts`, `comum.ts` |
| Preçário | `PrecarioV2.tsx`, `paginas.ts` (`precario`), `src/lib/precario.ts` (resumos), `en-GB/planos.ts` |
| Como funciona | `ComoFuncionaV2.tsx`, `paginas.ts` (`comoFunciona`) |
| Perguntas frequentes | `perguntas.ts`, `conteudoPerguntasFrequentes.tsx` |
| Contacto e WhatsApp | `ContactoV2.tsx`, `institucional.ts` (`contacto`), `whatsapp.ts` |
| Transparência, Sobre nós, Empresas | `institucional.ts` |
| Problemas | `src/lib/problemas/catalogo.ts`, `src/components/problemas/partes.tsx`, `problemas.ts` |
| Formulário | `FormularioCaso.tsx`, `tratarCaso.ts` |
| Calculadora | `calculadora.ts` (títulos e metadados) |
| Fundador | `marketing.ts` (`origem`) |
| SEO / middleware | `src/lib/seo/indexacao.ts`, `src/middleware.ts` |
| Estilos | `src/app/globals.css` (foco) |
| Testes atualizados | `planos.test.mjs` (novas necessidades), `problemas.test.mjs` (Ginásios), `textoCaso.test.mjs` ("na área de cliente") |

Não foram alterados: `src/lib/planos.ts` (as `descricaoCurta` aparecem nos Termos publicados), Stripe, webhooks, autenticação, base de dados, textos legais e de consentimento.

## 3. Matriz de requisitos

Estado: **Feito** · **N/A** (não aplicável, com justificação) · **Decisão** (depende de decisão comercial ou jurídica; o resto foi feito).

| # | Requisito | Estado | Notas |
|---|---|---|---|
| 1 | Perceber rapidamente se ajuda, o que faz, o que tem de fazer, quanto custa, o que acontece depois, onde pedir ajuda | Feito | Situações, duas formas, 4 passos, preços, dúvidas práticas, WhatsApp/Contacto |
| 2.1 | Ler instruções, mapear páginas, fontes de verdade, matriz | Feito | Este documento |
| 2.2 | Preservar identidade visual | Feito | Só componentes e tokens V2 existentes |
| 2.3 | Não alterar preços, Stripe, regras, permissões, dados | Feito | Nenhuma alteração de lógica de negócio |
| 2.4 | Sem testemunhos, estatísticas ou resultados inventados | Feito | Exemplos sempre marcados "Exemplo fictício" |
| 3.1 | Abertura clara: preparação, envio autorizado, acompanhamento, sem garantir resultado | Feito | |
| 3.2 | Bloco de 4–6 situações logo após a abertura | Feito | 6 situações |
| 3.3 | Não apresentar fatura alta/encargo como indevido | Feito | "Pode haver uma explicação, mas vale a pena verificar" |
| 3.4 | Cada situação → página mais relevante | Feito | 4 páginas de problema, Calculadora, Simulador |
| 3.5 | "Problemas que tratamos" no menu principal e móvel | Feito | |
| 4.1 | Reduzir repetições; uma explicação principal do processo | Feito | Removidas 2 secções e 2 painéis |
| 4.2 | Dúvidas práticas (8 perguntas) com respostas fiéis | Feito | Verificadas contra o código (ver secção 5) |
| 4.3 | Distinguir o que se consulta na área de cliente vs. o que a DoLado faz | Feito | Perguntas "atualizações" e "entrar regularmente" |
| 4.4 | Coerência botão/destino | Feito | Explicação dos botões no topo; CTA final agora "Ver se a DoLado pode ajudar" → Simulador |
| 5.1 | Proteção não depende de reclamação | Feito | Eyebrow "Depois de resolver o problema" retirado |
| 5.2 | Dois motivos para usar a DoLado | Feito | Bloco "Duas formas de ajudar" |
| 5.3 | Proteção sem passar por abertura de caso | Feito | `/protecao` → `/comprar` |
| 5.4 | Três perguntas, exemplos, dependências, não é seguro, não inclui reclamações | Feito | |
| 5.5 | Não sugerir acesso a contas, deteção total, tempo real, renegociação | Feito | Explícito em "O que a Proteção não é" |
| 5.6 | Página dedicada se necessário | Feito | `/protecao` |
| 6.1 | Preços confirmados na fonte, sem alterações | Feito | `src/lib/planos.ts` |
| 6.2 | Organização por necessidade | Feito | |
| 6.3 | Resumo de preços na página inicial | Feito | Preço, único/mensal, inclui/exclui casos, ligações |
| 6.4 | Não usar "desde 4,99 €" junto de tratar reclamações | Feito | Não existe no site |
| 6.5 | Explicar renovação, cancelamento, fim da subscrição, "1 caso por mês", acumulação, Caso Extra, conversão | Feito | Secção "Como funcionam os pagamentos" |
| 6.6 | Acompanhamento de caso aberto quando termina a subscrição | Feito | Escolha no cancelamento (secção 7, ponto 1); Termos por atualizar |
| 7 | Contacto: acolher e encaminhar | Feito | |
| 8.1 | WhatsApp: limites claros, só mensagem | Feito | Textos revistos; testes do WhatsApp passam |
| 8.2 | Acessos na inicial, preçário, FAQ, contacto | Feito | Acrescentado também junto dos preços na inicial |
| 8.3 | Ajuda discreta no 1.º passo da contratação | Feito (adaptado) | Regra do projeto e teste proíbem WhatsApp em `/tratar-caso`: usei ligação às perguntas frequentes num separador novo |
| 8.4 | Sem elementos flutuantes | Feito | Não há botão flutuante (teste existente) |
| 8.5 | Verificação visual do WhatsApp | Feito | Testado por Thiago em produção |
| 9 | Linguagem simples | Feito | Termos listados substituídos nas páginas revistas; textos jurídicos intactos |
| 10.1 | Canais de envio harmonizados | Feito | LRE, e-mail ou formulário da empresa ("por exemplo") |
| 10.2 | Acompanhamento ≠ resolução; sem "até à resolução" | Feito | |
| 10.3 | Áreas abrangidas (Ginásios) | Feito | |
| 10.4 | Prazos: primeiro contacto, preparação, resposta da empresa | Feito | "2 dias úteis" em todo o site |
| 10.5 | Limites jurídicos sem afirmações categóricas | Feito | Validado pela advogada |
| 11.1 | Fotografia e história real do fundador | Feito | Episódio real confirmado por Thiago |
| 11.2 | Demonstrações curtas e fictícias | Feito | Reclamação, aviso de promoção, alteração de fatura; acompanhamento já ilustrado em Como funciona |
| 11.3 | Guião do vídeo; não publicar vídeo sem ficheiro | Feito | `guiao-video-fundador.md`; nenhum vídeo no site |
| 11.4 | Entidade e contactos coerentes | Feito | Rodapé usa `ENTIDADE_LEGAL`/`NIPC` de `site.ts`; morada não alterada |
| 12.1 | Percursos por origem | Feito | `entradas-por-origem.md` |
| 12.2 | Proposta para flyers | Feito (proposta) | Usar a página inicial; sem página nova |
| 12.3 | Parceria imobiliária: só estrutura e lista de condições | Feito (preparado) | Nada publicado; depende de condições comerciais |
| 13 | Empresas: Proteção visível, sem dados individuais, sem condições | Feito | |
| 14 | Ferramentas: gratuitas, sem conta, linguagem simples, próximo passo coerente | Feito | Sem alterações de lógica |
| 15.1 | Progresso do formulário com hierarquia clara | Feito | |
| 15.2 | Rótulos, exemplos, erros, documentos, voltar, conservação de dados | Feito | Testado: voltar mantém setor e empresa; rótulos associados aos campos |
| 15.3 | Momento da conta, modalidade, confirmação | Feito (sem alteração) | Fluxo já claro (etapas "Conta", "Modalidade", "Pagamento" + `ConfirmarCompra`) |
| 15.4 | Pedidos não pagos não entram na operação | Feito | Regra não tocada |
| 16 | Telemóvel e computador (360/390/768/1440) | Feito | Sem deslocação horizontal em todas as páginas revistas |
| 17 | SEO, traduções, sem novas ferramentas de rastreio | Feito | Eventos `track()` existentes (com consentimento); novos nomes só para os novos botões |
| 18 | Guião de testes com pessoas | Feito | **Testes por fazer** |
| 19 | Verificações técnicas e entrega | Feito | Ver secções 6 e 8 |

## 4. Textos principais — antes e depois

| Onde | Antes | Depois |
|---|---|---|
| Título da página inicial | "Tem um problema com uma empresa? **A DoLado trata dele por si.**" | "Tem um problema com uma empresa? **A DoLado ajuda a tratar dele consigo.**" |
| Texto da abertura | "Explique-nos o que aconteceu. Analisamos a sua situação, preparamos a reclamação, mostramos-lhe o texto antes de enviar e acompanhamos o processo consigo." | "Conte-nos o que aconteceu. Preparamos a reclamação, mostramos-lhe o texto para rever e autorizar, enviamos pelo canal adequado e acompanhamos a resposta da empresa. Não podemos garantir o resultado, mas não fica a tratar disto sozinho." |
| Garantias | "Simples e seguro · Com a sua aprovação · Acompanhamos o processo" | "Revê o texto antes do envio · Nada é enviado sem a sua autorização · Preço à vista antes de pagar" |
| Proteção na inicial | Eyebrow "**Depois de resolver o problema** — Podemos continuar atentos por si." | "Duas formas de ajudar": "Acompanhar faturas e contratos — Para quem quer ser avisado a tempo, mesmo sem ter um problema agora. Não precisa de abrir um caso." |
| CTA final da inicial | "Conte-nos o que aconteceu." → botão para o Simulador | "Veja primeiro se a DoLado pode ajudar. São 4 perguntas rápidas…" → Simulador |
| Prazo do primeiro contacto | "no prazo máximo de 48 horas úteis" | "no prazo máximo de 2 dias úteis" |
| Contacto (aviso) | "Este formulário não abre casos. **Reclamações enviadas por e-mail ou por este formulário são ignoradas.** Para abrir um caso, use sempre o **fluxo guiado**…" | "Uma mensagem por aqui não abre um caso nem contrata o serviço. Este formulário serve para dúvidas, parcerias e outros assuntos. Para pedir à DoLado que trate de um problema, use o formulário passo a passo…" + botão |
| Como funciona (passo 2) | "Analisamos o **mérito do caso** — Verificamos se há fundamento legal…" | "Crie a conta e escolha a modalidade — … Começamos a tratar do caso depois de o pagamento ser confirmado." |
| Como funciona (prazo) | "Telecom: 15 dias úteis sem **resposta substantiva**…" | Removido; passo "Acompanhamos a resposta" descreve análise, confirmação da solução, nova comunicação ou encerramento com dossiê |
| Como funciona (envio) | "Enviamos para o **Livro de Reclamações** … a única etapa…" | "Enviamos pelo canal adequado — por exemplo, o Livro de Reclamações Eletrónico, o e-mail ou o formulário de reclamações da empresa." |
| Como funciona (fim) | "Acompanhamos **até ao fim** … uma eventual **escalada**, até haver desfecho" | "…ou encerramos o caso do nosso lado com um dossiê e a indicação de entidades que pode consultar." |
| Transparência | "Sabemos exatamente quando o prazo de resposta termina" | "Quando existe um prazo de resposta aplicável, fica registado no seu caso." |
| Transparência | "Se o caso chegar a esse ponto, **precisa de um advogado**" | "Se o caso seguir para uma dessas vias, avisamo-lo. A decisão de avançar é sua e, conforme o caso, pode precisar de apoio jurídico." |
| Preçário (necessidades) | "…quero continuar protegido." / "Não tenho um problema agora, mas quero acompanhamento." | "…quero acompanhamento contínuo." / "Quero acompanhar as minhas faturas e contratos." |
| Formulário | "Passo 1 de 5 · Empresa" | "O seu caso · pergunta 1 de 5: Empresa" |
| Calculadora | "Valor máximo estimado do **encargo por denúncia antecipada**:" | "Valor máximo estimado a pagar por cancelar antes do fim da fidelização:" |
| Fundador | "Tive uma penalização de fidelização de uma operadora **depois de aumentos** e só mais tarde descobri que poderia ter tido outras opções." | "A minha operadora aumentou o preço do serviço que eu tinha e eu quis sair. Estive quase a pagar a penalização da fidelização. Foi então que reparei que o aviso do aumento me tinha chegado apenas 28 dias antes da alteração — e foi com base nisso que consegui que a cobrança da fidelização fosse anulada." |
| FAQ "E se a empresa não resolver?" | "…ajuda a analisar a resposta e a identificar os próximos mecanismos disponíveis." | Nova comunicação quando faz sentido; caso contrário, encerramento do lado da DoLado ("não significa que ficou resolvido"), dossiê e lista de entidades de resolução de conflitos; a DoLado não representa o cliente. |

## 5. Factos verificados no código antes de escrever

| Afirmação pública | Onde está implementada |
|---|---|
| Documentos opcionais; pedidos depois | Passo 4 do formulário; `casos_pedidos_cliente` (cliente responde com texto/ficheiros no portal) |
| E-mails quando o texto está pronto, resposta em análise, pedido de informação, solução a confirmar, encerramento | `src/lib/email/textoRevisao.ts`, `acompanhamento.ts`, e-mail `caso_encerrado_externo` |
| Caso só "Resolvido" com confirmação do cliente | Decisão A em `caso_decidir_analise()` (CLAUDE.md, "Acompanhamento depois do envio") |
| Canais de envio | `CANAIS_ENVIO` (`src/lib/textoCaso.ts`): Livro de Reclamações Eletrónico, e-mail, formulário do operador, outro |
| Prazo de resposta só quando aplicável | `texto_registar_envio` (`prazo_resposta_em` + base; nunca calculado) |
| Dossiê e entidades RAL no encerramento | `caso_encerrar_encaminhamento_externo()`, `src/lib/dossie/`, `ENTIDADES_RAL` |
| Avisos 60 e 30 dias e no dia | Edge Function `verificar-monitor-datas` |
| Alteração de fatura revista por pessoa antes de avisar | Achados `acomp_v1` → `/backoffice/monitor/achados` |
| Estimativa de custo de saída só em telecomunicações | `src/lib/monitor/custoSaida.ts` |
| Resultado imediato após o 1.º documento | `src/lib/monitor/resultadoProtecao.ts` |
| Avisos setoriais opcionais | `/portal/perfil` + `/backoffice/avisos` |
| Renovação, cancelamento, 90 dias, limite 4, Caso Extra, conversão | Termos `2026-10-08` (secções 8–10, 14), `src/lib/planos.ts`, `DIAS_CASOS_GUARDADOS` |
| Ginásios é setor ativo | `SETORES` em `src/lib/pedidoCaso.ts` |

## 6. Verificações realizadas

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | Sem erros |
| `npm test` (node --test, 1215 testes: i18n completo, inglês britânico, regras de escrita, preços, WhatsApp, desempenho/prefetch, problemas, sitemap…) | 1215 passam, 0 falham |
| `eslint` nos ficheiros alterados | Sem erros nem avisos |
| `npm run build` (webpack, como na Clever Cloud) | Passa; `/pt/protecao` e `/en/protecao` geradas estaticamente |
| Browser, 360 px: `/`, `/protecao`, `/precario`, `/contacto`, `/como-funciona`, `/problemas`, `/tratar-caso` | Sem deslocação horizontal |
| Browser, 768 px: `/`, `/precario`, `/protecao`, `/empresas`, `/transparencia`, `/perguntas-frequentes`, `/calculadora-cancelamento` | Sem deslocação horizontal |
| Browser, 1440 px | Primeira versão do menu transbordava 52 px → corrigido (rótulos curtos, menu completo a partir de 1280 px) |
| Inglês (`/en`, `/en/protecao`, `/en/precario`, `/en/contacto`) | `lang="en-GB"`, sem palavras portuguesas no conteúdo, canonical e hreflang corretos em `/en/protecao` |
| Formulário | Avançar e voltar mantém setor e empresa; rótulo associado ao campo; novo texto de progresso |
| Menu do telemóvel | Abre, mostra os 7 destinos, "Iniciar sessão" e o botão principal |

Não foi feito: nenhum cliente, pagamento, mensagem de WhatsApp, contacto ou caso real (a navegação no formulário ficou no passo 2, sem envio). Testes de contrato (`npm run test:contrato`) não foram corridos: não houve alterações em webhooks, tabelas ou pagamentos.

## 7. Decisões tomadas (17/10/2026)

A advogada validou todos os pontos jurídicos (limites sobre advogado/arbitragem, prazo de telecomunicações retirado de Como funciona, textos novos). Decisões de Thiago e o que foi feito:

1. **Fim da subscrição com um caso aberto.** Ao cancelar, a cliente vê a escolha: manter a subscrição até o caso terminar, ou cancelar — e, nesse caso, o acompanhamento dos casos em curso termina também no fim do período já pago. Implementado em `/portal/subscricao`:
   - o servidor conta os casos em curso da subscrição (`casoAcompanhadoPelaSubscricao`, `src/lib/gestaoSubscricao.ts`) e recusa o cancelamento sem a caixa de confirmação marcada (nada muda no Stripe antes);
   - a escolha fica em `subscricao_cancelamentos.casos_em_curso` / `acompanhamento_casos_termina` (migration `20261017090000_cancelamento_casos_em_curso.sql`, **aplicada em produção a 17/10/2026** com `supabase db push --linked`, depois de `--dry-run`);
   - o backoffice mostra no caso o aviso "Acompanhamento termina com a subscrição";
   - preçário e perguntas frequentes explicam a regra.
   - contam só os casos abertos com um caso da subscrição ou sem compra única ligada (`origem_credito` `subscricao` ou vazio); os casos pagos à parte (Avulso, Caso Extra) continuam a ser acompanhados;
   - **Termos `2026-10-17`** (nova versão; a `2026-10-08` não se edita): regra acrescentada às secções 14.1 e 14.2, `TERMOS_VERSAO` atualizado. As compras novas passam a gravar esta versão no consentimento.
2. **Prazo:** todas as menções a "48 horas úteis" passaram a "2 dias úteis" (site, mensagens de compra, backoffice, regra de escrita no CLAUDE.md). No backoffice, o indicador da 1.ª resposta passou de 48 para 18 horas úteis (2 × 9h, a contagem existente). Sem funcionalidade nova. Mantém-se uma menção a "24 horas" na livre resolução: é um limite contra abuso ("vários pedidos nas últimas 24 horas"), não um prazo de resposta. Os Termos e a Política publicados não falam deste prazo.
3. **História do fundador:** reescrita com o episódio real (quase pagou a penalização; o aviso do aumento chegou só 28 dias antes; com base nisso conseguiu que a cobrança fosse anulada). Também no guião do vídeo.
4. **Envio por carta:** retirado das opções de canal de envio (`CANAIS_ENVIO`) e dos textos. A base de dados continua a aceitar o valor (sem migration); registos antigos, se existirem, mostram o valor técnico. A **receção** de respostas da empresa por carta (registo manual) mantém-se.
5. **Empresas** fora do menu do computador: aprovado.
6. **WhatsApp:** testado por Thiago em produção.
7. **Resumo mensal da Proteção:** ativo. Acrescentado à página `/protecao` e à pergunta "O que inclui o plano Proteção?".
8. **Parceria imobiliária:** fica como está (só estrutura e lista de condições).

## 8. Capturas

Em [`capturas/`](capturas/): página inicial (abertura, situações, duas formas, processo com exemplo, preços) em computador; abertura, preços e menu em telemóvel; Proteção (telemóvel e exemplos em computador); preçário e condições; contacto (telemóvel); formulário (telemóvel).

## 9. Estado da entrega

Alterações no branch local `feat/comunicacao-publica`, a partir de `main`. Não foi feito push, PR nem publicação. Ficaram fora do commit as alterações que já existiam no checkout antes deste trabalho (e-mail de boas-vindas, `.claude/launch.json`, `docs/PROMPT_*`, `parceiros-mockup/`, `scripts/manutencao/`).
