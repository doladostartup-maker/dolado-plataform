# Rascunho — Proteção gratuita durante 30 dias (Termos e Política de Privacidade)

**Estado:** rascunho para validação por Thiago e pela advogada (18/10/2026). Nada disto está publicado. A funcionalidade está no código mas **desligada** (`PROTECAO_GRATUITA_ATIVA`): só deve ser ligada depois de publicadas as novas versões dos Termos e da Política de Privacidade.

## Decisões comerciais (Thiago, 18/10/2026)

- Oferta permanente, só no plano Proteção (4,99 €/mês). Caso + Proteção (7,99 €/mês) e Avulso (14,99 €) não mudam.
- 30 dias, sem cartão bancário e sem compromisso. O período começa quando o cliente o ativa expressamente, nunca ao criar a conta.
- No fim, termina sozinho, sem cobrança. Não há conversão automática numa subscrição.
- Uma vez por pessoa: por conta e por e-mail. Também não é dada a quem já teve Proteção ou Caso + Proteção (incluindo o piloto Remax).
- Adesão durante o período: a 1.ª cobrança da Proteção é feita no dia em que o período gratuito terminaria. Se faltarem menos de 49 horas, a cobrança é feita no dia da adesão. O Caso + Proteção é cobrado logo, como sempre.
- Não acumula com o desconto de indicação de novo cliente. Quem usou a Proteção gratuita e adere à Proteção não recebe os 20%.
- E-mails nos dias 0, 7, 25, 29 e 30. Os dias 7 e 25 são lembretes opcionais, com uma ligação para deixar de os receber.

## Termos — proposta de nova versão (a partir da `2026-10-17`)

Criar `_versoes/v2026-10-XX.tsx`, registá-la em `index.ts` e subir `TERMOS_VERSAO`.

**Secção 5 (Planos e preços)** — acrescentar:

> **Proteção gratuita durante 30 dias.** Quem nunca teve a Proteção nem o Caso + Proteção pode experimentar a Proteção gratuitamente durante 30 dias, uma única vez por pessoa. Não é pedido nenhum meio de pagamento. O período começa no momento em que o cliente o ativa na sua área de cliente e termina automaticamente ao fim de 30 dias, sem qualquer cobrança e sem dar origem a uma subscrição. Durante o período, o cliente tem acesso às funcionalidades da Proteção nos termos da secção 2. O período gratuito não inclui o tratamento de casos.

**Secção 7 (Subscrições)** — acrescentar:

> Para continuar com a Proteção depois do período gratuito, o cliente tem de aderir expressamente à subscrição. Se aderir à Proteção durante o período gratuito, a primeira cobrança é feita no dia em que o período terminaria e é indicada antes do pagamento. Se faltarem menos de 2 dias, a primeira cobrança é feita no dia da adesão. Se aderir ao Caso + Proteção, a cobrança começa no dia da adesão e o período gratuito termina nesse momento. O cliente pode cancelar antes da primeira cobrança sem qualquer custo.

**Secção 14.2 (Fim da subscrição)** — acrescentar:

> No fim do período gratuito sem adesão, aplica-se o mesmo regime de conservação do fim de uma subscrição: os serviços acompanhados e os documentos ficam desativados, são conservados durante 6 meses e voltam a ficar ativos se o cliente aderir à Proteção nesse prazo.

**Secção 22 (Programa de indicação)** — acrescentar:

> O desconto de indicação de novo cliente não se aplica à Proteção de quem já usou a Proteção gratuita.

**Pontos a confirmar com a advogada:**

1. Livre resolução na adesão feita durante o período gratuito, quando a primeira cobrança é adiada. O modal continua a pedir o início imediato, porque o serviço já está a ser prestado.
2. Natureza jurídica do período gratuito: é um contrato de prestação de serviço gratuito, com aceitação dos Termos registada em `protecao_gratuita.texto_aceite`.
3. Se os e-mails dos dias 7 e 25 podem ser comunicações do serviço com uma ligação para deixar de os receber, ou se devem ser tratados como comunicação comercial (Lei 41/2004, art. 13.º-A).

## Política de Privacidade — proposta de nova versão (a partir da `2026-10-09`)

**Secção 2/4 (finalidades e categorias):**

> **Proteção gratuita.** Para garantir que cada pessoa usa a Proteção gratuita uma única vez, guardamos um pseudónimo do endereço de e-mail normalizado. É um código calculado com uma chave secreta, que não permite ler o e-mail. Fica guardado mesmo que a conta seja apagada e é eliminado 24 meses depois da utilização. Guardamos também as datas de início e de fim do período, a versão dos Termos aceite e a página de origem da ativação (só para estatísticas, sem identificar a pessoa).
>
> Base jurídica: execução do contrato (prestação da Proteção gratuita) e interesse legítimo em impedir a utilização repetida da oferta (art. 6.º, n.º 1, als. b) e f), do RGPD).

**Secção 6 (conservação):**

> Pseudónimo do e-mail: 24 meses. Dados do período gratuito: enquanto a conta existir. Dados da Proteção (serviços e documentos) no fim do período sem adesão: 6 meses, como no fim de uma subscrição.

**Matriz de subcontratantes:** não há fornecedor novo. A Brevo envia os e-mails e a Supabase guarda os dados, como já acontece.

**DPIA:** acrescentar o pseudónimo do e-mail (HMAC-SHA256, chave `PROTECAO_GRATUITA_CHAVE`) à análise.
