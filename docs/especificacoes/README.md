# DoLado — Especificações F1/F2/F3/F4

Este pacote contém a proposta de produto e arquitetura para transformar F1 + F2 + F4 num único **Monitor de Proteção DoLado**.

## Ficheiros

- `F_MONITOR_PROTECAO_INTEGRACAO.md` — visão e arquitetura transversal
- `F1_MONITOR_CONTRATO.md` — Monitor do Contrato
- `F2_MONITOR_FATURAS.md` — Monitor de Faturas
- `F3_MUDANCA_CASA_PUBLICA.md` — página pública e estática de mudança de casa
- `F4_MONITOR_CUSTO_SAIDA.md` — calculadora pública + monitor privado
- `CLAUDE_API_MONITORIZACAO.md` — uso da Claude API, modelo, custos e segurança

## Ordem recomendada de leitura

1. `F_MONITOR_PROTECAO_INTEGRACAO.md`
2. `F1_MONITOR_CONTRATO.md`
3. `F2_MONITOR_FATURAS.md`
4. `F4_MONITOR_CUSTO_SAIDA.md`
5. `CLAUDE_API_MONITORIZACAO.md`
6. `F3_MUDANCA_CASA_PUBLICA.md`

## Princípio central

> **IA lê e estrutura. Código calcula e aplica regras objetivas. Humano revê exceções.**

## Decisão de produto mais importante

Uma **fatura deve ser suficiente para começar**.

O cliente não deve ser obrigado a introduzir manualmente todo o contrato antes de sentir valor.

A partir da primeira fatura, a DoLado pode criar um contrato parcial, começar a acompanhar o histórico e pedir dados adicionais apenas quando forem realmente necessários.
