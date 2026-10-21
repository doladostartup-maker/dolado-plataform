# Rascunho — Política de Privacidade: área do parceiro (21 de Outubro de 2026)

**Estado:** rascunho para a advogada. Nada publicado. A área do parceiro (`/portal/parceiro`) está no código, **desligada** (`AREA_PARCEIRO_ATIVA`), até esta versão ser validada e publicada.

Decisão de Thiago (21/10/2026): criar uma área de login para o Parceiro de Indicação. Valores e prazos das comissões não mudam (5 € Protecção / 8 € Caso + Protecção, sem IVA, às 3 mensalidades pagas); o Caso Avulso continua sem comissão.

## 1. O que muda

A Política em vigor (`2026-10-22`, secção 5, "Parceiros comerciais") diz:

> Os parceiros da DoLado não têm acesso à plataforma. Um Parceiro de Indicação recebe apenas o número e o valor das comissões que lhe são devidas e pagas, nunca o nome, o e-mail, a conta, os casos, as facturas ou os contratos das pessoas que lhe estão atribuídas.

Com a área, o parceiro passa a:

- ter uma **conta DoLado** (a mesma conta de cliente de sempre — e-mail e palavra-passe, ou Google), ligada ao parceiro pelo admin;
- ver, além do número e do valor das comissões por estado e dos pagamentos que recebeu: o **número de contas que lhe estão atribuídas** e o **número de conversões por produto** (Protecção, Caso + Protecção).

Nunca vê nomes, e-mails, contas, casos, facturas, contratos, datas de compra nem linhas por pessoa (só uma função na base de dados, que devolve totais — `parceiro_area_resumo()`).

## 2. Ponto para decidir — inferência com números pequenos

O parceiro sabe a quem fez cada recomendação. Com poucas pessoas atribuídas, os totais permitem deduzir:

- se uma pessoa que recomendou **criou conta** (contas associadas);
- se **subscreveu** e **qual** serviço (conversões por produto);
- se **continua a pagar** (comissão pendente → elegível) ou se cancelou/pediu reembolso (anulada).

Isto já acontecia em parte com o e-mail de pagamento (valor = n.º de comissões), mas a área torna-o contínuo e mais detalhado.

Opções (decidir com a advogada):

1. **Manter os totais exactos** e dizê-lo na Política (texto A abaixo). O parceiro precisa de valores exactos para conferir o que lhe é pago.
2. **Esconder as contagens pequenas** de contas associadas e conversões por produto ("menos de 5", como no relatório da Protecção oferecida), mantendo exactos só os valores das comissões e os pagamentos. Reduz a inferência sobre o produto escolhido, mas não sobre "pagou / não pagou" (que o valor revela).
3. **Retirar as conversões por produto**, ficando só as comissões por estado e os pagamentos.

O código está na opção 1. As opções 2 e 3 são uma alteração pequena (função `parceiro_area_resumo()` e página).

## 3. Texto proposto (opção 1)

### Secção 2 (dados tratados) — nova linha

> **Área de parceiro**: da pessoa que representa um Parceiro de Indicação, os dados da sua conta DoLado (como qualquer conta) e a ligação dessa conta ao parceiro — quem deu e quem retirou o acesso, as datas e o motivo.

### Secção 5 (parágrafo "Parceiros comerciais") — substitui a primeira frase

> **Parceiros comerciais.** Um Parceiro de Indicação pode consultar, numa área própria da plataforma, apenas números totais: quantas contas lhe estão atribuídas, quantas subscreveram a Protecção ou o Caso + Protecção, o número e o valor das comissões em cada estado e os pagamentos que recebeu. Nunca vê o nome, o e-mail, a conta, os casos, as facturas ou os contratos das pessoas que lhe estão atribuídas. Como o parceiro sabe a quem fez a recomendação, quando os números são pequenos pode deduzir se uma pessoa que recomendou subscreveu um serviço e se a subscrição se mantém.

(O resto do parágrafo, sobre o Parceiro de Distribuição, fica igual.)

### Secção 6 (prazos) — nova linha

> **Acessos à área de parceiro** — enquanto durar a parceria; depois, pelo prazo dos dados dos parceiros (linha "Programa de Parceiros — dados dos parceiros…"). Retirar um acesso não apaga o registo (prova de quem teve acesso e quando).

### Base jurídica

- Conta e acesso da pessoa que representa o parceiro: execução do acordo de parceria (art. 6.º/1/b) quando o parceiro é pessoa singular; interesse legítimo (art. 6.º/1/f) quando representa uma empresa.
- Mostrar os totais ao parceiro: execução do acordo de parceria (transparência sobre as comissões) / interesse legítimo, com o teste de ponderação da secção 2 acima.

## 4. Termos

A secção 24 dos Termos (`2026-10-20`) diz que os Parceiros de Indicação "não têm acesso à conta, às facturas, aos contratos nem aos casos das pessoas que indicaram" — continua verdade. Ponto a confirmar: acrescentar "e só vêem números totais sobre as pessoas que lhes estão atribuídas" (exige nova versão dos Termos).

## 5. Contrato-tipo do Parceiro de Indicação

Acrescentar: a área de parceiro e a conta (uso pessoal, não partilhar a palavra-passe); a obrigação de dizer ao consumidor que recebe uma comissão; proibição de envio em massa ou uso de listas de contactos sem base legal; a área não é extracto contabilístico — vale o registo do pagamento.

## 6. Ordem para ligar

1. **Antes do merge do PR da área** (independente da Política): aplicar a migration `20261027090000_area_parceiro.sql` em produção (`supabase db push --linked --dry-run` e depois `db push`) — o backoffice lê a tabela nova. Não expõe nada: sem o interruptor, o portal nem consulta a tabela.
2. Depois de validado: criar `privacidade/_versoes/vAAAA-MM-DD.tsx` a partir da `2026-10-22`, registar em `index.ts`, subir `PRIVACIDADE_VERSAO` (e os Termos, se a secção 24 mudar).
3. Depois do deploy com a nova Política: `AREA_PARCEIRO_ATIVA=1` na Clever Cloud (novo build — a página `/parceiros/imobiliario` mostra o passo "Acompanha os resultados" só com o interruptor ligado). Só então dar acessos no backoffice (o e-mail de acesso aponta para a área).
