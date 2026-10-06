# Termos e Condições — novos setores (rascunho para validação)

**Estado: rascunho, por validar** (Thiago / advogada). Nada publicado: os Termos em vigor continuam a ser a
versão `2026-10-05`. Depois de aprovado, o texto entra numa versão nova (`_versoes/vAAAA-MM-DD.tsx`, a data da
publicação), sem editar a publicada.

## Porquê

A 06/10/2026 a plataforma passou a aceitar casos de três setores novos
([PR #91](https://github.com/doladostartup-maker/dolado-plataform/pull/91), migration
`20261006120000_novos_setores.sql`, já aplicada em produção):

- **Gás** — setor próprio, separado de "Energia";
- **Compras & Reembolsos** — compras de bens, online ou em loja: produto com defeito, errado ou danificado,
  encomenda não entregue, devolução ou reembolso em falta, garantia recusada, cobrança ligada a uma compra;
- **Ginásios** — ginásios e health clubs: cancelamento, fidelização/permanência, cobranças depois do
  cancelamento, aumentos de mensalidade, débitos indevidos, serviço diferente do contratado.

O fluxo do caso é o de sempre (análise → texto → revisão e autorização pelo Utilizador → envio →
acompanhamento). Não há preços, planos, prazos nem regras novas.

A secção 2 dos Termos `2026-10-05` descreve o serviço como apoio a consumidores com problemas "em contratos de
telecomunicações, energia ou água em Portugal". Vender casos de compras ou de ginásios com este texto é
prestar um serviço que os Termos aceites não descrevem, e a secção 11 permite recusar casos "fora dos setores
abrangidos". **Os Termos têm de ser atualizados antes de os novos setores serem divulgados ou vendidos.**

## O que muda

| Secção | Termos 2026-10-05 | Proposta |
|---|---|---|
| 2. O serviço da DoLado | "problemas em contratos de telecomunicações, energia ou água em Portugal" | Os sete âmbitos (texto abaixo) |
| 11. Como é tratado um caso | "fora dos setores abrangidos" | Sem alteração: passa a remeter para a lista nova da secção 2 |
| Restantes (1, 3–10, 12–21) | — | Sem alteração |
| Rodapé | "Versão 2026-10-05 · Última atualização: 5 de outubro de 2026" | Nova versão e data |

## Proposta de texto — secção 2, primeiro parágrafo

> A DoLado presta um serviço de apoio a consumidores com problemas com empresas, em Portugal, nos seguintes
> âmbitos: contratos de telecomunicações, de energia, de gás e de água; compras de bens, incluindo entregas,
> devoluções, garantias e reembolsos; e contratos com ginásios e health clubs. A DoLado analisa a situação
> descrita pelo Utilizador, prepara o texto de uma reclamação com os factos, as datas e a legislação
> potencialmente aplicável, submete-a pelo canal adequado — depois de o Utilizador a autorizar — e acompanha o
> caso. Disponibiliza também, nos planos com Proteção, funcionalidades que ajudam a prevenir e a detetar
> problemas a partir dos contratos e das faturas do Utilizador.

As três alíneas que se seguem (não é sociedade de advogados; não é autoridade pública, regulador, centro de
arbitragem nem tribunal; não garante o resultado) **ficam iguais**.

**Também muda a última frase.** A versão em vigor diz "funcionalidades de prevenção e acompanhamento de
contratos". A proposta segue a regra de produto ("Os contratos são contexto. O produto é a resolução do
problema.") e descreve a Proteção pelo que faz, não como gestão de contratos. Se preferir alterar só os
setores, basta manter a frase antiga — tudo o resto funciona igual.

## Pontos a validar pela advogada

1. **"em Portugal" nas compras online.** Um consumidor em Portugal pode comprar a um vendedor de outro Estado
   (UE ou fora). Proposta: o serviço é para consumidores em Portugal; a DoLado pode recusar (secção 11) um caso
   que não consiga apresentar pelo canal adequado — por exemplo, um vendedor fora da UE sem canal de
   reclamação. Confirmar se é preciso dizê-lo expressamente.
2. **"health clubs".** Anglicismo usado no setor e no pedido original. Alternativa: "ginásios e outros
   estabelecimentos de exercício físico". Escolher uma.
3. **Proteção e novos setores.** A Proteção (Monitor de Proteção) lê documentos de telecomunicações,
   eletricidade, gás e água; não acompanha compras nem ginásios. O Aviso Sectorial passa a ter os seis setores.
   A secção 5 fixa a descrição publicada da Proteção (que não refere setores), por isso não parece ser preciso
   alterá-la. Confirmar.
4. **Revisão jurídica pendente das secções herdadas** (`REVISAO_JURIDICA_PENDENTE`, desde a `2026-10-02`):
   esta alteração não a resolve nem a agrava. Pode ser feita na mesma revisão.

## Fora dos Termos (a ter em conta)

- **Política de Privacidade:** só refere setores como exemplo (secção 2: "por exemplo, um serviço de
  telecomunicações ou de eletricidade"). Os dados recolhidos e as finalidades não mudam, por isso **não precisa
  de nova versão**. Confirmar com a advogada.
- **Matriz de subcontratantes:** sem alteração (nenhum fornecedor novo).
- **Regras jurídicas** (`/backoffice/regras-juridicas`): ainda não há regras aprovadas para os novos setores; até
  lá, a sugestão do texto pela IA sai sem fundamentação legal (com aviso) e a DoLado acrescenta-a na revisão.

## Como publicar (depois de aprovado)

1. Copiar `src/app/(legal)/termos/_versoes/v2026-10-05.tsx` para `vAAAA-MM-DD.tsx` (segunda versão no mesmo dia:
   sufixo de letra), renomear a função (`TermosVAAAAMMDD`), substituir o primeiro parágrafo da secção 2 pelo
   texto aprovado, atualizar o comentário do cabeçalho (o que muda, quem validou e quando) e o rodapé.
2. Registar a versão em `_versoes/index.ts` e subir `TERMOS_VERSAO` em `src/lib/legal.ts`.
3. Atualizar a secção "Páginas legais" do `CLAUDE.md` (Termos em vigor).
4. As compras seguintes ficam ligadas à nova versão (`consentimentos_compra.termos_versao`); as anteriores
   continuam ligadas à versão aceite, disponível em `/termos/<versão>`.
