# F1 — Monitor do Contrato

**Papel:** núcleo de retenção da Proteção DoLado  
**Pergunta que responde:** **“O que tenho contratado e quando devo estar atento?”**  
**Integrações principais:** F2 Monitor de Faturas, F4 Monitor do Custo de Saída

---

## 1. Objetivo

Transformar o atual “Calendário do contrato” num registo vivo dos contratos relevantes do cliente.

A F1 não deve ser apenas um conjunto de lembretes.

Deve funcionar como a **fonte estruturada de verdade** sobre:

- fornecedor;
- serviço;
- preço;
- fidelização;
- promoção;
- descontos;
- equipamentos;
- identificadores da instalação;
- datas e condições que podem gerar uma ação.

---

## 2. Proposta de valor

> **A DoLado acompanha as datas e condições importantes dos seus contratos para que não tenha de se lembrar de tudo.**

A F1 é a principal resposta à questão:

> “Porque continuo a pagar a Proteção se este mês não tenho nenhuma reclamação?”

Porque a DoLado continua a acompanhar os contratos.

---

## 3. Posição no funil

Principal:

**Retenção**

Secundário:

- ativação;
- expansão;
- geração de novos casos.

---

## 4. Como começa

### Opção A — primeira fatura

Preferida por menor fricção.

O cliente carrega uma fatura.

A DoLado tenta criar um contrato `partial`.

### Opção B — contrato

O cliente carrega o contrato e obtém monitorização mais completa.

### Opção C — manual

Só para campos que não podem ser obtidos de documentos ou que o cliente queira corrigir.

---

## 5. Dados por setor

### 5.1. Comuns

- fornecedor;
- setor;
- referência contratual;
- preço/mensalidade;
- data de início;
- fim de fidelização;
- fim de promoção;
- valor da vantagem associada;
- serviço;
- equipamentos;
- estado.

### 5.2. Telecomunicações

- pacote/serviços;
- mensalidade base;
- descontos;
- fim de fidelização;
- custo de cessação indicado pelo operador, se presente;
- router/box/equipamentos;
- refidelização;
- informação sobre nova instalação quando conhecida.

### 5.3. Eletricidade

- CPE;
- potência contratada;
- opção tarifária;
- comercializador;
- fidelização;
- desconto;
- preço/estrutura relevante.

### 5.4. Gás

- CUI;
- escalão;
- comercializador;
- fidelização;
- desconto;
- preço/estrutura relevante.

---

## 6. IA

### Usa IA para

- classificar documento;
- extrair campos;
- encontrar datas;
- identificar promoções/descontos;
- identificar equipamentos;
- encontrar cláusulas relevantes;
- localizar CPE/CUI.

### Não usa IA para

- calcular dias;
- determinar se uma data chegou;
- agendar alertas;
- calcular percentagens;
- aplicar regras;
- decidir se o cliente “tem um direito”.

---

## 7. Schema sugerido de extração

Exemplo conceptual:

```json
{
  "document_type": "invoice|contract|unknown",
  "sector": "telecom|electricity|gas|unknown",
  "provider": {
    "value": "string|null",
    "confidence": "high|medium|low|not_found"
  },
  "recurring_price": {
    "value": 0,
    "currency": "EUR",
    "confidence": "high|medium|low|not_found"
  },
  "loyalty_end_date": {
    "value": "YYYY-MM-DD|null",
    "confidence": "high|medium|low|not_found",
    "source_page": 1
  },
  "promotion_end_date": {
    "value": "YYYY-MM-DD|null",
    "confidence": "high|medium|low|not_found"
  },
  "contractual_advantage_value": {
    "value": 0,
    "currency": "EUR",
    "confidence": "high|medium|low|not_found"
  },
  "operator_termination_amount": {
    "value": 0,
    "currency": "EUR",
    "as_of_date": "YYYY-MM-DD|null",
    "confidence": "high|medium|low|not_found"
  },
  "cpe": {
    "value": "string|null",
    "confidence": "high|medium|low|not_found"
  },
  "cui": {
    "value": "string|null",
    "confidence": "high|medium|low|not_found"
  }
}
```

Schema final deve ser adaptado à estrutura atual.

---

## 8. Proveniência

Cada campo crítico deve saber de onde veio.

Exemplo:

> Fidelização termina: 28/02/2027  
> Origem: fatura Vodafone de setembro, página 2  
> Confirmado pelo cliente: 02/10/2026

Não guardar apenas `28/02/2027`.

---

## 9. Confirmação

Depois da extração:

> **Encontrámos estes dados no documento. Confirme antes de começarmos a monitorizar.**

Mostrar apenas campos relevantes.

Não obrigar o utilizador a validar 30 campos.

Prioridade:

- fornecedor;
- serviço;
- preço;
- fim de fidelização;
- fim de promoção;
- vantagem;
- CPE/CUI quando necessário.

---

## 10. Regras de monitorização MVP

### Fidelização

Eventos sugeridos:

- 60 dias;
- 30 dias;
- fim.

### Promoção/desconto

- 60 dias;
- 30 dias;
- fim.

### Energia

- fim de desconto;
- lembrete de leitura apenas se fizer parte do produto final decidido;
- outras datas objetivas.

### Pós-cancelamento/mudança

Só manter se houver dados suficientes e um propósito concreto.

---

## 11. Princípio dos alertas

**Não enviar um alerta apenas porque uma data existe.**

Pergunta antes:

> “Este alerta dá ao cliente uma ação útil?”

Exemplo bom:

> “A promoção de €10/mês que temos registada termina dentro de 30 dias.”

Exemplo a evitar:

> “Temos novidades sobre o seu contrato.”

---

## 12. Linguagem

Factual.

Não dizer:

> “Tem direito a cancelar.”

Preferir:

> “A fidelização que temos registada termina em 28/02/2027.”

Depois:

> “Quer verificar o custo estimado de saída?”

ou:

> “Está a ter um problema? Tratar o meu caso.”

---

## 13. Integração F1 → F2

F1 fornece contexto para evitar falsos positivos.

Exemplo:

F1:
> desconto termina em abril.

F2:
> fatura de abril aumentou €10.

Resultado:

> aumento esperado de acordo com a data de fim da promoção.

Não criar finding “aumento inexplicado”.

Outro exemplo:

F1:
> promoção termina em dezembro.

F2:
> preço aumenta em outubro.

Criar:

> aumento não explicado pelos dados contratuais disponíveis.

Não chamar automaticamente “aumento sem aviso”.

---

## 14. Integração F1 → F4

F1 fornece:

- início/fim;
- mensalidade;
- vantagem;
- tipo de fidelização;
- cláusula;
- dados necessários ao cálculo.

F4 devolve:

- custo de saída hoje;
- datas relevantes;
- divergência face ao valor indicado pelo operador.

---

## 15. Portal

Exemplo:

### Vodafone
**Contrato monitorizado**

- Mensalidade: €42,99
- Promoção termina: 30/11/2026
- Fidelização termina: 28/02/2027
- Custo de saída hoje: ~€74

**Próxima data relevante:** promoção termina em 59 dias.

Ações:

- Ver contrato
- Ver faturas
- Quanto custa cancelar?
- Tratar o meu caso

---

## 16. Casos-limite

- duas faturas do mesmo fornecedor com referências diferentes;
- mudança de tarifário;
- refidelização;
- cliente muda de fornecedor;
- fim da fidelização mas contrato continua ativo;
- promoção sem data explícita;
- preços variáveis;
- documentos contraditórios;
- CPE/CUI repetido em documentos diferentes;
- contrato conjunto eletricidade + gás.

---

## 17. Revisão humana

Não exigir revisão humana para o simples cálculo de uma data confirmada.

Exigir quando:

- há conflito entre documentos;
- campo crítico tem baixa confiança;
- o resultado vai sustentar uma conclusão sensível;
- há cláusula não estruturada que afeta F4.

---

## 18. Auditoria

Registar:

- documento;
- extração;
- confirmação do cliente;
- alterações;
- regra usada;
- alerta gerado;
- alerta enviado;
- desativação.

---

## 19. Métricas

- contratos criados;
- % criados apenas com fatura;
- % confirmados pelo cliente;
- campos corrigidos;
- alertas enviados;
- CTR para F4;
- CTR para “Tratar o meu caso”;
- casos pagos originados por F1;
- churn de clientes com F1 ativo vs. sem F1.

---

## 20. Critérios de aceitação

- [ ] Uma fatura pode criar contrato parcial.
- [ ] O mesmo contrato não é duplicado ao carregar novo documento.
- [ ] Campos críticos têm proveniência.
- [ ] Cliente pode corrigir dados.
- [ ] Datas são calculadas por código.
- [ ] F1 fornece contexto ao F2.
- [ ] F1 fornece inputs ao F4.
- [ ] Alertas são idempotentes.
- [ ] Texto é PT-PT clássico.
- [ ] Alertas descrevem factos e não aconselhamento jurídico.
