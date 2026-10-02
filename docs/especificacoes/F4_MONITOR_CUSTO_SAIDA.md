# F4 — Calculadora e Monitor do Custo de Saída

**Componentes:**
1. calculadora pública gratuita — telecomunicações;
2. monitor privado — integrado na Proteção.

**Pergunta que responde:** **“Quanto poderá custar sair deste contrato?”**

---

## 1. Princípio

F4 não deve depender da IA para fazer matemática.

A IA pode **extrair os dados**.

O código faz o cálculo.

---

# Parte A — Calculadora pública

## 2. Âmbito

Apenas telecomunicações na primeira versão.

- pública;
- gratuita;
- sem login;
- sem e-mail antes do resultado;
- sem IA;
- sem criação automática de caso.

CTA final:

**Tratar o meu caso**

---

## 3. Inputs

Conforme aplicável:

- data de início da fidelização;
- duração;
- fidelização inicial ou subsequente;
- se subsequente, se houve alteração/nova instalação;
- mensalidade;
- valor da vantagem associada à fidelização;
- equipamento subsidiado — sim/não.

---

## 4. Contratos/fidelizações a partir de 14/11/2022

Definições:

- `V` = vantagem contratual;
- `D` = duração total;
- `R` = período ainda em falta;
- `M` = mensalidade;
- `N` = mensalidades vincendas estimadas.

### Limite A

```text
A = V × (R / D)
```

### Limite B

Fidelização inicial:

- primeiro ano: `M × N × 50%`
- segundo ano: `M × N × 30%`

Refidelização sem alteração da instalação/lacete local:

- `M × N × 30%`

Refidelização com alteração/nova instalação:

- primeiro ano: `M × N × 50%`
- segundo ano: `M × N × 30%`

### Resultado

```text
estimativa = MIN(A, B)
```

---

## 5. Contratos anteriores a 14/11/2022

Regra base:

```text
estimativa = V × (R / D)
```

Refidelização sem alteração da instalação:

aplica-se também o limite de 30% das mensalidades em falta, segundo orientação da ANACOM.

Casos ambíguos:

não inventar resultado.

---

## 6. Fidelização terminada

```text
estimativa_fidelizacao = €0
```

Isto não significa que não possam existir outros valores contratuais.

---

## 7. Equipamento subsidiado

Não incluir automaticamente no valor da primeira versão.

Mostrar:

> “Podem existir encargos específicos associados a equipamento subsidiado. Este valor não está incluído na estimativa.”

---

## 8. Possíveis situações sem encargos

A calculadora não decide automaticamente se existe fundamento legal/contratual para cessação sem encargos.

Nota:

> **Esta calculadora estima o encargo máximo de uma cessação antecipada por iniciativa do cliente, quando não exista um motivo legal ou contratual que permita terminar o contrato sem estes encargos.**

---

## 9. Precisão temporal

O valor é uma estimativa.

Datas/fracionamento devem ser implementados de forma consistente e testada.

Não prometer correspondência ao cêntimo com o operador.

Se existir na fatura um valor oficial do operador para a data de emissão, tratá-lo separadamente.

---

# Parte B — Monitor privado

## 10. Diferença principal

O cliente **não volta a preencher dados** se F1/F2 já os conhecem.

Inputs vêm de:

- F1;
- F2;
- correções do cliente;
- revisão humana.

---

## 11. Telecomunicações

Mostrar:

- custo estimado hoje;
- fim de fidelização;
- valor indicado pelo operador na última fatura;
- diferença entre valor operador e cálculo;
- evolução estimada.

Exemplo:

> Valor indicado pelo operador na fatura: €74,10  
> Estimativa DoLado: €73,80  
> Fidelização termina: 28/02/2027

---

## 12. A integração mais forte com F2

A ANACOM indica que a fatura deve disponibilizar informação sobre:

- fim da fidelização;
- valor a pagar se o cliente terminar o contrato na data de emissão.

Por isso:

F2 extrai esse valor.

F4 calcula a sua estimativa.

### Se valores forem próximos

Mostrar ambos como confirmação.

### Se forem diferentes

Finding:

`termination_amount_mismatch`

Enviar para revisão humana.

Não dizer automaticamente que o operador está errado.

---

## 13. Evolução no tempo

Não é necessário executar IA diariamente.

O custo telecom pode ser calculado em tempo real com a data atual.

Exemplo:

> Hoje: ~€74  
> Em 3 meses: ~€50  
> Fim da fidelização: €0 de encargo de fidelização

Valores futuros são estimativas.

---

# Parte C — Eletricidade e gás no privado

## 14. Regra

Não existe uma fórmula nacional única equivalente à telecom.

O contrato deve indicar a penalização ou a forma de cálculo.

### Processo

1. Claude identifica a cláusula.
2. Claude devolve estrutura, nunca executa a decisão final.
3. Sistema verifica se a fórmula cabe num conjunto seguro de tipos suportados.
4. Código calcula.
5. Se não for possível representar a fórmula com segurança → revisão humana.

---

## 15. Tipos de fórmula permitidos

Começar muito restrito.

Exemplos:

### Valor fixo por mês restante

```text
€X × meses_restantes
```

### Devolução proporcional de benefício

```text
beneficio_total × período_restante / duração
```

### Valor fixo

```text
€X
```

Outras fórmulas:

`manual_only`

Não construir um interpretador de expressões arbitrárias geradas pela IA.

---

## 16. Schema da cláusula

Exemplo:

```json
{
  "loyalty_exists": true,
  "end_date": "YYYY-MM-DD",
  "clause_text_excerpt": "string",
  "formula_type": "fixed_per_month|proportional_benefit|fixed|manual_only",
  "parameters": {
    "amount": null,
    "benefit_total": null
  },
  "confidence": "high|medium|low",
  "source_page": 4
}
```

Structured output.

---

## 17. Revisão humana

Obrigatória quando:

- `manual_only`;
- confiança média/baixa num campo crítico;
- cláusula contraditória;
- valor operador diverge do cálculo de forma relevante;
- equipamento subsidiado;
- potencial situação de isenção/justa causa;
- resultado será usado para uma reclamação.

---

## 18. Portal

Cartão:

### Custo de saída

**Estimativa hoje:** €74,00

**Valor indicado na última fatura:** €74,10

**Fidelização termina:** 28/02/2027

> Esta é uma estimativa com base nos dados registados. Outras condições podem alterar o valor final.

Ações:

- Ver cálculo
- Corrigir dados
- Tratar o meu caso

---

## 19. Testes

### Telecom

- fidelização terminada;
- 1.º ano;
- 2.º ano;
- refidelização sem instalação;
- refidelização com instalação;
- contrato anterior a 14/11/2022;
- A < B;
- B < A;
- valor vantagem zero;
- inputs inválidos;
- divergência com valor de fatura.

### Energia/gás

- fórmula fixa/mês;
- benefício proporcional;
- valor fixo;
- cláusula ambígua;
- dados em falta;
- fórmula não suportada.

---

## 20. Critérios de aceitação

- [ ] Público telecom funciona sem IA.
- [ ] Privado reutiliza F1/F2.
- [ ] Cálculo fica numa função isolada/testável.
- [ ] Valor da fatura e cálculo não são confundidos.
- [ ] Energia/gás só calculam fórmulas suportadas.
- [ ] IA nunca executa expressão arbitrária.
- [ ] Casos ambíguos passam para humano.
- [ ] CTA final é “Tratar o meu caso”.
- [ ] Linguagem é de estimativa, não parecer jurídico.

---

## 21. Fontes oficiais

- ANACOM — cancelamento/fidelização: https://anacom.pt/render.jsp?contentId=1736614
- ANACOM — Lei n.º 16/2022: https://anacom.pt/render.jsp?contentId=1727429
- ERSE — eletricidade: https://www.erse.pt/consumidores-de-energia/eletricidade/contratarmudar-de-comercializador/
- ERSE — gás: https://www.erse.pt/consumidores-de-energia/gas/contratarmudar-de-comercializador/
