# Termos 2026-10-18b — novo preço do Avulso (rascunho para validação)

Decisão comercial de Thiago (18/10/2026): o Avulso passa, de forma permanente, de 14,99 € para 11,99 € (IVA incluído). Não é uma campanha promocional. A Proteção (4,99 €/mês) e o Caso + Proteção (7,99 €/mês) não mudam.

## O que muda nos Termos (versão 2026-10-18b, a partir da 2026-10-18)

| Secção | Antes (2026-10-18) | Agora (2026-10-18b) |
|---|---|---|
| 5. Planos e preços: Avulso | 14,99 € por caso | 11,99 € por caso |
| 5. Planos e preços: Caso Extra | 11,99 € em vez de 14,99 € (20%) | 9,59 € em vez de 11,99 € (20%) |
| 9. Avulso e Caso Extra | 14,99 € / 11,99 € | 11,99 € / 9,59 € |
| 10. Passagem Avulso → subscrição | reembolso de 10,00 € (Proteção) / 7,00 € (Caso + Proteção) | 7,00 € / 4,00 €, e um parágrafo novo: um Avulso pago a outro preço (por exemplo, antes desta versão) é reembolsado pelo valor efetivamente pago menos a primeira mensalidade |

Nada mais muda. O Caso Extra continua com 20% de desconto de subscritor (decisão de Thiago, 18/10/2026).

## Versões anteriores

As versões publicadas até 2026-10-18 liam os preços de `src/lib/planos.ts`: mudar o preço reescreveria o texto que os clientes aceitaram. Agora leem os preços desse período de `src/app/[idioma]/(legal)/termos/_versoes/precosAte20261018.ts` (Avulso 14,99 €, Caso Extra 11,99 €), e o texto mantém-se igual ao publicado.

## Compras anteriores

- Um Avulso comprado a 14,99 € continua válido. Se for convertido numa subscrição, o reembolso é calculado sobre o valor pago (10,00 € / 7,00 €). O código (`calcularConversao`) já fazia este cálculo.
- Não há reembolso da diferença de preço a quem comprou a 14,99 €. Se se quiser oferecer esse reembolso, é uma decisão à parte.

## A validar

- [ ] Texto da secção 10 (parágrafo novo) — advogada
