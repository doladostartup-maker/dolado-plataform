# Programa de Parceiros — modelos de comunicação (21 de Outubro de 2026)

Modelos para Thiago enviar à mão (e-mail ou WhatsApp) ou para o parceiro usar com os clientes dele. **Nada disto é enviado automaticamente.** Ortografia tradicional, "e-mail", "a DoLado", tratamento por "si".

Regras para todos:

- Nunca prometer rendimentos nem resultados de um caso.
- Não mostrar valores de comissão em material público; os valores vão no acordo de parceria e, para quem já é parceiro, na área de parceiro.
- O parceiro diz sempre ao cliente que recebe uma comissão da DoLado.
- Sem campanhas de e-mail frio, sem listas de contactos do parceiro e sem mensagens enviadas pela DoLado em nome do parceiro.
- O Caso Avulso e o Caso Extra não dão comissão — não os apresentar como fonte de comissão.

E-mails que **já saem da plataforma** (não repetir à mão): candidatura recebida, candidatura aprovada (com código e ligação), acesso à área de parceiro e pagamento registado — textos em `src/i18n/mensagens/{pt-PT,en-GB}/parceiros.ts`.

---

## 1. Convite para aderir (Thiago → consultor imobiliário)

> **Assunto:** Uma resposta para os seus clientes depois da entrega das chaves
>
> Olá, [nome],
>
> Sou o Thiago, da DoLado. Ajudamos as pessoas a resolver problemas com operadoras de telecomunicações, electricidade, gás e água — e muitos desses problemas aparecem nas semanas a seguir a uma mudança de casa: a casa antiga que continua a ser cobrada, uma penalização por cancelar, a primeira factura muito acima do esperado.
>
> Estamos a convidar consultores imobiliários para recomendarem a DoLado aos seus clientes. Por cada novo cliente elegível, a DoLado paga-lhe uma comissão; o cliente paga o preço normal.
>
> Pode ver como funciona aqui: https://dolado.pt/parceiros/imobiliario
>
> Se fizer sentido, responda a este e-mail e marcamos 15 minutos.
>
> Thiago — DoLado

Enviar só a quem Thiago conhece ou a contactos profissionais publicados para esse fim (ex.: página da agência). Não comprar listas.

## 2. Aprovação da parceria

Sai automaticamente quando a candidatura é aprovada no backoffice. Depois do acordo assinado, Thiago acrescenta à mão:

> Obrigado por se juntar ao Programa de Parceiros. Em anexo vai o acordo assinado. Para acompanhar as suas recomendações, crie uma conta em https://portal.dolado.pt/registo com este e-mail e avise-me — dou-lhe acesso à área de parceiro.

## 3. Instruções de utilização da ligação

> **Como recomendar a DoLado**
>
> 1. Partilhe a sua ligação (está na área de parceiro e no e-mail de aprovação). Quem a abrir conhece todos os serviços da DoLado e escolhe o que precisa.
> 2. Se a pessoa não usar a ligação, peça-lhe para escrever o seu código de parceiro ao criar conta ou antes de pagar.
> 3. Diga sempre que é parceiro da DoLado e que recebe uma comissão. A pessoa paga o preço normal.
> 4. A DoLado trata do resto. Não precisa de acompanhar o caso nem de enviar documentos — e não terá acesso a eles.
> 5. Na área de parceiro vê quantas pessoas chegaram por si e o estado das comissões.

## 4. Mensagem de recomendação genérica (parceiro → cliente)

> Olá, [nome]. Agora que já tem as chaves, deixo-lhe uma sugestão: a DoLado ajuda a resolver problemas com operadoras de internet, luz, gás e água, e acompanha as facturas para evitar surpresas. Sou parceiro da DoLado e recebo uma comissão se escolher um serviço, mas o preço para si é o mesmo. Veja aqui: [ligação]

## 5. Recomendar o tratamento de um caso (parceiro → cliente com um problema)

> Olá, [nome]. Sobre o problema com [a operadora / a factura]: a DoLado trata disto por si — prepara a reclamação, envia-a e acompanha até haver resposta. Sou parceiro da DoLado e recebo uma comissão em alguns serviços, sem custo extra para si. Pode começar aqui: [ligação]

## 6. Recomendar a Protecção (parceiro → cliente)

> Olá, [nome]. Com a mudança, ficou com contratos novos de internet, luz e água. A Protecção da DoLado acompanha as facturas e as datas desses contratos e avisa quando um preço muda ou uma promoção está a acabar. Sou parceiro da DoLado e recebo uma comissão se aderir, sem custo extra para si. Saiba mais: [ligação]

## 7. Comissão aprovada (Thiago → parceiro)

Não há e-mail automático nesta versão (o estado aparece na área de parceiro). Se quiser avisar:

> Olá, [nome]. Aprovámos [n] comissões ([valor] sem IVA). Vão no próximo pagamento, previsto para [data]. Se cobra IVA, envie-nos a factura com o IVA acrescido. Pode ver o detalhe na área de parceiro: https://portal.dolado.pt/portal/parceiro

## 8. Resumo mensal de comissões (Thiago → parceiro)

Não há envio automático nesta versão. Modelo, com os números da área de parceiro (nunca dados de clientes):

> **Assunto:** As suas recomendações em [mês]
>
> Olá, [nome]. Em [mês]:
>
> - contas associadas a si: [n] (total: [n])
> - comissões pendentes: [n] · elegíveis: [n] · aprovadas: [n]
> - pagamento feito: [valor] (referência [ref]) / ainda sem pagamento
>
> Pode ver tudo, a qualquer momento, na área de parceiro. Obrigado pelas recomendações.

Se este resumo passar a automático, usar `emailV2`, só contagens e valores, e acrescentá-lo ao dicionário `parceiros` (pt/en).
