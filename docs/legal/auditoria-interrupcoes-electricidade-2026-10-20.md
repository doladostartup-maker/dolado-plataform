# Auditoria — Interrupções de electricidade e compensações (20 de Outubro de 2026)

Origem: Radar DoLado (15/10/2026), P1, sector Energia — Electricidade.
Ponto de partida: a ERSE divulgou, a 14/10/2026, o relatório da qualidade de serviço técnica de 2025 (rede de distribuição: 111 182 incumprimentos dos padrões individuais, mais 53% do que em 2024; cerca de 2,1 milhões de euros em compensações, o dobro). **Estas estatísticas não mudam direitos individuais**: serviram só de motivo para auditar como a DoLado identifica e trata as reclamações por interrupções.

Migrations (aplicadas em produção a 20/10/2026 com `supabase db push --linked`, depois do `--dry-run`):

- `20261020100000_energia_continuidade_servico.sql` — 4 regras do RQS;
- `20261020110000_ativar_continuidade_corrigir_104.sql` — activação das 4 regras e correcção da `ENE_QUALIDADE_COMPENSACAO_104` (aprovadas por Thiago a 20/10/2026);
- `20261020120000_energia_danos_responsabilidade_civil.sql` — 2 regras do Código Civil sobre danos, **inactivas, por rever**.

## Fontes verificadas

| Fonte | Versão lida | Uso |
|---|---|---|
| Regulamento da Qualidade de Serviço dos sectores eléctrico e do gás (RQS) — Regulamento n.º 826/2023, consolidado pela ERSE | Janeiro de 2026 (com a Directiva n.º 21/2024 e o Regulamento n.º 8/2026) — [PDF oficial](https://www.erse.pt/media/sxlhtvlp/rqs_regulamento-da-qualidade-de-servi%C3%A7o_consolidado-2026.pdf) | arts. 2.º, n.º 2, als. aa) e bb); 7.º a 10.º; 12.º; 13.º; 16.º; 23.º; 24.º; 45.º; 46.º; 60.º; 61.º; 66.º; 82.º a 84.º; 102.º a 106.º; 110.º; Anexo I |
| Destaque da ERSE de 14/10/2026 | [página oficial](https://www.erse.pt/comunicacao/destaques/erse-divulga-relatorio-relativo-ao-desempenho-tecnico-dos-operadores-das-redes-eletricas-em-2025/) | estatísticas; classificação do apagão ibérico de 28/04/2025 como evento excepcional |
| Código Civil (DL n.º 47344/66), versão consolidada (90.ª versão, Lei n.º 29/2026) publicada pela [PGDL](https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=775&tabela=leis) | lida a 20/10/2026 | arts. 483.º, 509.º, 510.º, 798.º, 799.º |
| Base jurídica da DoLado em produção (`regras_juridicas`) | leitura só SELECT a 20/10/2026 | regras de Energia e Gás das categorias Qualidade de serviço, Reclamação e Suspensão |

## A. Diagnóstico jurídico

### Regime confirmado (RQS)

- **O que é uma interrupção** (art. 12.º): ausência de fornecimento num ponto de entrega. Breve = de 1 s a 3 min; longa = mais de 3 min (art. 2.º, n.º 2, als. aa) e bb)). Interrupções sucessivas relacionadas, com continuidade de 10 min ou menos entre elas, contam como uma.
- **Classificação** (art. 13.º): *previstas* — clientes informados com a antecedência regulamentar (razões de serviço ou de interesse público: divulgação com pelo menos 36 h; acordo com o cliente; facto imputável ao cliente; outras redes); *acidentais* — as restantes (segurança, casos fortuitos, força maior, causas próprias — fenómenos atmosféricos, acções naturais, origem interna, outras). Uma interrupção por razões de serviço sem o aviso exigido é acidental.
- **Indicadores e padrões individuais** (arts. 23.º e 24.º): por ano civil e por ponto de entrega, número e duração total. Os padrões aplicam-se **só a interrupções acidentais longas**, excluindo as de **eventos excepcionais** aprovados pela ERSE (art. 8.º: só depois de aprovação, sem deferimento tácito). Em Portugal continental, baixa tensão (Anexo I, I.C): zona A 10 interrupções / 6 h; zona B 11 / 9 h; zona C 15 / 14 h. Açores e Madeira têm padrões próprios.
- **Força maior no sector eléctrico**: não é, por si, exclusão; só o **evento excepcional** classificado pela ERSE afasta a compensação (art. 110.º, n.º 1, al. a); a força maior é exclusão só no gás, al. b)). Um "incidente de grande impacto" (art. 16.º) também não é, por si, excepcional.
- **Compensação** (arts. 24.º, n.º 5, 102.º e 106.º): automática, sem pedido. Calculada pelo operador de rede (número ou duração acima do padrão; na duração, com a potência contratada; paga-se a mais elevada se forem ultrapassados os dois; limite de 200% do valor pago pela tarifa de uso das redes no ano). O operador credita ao comercializador **até 12 de Março do ano seguinte** (ou até 70 dias após a última decisão da ERSE sobre eventos excepcionais desse ano); o comercializador credita ao cliente **na 1.ª factura emitida depois de 30 dias** sobre a recepção. Montantes inferiores a 0,50 € não são creditados individualmente (art. 110.º, n.º 4). Inexigível ao fim de 5 anos (art. 110.º, n.º 6).
- **Quem responde perante o cliente** (art. 9.º): o comercializador, sem prejuízo da responsabilidade do operador de rede e do direito de regresso.
- **Indemnização por danos** (art. 10.º): o RQS e as compensações não prejudicam a responsabilidade civil. Compensação regulamentar ≠ indemnização (esta exige prova do dano, valor e nexo).
- **Avaria comunicada** (arts. 82.º a 84.º): se o operador decidir deslocar-se, 4 h (2 h para prioritários); BTN não prioritário: comunicação entre 0h e 8h conta a partir das 8h. Atraso → compensação ao cliente; avaria na instalação do cliente → compensação ao operador.
- **Informação** (art. 45.º): o operador informa, quando solicitado, as causas da interrupção e a hora prevista de restabelecimento (n.º 3), e a informação sobre indicadores, padrões e compensações (n.os 1, al. e), e 2).

### Regras existentes

| Código | Estado | Observação |
|---|---|---|
| `ENE_QUALIDADE_COMPENSACAO_104` | Correcta, mas **incompleta como único fundamento** | É da qualidade de serviço **comercial** (art. 104.º: 45 dias). Era a única regra de "Qualidade de serviço" de Energia — risco de a IA aplicar o prazo de 45 dias às interrupções. Corrigida (secção C). |
| `ENE_RECLAMACAO_PRAZO_60`, `ENE_RECLAMACAO_COMPENSACAO_61` | Conformes | Prazos e compensação por falta de resposta à reclamação. |
| `ENE_RECLAM_FAT_SUSPENDE_CORTE_64` | Conforme | Só faturação. |
| `ENE_CORTE_PREAVISO_79`, `ENE_CORTE_PRESCRICAO_78`, `ENE_CORTE_VULNERAVEL_30D_79`, `ENE_ELEC_REDUCAO_ANTES_CORTE_78`, `ENE_CAUCAO_CONSUMIDOR_23` | Conformes | Corte por iniciativa do comercializador (falta de pagamento) — não são interrupções da rede. |
| `CONS_REPARACAO_DANOS_12` (Lei 24/96, art. 12.º; categoria "Danos") | Conforme | Só chega aos casos solares (a categoria "Danos" não está em "Corte ou falha de serviço"). Não alterado. |
| `GAS_*` do RQS (67.º, 60.º/61.º, 64.º, 90.º) | Fora do âmbito | Gás natural. |

### Lacunas identificadas

1. **Nenhuma regra sobre a continuidade de serviço** (padrões individuais, classificação das interrupções, eventos excepcionais, pagamento automático, prazos).
2. Nenhuma regra a distinguir compensação regulamentar de indemnização por danos em Energia.
3. Nenhuma regra sobre a assistência técnica após avaria (prazo de chegada) nem sobre o direito à informação da causa.
4. O tipo "Corte ou falha de serviço" junta duas situações juridicamente diferentes (corte por falta de pagamento × falha do fornecimento). Com o limite de 12 regras por pedido, acrescentar regras de continuidade tiraria o lugar às de corte.
5. Prompt: não distinguia compensação de indemnização nem dizia o que fazer quando o direito depende de dados que só o operador tem.

### Riscos

- Prometer uma compensação a quem teve uma só interrupção longa, ou uma interrupção avisada, ou o apagão de 28/04/2025 (evento excepcional).
- Aplicar o prazo de 45 dias do art. 104.º às interrupções.
- Pedir ao cliente provas que só o operador tem (zona, classificação, indicadores).
- Confundir compensação com indemnização, ou concluir responsabilidade por danos.

## B. Diagnóstico funcional

- **Triagem:** Energia → "Corte ou falha de serviço" → categorias Suspensão, Qualidade de serviço + Reclamação/Resolução/Prática comercial/Defesa do consumidor. Hoje chegavam 12 regras: 5 de corte, a 104.º, 3 de reclamação e 3 gerais — nenhuma de continuidade.
- **Simulador de Elegibilidade:** só regras de âmbito (sector, contrato pessoal, o que aconteceu, já reclamou) — não promete direitos. Conforme; sem alterações.
- **Formulário:** só descrição livre (500 caracteres). Não havia orientação sobre o que interessa numa falha de luz.
- **Melhorias realizadas:**
  - 4 regras novas (inactivas, por rever) — secção C.
  - Limite próprio de **18 regras** (como o perfil de Autoconsumo) para Energia + "Corte ou falha de serviço" (`limiteRegras`, `src/lib/rascunhoIA/regras.ts`): as 12 de antes continuam a ser enviadas, pela mesma ordem, e as de continuidade entram a seguir. Os restantes sectores e tipos ficam exactamente iguais (teste).
  - Prompt `reclamacao_v5` / `nova_comunicacao_v5` (`src/lib/rascunhoIA/prompt.ts`), para todos os sectores: compensação regulamentar ≠ indemnização (pedidos separados); direito que depende de dados da empresa/operador → pedido de esclarecimento em `missing_information`, nunca afirmar o direito.
  - Ajuda no formulário `/tratar-caso` (pt-PT e en-GB), só em Energia + "Corte ou falha de serviço": o que convém indicar (quando, quanto tempo, quantas vezes, se foi avisado, compensação na factura, danos), "se não souber, não faz mal". Sem campos novos, sem dados novos guardados, nada obrigatório.
- **Não feito, de propósito:** perguntas estruturadas novas (`detalhes_caso`). Os elementos decisivos (zona, classificação, indicadores anuais) são do operador; as perguntas úteis cabem na descrição e a análise humana pede o resto. Evita mexer no schema, na validação `detalhes_caso_valido()` e no backoffice.
- **Impacto para o consumidor:** a sugestão da IA passa a pedir esclarecimento e o crédito em falta em vez de afirmar um direito, separa a indemnização e não confunde o corte por dívida com a falha da rede.

## C. Base jurídica

### Regras criadas

Continuidade de serviço (RQS) — **activas desde 20/10/2026** (revistas por Thiago Pereira):

| Código | Artigos | Conteúdo |
|---|---|---|
| `ENE_CONTINUIDADE_PADROES_24` | 12.º, 13.º, 23.º, 24.º; 2.º, n.º 2, aa)/bb); Anexo I | O que conta (acidentais longas), o que não conta (breves, previstas com aviso, facto imputável ao cliente, eventos excepcionais), padrões BT do continente, contagem anual, apagão de 28/04/2025, pedido de esclarecimento. |
| `ENE_CONTINUIDADE_PAGAMENTO_106` | 9.º, 102.º, 106.º, 110.º, n.os 1, 4 e 6 | Cálculo pelo operador, crédito automático (12 de Março + 1.ª factura após 30 dias), < 0,50 €, exclusões, 5 anos; compensação já creditada / não creditada; ≠ art. 104.º. |
| `ENE_CONTINUIDADE_RESP_CIVIL_10` | 10.º; 9.º, n.os 1 e 3 | Compensação ≠ indemnização; só com dano concreto; prova; sem concluir responsabilidade. |
| `ENE_ASSISTENCIA_AVARIA_83` | 82.º a 84.º; 45.º, n.º 3 | Prazo de chegada após avaria (4 h / 2 h; 0h–8h), compensação, avaria na instalação do cliente, informação da causa e da hora de restabelecimento. |

Danos em aparelhos e outros bens (Código Civil) — **inactivas, por rever**:

| Código | Artigos | Conteúdo |
|---|---|---|
| `ENE_DANOS_INSTALACAO_CC_509` | 509.º e 510.º | Responsabilidade, independente de culpa, de quem dirige a instalação de condução ou entrega (a rede de distribuição é explorada pelo operador de rede): excepções (regras técnicas e conservação; força maior = causa exterior), exclusão dos danos causados por utensílios de uso de energia (n.º 3), limites do art. 510.º; força maior ≠ evento excepcional do RQS. |
| `ENE_DANOS_CULPA_CC_798` | 798.º, 799.º; 483.º | Responsabilidade contratual (presunção de culpa só no contrato, em regra com o comercializador) e por facto ilícito; ≠ compensação regulamentar. |

### Regras modificadas

- `ENE_QUALIDADE_COMPENSACAO_104` — título "Compensações de qualidade de serviço **comercial** devem ser creditadas sem pedido"; subcategoria "Compensação automática — serviço comercial"; condições com exemplos da qualidade comercial e "Não aplicar às compensações por incumprimento dos padrões individuais de continuidade de serviço (interrupções do fornecimento), que seguem o artigo 106.º e prazos próprios (ver ENE_CONTINUIDADE_PAGAMENTO_106)". Resumo, diploma e artigo inalterados. Nova data de revisão (20/10/2026, Thiago Pereira) na mesma alteração, para continuar activa.

### Questões pendentes de validação (Thiago / advogada)

1. ~~`ENE_QUALIDADE_COMPENSACAO_104`~~ — corrigida a 20/10/2026 (ver "Regras modificadas").
2. ~~Rever e activar as 4 regras~~ — activadas a 20/10/2026. Pontos que ficam para confirmação da advogada:
   - Art. 13.º, n.º 3, als. e) e f), remete para o "artigo 8.º" nos casos fortuitos e de força maior, que estão definidos no art. 7.º (provável remissão desactualizada no consolidado). A regra não depende disto: diz que, na electricidade, só o evento excepcional afasta a compensação (arts. 24.º, n.º 2, e 110.º, n.º 1, al. a)).
   - Se o art. 45.º obriga o operador a comunicar ao cliente os **valores** dos indicadores individuais da sua instalação (a regra só diz "pedir esclarecimento", não afirma esse direito).
   - Menção ao apagão de 28/04/2025 nas condições (facto divulgado pela ERSE; manter ou retirar).
   - Interrupções de 2025 com pedido de evento excepcional ainda pendente: o prazo de crédito é 70 dias após a última decisão da ERSE.
3. **Danos em aparelhos** — carregadas `ENE_DANOS_INSTALACAO_CC_509` e `ENE_DANOS_CULPA_CC_798` (inactivas). Antes de activar, confirmar: o alcance do art. 509.º, n.º 3 (danos *causados por* utensílios ≠ danos *sofridos* pelos aparelhos); a quem dirigir o pedido (operador de rede pelo art. 509.º; comercializador pelo contrato, incluindo os actos de auxiliares do art. 800.º); os limites do art. 510.º (remetem para o art. 508.º, n.º 1). Ficou de fora o regime da responsabilidade do produtor (DL n.º 383/89): não confirmei se a electricidade é "produto" no direito português.
4. **Qualidade da tensão** (art. 66.º — reclamações sobre a qualidade da energia, com compensação pelo art. 61.º, n.º 1, al. d)): não carregada nesta auditoria (fora do âmbito "interrupções"); candidata a uma próxima carga, a par da `GAS_RECLAM_CARACTERISTICAS_RQS_67`.

## D. Impacto nas páginas de problemas e no conteúdo público

Pesquisa feita nas rotas e componentes existentes (`src/lib/problemas/catalogo.ts`, `src/i18n/mensagens/{pt-PT,en-GB}/*.ts`, `src/components/**`, `src/app/[idioma]/**`, `src/lib/elegibilidade/`): termos falta de luz, corte, interrupção, apagão, compensação, indemnização, *outage*, *power cut*.

| Página | URL | Conteúdo analisado | Estado | Alterações efectuadas | Pendentes | SEO |
|---|---|---|---|---|---|---|
| Categoria Energia | `/problemas/energia` (+ `/en/…`) | Título, intro, exemplos, metadata | **Sem conteúdo relacionado** (só facturas, leituras, cobranças) | Nenhuma | — | Sem impacto |
| Factura muito alta | `/problemas/energia/fatura-muito-alta` | Texto e FAQ | Sem conteúdo relacionado | Nenhuma | — | — |
| Cobrança indevida (Energia) | `/problemas/energia/cobranca-indevida` | Texto e FAQ | Sem conteúdo relacionado | Nenhuma | — | — |
| Consumos estimados | `/problemas/energia/consumos-estimados` | Texto e FAQ | Sem conteúdo relacionado | Nenhuma | — | — |
| Índice de problemas | `/problemas` | Cartões de Gás e Água com "Corte de fornecimento" | Conforme (exemplo genérico, sem promessas) | Nenhuma | — | — |
| Serviço não funciona (Telecom) | `/problemas/telecomunicacoes/servico-nao-funciona` | Falhas de internet/rede | Conforme (sector diferente; o RQS não se aplica) | Nenhuma | — | — |
| Simulador de Elegibilidade | `/simulador-elegibilidade` | Perguntas e resultados | Conforme (só âmbito, sem direitos) | Nenhuma | — | — |
| Ajuda, Mudança de Casa, Calculadora | `/perguntas-frequentes`, `/mudanca-de-casa`, `/calculadora-cancelamento` | Textos | Sem conteúdo sobre interrupções | Nenhuma | — | — |
| Formulário "Tratar o meu caso" | `portal.dolado.pt/tratar-caso` (noindex) | Passo 2 | Actualização necessária (orientação em falta) | Ajuda contextual pt-PT/en-GB (secção B) | — | Sem impacto (página não indexada) |

**Recomendação de página nova (não criada):** `/problemas/energia/falta-de-luz` ("Falhas de electricidade e compensações"), com `problemaCaso: "Corte ou falha de serviço"`. Fundamento: o tema está na agenda (relatório da ERSE, 2,1 M€ pagos) e há muita confusão entre interrupção avisada, apagão de Abril de 2025, compensação automática e indemnização por aparelhos estragados. Conteúdo prudente: a compensação é automática e anual e aparece na factura; nem todas as interrupções contam (curtas, avisadas, eventos excepcionais); os danos são um pedido à parte e exigem prova; o que guardar (datas, horas, avisos, facturas, fotografias, orçamentos). Sem números de artigos (regra das páginas de problemas), sem marcas, sem promessas. Recomenda-se esperar pela activação das regras novas, para a página e a IA dizerem o mesmo.

## E. Testes

| Teste | Resultado |
|---|---|
| `src/lib/rascunhoIA/continuidadeEnergia.test.mjs` (novo, 27 testes: regras inactivas e sem duplicados; texto sem conclusões e em ortografia tradicional; cenários — interrupção curta, repetidas, duração acumulada, evento excepcional, programada, imputável ao cliente, compensação devida e não creditada, já recebida, danos materiais, informação insuficiente; ≠ art. 104.º; selecção; limite só em Energia + Corte; outros sectores inalterados; validação aceita o RQS enviado e recusa regra/diploma não enviados; danos do Código Civil; migration de activação e da 104.º) | Passa |
| `src/lib/rascunhoIA/autoconsumo.test.mjs` (não regressão actualizada: Energia + Corte mantém as 12 regras anteriores como prefixo) | Passa |
| `supabase/tests/database/energia_continuidade_servico.test.sql` (4 regras activas e revistas a 20/10/2026; alterar sem nova revisão desactiva; 2 de danos inactivas; activação sem revisão recusada) | Passa (`supabase test db`: 31 ficheiros, 1461 testes, base local recriada das migrations) |
| `npm test` (1311 testes, incluindo norma linguística e i18n) | Passa |
| `tsc --noEmit`, ESLint dos ficheiros alterados | Sem erros |

**Falha encontrada e corrigida:** a primeira versão do teste afirmava que não havia regras com "INTERRUP" no código — há `AGUA_INTERRUPCAO_*` (sector da água); o teste passou a olhar só para Energia.

**Riscos remanescentes:** a IA continua dependente da revisão humana (as regras novas só chegam depois de activadas); a geração real com a Claude API não foi corrida (sem chamadas à API nos testes); entre a aplicação das migrations e o deploy, o código em produção ainda usa o limite de 12 em Energia + Corte (entram as regras de continuidade e saem `SPE_PREAVISO_CORTE_20D` e três regras gerais, até ao merge); os padrões do Anexo I são actualizados pela ERSE — rever as regras a cada consolidação do RQS.

## F. Conclusão

**Validado neste trabalho:** o regime do RQS (fonte oficial consolidada de 2026) e a sua tradução em 4 regras factuais; a selecção (as regras chegam só a Energia + "Corte ou falha de serviço", sem perder as de corte por dívida); o prompt e a validação; a ajuda no formulário; o conteúdo público (sem afirmações incorrectas).

**Depende de revisão jurídica humana:** a activação das 2 regras de danos do Código Civil (pendente 3), a confirmação dos pontos do pendente 2 pela advogada e a qualidade da tensão (pendente 4).

Com as 4 regras activas (20/10/2026) e o deploy deste trabalho (limite de 18 e prompt v5), a DoLado fica preparada para distinguir interrupções que podem gerar compensação, as que não contam, a compensação que devia ter sido creditada e o pedido de esclarecimento. A indemnização por danos fica separada da compensação; o fundamento civil concreto (Código Civil) só chega à IA depois de activadas as 2 regras de danos.
