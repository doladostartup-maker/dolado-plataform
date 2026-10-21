# Monitor de Protecção — Electricidade e Gás, Fase 1 (21/10/2026)

Objectivo: com duas facturas comparáveis de electricidade ou gás, a DoLado explica ao cliente **porque mudou o valor**, separando consumo, preço e outros factores, **sem conclusões jurídicas não demonstradas**.

Auditoria jurídica e pendências: `docs/legal/auditoria-monitor-energia-2026-10-21.md`.

## 1. Diagnóstico do Monitor antes desta fase

| Área | Estado encontrado (confirmado no código) |
| --- | --- |
| Extracção | Uma chamada por documento (`fatura_v3`). Para energia, só total, linhas genéricas e uma "mensalidade" (total recorrente sem consumos). Sem potência, kWh, preços unitários, leituras, acertos nem impostos separados. O CPE/CUI vinha como "número do serviço" e ficava **em claro** em `servicos_identificadores` e em `extracoes_documento`. |
| Dados | `faturas_monitor` com linhas em jsonb; nada específico de energia. |
| Comparação | `compararFatura` (acomp_v1) pensada para telecomunicações: tudo gira em torno da "mensalidade". Aplicada às facturas de energia, uma subida do consumo aparecia como "mensalidade alterada" ou "consumo adicional" — falsos alertas, e uma subida do preço por kWh com consumo menor passava despercebida. |
| Alertas | Datas de fidelização/promoção servem todos os sectores (avisos a 60/30/0 dias). O custo de saída (F4) é só telecomunicações e **não** se aplica a energia (correcto). |
| Portal / resumo | "O que verificámos" falava de mensalidade; o resumo mensal não tinha nada próprio de energia. |
| Segurança | RLS, escrita só por `service_role`, revisão humana dos eventos "atencao" (achados), pseudónimos HMAC do NIF/titular — tudo reutilizável. |
| Limite técnico | A gramática dos structured outputs tem limite de tamanho (a API recusou um schema com 79 propriedades; teste em `monitor.test.mjs`, limite prudente 60). |

## 2. O que foi reutilizado

- Pipeline de processamento, associação por identificadores, `extracoes_documento` (idempotência por modelo/schema/prompt), `faturas_monitor`, `eventos_servico`, `achados_monitor` com revisão humana e "comunicado", `monitor_eventos_substituir()` (reanálise sem apagar), RLS.
- Avisos de fim de fidelização/promoção (já cobriam energia).
- Descontos que desaparecem → os tipos de sempre (`promocao_em_falta`, `promocao_alterada`, `promocao_terminada`), com as frases e as situações de sempre.
- Situações comunicadas no portal (`SituacaoEncontrada`) com "Tratar este problema".

## 3. O que foi construído (Fase 1)

### Leitura (`fatura_v4`, atrás de `MONITOR_ENERGIA_ATIVO=1`)

- `src/lib/monitor/energia.ts`: bloco "energia" como **lista de campos** (`{fornecimento, campo, periodo, descricao, valor}`) — 5 propriedades em vez de ~30, para caber no limite da gramática (59 ≤ 60). `agruparCamposEnergia()` reconstrói um fornecimento por tipo (factura conjunta = dois).
- Campos: CPE/CUI, período, dias, potência (kVA), opção horária, tipo de tarifário (fixo/indexado/dinâmico), tipo de leitura (real/estimada/mista), consumo kWh (sem kWh de acertos), m³ + factor de conversão + escalão (gás), termo fixo/potência por dia e no período, linhas de energia por período horário (kWh, €/kWh, valor), energia total, redes em linha própria, impostos, descontos, acertos (+ período e kWh), serviços adicionais, total.
- Unidades inteiras: cêntimos; preços em µ€ (0,1658 €/kWh = 165 800).
- Reconciliação por fornecimento (tolerância 10 cêntimos); avisos de incoerências (dias, consumo ≠ soma das parcelas, preços impossíveis).
- **Interruptor:** sem `MONITOR_ENERGIA_ATIVO=1`, a leitura continua a ser a `fatura_v3` (prompt e schema exactamente os de antes). Motivo: o schema maior tem de ser confirmado numa chamada real; se a API o recusasse, falhariam **todas** as leituras de facturas (também telecomunicações).
- `PARAMETROS_EXTRACAO.max_tokens` 4096 → 8192 (só limite; não aumenta custo por si).

### Comparação (`src/lib/monitor/comparacaoEnergia.ts`, regra `energia_v1`)

- Compara cada fornecimento só com o mesmo fornecimento (tipo e, se conhecido, CPE/CUI) da factura anterior **sem sobreposição de período** (uma factura de acerto que volta a cobrir dias antigos não é comparada).
- Decomposição exacta da diferença dos totais: consumo `(kWh₁ − kWh₀) × preço₀`; preço `kWh₁ × (preço₁ − preço₀)` por período horário (estruturas compatíveis) ou preço médio (estruturas diferentes, certeza média); dias × preço diário anterior; preço diário (ou potência, se mudou); redes; impostos; descontos; acertos; serviços. Reconciliação: até 10 cêntimos = arredondamento; acima, "não identificado" e explicação parcial — **nunca se inventa um valor**.
- Eventos (`eventos_servico`, com `confianca` alta/média/baixa):
  - informativos: `energia_variacao` (a decomposição), `energia_consumo_superior` (+20 % e +1 kWh/dia face ao mesmo período do ano anterior, se houver, ou à anterior), `energia_leitura_estimada`, `energia_preco_indexado`, `energia_dados_insuficientes`, descidas;
  - para revisão humana (achados): `energia_preco_alterado` (subida ≥ 0,001 €/kWh e ≥ 1 %, mesmo com o total a descer; nunca em tarifários indexados/dinâmicos), `energia_termo_fixo_alterado`, `energia_potencia_alterada` (subida), `energia_tarifario_alterado`, `energia_acerto` relevante (≥ 20 € ou ≥ 30 % do total → achado `energia_acerto_relevante`), `energia_servico_adicional` (novo ou mais caro), `promocao_em_falta`/`promocao_alterada`.
- `compararFaturaServico()` (acompanhamento.ts) encaminha: energia com fornecimentos → regras novas; tudo o resto (telecomunicações, água, energia lida antes da v4) → `compararFatura` sem alterações (teste de regressão: resultado idêntico).
- Frases (`frasesEnergia.ts`, dicionário `monitorEnergia` pt-PT/en-GB): facto + diferença em euros + o que o cliente pode confirmar; nunca "indevido", "incumprimento" nem conclusões sobre a lei (teste).

### CPE e CUI

Só como pseudónimo HMAC (chave `MONITOR_IDENTIFICADORES_CHAVE`, prefixo `local:`), com a apresentação "terminado em 78AB", na leitura gravada, nos identificadores e na factura. Também quando o CPE vem como "número do serviço". Valores antigos guardados em claro coincidem com os novos: são convertidos no momento da comparação (`identidadesServicos`). Sem chave, o CPE é descartado (falha fechada).

### Portal e resumo mensal

- Página do serviço: cartão **"Porque mudou o valor"** (quanto pagou, factura anterior, diferença, quanto veio do consumo, quanto dos preços e outros valores, linhas por componente, consumo médio por dia, dias, estimativas, arredondamentos, grau de certeza e **próximo passo**).
- Enquanto a factura tem uma situação por rever (`em_verificacao`), mostram-se só os totais e "A DoLado está a verificar…": a decomposição revelaria antes da revisão o facto que está a ser verificado. O mesmo no histórico e no resumo mensal.
- "O que verificámos" em energia: última factura, consumo médio por dia, preço da energia, potência (sem "mensalidade").
- Resumo mensal `resumo_v5`: secção "Porque mudou o valor das suas facturas" (e-mail HTML, texto e portal).
- Backoffice: rótulos dos achados novos em `src/lib/monitor/achados.ts` (a revisão usa o ecrã de sempre).

### Base de dados

Migration `20261026090000_monitor_energia.sql`: `faturas_monitor.energia` (jsonb, lista ≤ 4, `[]` por omissão) e os tipos novos nas restrições de `eventos_servico` e `achados_monitor`. Nada novo em RLS (tabelas existentes; o cliente só lê as próprias facturas).

## 4. Testes

- `src/lib/monitor/energia.test.mjs` (41): consumo sem preço, preço sem consumo, consumo desce com preço a subir, dias diferentes, bi/tri-horária, simples → bi-horária, indexado, tarifário desconhecido, estimativa → acerto (sem duplicar consumos), factura rectificativa sobreposta, potência, termo fixo, factura conjunta, CPE diferente, fim de promoção (com e sem contrato), serviços adicionais, impostos em falta, totais que não reconciliam, arredondamentos, primeira factura, leitura em lista de campos, CPE pseudonimizado e compatível com valores antigos, interruptor, regressão das telecomunicações, frases sem conclusões jurídicas (pt e en).
- `src/lib/monitor/energia.contrato.test.mjs`: pipeline real contra a Supabase local (associação pelo CPE, `energia` gravada, eventos, achado, RLS do cliente, reanálise idempotente).
- `src/lib/resumoMensal/resumoMensal.test.mjs`: secção de energia, factura em verificação omitida, inglês.
- `supabase/tests/database/monitor_energia.test.sql`: coluna, restrições, eventos/achados, RLS, evento "atencao" só visível depois de comunicado.

## 5. Activação (Thiago)

1. ~~Migration `20261026090000` em produção~~ — aplicada a 21/10/2026 (`supabase db push --linked`).
2. Merge/deploy com `MONITOR_ENERGIA_ATIVO` **desligado**: nada muda para os clientes (leitura v3).
3. Confirmar o schema v4 numa chamada real: ligar `MONITOR_ENERGIA_ATIVO=1` e carregar **uma** factura de electricidade de teste (e uma de telecomunicações, para confirmar que a API aceita o schema também nesse caso). Se a leitura falhar com "grammar too large", desligar o interruptor (volta à v3 de imediato).
4. Medir o custo dos primeiros 10–15 documentos (regra 5 do "Uso de IA"): a resposta v4 é mais longa nas facturas de energia.
5. Facturas de energia já lidas (v3) não têm fornecimentos: ficam com a comparação antiga até serem lidas outra vez (nova chamada à API, com custo). Decidir se vale a pena reler as existentes.

## 6. Riscos e limitações conhecidos

- **Precisão da leitura não medida** (pendente desde 02/10/2026: dataset de avaliação). Preços com 4–6 casas e linhas por período são leituras exigentes; um preço mal lido gera um falso "preço subiu" — por isso essas situações passam sempre pela revisão humana.
- Limite da gramática: 59 propriedades, a uma do limite prudente. Qualquer campo novo no schema da factura exige outra abordagem (ex.: chamada separada para energia).
- Impostos: o efeito do consumo é calculado sem IVA; o IVA que acompanha o consumo aparece em "Impostos e taxas".
- Tarifas de acesso às redes: só se separam quando cobradas em linha própria; normalmente estão incluídas no preço por kWh, e uma alteração das tarifas reguladas aparece como "preço da energia" (as causas possíveis mencionam-no).
- Consumo comparado com o mesmo período do ano anterior só quando há essa factura; senão, com a anterior (o inverno sobe naturalmente — por isso é só informativo).
- Gás: o escalão e o factor de conversão são guardados mas ainda não alimentam regras próprias.
- CPE/CUI antigos continuam em claro na base de dados até serem regravados (convertidos só ao comparar). Uma limpeza única (script com a chave) fica por decidir.
