# DoLado — Design System V2 (páginas públicas)

Documento de referência aprovado por Thiago a 04/10/2026. Nasce da nova direção visual da homepage e substitui gradualmente a linguagem visual pública anterior.

> **Âmbito curto:** páginas públicas e, desde 04/10/2026, o portal do cliente (ver "Portal do cliente" abaixo). O backoffice, a autenticação, o checkout/Stripe e os e-mails continuam com o guia de marca anterior ([brand-guide.md](brand-guide.md)). Design não altera comportamento.

## Implementação no código

| Peça | Onde |
|---|---|
| Tokens de cor (`--v2-*`) | `src/app/globals.css`, classe `.tema-v2` |
| Moldura da página (tokens + fonte Plus Jakarta Sans + NavbarV2 + `<main>` + FooterV2; evento do botão da navbar com parâmetros opcionais) | `src/components/marketing-v2/PaginaV2.tsx` |
| Navbar / Rodapé / Logótipo | `NavbarV2.tsx`, `FooterV2.tsx`, `Logotipo.tsx` |
| Destinos da navegação (trocar aqui quando uma página migrar ou for criada) | `rotas.ts` (`ROTAS_V2`) |
| Secção (`tone`: white / soft-blue / soft-green; `size`: compact / default / large), Eyebrow, SectionHeader | `SectionV2.tsx` |
| Botões (primário, contorno), cartão, contentor, tipografia de H2 e texto, campos de formulário (`CAMPO`, `ROTULO_CAMPO`) | `estilos.ts` (classes) |
| Ícones lineares | `Icones.tsx` |
| Mockups de interface (dados fictícios, com "Exemplo") | `Mockups.tsx` |
| Lista com vistos, bloco de fecho (CTA final) | `ListaVistos.tsx`, `CTASection.tsx` |
| Cartão de plano por necessidade (preços sempre de `src/lib/planos.ts`; alinhamento por subgrid com `GRELHA_PLANOS`) | `PricingCard.tsx` |
| Perguntas frequentes (mesmo accordion e mesmo conteúdo de `/perguntas-frequentes`) | `FAQAccordionV2.tsx` |
| Cartão de ferramenta/funcionalidade (ícone, título, texto, visual, uma ação) | `FeatureCard.tsx` |
| Ferramentas gratuitas (fonte única: pergunta, texto, visual, CTA, destino) | `ferramentas.tsx` |
| "A nossa origem" (história e fotografia do fundador; `aside` opcional) | `OrigemFundador.tsx` |
| Etapas de um processo (`layout`: horizontal para 3–5 etapas; vertical para processos longos, com rótulo de quem age) | `StepsTimeline.tsx` |

Páginas V2:

| Página | Ficheiros | Estado |
|---|---|---|
| Homepage | `/` — `src/app/page.tsx`, `src/components/homepage-v2/HomepageV2.tsx` (`/landing-v2` redireciona para `/`) | indexada (substituiu a versão V1) |
| Como Funciona | `/como-funciona` — `src/app/como-funciona/page.tsx`, `src/components/como-funciona-v2/ComoFuncionaV2.tsx` (passos e nota de transparência com o texto já publicado) | indexada (substituiu a versão V1) |
| Ferramentas Gratuitas | `/ferramentas-gratuitas` — `src/app/ferramentas-gratuitas/page.tsx`, `src/components/ferramentas-v2/FerramentasV2.tsx` (Calculadora, Simulador, Guia de Mudança) | indexada (página nova) |
| Sobre Nós | `/sobre-nos` — `src/app/sobre-nos/page.tsx`, `src/components/sobre-nos-v2/SobreNosV2.tsx` (todo o texto institucional já publicado) | indexada (substituiu a versão V1) |
| Ajuda | `/perguntas-frequentes` — `src/app/perguntas-frequentes/page.tsx`, `src/components/ajuda-v2/AjudaV2.tsx` (pesquisa só no browser em `pesquisa.ts`; perguntas de `conteudoPerguntasFrequentes.tsx`) | indexada (substituiu a versão V1) |
| Contacto | `/contacto` — `src/app/contacto/page.tsx`, `src/components/contacto-v2/ContactoV2.tsx` (mesmo formulário e Server Action `enviarContacto`; aviso "não abre casos" mantido) | indexada (substituiu a versão V1) |
| Simulador de Elegibilidade | `/simulador-elegibilidade` — `src/app/simulador-elegibilidade/page.tsx`, `src/components/simulador-v2/SimuladorV2.tsx` (perguntas, resultados, CTA "Tratar o meu caso" e medição iguais; regras em `src/lib/elegibilidade/regras.ts`) | indexada (substituiu a versão V1) |
| Calculadora de Cancelamento | `/calculadora-cancelamento` — `src/app/calculadora-cancelamento/page.tsx`, `src/components/calculadora-v2/CalculadoraV2.tsx` (campos, validação, resultado, textos e medição iguais; regras em `src/lib/calculadoraCancelamento/regras.ts`) | indexada (substituiu a versão V1) |
| Guia de Mudança de Casa | `/mudanca-de-casa` — `src/app/mudanca-de-casa/page.tsx`, `src/components/mudanca-casa-v2/MudancaDeCasaV2.tsx` (conteúdo já publicado; CTAs e medição `mudanca_casa_clique_tratar_caso` iguais) | indexada (substituiu a versão V1) |
| Transparência | `/transparencia` — `src/app/transparencia/page.tsx`, `src/components/transparencia-v2/TransparenciaV2.tsx` (texto já publicado; CTA final novo) | indexada (substituiu a versão V1) |
| Páginas legais | `/termos`, `/termos/<versão>`, `/privacidade`, `/privacidade/<versão>`, `/livre-resolucao`, `/resolucao-de-litigios` — moldura em `src/app/(legal)/layout.tsx` (PaginaV2). As versões publicadas não se editam: usam os tokens antigos `--color-*`, que `.documento-legal` (`globals.css`) aponta para as cores V2; os pesos dos títulos também são ajustados aí. Versões novas podem usar já as classes V2. | indexadas, como antes |
| Preçário | `/precario` — `src/app/precario/page.tsx`, `src/components/precario-v2/PrecarioV2.tsx`; conteúdo dos planos e destino dos botões em `src/lib/precario.ts`, `/#precario` (links antigos) leva aqui pela homepage | indexada, com `canonical` |

Uma página V2 nova: `<PaginaV2 eventoCtaNavbar="click_…">` + `SectionV2`/`SectionHeader` + classes de `estilos.ts`. Criar componentes novos (PricingCard, FAQAccordionV2, …) só quando forem usados, em `src/components/marketing-v2/`, e reutilizá-los nas páginas seguintes.

Links antigos `/#precario` (portal, `cancel_url` do Stripe, `/criar-conta`, e-mails já enviados) continuam a funcionar: a homepage troca o fragmento por `/precario` no browser. Quando se mexer nesses ficheiros, pode trocar-se o link diretamente para `/precario`. Todas as páginas públicas estão em V2 (04/10/2026); o `SiteHeader` antigo foi removido.

### Portal do cliente (04/10/2026)

O portal (`/portal/*`) aplica o V2 como aplicação de uso recorrente: mesmos tokens, fonte e ícones, componentes mais compactos (botões de 44px, títulos de página ~30px, cartões de 16px de raio, sem sombra). Não usa `PaginaV2` nem as secções de marketing.

| Peça | Onde |
|---|---|
| Tokens: `.tema-portal` (layout do portal) ativa os `--v2-*` e traduz os tokens antigos (`--color-*`, `--radius-*`, `--shadow-*`) para os V2 — componentes do portal ainda não migrados ficam coerentes sem mudar lógica | `src/app/globals.css` |
| Moldura: barra lateral (computador) / cabeçalho com menu (telemóvel), `Logotipo` V2, fonte de `marketing-v2/fonte.ts`, ligação "Saltar para o conteúdo" | `src/app/portal/layout.tsx`, `_components/NavegacaoPortal.tsx`, `_components/MenuMovel.tsx` |
| Classes: botões (primário, secundário, fantasma, destrutivo), ligações, cartões (normal, destaque, ação, informativo, sucesso, ligação), tipografia, campos | `src/components/portal/ui.ts` |
| Cabeçalho de página (voltar, contexto, título, estado, uma ação) e título de secção | `src/components/portal/Cabecalho.tsx` |
| Avisos de retorno (info, sucesso, atenção, erro) | `src/components/portal/Aviso.tsx` |
| Badge de estado (ação, em curso, espera, concluído, neutro) | `src/components/portal/Etiqueta.tsx` |
| Estado vazio útil (o que significa + próxima ação) | `src/components/portal/EstadoVazio.tsx` |
| Linha temporal vertical (caso) | `src/components/portal/LinhaTemporal.tsx` |
| Lista rótulo/valor | `src/components/portal/Dados.tsx` |
| Ícones do portal (mesmo sistema linear) | `src/components/portal/Icones.tsx` |
| Páginas de revisão do texto sem login (`/texto/rever`, `/texto/alterar`) e modal de confirmação da compra (`ConfirmarCompra`, que traz o próprio tema e fonte: mesmo aspeto no portal, em `/comprar` e em `/tratar-caso`) e a página `/comprar` | `src/app/texto/`, `src/components/compra/ConfirmarCompra.tsx`, `src/app/comprar/page.tsx` |
| Estado do caso em linguagem humana (rótulo, explicação, próximo passo, se pede ação) e eventos vistos pelo cliente — só apresentação | `src/lib/portal/estadoCaso.ts` (testes em `estadoCaso.test.mjs`) |

Regras do portal: o painel mostra primeiro o que precisa do cliente, depois os casos em curso, depois a Proteção e o plano; uma só ação primária por bloco; estados internos nunca aparecem em bruto; sem emojis nem símbolos (✓ ⚠ ℹ) — usar os ícones; nada depende de hover; cor só com significado.

---

## 1. Objetivo

Criar uma experiência:

- mais clara;
- mais editorial;
- mais humana;
- mais confiável;
- mais consistente;
- mais fácil de percorrer;
- mais orientada para problemas concretos do consumidor;
- visualmente moderna sem parecer um SaaS genérico.

A DoLado deve transmitir: **confiança + simplicidade + acompanhamento + independência + ação.**

## 2. Âmbito

Aplica-se prioritariamente às páginas públicas: Homepage, Como Funciona, Ferramentas Gratuitas, Preçário, Ajuda / FAQ, Sobre Nós, Contacto, páginas institucionais semelhantes e futuras landing pages de aquisição.

Pode também ser usado em páginas públicas de parceiros, campanhas, páginas públicas de ferramentas, conteúdos editoriais e páginas de explicação de serviços.

## 3. O que NÃO está incluído neste momento

Não aplicar automaticamente a: Backoffice, autenticação, checkout, fluxos Stripe, páginas internas, ferramentas operacionais, interfaces de administração, e-mails transacionais.

Essas áreas podem receber no futuro uma evolução visual própria. Não alterar o produto interno apenas para uniformizar com o site público.

## 4. Princípio central de design

O site não deve parecer uma coleção de funcionalidades. A DoLado deve parecer um serviço que acompanha o consumidor quando surge um problema.

```
Problema → Perceber a situação → Saber o próximo passo → A DoLado trata → A DoLado pode continuar atenta
```

As funcionalidades são meios para atingir esse objetivo. Nunca deixar o design transformar a DoLado numa aplicação de contratos, de faturas, de alertas, numa ferramenta de IA, numa coleção de pequenos utilitários ou numa plataforma SaaS genérica.

## 5. Princípios visuais

### 5.1 Clareza antes de decoração
Cada secção responde rapidamente a uma pergunta. Evitar decoração sem função, excesso de ilustrações, elementos que competem com a mensagem, dezenas de badges, excesso de cards e layouts demasiado complexos.

### 5.2 Muito espaço em branco
Grandes margens verticais, secções claramente separadas, blocos de texto curtos, largura de leitura confortável, cards com padding generoso. A página nunca deve parecer "carregada".

### 5.3 Ritmo editorial
Alternar naturalmente entre secções brancas, com fundo azul muito claro e com fundo verde muito claro, e entre blocos mais densos e mais leves. Não repetir `Título + 3 cards` dez vezes.

### 5.4 Hierarquia forte
Cada secção: (1) eyebrow opcional; (2) título; (3) texto curto; (4) conteúdo principal; (5) CTA apenas quando necessário. Nunca vários CTAs com igual importância na mesma secção.

## 6. Identidade visual geral

Navy / azul muito escuro para títulos; verde DoLado para ações; branco como fundo principal; azul e verde pastel muito suaves; cinzas frios para texto secundário e bordas.

Evitar cores demasiado saturadas, gradientes fortes, roxos típicos de SaaS, neon e fundos escuros extensos sem necessidade.

## 7. Tokens de cor

Tokens reutilizáveis e centralizados. Os valores implementados estão em `.tema-v2` (`globals.css`); a lógica conceptual é:

| Papel | Conceito | Token implementado |
|---|---|---|
| Fundo | branco | `bg-white` |
| Fundo azul suave | `#F5F8FB` | `--v2-blue-bg` `#F4F8FC` |
| Fundo verde suave | `#F2F8F5` | `--v2-mint-bg` `#F1F9F4` |
| Texto principal (navy) | `#102A43` | `--v2-navy` `#0B2545` |
| Texto secundário | `#52667A` | `--v2-muted` `#55657A` |
| Verde de ação | `#28A87D` | `--v2-green` `#0A7A4F` (contraste AA com texto branco) |
| Verde hover | `#238E6B` | `--v2-green-hover` `#08643F` |
| Borda | `#E3E9EE` | `--v2-line` `#E4EAF1` |
| Borda forte | `#D2DCE5` | `--v2-line-strong` `#CBD5E1` |

Os valores não são definitivos; reutilizar sempre os tokens, nunca valores soltos por página.

## 8. Tipografia

Limpa, contemporânea, muito legível, forte nos headings, neutra no corpo — nem tecnológica nem institucional demais. Implementada com Plus Jakarta Sans (só nas páginas V2).

| Nível | Uso | Desktop | Telemóvel |
|---|---|---|---|
| H1 | um por página, hero | ~52–68px, peso 700+, line-height 1.0–1.1, tracking ligeiramente negativo | ~36–44px |
| H2 | títulos de secção | ~38–48px | ~30–36px |
| H3 | cards, subsecções, destaques | ~22–28px | — |
| Body Large | introduções, hero | 18–21px | |
| Body | normal | 16–18px | |
| Small | metadata, labels | 14–15px | |

## 9. Eyebrows

Contextualizam secções (ex.: `COMO FUNCIONA`, `A NOSSA ORIGEM`): pequenos, peso 600–700, tracking ligeiramente aumentado, verde ou cinza escuro, discretos. Não obrigatórios em todas as secções.

## 10. Larguras e containers

Container principal `max-width: 1200px`; conteúdo textual ~720px; o hero pode ocupar largura maior.

## 11. Espaçamento

Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Secções: ~96–128px de padding vertical no desktop, ~64–80px no telemóvel (`SectionV2` `size`).

## 12. Navbar V2

Desktop: logótipo · ao centro "Como funciona", "Ferramentas gratuitas", "Preçário", "Ajuda" · à direita "Iniciar sessão" e o CTA "Tratar do meu caso". Fundo branco, layout limpo, altura confortável (não excessiva), borda inferior subtil, sticky.

Telemóvel: menu simplificado, CTA principal sempre acessível, sem subcategorias em excesso.

## 13. Botões

`ButtonPrimary`, `ButtonSecondary`, `ButtonGhost` (eventualmente `ButtonText`) — no código, classes `BOTAO_PRIMARIO` e `BOTAO_CONTORNO`.

- **Primário** — ação principal (ex.: "Tratar do meu caso"): fundo verde, texto branco, radius suave, padding horizontal generoso, altura ~48–54px; hover ligeiramente mais escuro, sem animações exageradas.
- **Secundário** — ação alternativa (ex.: "Ver se a DoLado pode ajudar"): fundo branco/transparente, borda discreta, texto navy.
- Nunca 3 ou 4 botões principais na mesma secção, cores diferentes só para chamar a atenção, CTA vermelho para gerar pressão nem falsa urgência.

## 14. Links

Claramente identificáveis, hover subtil, sem competir com CTAs. Não transformar todos os links em botões.

## 15. Cards

- **Card padrão:** fundo branco, borda subtil, radius ~16–24px, sombra mínima ou nenhuma, padding 24–36px.
- **Feature Card:** ferramentas gratuitas, funcionalidades, serviços, categorias — ícone, título, descrição, visual, CTA.
- **Info Card:** informação complementar, pequenos destaques, exemplos — mais compacto.
- Cards não dominam tudo: considerar sempre texto + imagem, timeline ou outro layout.

## 16. Hero V2

Desktop em duas colunas — esquerda: eyebrow, H1, body large, CTAs, trust indicators (ex.: "Simples e seguro", "Com a sua aprovação", "Acompanhamos o processo", com ícones pequenos); direita: imagem, ilustração, interface ou composição visual.

Telemóvel empilhado: texto → CTAs → trust indicators → visual. Não esconder informação essencial.

## 17. Section Wrapper

Componente `SectionV2` (`tone`, `size`) — nunca definir backgrounds e espaçamentos manualmente em cada página.

## 18. Fundos de secção

`white`, `soft-blue`, `soft-green`. Sem alternância mecânica: a escolha serve a narrativa.

## 19. Timeline / Steps

`StepsTimeline` para Como Funciona, processo de reclamação e etapas de tratamento: horizontal no desktop com 3–5 etapas, vertical no telemóvel; número, ícone, título, texto, linha ou seta subtil.

## 20. Mockups de interface

Pequenos mockups de produto para explicar valor (estado do caso, estado da Proteção, leitura de fidelização, resultado do Simulador): plausíveis, sem necessidade de replicar o portal ao pixel.

Nunca usar dados pessoais reais, nomes reais sem autorização, testemunhos inventados nem valores apresentados como de um cliente real. Dados fictícios claramente contextuais.

## 21. Ícones

Um único sistema: lineares, simples, consistentes, espessura semelhante, pouco decorativos. Não misturar emojis, ícones preenchidos, ilustrações cartoon nem ícones 3D.

## 22. Imagens e fotografia

Fotografia só quando acrescenta humanidade, há asset adequado e parece autêntica. Evitar stock de call center, equipas a sorrir para um portátil, apertos de mão e reuniões corporativas. Sem fotografia adequada: mockup, ilustração ou composição gráfica.

## 23. Ilustrações

Limpas, minimalistas, consistentes com navy/verde, pouco infantis, sem excesso de cor.

## 24. Movimento e animação

Com moderação. Permitido: fade-in subtil, hover de botão e de card, pequenas transições, disclosure/accordion. Evitar: parallax, elementos constantemente animados, texto em movimento, números a contar, carrosséis automáticos, animações que atrasem a leitura.

## 25. Acessibilidade

Contraste suficiente, navegação por teclado, `aria-label` quando necessário, focus visível, texto alternativo adequado, headings semânticos, botões com labels claros, formulários acessíveis.

## 26. Responsive

Mobile-first. Testar pelo menos 390px, 768px, 1024px e 1440px.

## 27. Regras para telemóvel

Grids em coluna; cards a toda a largura; CTAs principais podem ocupar mais largura; headlines quebram naturalmente; não reduzir demasiado o texto; sem scroll horizontal; nada dependente de hover.

## 28. Copy e UI

Linguagem baseada em problemas reais, não em nomes internos de funcionalidades:

| Evitar | Preferir |
|---|---|
| Simulador de Elegibilidade | A DoLado pode tratar do meu caso? |
| Análise contratual | Quando termina a minha fidelização? |
| Comparador de Faturas (no contexto da Proteção) | Perceba quando algo muda na sua fatura. |

## 29. Português

Português europeu clássico (Acordo Ortográfico de 1990), com as regras de escrita do `CLAUDE.md`: subscrever, fatura, ficheiro, telemóvel, utilizador, proteção, connosco, consigo.

## 30. Navegação pública

Principal: Como funciona · Ferramentas gratuitas · Preçário · Ajuda. Institucionais no rodapé: Sobre nós, Contacto, páginas legais.

## 31. Footer V2

Logótipo + "Do lado dos consumidores." · **Produto:** Como funciona, Ferramentas gratuitas, Preçário · **DoLado:** Sobre nós, Ajuda, Contacto · **Legal:** Termos e Condições, Política de Privacidade, Livro de Reclamações, Resolução de Litígios, Livre Resolução. Não criar links que não existam.

## 32. Página Como Funciona

Hero simples, StepsTimeline, explicações mais detalhadas, mockup de acompanhamento do caso, CTA final. Aprofunda a homepage, não a repete.

## 33. Página Ferramentas Gratuitas

Só funcionalidades gratuitas. Atualmente:

1. "Quanto custa cancelar antes do fim da fidelização?" (Calculadora de Cancelamento — estima o encargo máximo de um cancelamento antecipado em telecomunicações; não calcula a data de fim)
2. "A DoLado pode tratar do meu caso?" (Simulador de Elegibilidade)
3. "Vou mudar de casa. O que tenho de tratar?" (Guia de Mudança)

Nunca apresentar a análise/comparação de faturas como ferramenta gratuita.

## 34. Guia de Mudança

Público, gratuito, estático — apresentado como recurso prático. Ex.: título "Vai mudar de casa?", texto "Veja o que deve tratar antes, durante e depois da mudança.", CTA "Ver Guia de Mudança".

## 35. Página Preçário

Não apenas uma tabela de planos: ajuda a responder "De que tipo de ajuda preciso?", organizada por necessidade:

1. "Tenho um problema agora." → Avulso.
2. "Tenho um problema e quero continuar protegido." → Caso + Proteção.
3. "Não tenho um problema agora, mas quero acompanhamento." → Proteção.

## 36. Preços

Manter os preços reais (`src/lib/planos.ts`). O Design System só define apresentação.

## 37. Página Ajuda

Utilitária e mais simples. Hero "Como podemos ajudar?" → pesquisa → categorias (Casos e reclamações, Proteção, Pagamentos e subscrições, Conta e portal, Ferramentas gratuitas) → accordions → links de apoio.

## 38. Página Sobre Nós

Mais editorial: origem, problema identificado, missão, como a DoLado funciona, independência, CTA. Pode usar a história do fundador como eixo narrativo.

## 39. Página Contacto

Simples. Título "Fale connosco." e caminhos claros: apoio, comercial, privacidade, outros assuntos (constantes `CONTACTO_EMAIL` / `PRIVACIDADE_EMAIL`).

## 40. Prova social

Só testemunhos reais, avaliações reais e dados verificáveis. Nunca inventar nomes, citações, estrelas, números de clientes, empresas ou resultados.

## 41. Marcas de terceiros

Por defeito, sem logótipos de operadoras, empresas de energia, retalhistas, plataformas ou outras marcas. Evitar qualquer sugestão de parceria, afiliação, aprovação, integração ou patrocínio.

## 42. Setores

Para mostrar amplitude, categorias genéricas com ícones genéricos (ex.: Telecomunicações, Energia, …). Mostrar só os setores que a DoLado trata hoje (`SETORES` em `src/lib/pedidoCaso.ts`).

## 43. Urgência e pressão comercial

Sem countdowns, "só hoje", "últimas vagas", falsas limitações, popups agressivos nem dark patterns. Urgência só quando existe um prazo real.

## 44. Independência

A aparência reforça que a DoLado é independente, do lado do consumidor, um serviço — não uma operadora, não uma entidade pública, não um escritório de advocacia. Nenhum elemento gráfico que crie essa confusão.

## 45. IA

Nunca o principal argumento visual (nada de "Reclamações com Inteligência Artificial" ou "IA que defende os seus direitos"). A IA é infraestrutura; o cliente compra o resultado e o acompanhamento.

## 46. Segurança e confiança

Linguagem de confiança só quando factual ("Com a sua aprovação", "Revê antes do envio", "Acompanha o processo"). Evitar "100% seguro", "Garantido", "Resolução garantida".

## 47. Componentes V2 recomendados

NavbarV2, FooterV2, ContainerV2, SectionV2, HeroV2, SectionHeader, Eyebrow, ButtonPrimary, ButtonSecondary, ButtonGhost, FeatureCard, InfoCard, PricingCard, StepsTimeline, ProductMockup, ProtectionMockup, CaseStatusMockup, FAQAccordionV2, CTASection, CategoryCard, TestimonialCard, ContactCard.

Não é obrigatório criá-los todos de imediato — criar conforme forem usados.

## 48. Organização

`src/components/marketing-v2/` (ver "Implementação no código"). Evitar duplicação.

## 49. CSS / styling

Usar os mecanismos do projeto (Tailwind v4). Não introduzir uma segunda framework CSS. Tokens centralizados; sem valores arbitrários diferentes em cada página.

## 50. Consistência

Quando uma solução já existe no V2, reutilizar (ex.: se o Preçário usa `SectionHeader`, Sobre Nós também). Não criar versões quase iguais sem motivo.

## 51. Exceções

Uma página pode romper o padrão quando isso melhora claramente a compreensão, a acessibilidade, a narrativa ou a conversão — e a exceção deve parecer intencional.

## 52. Performance

Sem bibliotecas pesadas só para animações, imagens gigantes, vídeos automáticos ou dependências desnecessárias. Otimizar imagens; lazy loading quando adequado.

## 53. SEO

Preservar hierarquia H1/H2, metadata, titles, descriptions, URLs existentes quando possível, conteúdo indexável e links internos. Mudanças visuais não destroem SEO.

## 54. Foco de conversão

Uma ação principal clara por página: Homepage → "Tratar do meu caso"; Ferramentas → usar uma ferramenta; Preçário → escolher uma modalidade; Como Funciona → iniciar um caso; Sobre Nós → conhecer e depois iniciar; Contacto → contactar.

## 55. CTAs consistentes

"Tratar do meu caso", "Ver se a DoLado pode ajudar", "Conhecer a Proteção", "Ver preços", "Calcular o encargo grátis", "Ver Guia de Mudança". Evitar dezenas de versões para a mesma ação.

## 56. Core da DoLado

A DoLado existe para tratar e ajudar a resolver problemas do consumidor. Contratos, faturas, fidelizações e alertas existem para detetar, prevenir e contextualizar esses problemas — nunca assumem o posicionamento principal.

## 57. Pergunta de referência

> Esta página ajuda o utilizador a perceber o seu problema, o próximo passo ou como a DoLado o pode tratar?

Se não, rever a página.

## 58. Anti-patterns

Dashboards na homepage; excesso de números ou de funcionalidades; páginas demasiado densas; cards dentro de cards; cinco estilos de CTA; sete tons de verde; stock photography corporativa; linguagem de startup SaaS; "Powered by AI" em destaque; excesso de animação; blobs e gradientes decorativos; marcas de terceiros; depoimentos inventados.

## 59. Processo para migrar uma página

1. Compreender a função atual da página.
2. Preservar o conteúdo juridicamente relevante.
3. Identificar a ação principal.
4. Aplicar NavbarV2 e FooterV2 (via `PaginaV2`).
5. Migrar tipografia e espaçamento.
6. Usar `SectionV2`.
7. Reutilizar cards/componentes V2.
8. Validar telemóvel, acessibilidade e SEO.
9. Garantir que a lógica da página não mudou.

## 60. Ordem recomendada de migração

Depois da Homepage V2: (1) Preçário, (2) Como Funciona, (3) Ferramentas Gratuitas, (4) Sobre Nós, (5) Ajuda, (6) Contacto.

## 61. Não alterar lógica de negócio

Sem instrução específica, aplicar o V2 nunca altera: preços, Stripe, subscrições, checkout, casos disponíveis, pagamentos, autenticação, Supabase, RLS, lógica de casos, aprovação do cliente, alertas, comparação de faturas, Simulador, Calculadora de Cancelamento, e-mails, documentos legais.

## 62. Validação final de uma página V2

- Parece pertencer ao mesmo site que a Homepage V2?
- Usa a mesma navbar e o mesmo rodapé?
- Tipografia, espaçamento e cores consistentes?
- CTAs consistentes e ação principal clara?
- Telemóvel correto?
- Sem marcas externas desnecessárias nem conteúdo inventado?
- Português europeu?
- O core da DoLado é evidente?

Se alguma resposta for não, rever.

## 63. Princípio final

A DoLado deve parecer **um serviço moderno e confiável que está do lado do consumidor** — não software à procura de funcionalidades para vender.

O utilizador percebe primeiro: "Eles ajudam-me a tratar deste problema." E só depois descobre: "Também conseguem detetar e acompanhar outras situações por mim."
