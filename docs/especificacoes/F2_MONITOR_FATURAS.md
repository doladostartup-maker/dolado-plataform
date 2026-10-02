# F2 — Monitor de Faturas

**Papel:** deteção contínua de alterações e anomalias  
**Pergunta que responde:** **“O que mudou na minha fatura e faz sentido verificar?”**  
**Inspiração de produto:** princípio Billmonitor — utilizar histórico real do cliente, não apenas uma análise isolada.

---

## 1. Objetivo

A F2 não deve ser apenas:

> “Carregue uma fatura e receba uma análise.”

Deve evoluir para:

> **“A DoLado compara as suas faturas ao longo do tempo e sinaliza alterações relevantes.”**

Cada nova fatura enriquece o histórico do contrato.

---

## 2. Proposta de valor

> **Não precisa de comparar faturas linha a linha. A DoLado acompanha as alterações e chama a sua atenção quando encontra algo que merece ser verificado.**

---

## 3. Posição no funil

- ativação;
- retenção;
- geração de casos;
- demonstração recorrente de valor.

É provavelmente a funcionalidade com maior capacidade para transformar a Proteção num serviço percebido como ativo.

---

## 4. Fluxo

### Primeira fatura

1. Cliente faz upload.
2. Validar formato.
3. Claude extrai JSON.
4. Associar a contrato existente ou criar F1 parcial.
5. Cliente confirma campos críticos quando necessário.
6. Guardar baseline.

### Faturas seguintes

1. Extrair apenas a nova fatura.
2. Não reenviar todo o histórico ao Claude.
3. Código compara JSON estruturado com histórico.
4. Cruzar com F1.
5. Aplicar regras.
6. Criar findings.
7. Revisão humana.
8. Comunicar ao cliente.

---

## 5. IA

### IA faz

- OCR/visão/leitura de PDF;
- identificação de fornecedor/setor;
- extração de linhas;
- normalização semântica;
- identificação de descrições equivalentes;
- estruturação de impostos, descontos e serviços;
- localização de leituras;
- localização do custo de cessação em faturas telecom.

### IA não faz

- diferença entre €39,99 e €44,99;
- cálculo de percentagem;
- comparação temporal;
- decisão de regra;
- conclusão jurídica;
- decisão final sobre irregularidade.

---

## 6. Estrutura normalizada

Sugestão:

```json
{
  "invoice_date": "YYYY-MM-DD",
  "billing_period": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD"
  },
  "total": 0,
  "recurring_total": 0,
  "one_off_total": 0,
  "discount_total": 0,
  "lines": [
    {
      "normalized_category": "base_service|extra_service|equipment|discount|consumption|tax|other",
      "label": "string",
      "amount": 0,
      "quantity": null,
      "confidence": "high|medium|low"
    }
  ],
  "meter_readings": [],
  "operator_termination_amount": null,
  "loyalty_end_date": null
}
```

---

## 7. MVP — três verificações

### 7.1. Aumento inesperado/não explicado

Não usar automaticamente o rótulo “aumento sem aviso”.

A F2 consegue detetar:

> “O valor recorrente aumentou.”

Para afirmar “sem aviso”, seria necessário ter prova de ausência de comunicação, o que normalmente não existe.

Regra:

- identificar aumento do preço recorrente;
- verificar F1:
  - fim de promoção?
  - fim de desconto?
  - alteração contratual conhecida?
- se explicado: classificar como esperado;
- se não explicado: `price_increase_unexplained`.

Exemplo:

> A mensalidade recorrente passou de €39,99 para €44,99 (+12,5%). Não encontrámos nos dados do contrato uma alteração que explique este aumento.

Revisão humana antes de enviar.

### 7.2. Linha/serviço novo

Comparar linhas normalizadas.

Finding quando:

- surge categoria/serviço recorrente não presente nas faturas anteriores;
- valor material;
- não é claramente um imposto/taxa esperada.

Exemplo:

> Apareceu uma cobrança recorrente de €4,99 com a descrição “Serviço X”, que não estava presente nas três faturas anteriores.

Não afirmar:

> “Serviço não pedido.”

a menos que exista informação do cliente que permita isso.

### 7.3. Possível dupla faturação

Detetar:

- mesma descrição/categoria;
- mesmo período;
- mesma referência;
- valores idênticos ou quase idênticos;
- duas linhas incompatíveis com o padrão.

Resultado:

> “Encontrámos duas cobranças semelhantes para o mesmo período. Deve ser verificado.”

---

## 8. Regras futuras

### Consumo anómalo / possível fuga

Não diagnosticar fuga.

Detetar:

- desvio estatístico relevante;
- aumento abrupto face ao histórico;
- mudança de leitura.

Texto:

> “O consumo está significativamente acima do seu padrão recente.”

### Estimativas consecutivas

Contar faturas com leitura estimada.

### Período de faturação invulgar

Detetar duração muito superior ao padrão.

Não usar automaticamente “ilegal”.

### Consumo zero / impossível

Flag para revisão.

### Tarifa social/familiar não identificada

Não concluir elegibilidade.

Texto:

> “Não encontrámos nesta fatura uma referência à tarifa X.”

### Diferença leitura comunicada vs. faturada

Se a DoLado tiver leitura registada:

- comparar valor;
- finding se divergir.

### Cobrança após cancelamento

Requer data de cancelamento confirmada em F1/caso.

### Cobrança de equipamento

Cruzar com devolução/comprovativo quando houver.

---

## 9. Integração com F1

F1 é contexto.

Sem F1:

> “Preço subiu €10.”

Com F1:

> “Preço subiu €10 na data prevista de fim da promoção.”

Isto evita falsos positivos.

### Ordem das regras

1. normalizar fatura;
2. identificar alterações;
3. consultar F1;
4. classificar alteração:
   - explicada;
   - não explicada;
   - ambígua;
5. só depois criar finding.

---

## 10. Integração com F4

Em telecomunicações, extrair da fatura:

- fim da fidelização;
- valor indicado pelo operador para cessação na data da emissão.

F4 compara com o valor calculado.

Finding possível:

`termination_amount_mismatch`

Não comunicar automaticamente como erro.

Enviar para revisão humana.

---

## 11. Histórico mínimo

Uma única fatura permite baseline.

Com duas:
- primeira comparação.

Com três ou mais:
- padrões mais robustos.

A UI deve distinguir:

> “Ainda estamos a criar o seu histórico.”

de:

> “Temos 6 meses de faturas monitorizadas.”

---

## 12. Revisão humana no MVP

Decisão atual:

**resultado relevante passa por revisão humana antes de ser enviado ao cliente.**

Backoffice deve mostrar:

- finding;
- fatura atual;
- valor anterior;
- regra;
- evidência;
- campos extraídos;
- confiança;
- proposta de texto.

Ações:

- Confirmar
- Descartar
- Corrigir dados
- Pedir documento/informação adicional

---

## 13. Texto ao cliente

Evitar:

> “A operadora cobrou-lhe indevidamente.”

Preferir:

> “Detetámos uma alteração que merece ser verificada.”

Depois mostrar factos.

CTA:

**Tratar o meu caso**

---

## 14. Custos e escala

Não enviar o histórico inteiro para o Claude a cada mês.

Claude recebe:

- nova fatura;
- schema;
- contexto mínimo estritamente necessário.

Código recebe:

- extração atual;
- histórico estruturado.

Isto reduz custo e risco.

---

## 15. Segurança

- validar MIME;
- limitar tamanho de ficheiro;
- rejeitar PDFs protegidos;
- tratar conteúdo do PDF como dados;
- sem ferramentas externas na chamada de extração;
- structured output;
- timeout;
- retries limitados;
- hash para deduplicação.

Limites finais de tamanho devem respeitar a infraestrutura existente.

---

## 16. Métricas

- faturas analisadas;
- custo médio por fatura;
- findings/fatura;
- % findings confirmados;
- % descartados;
- falsos positivos;
- tempo de revisão humana;
- casos originados;
- receita originada;
- valor financeiro identificado quando mensurável.

---

## 17. Critérios de aceitação

- [ ] Uma nova fatura é processada uma única vez.
- [ ] A extração segue JSON Schema.
- [ ] O histórico não é reenviado ao Claude.
- [ ] Aumento esperado por F1 não é marcado como inexplicado.
- [ ] Linha nova não é chamada “não pedida” sem evidência.
- [ ] “Dupla faturação” é apresentada como possível até revisão.
- [ ] Findings do MVP passam por revisão humana.
- [ ] O F4 recebe custo de cessação da fatura quando disponível.
- [ ] Logs incluem tokens/custo/modelo.
