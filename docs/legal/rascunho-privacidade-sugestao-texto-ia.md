# Política de Privacidade 2026-10-05 — alterações para validação

Versão em vigor: **2026-10-03** (validada pela advogada; confirmado por Thiago a 05/10/2026).
Nova versão: **2026-10-05** (`src/app/(legal)/privacidade/_versoes/v2026-10-05.tsx`).

## Porquê

A DoLado passa a poder preparar, com a Claude API (Anthropic), uma **primeira proposta do texto da
reclamação** quando um cliente abre um caso. É uma finalidade nova para a Anthropic: até aqui só lia faturas
e contratos do Monitor de Proteção. A funcionalidade está **desligada** (`RASCUNHO_IA_ATIVO`) até esta versão
estar validada e publicada.

## O que muda no tratamento

| Ponto | Antes (2026-10-03) | Agora (2026-10-05) |
|---|---|---|
| Uso da IA | Ler faturas e contratos do Monitor | Também redigir uma primeira proposta do texto da reclamação |
| Dados enviados à Anthropic para a proposta | — | Setor, empresa visada, tipo de problema, descrição do cliente, contacto anterior com a empresa e, se o cliente acompanhar esse serviço no Monitor, condições registadas e valores das faturas recentes |
| Dados não enviados | Nome, e-mail, telefone da conta | Também NIF, referências de cliente/contrato e anexos do caso. A DoLado retira da descrição contactos e números de identificação detetados (melhor esforço — não é anonimização) |
| Revisão humana | Situações do Monitor revistas antes de comunicar | A proposta é sempre revista por uma pessoa antes de ser mostrada ao cliente; nunca é enviada sem essa revisão nem sem a autorização do cliente (garantido também na base de dados) |
| Fundamentação jurídica | — | Só regras escolhidas e revistas pela DoLado; a IA não pode citar outras |
| Novos dados guardados | — | A proposta e o registo da sua preparação (regras consideradas, informação por confirmar, data, modelo, custo); do contexto enviado só um hash |
| Fundamento | Execução do contrato (art. 6.º, n.º 1, al. b) | Sem alteração: preparar a reclamação faz parte do serviço contratado |
| Conservação | Casos: enquanto a conta existir (+ prova até à prescrição) | Sem alteração: as propostas seguem o caso e são apagadas com ele |
| Subcontratantes / transferências | Anthropic já listada | Sem novo fornecedor; muda a finalidade da Anthropic (secção 5 e matriz) |

## Secções alteradas

- **2. Que dados tratamos** — dados do caso: a proposta preparada com apoio de IA e o registo da sua preparação.
- **3. Finalidades** — preparar a reclamação inclui, quando aplicável, uma primeira proposta com apoio de IA,
  sempre revista por uma pessoa.
- **4. Inteligência artificial** — segundo uso da IA; revisão humana obrigatória; base jurídica da DoLado;
  a IA não decide se um caso é aceite; dados enviados e não enviados para a proposta; recomendação de não
  escrever contactos ou números de identificação na descrição.
- **5. Com quem partilhamos** — finalidade da Anthropic alargada.
- **6. Conservação** — linha dos casos inclui as propostas; registos de custo sem conteúdo dos casos.

Secções 1, 7, 8, 9 e 10: sem alterações.

## Pontos a confirmar pela advogada

1. Se a execução do contrato continua a ser o fundamento adequado para enviar a descrição do caso à Anthropic
   (a proposta é um meio interno de preparar a reclamação contratada) ou se recomenda outro.
2. Se a descrição da remoção de dados pessoais da descrição ("procura retirar") é suficientemente prudente.
3. Se a AIPD/DPIA em curso deve incluir esta finalidade (redação assistida por IA com revisão humana).
4. Prazo de conservação de entradas/saídas pela Anthropic (já "a validar" na matriz).
