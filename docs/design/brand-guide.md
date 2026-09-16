# DoLado — Guia de Marca (para Claude Design)

Marca: **Confiança Direta** — papel neutro, teal de resolução, formalidade calma.
Não é um SaaS de vendas nem uma "app de consumo divertida" — a DoLado lida com prazos legais e pessoas frustradas/ansiosas. A UI comunica competência e confiança calma.

## Cores de Marca e Neutros

| Nome | Hex | Uso |
|---|---|---|
| Brand Teal | `#0E6B5C` | Única cor de ação — CTAs, links, estados ativos, foco |
| Brand Teal Hover | `#0A5348` | Hover/pressed do brand |
| Brand Teal Wash | `#E3F0EC` | Fundos suaves, badges de marca, ícones em círculo/quadrado |
| Canvas | `#F7F6F2` | Fundo de página (nunca branco puro) |
| Surface | `#FFFFFF` | Cards, painéis, inputs |
| Surface Sunken | `#EFEDE7` | Fundos rebaixados (ex. bloco de citação legal) |
| Ink | `#171A21` | Texto primário, headings |
| Ink Muted | `#5B6270` | Texto secundário, metadata |
| Ink Faint | `#9098A5` | Placeholder, timestamps, texto desativado |
| Hairline | `#E4E2DB` | Bordas, divisores |
| Hairline Strong | `#CFCCC2` | Bordas em foco/hover |

## Cores de Estado (semântica de caso — nunca usar como CTA nem misturar com o Brand Teal)

| Estado | Cor | Wash |
|---|---|---|
| Pendente/Em curso | `#3D5A80` | `#E8EEF5` |
| Urgente | `#B7791F` | `#FBF0DC` |
| Recusado/Erro | `#C0392B` | `#FBE6E3` |
| Resolvido | `#1E8E5A` | `#E4F5EC` |

## Tipografia

- **Inter** — toda a UI (nav, botões, formulários, headings de marketing). Pesos 400/500/600/700.
- **Source Serif 4** — reservada apenas para o texto da carta/reclamação gerada e o dossiê final. Nunca em botões, nav ou headings de marketing.
- Headings nunca acima de **52px**. Line-height de headings ≤1.2; body 1.5–1.65.

## Radius (sem pílulas totais)

Range válido: **6, 8, 12, 16, 999px** (999 só em badges/avatares pequenos, nunca em botões grandes).
- Inputs/chips pequenos: 6px
- Botões: 8px
- Cards/modais/imagens: 12px
- Painéis grandes/hero: 16px

## Sombras

Muito subtis — elevação por contraste de superfície, não por sombra pesada.
- `subtle`: rgba(23,26,33,0.06) 0px 1px 2px, rgba(23,26,33,0.04) 0px 1px 1px
- `md`: rgba(23,26,33,0.08) 0px 4px 12px -2px

## Logótipo

Ícone quadrado arredondado (radius 16) com fundo Brand Teal Wash `#E3F0EC`, contendo duas figuras abstratas tipo avatar lado a lado (cabeça pequena próxima do corpo, corpo em círculo cortado pela moldura do ícone): figura da esquerda em Brand Teal `#0E6B5C` (representa a DoLado), figura da direita em Ink `#171A21` (representa o cliente), quase a tocar-se ao centro — "estar do lado do cliente".
Wordmark "DoLado": **Do** em Ink, **Lado** em Brand Teal, peso 700, sem espaço entre as palavras (efeito duotone tipo FedEx).

## O que evitar (regras duras)

- Vermelho/magenta de telecom, verde-EDP, azul institucional saturado tipo ANACOM/ERSE/gov.pt
- Radius fora de {6, 8, 12, 16, 999}px — nunca pílulas em botões grandes
- Misturar serif e sans no mesmo bloco de texto
- Gradientes decorativos pesados — no máximo um wash muito subtil
- Usar o Brand Teal para indicar prazo/urgência/recusa — isso é sempre cor de estado
- Headings acima de 52px
