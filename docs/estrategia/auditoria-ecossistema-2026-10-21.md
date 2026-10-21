# Auditoria do ecossistema DoLado — ECO-01 a ECO-23

Data: 21 de Outubro de 2026. Documento de origem: [`ecossistema.md`](ecossistema.md).

Auditoria só de leitura: nenhuma funcionalidade implementada, nenhum dado de cliente alterado, nenhuma
mensagem enviada, nenhum pagamento processado. Não se reproduzem segredos nem dados pessoais — só nomes
de variáveis, contagens agregadas e nomes de tarefas agendadas.

## 1. Base da verificação

| Fonte | O que prova | Resultado a 21/10/2026 |
| --- | --- | --- |
| `origin/main` | Branch que alimenta produção (webhook GitHub → Clever Cloud) | Ponta `d982cd88` (merge do PR #166) |
| `clever activity` | Deploy efectivo | Deploy de `d982cd88` com estado `OK` (21/10/2026, 15:17) |
| GitHub Actions (`Testes`, em `main`) | `npm test`, testes de contrato, `supabase test db` | Últimas três execuções em `main` com `success` (PRs #164–#166) |
| `supabase migration list --linked` | Migrações aplicadas em produção | As 95 migrações do repositório aplicadas; nenhuma por aplicar |
| `cron.job` / `cron.job_run_details` (produção, leitura) | Agendamentos e execuções | 13 tarefas activas; todas as que já tiveram hora de correr têm execuções `succeeded` nos últimos 60 dias, sem falhas |
| `clever env` (só nomes e interruptores 0/1) | Configuração activa | Interruptores listados em cada ponto; valores secretos não lidos para o relatório |
| `vault.secrets` (só nomes) | Segredos das tarefas agendadas | `resumo_mensal_cron_secret`, `protecao_gratuita_cron_secret`, `lembretes_compra_cron_secret`, `novo_caso_webhook_secret` e os de alertas presentes |
| Contagens agregadas em produção (só `count`) | Uso observado | Ver cada ponto. O volume real é muito baixo (2 contas com Protecção, 1 caso, 2 pedidos) |

**Limite importante:** `cron.job_run_details` regista que o pedido HTTP foi feito pela base de dados,
não a resposta da rota chamada. As respostas (`net._http_response`) só são guardadas durante horas e não
foram consultadas. Não houve acesso aos painéis da Stripe, Brevo, Resend, Cookiebot nem Crisp.

Interruptores activos na Clever Cloud (`=1`): `ACESSOS_PATROCINADOS_ATIVO`, `ANALISE_RESPOSTA_IA_ATIVO`,
`AREA_PARCEIRO_ATIVA`, `CRISP_ATIVO`, `GUIA_FACTURAS_ATIVO`, `INDICACOES_ATIVO`, `MONITOR_ENERGIA_ATIVO`,
`ORIGEM_AQUISICAO_ATIVO`, `PARCEIROS_ATIVO`, `PROTECAO_GRATUITA_ATIVA`, `RASCUNHO_IA_ATIVO`.

### Legenda dos estados

- **Confirmado em produção** — código publicado, migrações aplicadas, configuração activa e funcionamento observado (dados ou execuções).
- **Implementado, produção não confirmada** — código publicado e migrações aplicadas, mas sem uso observado em produção.
- **Parcial** — parte existe; o que falta está descrito.
- **Não implementado** — só depois de pesquisa documentada.
- **Não verificável** — falta de acesso.
- **Não aplicável** — com justificação.

## 2. Matriz

### ECO-01 — Fluxo de reclamação, pagamento e acesso ao portal
**Confirmado em produção.**
- Código: `src/lib/pedidoCaso.ts`, `src/app/[idioma]/tratar-caso/`, `confirmarCompra` em `src/app/actions/stripe.ts`, `src/lib/stripe/webhook.ts`, `converter_pedido_em_caso()`, gating em `src/lib/acesso.ts`.
- Migrações: `20261001220000_pedidos_caso_antes_do_pagamento.sql`, `20261001235000_creditos_avulso_disponiveis.sql` (aplicadas).
- Testes: `supabase/tests/database/pedidos_caso.test.sql`, `creditos_caso.test.sql`, `src/lib/stripe/webhook.test.mjs`, testes de contrato no CI.
- Produção: 2 pedidos, 1 caso criado a partir de pedido, 2 linhas em `user_access`; tarefa `lembretes-compra-sem-conta` com 437 execuções sem falha.

### ECO-02 — Revisão, autorização versionada e bloqueio de envio sem autorização
**Confirmado em produção** (autorização observada; envio ainda não observado).
- Código: `src/lib/textoCaso.ts`, `texto_registar_envio`, `texto_marcar_revisto()`, trigger `casos_textos_ia_integridade`.
- Migrações: `20261001180000_textos_caso_revisao_autorizacao.sql`, `20261005150000_rascunho_ia_reclamacao.sql` (aplicadas).
- Testes: `supabase/tests/database/textos_caso.test.sql`, `rascunho_ia.test.sql`, `src/lib/textoCaso.test.mjs`.
- Produção: 1 versão de texto de origem `ia`, revista e `autorizado`; 1 autorização registada; 0 envios registados.

### ECO-03 — Comprovativos, imutabilidade pós-envio, dossiê e exportação
**Parcial.**
- Existe: `casos_comprovativos` e bucket privado `comprovativos-casos` (`20261001190000_comprovativos_pos_envio.sql`), tabelas de prova só de inserção, dossiê PDF versionado com SHA-256 (`src/lib/dossie/`, `casos_dossies`), descarga por `/api/dossies/[id]`, retenção (`limpar-dossies-expirados-diario`, 13 execuções sem falha).
- Testes: `textos_caso.test.sql`, `encerramento_externo.test.sql`, `retencao_dossies.test.sql`, `src/lib/dossie/dossie.test.mjs`.
- Produção: 0 comprovativos, 0 dossiês — o percurso pós-envio nunca correu com um caso real.
- **Falta:** o dossiê só é gerado pelo admin (`gerarDossieDoCaso(casoId, adminId)`), no encerramento com encaminhamento externo ou por "Gerar nova versão". Não há exportação pelo próprio cliente do histórico de um caso nem dos dados do Monitor; a portabilidade faz-se a pedido por `privacidade@dolado.pt`.

### ECO-04 — Responsável, próxima acção, revisão e detecção de casos parados
**Parcial.**
- Existe: `proximaAcao()`, `prazosCaso()`, `prioridade()` e vistas "acção"/"espera" em `src/lib/backoffice/triagem.ts`; páginas `/backoffice/urgentes` e `/backoffice/revisao`; prazo da 1.ª resposta (2 dias úteis), prazo da resposta da empresa (indicado ou 15 dias úteis) e fim da fidelização.
- Responsável: **não aplicável** na operação actual — um único operador (Thiago); não há campo de responsável.
- **Falta (comprovado):** as esperas do lado do cliente — `Aguardando cliente`, `Aguardando decisão cliente` e texto à espera de autorização — não têm prazo nem alerta de envelhecimento em `prazosCaso()`; um caso pode ficar parado sem aparecer como vencido. Não existe data de revisão por caso.

### ECO-05 — Ligação entre contrato, documentos, facturas, alertas e casos
**Parcial.**
- Existe: serviço acompanhado ↔ documentos ↔ facturas ↔ eventos ↔ achados (`contratos_monitorizados`, `documentos_monitor`, `faturas_monitor`, `eventos_servico`, `achados_monitor`; `src/lib/monitor/acompanhamento.ts`, `identificacao.ts`); caso → Monitor pela factura do caso (`src/lib/monitor/faturaDoCaso.ts`, `20261006160000_monitor_fatura_do_caso.sql`); o rascunho da IA usa os serviços do Monitor da mesma empresa (`servicosDoCaso`).
- **Falta (comprovado):** Monitor → caso só passa `setor`, `problema` e `origem=/portal/contratos` (`hrefTratarSituacao`, `ResultadoProtecao.tsx`). A empresa não é pré-preenchida, nem o caso guarda o serviço ou o achado que o originou (sem coluna em `pedidos_caso`/`casos`); a evidência do achado não chega ao backoffice do caso.

### ECO-06 — Acções a partir dos alertas, com contexto e modalidade respeitados
**Parcial.**
- Existe: situação comunicada → "Tratar este problema" → `/tratar-caso` (modalidade, pagamento e casos disponíveis pelo fluxo de sempre, logo respeitados).
- Produção: 0 envios de alertas de datas e 0 achados até hoje; `verificar-monitor-datas-diario` com 19 execuções sem falha.
- **Falta:** os e-mails de datas (`supabase/functions/_shared/emailAlertas.ts`) ligam só à página do serviço, com uma nota "pode pedir à DoLado"; não há acção directa a partir do alerta. O contexto em falta é o descrito em ECO-05.

### ECO-07 — Monitor de telecomunicações
**Implementado, produção não confirmada.**
- Código: leitura `fatura_v3`/`contrato_v4`, `compararFatura`, custo de saída (`src/lib/monitor/custoSaida.ts`), datas da fidelização, alertas 60/30/0 dias.
- Testes: `monitor.test.mjs` (cenários A–L), `acompanhamento.contrato.test.mjs`, `monitor_protecao.test.sql`, `monitor_datas_fidelizacao.test.sql`.
- Produção: 0 serviços de telecomunicações acompanhados.
- Lacuna conhecida: a precisão da extracção nunca foi medida (dataset de avaliação por fazer — ver ECO-22).

### ECO-08 — Monitor de electricidade
**Confirmado em produção (Fase 1, factual).**
- Código: `src/lib/monitor/energia.ts` (potência, períodos horários, tipo de leitura real/estimada, acertos, tarifário fixo/indexado/dinâmico), `comparacaoEnergia.ts` (`energia_v1`), cartão `ExplicacaoEnergia`.
- Migração `20261026090000_monitor_energia.sql` aplicada; `MONITOR_ENERGIA_ATIVO=1`.
- Produção: 2 serviços de electricidade; 1 factura com dados de energia v4 gravados — o schema foi aceite pela API.
- Fora desta fase (decisão documentada): fidelização, custo de saída e ofertas (Fase 2 jurídica — `docs/legal/auditoria-monitor-energia-2026-10-21.md`).

### ECO-09 — Monitor de gás
**Implementado, produção não confirmada.**
- Mesmo código de ECO-08, com componentes próprios: `consumo_m3`, `fator_conversao`, `escalao`, termo fixo, estimativas e acertos.
- Testes: `energia.test.mjs`, `energia.contrato.test.mjs`, `monitor_energia.test.sql`.
- Produção: nenhuma factura de gás observada.

### ECO-10 — Monitor de água
**Parcial.**
- Existe: leitura de facturas de água (`SETORES_FATURA` em `extracaoFatura.ts`) e comparação genérica com facturas anteriores (`compararFatura`: valores recorrentes, cobranças novas, possível duplicado).
- **Falta:** nenhuma decomposição própria da água (consumo em m³, escalões, saneamento e resíduos, estimativas e acertos), ao contrário da electricidade e do gás. Não há páginas públicas de problemas de água, apesar de 36 regras jurídicas activas no sector.

### ECO-11 — Promoções, fidelização, regras de saída e alertas por sector
**Parcial.**
- Telecomunicações: completo (datas, fim de promoção, custo de saída igual à Calculadora pública, `cessacao_divergente`).
- Alertas de datas (60/30/0 dias) funcionam para qualquer sector com datas registadas.
- **Falta:** custo de saída e regras de fidelização para electricidade e gás (Fase 2 dependente da advogada); água sem regras de saída. Regras ENE/GÁS de fidelização existem como base jurídica dos textos, não como cálculo no Monitor.

### ECO-12 — Onboarding da Protecção e valor visível no portal
**Confirmado em produção.**
- Código: `src/lib/protecaoGratuita.ts`, `/experimentar-protecao`, `/30-dias-gratis`, `src/lib/monitor/resultadoProtecao.ts` ("Verificámos" / "Continuamos atentos" / "Encontrámos algo").
- Produção: `PROTECAO_GRATUITA_ATIVA=1`; 1 período gratuito convertido em subscrição; tarefa `protecao-gratuita` com 74 execuções sem falha.

### ECO-13 — Resumo mensal
**Implementado; primeira execução agendada para 1 de Novembro de 2026.**
- Código: `src/lib/resumoMensal/`, `/api/internal/resumo-mensal`, portal `/portal/contratos/resumos`.
- Migração `20261008100000_resumo_mensal_protecao.sql` aplicada; tarefa `resumo-mensal-protecao` activa (`0 9 1-3 * *`) e a chamar a rota certa; segredo no Vault e na Clever Cloud.
- Produção: 0 resumos e 0 execuções — é esperado, porque a migração entrou a 08/10/2026, depois da janela de Outubro. **Não é uma falha.** Verificar a 1–3 de Novembro.

### ECO-14 — Encerramento, encaminhamento externo e dossiê
**Implementado, produção não confirmada** (para o encerramento com dossiê).
- Código: `caso_encerrar_encaminhamento_externo()`, `caso_bloquear_apos_encerramento()`, `src/lib/dossie/`, `src/lib/encerramentoExterno.ts`, secção "Encerramento" do backoffice.
- Migrações `20261007100000_…`, `20261008130000_retencao_dossies_pdf.sql` aplicadas.
- Produção: 1 caso `Encerrado sem resolução` (encerramento simples observado); 0 encerramentos com encaminhamento externo; 0 dossiês.

### ECO-15 — Aceitação, acompanhamento e retorno dos encaminhamentos
**Parcial.**
- Existe: decisão "encaminhar" (`caso_decidir_analise()`), 6 tipos activos em `tipos_encaminhamento` (nova comunicação, regulador, centro de arbitragem, julgado de paz, outro meio, encerramento), evento visível ao cliente, entidades RAL no portal.
- **Falta:** não se regista se o cliente seguiu o encaminhamento nem o resultado posterior (a DoLado não representa o cliente — o retorno só pode vir do cliente). Encaminhamento para apoio especializado: **não implementado** (ver ECO-19).

### ECO-16 — Indicações: atribuição, produtos elegíveis, descontos e não acumulação
**Implementado, produção não confirmada.**
- Código: `src/lib/indicacoes/` (`regras.ts`, `webhook.ts`, `servidor.ts`), `/r/<código>`, `escolherDescontoCheckout`.
- Migração `20261007090000_programa_indicacoes.sql` aplicada; `INDICACOES_ATIVO=1`; tarefas `indicacoes-expirar-recompensas` e `indicacoes-limpar-dados-expirados` com execuções sem falha.
- Testes: `regras.test.mjs`, `webhook.test.mjs`, `indicacoes.contrato.test.mjs`, `indicacoes.test.sql`.
- Produção: 0 indicações, 0 recompensas.

### ECO-17 — Parceiros remunerados: comissões, cancelamentos e pagamentos
**Implementado e configurado; sem parceiros activos.**
- Código: `src/lib/parceiros/` (`regras.ts`, `webhook.ts`, `servidor.ts`); estados `pendente → em_validacao/elegivel → aprovada → paga`, `cancelada`/`revertida`, transições validadas na base de dados, `parceiro_reverter_fatura()` para reembolso/disputa, pagamentos manuais em `parceiros_pagamentos`.
- Migração `20261021090000_programa_parceiros.sql` aplicada; `PARCEIROS_ATIVO=1`, `PARCEIROS_CHAVE` presente.
- Testes: `parceiros.test.mjs`, `programa_parceiros.test.sql`.
- Produção: 0 parceiros, 0 candidaturas, 0 comissões, 0 pagamentos, 0 pacotes. **O programa existe; não há parceiros comercialmente activos.**
- Regras de produto actuais: comissão na Protecção e no Caso + Protecção; o Avulso e o Caso Extra não dão comissão (decisão de Thiago, 21/10/2026); os pacotes do Parceiro de Distribuição são só de Protecção. Alargar a outros produtos é decisão comercial, não lacuna técnica.

### ECO-18 — Ferramentas de parceiro, permissões e informação agregada
**Implementado e configurado; sem acessos concedidos.**
- Código: `/portal/parceiro`, `parceiro_area_resumo()` (só totais, `auth.uid()`), `src/lib/parceiros/area.ts`, `areaServidor.ts` (sessão, nunca service role); relatório do Parceiro de Distribuição com "menos de 5".
- Migração `20261027090000_area_parceiro.sql` aplicada; `AREA_PARCEIRO_ATIVA=1`.
- Testes: `area.test.mjs`, `area_parceiro.test.sql`.
- Produção: 0 acessos concedidos.

### ECO-19 — Acordos, qualidade e operação real da rede especializada
**Não implementado.**
- Pesquisa: nenhuma tabela, rota ou texto para advogados, especialistas técnicos ou prestadores de execução (lista completa de tabelas das migrações revista; `tipos_encaminhamento` só tem vias públicas; Programa de Parceiros cobre distribuição e indicação).
- É sobretudo trabalho comercial e jurídico (acordos, âmbito, preço, partilha autorizada) antes de qualquer desenvolvimento.

### ECO-20 — Transparência comercial, independência e partilha autorizada
**Parcial.**
- Existe: Termos `2026-10-22`, secção 24 (comissão paga pela DoLado, não cobrada ao Utilizador; parceiro só vê totais); "Sem comissão de sucesso" na página institucional; parceiros nunca recebem dados de casos, facturas ou documentos; nenhuma venda de dados (Política de Privacidade).
- **Falta:** junto do campo "Código de parceiro" (`src/i18n/mensagens/pt-PT/parceiros.ts`, `codigo.ajuda`) e do percurso `/r/<código>` não se informa o cliente de que o parceiro pode receber uma comissão; a informação está só nos Termos.
- Não aplicável por agora: ordenação de recomendações e reclamações contra parceiros — não existe rede de execução nem recomendação de prestadores.

### ECO-21 — Métricas de resultados, retenção e esforço operacional
**Parcial.**
- Existe: `indicacoes_metricas()`, `protecao_gratuita_metricas()` (com o funil da landing), `guia_metricas()`; histórico de estados (`casos_estados_historico`); confirmação de resolução pelo cliente (`Aguardando decisão cliente → Resolvido`); campo manual `casos.minutos`; custo da IA em `uso_api_claude`.
- **Falta:** nenhum indicador agregado de resultados (enviados / com resposta / resolvidos, tempo até resolução), de retenção ou cancelamentos por canal/origem, nem de minutos de trabalho por cliente ou caso (`casos.minutos` existe mas não é somado nem preenchido de forma sistemática). `docs/custos-fixos-e-break-even.md` tem os números por preencher. Com o volume actual, os valores ainda não teriam significado estatístico — a instrumentação pode vir antes dos números.

### ECO-22 — Aprendizagem operacional, privacidade e minimização de dados
**Parcial — com uma lacuna de conformidade.**
- Existe: decisões humanas registadas (`casos_analises`, `achados_revisoes`, `associacoes_documento`), auditoria da IA (`casos_rascunhos_ia`, `casos_analises_ia`), minimização obrigatória (`src/lib/ia/minimizacao.ts`, teste `minimizacao.test.mjs`), pseudónimos HMAC, retenções agendadas (6 tarefas de limpeza com execuções sem falha).
- **Lacuna de conformidade (comprovada):** `CRISP_ATIVO=1` na Clever Cloud e `ChatCrisp` presente na homepage publicada (`https://dolado.pt/`), carregado só depois do consentimento de "preferências". Mas a Política de Privacidade em vigor (`2026-10-22b`) não menciona o Crisp, a matriz de subcontratantes indica o DPA como "**Por obter**" e o rascunho `docs/legal/rascunho-privacidade-crisp.md` diz "Não ligar em produção antes de" DPA, nova Política e declaração no Cookiebot.
- **Lacuna de qualidade:** a precisão da extracção de documentos nunca foi medida (dataset de avaliação de `docs/especificacoes/CLAUDE_API_MONITORIZACAO.md`, secção 19), e a leitura de energia já está ligada em produção.

### ECO-23 — Regras jurídicas e coerência com as páginas públicas de problemas
**Confirmado em produção.**
- Produção: 185 regras, 177 activas (Água 36, Energia 48, Gás 22, Compras & Reembolsos 16, Ginásios 7, Telecomunicações 9, gerais 47 — contagem por sector de todas as regras).
- Código: `src/lib/rascunhoIA/regras.ts`, `perfilEnergia.ts`, `perfilAutoconsumo.ts`; páginas em `src/lib/problemas/catalogo.ts`; teste `src/lib/problemas/problemas.test.mjs` (regras de conteúdo e metadata); pendências em `docs/legal/pendencias-juridicas.md`.
- Nesta auditoria não foi identificada nenhuma alteração legal nova; por isso nenhuma página de problemas foi alterada.
- Observação (recomendação, não lacuna jurídica): Água e Gás têm regras activas mas nenhuma página de problemas.

### Impacto nas páginas de problemas e no conteúdo público

| Página | Conteúdo analisado | Estado | Alterações |
| --- | --- | --- | --- |
| `/problemas/*` (pt e en) | Coerência com as regras activas e com as auditorias de 20/10/2026 | Sem conteúdo relacionado com alterações novas | Nenhuma |
| `/` (homepage) | Chat em direto (Crisp) | Actualização necessária — de conformidade, não jurídica de consumo (ECO-22) | Nenhuma feita; decisão de Thiago |

Sem impacto em SEO: nenhuma URL, título ou metadata alterados.

## 3. Hipóteses anteriores que a verificação desmente

A conversa original não está no repositório; enumeram-se as hipóteses de lacuna identificáveis no
documento de origem.

| Hipótese de lacuna | Realidade verificada |
| --- | --- |
| Tratamento de reclamações por construir ou incompleto | Fluxo completo de pedido → pagamento → caso → texto → autorização → envio → acompanhamento (ECO-01, 02) |
| Autorização do cliente sem versão ou sem bloqueio | Autorização presa à versão e ao hash; envio só da versão autorizada, garantido por triggers (ECO-02) |
| Dossiê e encerramento em falta | Dossiê PDF versionado, encerramento com encaminhamento externo, retenção agendada (ECO-03, 14) |
| Monitorização só de telecomunicações | Electricidade e gás com decomposição própria, ligados em produção a 21/10/2026 (ECO-08, 09) |
| Alertas inexistentes ou só planeados | Alertas 60/30/0 dias a correr diariamente em produção (ECO-06, 11) |
| Resumo mensal por fazer ou a falhar | Implementado e agendado; a 1.ª execução é a 1 de Novembro (ECO-13) |
| Programa de indicações ou de parceiros por construir | Indicação de amigos, Parceiro de Indicação, Parceiro de Distribuição e área do parceiro em produção (ECO-16, 17, 18) |
| O programa comercial só abrange a Protecção | Comissões também no Caso + Protecção; exclusões do Avulso e Caso Extra são decisão comercial (ECO-17) |
| Onboarding da Protecção sem valor visível | Protecção gratuita de 30 dias, resultado imediato no primeiro documento, landing de campanhas (ECO-12) |

## 4. Lacunas comprovadas (resumo)

1. Crisp ligado em produção sem Política, DPA nem declaração no Cookiebot (ECO-22) — conformidade.
2. Precisão da extracção nunca medida, com a leitura de energia já ligada (ECO-07, 08, 22).
3. Percurso pós-envio (envio, comprovativo, resposta, dossiê) nunca exercido com um caso real (ECO-02, 03, 14).
4. Esperas do lado do cliente sem prazo nem alerta de caso parado (ECO-04).
5. Monitor → caso sem empresa nem referência ao serviço/achado; alertas sem acção directa (ECO-05, 06).
6. Métricas de resultados, retenção e esforço inexistentes (ECO-21).
7. Aviso de comissão ausente no ponto de uso do código de parceiro (ECO-20).
8. Sem parceiros activos nem rede especializada (ECO-17, 19) — trabalho comercial.
9. Água sem decomposição própria; energia/gás sem Fase 2 jurídica (ECO-10, 11).
10. Exportação pelo cliente e retorno dos encaminhamentos (ECO-03, 15) — baixo impacto.

## 5. O que não foi possível verificar

- Respostas das rotas chamadas pelas tarefas agendadas (só o pedido é registado).
- Estado nos painéis externos: Stripe (cupões, produtos), Brevo (entregas), Resend (domínio de recepção — há 1 comunicação recebida registada em produção, mas pode ter sido registo manual), Cookiebot (declaração dos cookies do Crisp), Crisp (DPA, região).
- Comportamento visual no browser de cada fluxo autenticado (não foram usadas contas de clientes).
- Comparação das regras de energia com o Regulamento n.º 8/2026 (pendência jurídica já registada).
