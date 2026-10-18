# Percursos por origem da visita

Revisão de 17/10/2026. Princípio: reutilizar as páginas existentes; só criar uma página nova quando nenhuma serve.

| Origem | Destino | Porquê |
|---|---|---|
| Conteúdo sobre um problema específico (redes, anúncios, SEO) | A página desse problema: `/problemas/<categoria>/<problema>` | Já tem explicação, Simulador e "Tratar o meu caso" com o setor e o problema pré-preenchidos e `origem` medida em `pedidos_caso.origem` |
| Conteúdo sobre fidelização | `/calculadora-cancelamento` | Resultado imediato, explicação do cálculo e próximo passo coerente |
| Flyer | `https://dolado.pt/` (ver proposta abaixo) | A página inicial passou a ter, logo no início, situações concretas, preços resumidos e ajuda |
| Recomendação pessoal | `https://dolado.pt/` | Abertura, "Duas formas de ajudar", processo e origem do fundador |
| Parceria imobiliária | Por decidir — ver abaixo | Depende de condições comerciais ainda não acordadas |
| Empresa interessada | `/empresas` | Página própria, sem preços, contacto pelo formulário de `/contacto` |
| Quem procura só acompanhamento | `/protecao` | Página nova, sem passar pelo percurso de abertura de caso |

## Proposta para flyers

Não é preciso uma página nova: a página inicial já responde às quatro perguntas de quem lê um flyer (isto é para mim? quanto custa? como começo? e se precisar de ajuda?).

- **URL impresso:** `dolado.pt` (curto, fácil de escrever).
- **Atribuição (opcional):** se quiser medir, usar `dolado.pt/?ref=flyer_<local>_<mês>` num QR code (nunca no texto escrito). Lembrar que a origem `?ref=` só é registada com consentimento de estatística no Cookiebot e nunca dá descontos nem acesso (ver CLAUDE.md, "Origem de aquisição").
- **Texto sugerido para o flyer:**
  - "Tem um problema com uma empresa? Cobranças depois de cancelar, faturas que não percebe, reembolsos que não chegam."
  - "A DoLado prepara a reclamação, mostra-lhe o texto antes de enviar e acompanha a resposta."
  - "Avulso: 11,99 € por caso, sem subscrição." (confirmar o preço em `src/lib/planos.ts` antes de imprimir)
  - "Comece em dolado.pt — ou veja primeiro, em 4 perguntas gratuitas, se podemos ajudar."
- Se mais tarde se quiser uma página curta própria (ex.: `/comecar`), deve reutilizar os blocos da página inicial (situações, preços, ajuda) e entrar em `PAGINAS_BILINGUES` e no middleware.

## Parcerias (ex.: imobiliária) — preparado, dependente de condições comerciais

**Nada foi publicado.** Não existe página da Remax, logótipos, benefícios, preços, duração de ofertas nem compromissos no site. O piloto atual (cupão `duploprestigio26` no Caso + Proteção) continua a funcionar pelo preçário, sem página própria.

Estrutura reutilizável proposta para quando houver condições aprovadas (uma página por parceiro, em `noindex` se for só para os colaboradores/clientes do parceiro):

1. Abertura: "Uma oferta para os [colaboradores / clientes] de [Parceiro]" — sem promessas de poupança.
2. O que a pessoa recebe (exatamente o que foi acordado).
3. A Proteção depois de uma mudança de casa: enviar a primeira fatura e o contrato dos novos serviços; avisos de fim de promoção e de fidelização (ver `/protecao` e o Guia de Mudança de Casa).
4. Como ativar (passo a passo, incluindo o código, se existir).
5. Confidencialidade: o parceiro não vê os casos nem os dados de quem usa a DoLado.
6. Perguntas frequentes e contacto.

Condições necessárias antes de publicar qualquer página de parceria:

- [ ] Acordo escrito com o parceiro (público: colaboradores, clientes ou ambos).
- [ ] Oferta exata: plano, desconto, duração, número de casos, data de início e de fim.
- [ ] Configuração no Stripe correspondente (cupão, produtos, limite) e testada fora de produção.
- [ ] Autorização escrita para usar o nome e o logótipo do parceiro.
- [ ] Texto validado por Thiago; se houver condições contratuais novas, nova versão dos Termos.
- [ ] Que dados (se alguns) o parceiro recebe — por omissão, nenhum; qualquer partilha exige revisão da Política de Privacidade.
- [ ] Decisão sobre indexação (`noindex` ou não) e sobre medição (`?ref=` do parceiro).
