# Política de Privacidade 2026-10-03 — alterações para validação

Versão anterior em vigor: **2026-10-02e** (validada pela advogada a 02/10/2026).
Nova versão: **2026-10-03** (`src/app/(legal)/privacidade/_versoes/v2026-10-03.tsx`).

## Porquê

A 03/10/2026 o Monitor de Proteção passou a acompanhar **serviços** (com ou sem contrato) e a verificar,
antes de juntar uma fatura ou um contrato a um serviço, se o documento pertence mesmo a esse serviço. Num
teste real, uma fatura de outro cliente do mesmo fornecedor era junta ao contrato do Utilizador. Para o
evitar, passamos a ler e a comparar os **dados de identificação que constam dos documentos**.

## O que mudou no tratamento

| Ponto | Antes | Agora |
|---|---|---|
| Dados lidos dos documentos | Fornecedor, datas, valores, referência do contrato | Também nome e NIF do titular, número de cliente, de conta, de contrato e de serviço, e número da fatura |
| Como ficam guardados | — | NIF e nome do titular **nunca em texto** na base de dados: logo a seguir à leitura (antes de qualquer gravação) são substituídos por um pseudónimo HMAC-SHA256 calculado com uma chave secreta guardada só no servidor de aplicação (Clever Cloud). Do NIF fica apenas "NIF terminado em 789". Referências de conta/contrato/serviço: em claro. O documento carregado continua guardado tal como foi enviado (armazenamento privado) |
| Finalidade | Acompanhar datas e condições; comparar faturas | Igual, e confirmar que cada documento pertence ao serviço certo, para não misturar dados de outra pessoa ou de outro serviço |
| Decisões do Utilizador | Confirmar/corrigir valores lidos | Também associar um documento a um serviço quando não foi possível confirmar (registado com data e autor) |
| Documento de outra pessoa | Era associado ao contrato | Não é associado; o Utilizador decide (novo serviço, outro serviço ou cancelar — cancelar apaga o documento de imediato) |
| Fundamento | Execução do contrato (art. 6.º, n.º 1, al. b) | Sem alteração |
| Conservação | 6 meses após o fim da subscrição | Sem alteração; acrescenta-se que um documento cancelado é apagado de imediato |
| Subcontratantes / transferências | — | Sem alteração (Anthropic já lia os documentos completos) |

## Secções alteradas

- **2. Que dados tratamos** — bloco do Monitor reescrito: valores das faturas e histórico; condições
  contratadas e alterações; dados de identificação (com a pseudonimização do NIF e do nome); origem dos dados
  e decisões de associação; situações detetadas e alertas.
- **3. Finalidades** — confirmar que cada documento pertence ao serviço certo; comparação com as faturas
  anteriores e, havendo contrato, com as condições contratadas.
- **4. Inteligência artificial** — a IA também lê a identificação; a associação é feita por regras fixas;
  sem confirmação nada é associado.
- **6. Conservação** — linha do Monitor alargada; documento cancelado apagado de imediato.
- **8. Documentos com dados de terceiros** — novo parágrafo sobre documentos que pareçam pertencer a outra
  pessoa.

Secções 1, 5, 7, 9 e 10: sem alterações.

## Pontos a confirmar pela advogada

1. Se a descrição do pseudónimo (secção 2) é adequada. Trata-se de pseudonimização (art. 4.º, n.º 5, RGPD):
   a chave secreta é guardada separadamente da base de dados; sem ela, o pseudónimo não permite conhecer o
   NIF nem o nome. Continua a ser dado pessoal.
2. Se a DPIA em curso deve passar a incluir a comparação de identificadores.

Nota: a Anthropic continua a receber o documento completo para o ler (já descrito na 2026-10-02e); a
pseudonimização aplica-se ao que a DoLado guarda depois da leitura.
