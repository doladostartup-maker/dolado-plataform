# Ecossistema DoLado

Data: 21 de Outubro de 2026. Estado verificado a 21 de Outubro de 2026 contra `main` em `d982cd88` (deploy `OK` na Clever Cloud) e a base de dados de produção, em modo de leitura. Provas completas em [`auditoria-ecossistema-2026-10-21.md`](auditoria-ecossistema-2026-10-21.md).

## Estado verificado (21/10/2026)

O documento divide-se em duas partes: a **visão estratégica** (Objectivo, Ciclo de serviço, Confiança e continuidade, Rede de parceiros, Independência e economia, Aprendizagem e medição), que se mantém como estava, e o **inventário actual** (esta secção, a matriz e o roadmap), que reflecte o que foi verificado.

### Já concluído

- Ciclo do caso completo: pedido → pagamento (Stripe) → caso → sugestão da IA revista → autorização versionada → envio → recepção das respostas → análise humana → encerramento e dossiê. Todas as 95 migrações aplicadas em produção; testes de base de dados e de contrato verdes no CI.
- Monitor de Protecção: telecomunicações completo; electricidade e gás com decomposição factual ligada em produção (1 factura de energia já lida com o schema novo); alertas de datas diários sem falhas.
- Protecção gratuita de 30 dias e resultado imediato no portal; 1 conversão observada.
- Resumo mensal implementado e agendado (1.ª execução a 1 de Novembro de 2026 — ainda não correu porque a janela de Outubro já tinha passado).
- Indicação de amigos, Parceiro de Indicação, Parceiro de Distribuição e área do parceiro implementados e ligados.
- Regras jurídicas: 177 activas de 185; páginas de problemas com testes de conteúdo.

### Suposições anteriores que estavam erradas

Reclamações, autorização, dossiês, monitorização (incluindo energia), alertas, resumo mensal, indicações e programa de parceiros **existem e estão publicados**. O programa comercial não se limita à Protecção (o Caso + Protecção também dá comissão; o Avulso e o Caso Extra ficam de fora por decisão comercial de 21/10/2026). Lista completa na secção 3 da auditoria.

### Existe parcialmente

Detecção de casos parados (falta nas esperas do cliente), ligação Monitor → caso (só sector e problema), acções a partir dos e-mails de alertas, monitor de água (comparação genérica), fidelização e custo de saída fora das telecomunicações, transparência da comissão no ponto de uso, métricas de resultados e esforço, exportação pelo cliente, retorno dos encaminhamentos.

### Não verificado

Respostas das rotas chamadas pelas tarefas agendadas, painéis da Stripe, Brevo, Resend, Cookiebot e Crisp, e os fluxos autenticados no browser.

### Uso real observado

Volume muito baixo: 2 contas com Protecção, 1 caso (encerrado sem resolução), 0 envios registados, 0 parceiros, 0 indicações. Muitas capacidades estão publicadas mas ainda não foram exercidas com clientes reais — isso não é uma falha de implementação.

## Natureza deste documento

Visão estratégica e matriz de verificação. Não é uma auditoria técnica nem uma lista de funcionalidades em falta. A conversa que lhe deu origem contém hipóteses de lacunas que o fundador contestou por já existirem implementações. Essas hipóteses não devem ser convertidas em tarefas sem verificação.

O código, as migrações aplicadas, a configuração efectiva e o comportamento observado prevalecem sobre as descrições anteriores. Não reconstruir funcionalidades existentes nem criar sistemas paralelos.

## Objectivo

Tornar a DoLado o ponto de referência do cliente para os contratos e problemas de consumo da casa: conhecer a situação, prevenir problemas, organizar acções, acompanhar respostas e facilitar o apoio especializado quando necessário.

A diferenciação depende da qualidade do serviço completo: continuidade, confiança verificável, execução acompanhada, rede de parceiros e aprendizagem operacional. Não pressupõe que assistentes de IA generalistas sejam incapazes de ter memória, alertas ou executar tarefas.

## Ciclo de serviço a verificar

1. Organizar condições essenciais, documentos e datas dos contratos.
2. Monitorizar facturas, distinguindo preço, consumo e outras cobranças.
3. Alertar para alterações e datas relevantes, com acções úteis.
4. Tratar reclamações, aproveitando o contexto existente e respeitando a autorização do cliente.
5. Acompanhar respostas, prazos, responsável e próxima acção.
6. Registar o desfecho, disponibilizar o dossiê e encaminhar quando necessário.
7. Manter a protecção e actualizar o histórico após o caso.

Âmbito inicial proposto: telecomunicações, electricidade, gás e água. Não implica remover outros sectores existentes. A profundidade de cada monitor deve ser verificada individualmente.

## Confiança e continuidade

- Estado claro, última verificação, informação em falta e próxima acção.
- Responsável e data de revisão nos casos em acompanhamento, segundo o fluxo existente.
- Autorizações associadas à versão do texto e à data/hora.
- Comprovativos e documentos finais preservados.
- Resumo de actividade sustentado por verificações realmente executadas.
- Histórico e dossiê exportáveis; retenção baseada na utilidade, não no bloqueio dos dados.
- Recolha mínima de dados, respeitando as decisões de privacidade já adoptadas.

## Rede de parceiros proposta

| Função | Exemplos a avaliar | Contributo |
| --- | --- | --- |
| Distribuição | Consultores imobiliários, empresas, contabilistas | Apresentar a DoLado num momento relevante |
| Apoio especializado | Advogados e especialistas técnicos | Intervir nas situações que exigem competências adicionais |
| Execução | Prestadores seleccionados | Concretizar a solução escolhida pelo cliente |

Cada relação operacional deve definir âmbito, aceitação, preço, entidade pagadora, prazo, informação necessária, autorização de partilha, comunicação de estado e desfecho. Distinguir contactos prospectivos, acordos existentes e parceiros efectivamente activos.

Entidades públicas e centros de resolução de conflitos são vias de encaminhamento; não devem ser apresentados como parceiros comerciais sem acordo.

O programa comercial deve permitir avaliar a indicação dos diferentes produtos DoLado, de acordo com a intenção do fundador, sem presumir exclusividade da Protecção. Verificar as regras já implementadas antes de propor alterações.

## Independência e economia

- Identificar remunerações por indicação; não ordenar recomendações pela comissão.
- Permitir escolhas exteriores à rede e tratamento imparcial de reclamações contra parceiros.
- Não vender dados dos clientes.
- Sustentar a operação em subscrições e serviços definidos; avaliar comissões como receita complementar.
- Manter limites claros entre automatização, intervenção humana incluída e trabalho especializado adicional.
- Confirmar preços, modalidades e regras na implementação actual; este documento não altera condições comerciais.

## Aprendizagem e medição

Registar o necessário para melhorar triagem, documentação, acompanhamento e qualidade dos parceiros. Distinguir reclamação enviada, resposta recebida e problema resolvido, identificando quem confirmou o resultado.

Indicadores a verificar: configuração da Protecção, alertas com acção útil, casos com próxima acção, resultados confirmados, retenção por canal, cancelamentos e minutos de trabalho humano por cliente/caso. Não inventar valores nem interpretar ausência de dados como ausência de funcionalidade.

## Matriz de auditoria

Estados verificados a 21/10/2026. Ficheiros, migrações, testes, configuração e evidência de produção de cada ponto em [`auditoria-ecossistema-2026-10-21.md`](auditoria-ecossistema-2026-10-21.md).

| ID | Capacidade a verificar | Estado verificado a 21/10/2026 |
| --- | --- | --- |
| ECO-01 | Fluxo de reclamação, pagamento e acesso ao portal | Confirmado em produção |
| ECO-02 | Revisão, autorização versionada e bloqueio de envio sem autorização | Confirmado em produção (autorização observada; envio ainda não) |
| ECO-03 | Comprovativos, imutabilidade pós-envio, dossiê e exportação | Parcial — sem exportação pelo cliente; pós-envio nunca exercido |
| ECO-04 | Responsável, próxima acção, revisão e detecção de casos parados | Parcial — esperas do cliente sem prazo; responsável não aplicável (operador único) |
| ECO-05 | Ligação entre contrato, documentos, facturas, alertas e casos | Parcial — Monitor → caso só leva sector e problema |
| ECO-06 | Acções a partir dos alertas, com contexto e modalidade respeitados | Parcial — e-mails de alertas sem acção directa |
| ECO-07 | Monitor de telecomunicações | Implementado, produção não confirmada (0 serviços de telecomunicações) |
| ECO-08 | Monitor de electricidade: preços, consumo, potência, estimativas e acertos | Confirmado em produção (Fase 1 factual) |
| ECO-09 | Monitor de gás: componentes específicos, estimativas e acertos | Implementado, produção não confirmada |
| ECO-10 | Monitor de água: cobertura real e limites | Parcial — só comparação genérica |
| ECO-11 | Promoções, fidelização, regras de saída e alertas por sector | Parcial — completo só em telecomunicações |
| ECO-12 | Onboarding de Protecção e valor visível no portal | Confirmado em produção |
| ECO-13 | Resumo mensal: implementação, configuração, agendamento e evidência de execução | Implementado; 1.ª execução agendada para 01/11/2026 |
| ECO-14 | Encerramento, encaminhamento externo e dossiê | Implementado, produção não confirmada (sem dossiês) |
| ECO-15 | Aceitação, acompanhamento e retorno dos encaminhamentos | Parcial — sem registo do retorno; especializado não implementado |
| ECO-16 | Indicações: atribuição, produtos elegíveis, descontos e não acumulação | Implementado, produção não confirmada (0 indicações) |
| ECO-17 | Parceiros remunerados: comissões, cancelamentos e pagamentos | Implementado e configurado; 0 parceiros activos |
| ECO-18 | Ferramentas de parceiro, permissões e informação agregada | Implementado e configurado; 0 acessos |
| ECO-19 | Acordos, qualidade e operação real da rede especializada | Não implementado (trabalho comercial e jurídico) |
| ECO-20 | Transparência comercial, independência e partilha autorizada | Parcial — sem aviso de comissão no ponto de uso |
| ECO-21 | Métricas de resultados, retenção e esforço operacional | Parcial — sem métricas de resultados, retenção e esforço |
| ECO-22 | Aprendizagem operacional, privacidade e minimização de dados | Parcial — Crisp ligado sem Política/DPA; precisão da extracção por medir |
| ECO-23 | Regras jurídicas e coerência com páginas públicas de problemas | Confirmado em produção |

Para cada ID, acrescentar: estado apurado, ficheiros/símbolos, migrações/configurações relevantes, testes existentes, evidência de produção, limites de acesso e lacuna exacta, se existir. Decompor itens parcialmente concluídos.

Estados permitidos: confirmado em produção; implementado com produção não confirmada; parcial; não implementado após pesquisa documentada; não verificável com os acessos disponíveis; não aplicável com justificação.

Ausência de prova não prova ausência. Uma migração no repositório não prova aplicação em produção; um botão não prova funcionamento ponta a ponta; um agendamento futuro não é uma execução falhada; um programa de indicação não prova a existência de parceiros activos.

## Roadmap das lacunas confirmadas (21/10/2026)

Só lacunas comprovadas na auditoria; nada do que já existe volta a ser construído. Ordem por impacto, dependências e esforço; sem datas, porque dependem da capacidade de Thiago. Esforço: P (horas), M (1–3 dias), G (mais de uma semana).

A ordem estratégica original mantém-se como princípio: corrigir falhas no acompanhamento → completar ligações → monitores → medição → pilotos de distribuição → rede especializada → automatização.

### A. Configuração, jurídico e operação (sem desenvolvimento ou com alteração mínima)

| # | Lacuna (ECO) | Impacto | Dependências | Esforço | Critério de conclusão |
| --- | --- | --- | --- | --- | --- |
| A1 | Crisp ligado em produção sem Política, DPA nem declaração no Cookiebot (ECO-22) | Alto — conformidade RGPD | Decisão de Thiago | P | `CRISP_ATIVO` desligado e novo build publicado; **ou** DPA do Crisp obtido, nova versão da Política validada pela advogada e publicada, cookies do Crisp declarados no Cookiebot como "Preferências" e matriz de subcontratantes actualizada |
| A2 | Percurso pós-envio nunca exercido com um caso real (ECO-02, 03, 14) | Alto — confiança no ciclo completo | Primeiro caso real a enviar | P por caso | Um caso real com envio registado, comprovativo, resposta recebida pelo endereço do caso e desfecho (resolução confirmada pelo cliente ou encerramento com dossiê descarregado no portal) |
| A3 | Resumo mensal ainda não executado (ECO-13) | Médio | 1–3 de Novembro de 2026 | P | Execuções `succeeded` de `resumo-mensal-protecao` em Novembro e uma linha `enviado` por conta elegível em `protecao_resumos_mensais`, sem duplicados |
| A4 | Custo real da IA por caso por medir (ECO-21, regra 5 do "Uso de IA") | Médio | Primeiros 10–15 casos | P | `docs/custos-fixos-e-break-even.md` preenchido com a média por caso de `scripts/sql/custo-sugestao-texto-ia.sql` |

### B. Desenvolvimento técnico

| # | Lacuna (ECO) | Impacto | Dependências | Esforço | Critério de conclusão |
| --- | --- | --- | --- | --- | --- |
| B1 | Precisão da extracção nunca medida, com energia já ligada (ECO-07, 08, 22) | Alto — falsos aumentos ou aumentos não detectados | Facturas anonimizadas ou com autorização (operação) | M | Dataset de 20 facturas telecom e 20 de energia com valores certos anotados; script de avaliação local sem efeitos externos; precisão por campo registada; decisão escrita de manter, ajustar ou desligar `MONITOR_ENERGIA_ATIVO` |
| B2 | Esperas do cliente sem prazo nem alerta de caso parado (ECO-04) | Alto quando houver volume | — | P | `prazosCaso()` com prazo para `Aguardando cliente`, `Aguardando decisão cliente` e texto à espera de autorização; esses casos aparecem em `/backoffice/urgentes` quando vencidos; testes em `triagem` |
| B3 | Monitor → caso sem empresa nem referência ao serviço/achado; alertas sem acção directa (ECO-05, 06) | Médio — menos trabalho para o cliente e contexto para a DoLado | — | M | "Tratar este problema" pré-preenche a empresa; o pedido e o caso guardam a referência ao serviço/achado (RLS e testes pgTAP); o backoffice do caso mostra a situação de origem; os e-mails de datas têm uma acção directa para o serviço com "Tratar este problema" |
| B4 | Métricas de resultados, retenção e esforço (ECO-21) | Médio — decisões de produto e preço | B2 ajuda | M | Função só-admin com contagens por estado final (enviado, com resposta, resolvido confirmado pelo cliente, encerrado), tempo até resolução, cancelamentos por origem de aquisição e soma de `casos.minutos`; página no backoffice; sem dados pessoais |
| B5 | Aviso de comissão no ponto de uso do código de parceiro (ECO-20) | Baixo-médio — transparência | Validação do texto pela advogada | P | Frase nas duas línguas junto do campo "Código de parceiro" e no percurso `/r/<código>` de parceiro; testes i18n verdes |
| B6 | Água sem decomposição própria (ECO-10) | Baixo até haver procura | Clientes com facturas de água | G | Só se houver procura: leitura e comparação de m³, escalões, saneamento e resíduos, com testes como os de energia |
| B7 | Exportação pelo cliente e retorno dos encaminhamentos (ECO-03, 15) | Baixo | Decisão de produto | M | A decidir: descarga do histórico do caso pelo cliente; registo opcional do resultado do encaminhamento indicado pelo cliente |

### C. Jurídico com desenvolvimento dependente

| # | Lacuna (ECO) | Dependências | Critério de conclusão |
| --- | --- | --- | --- |
| C1 | Fidelização e custo de saída em electricidade e gás (ECO-11) | Pontos para a advogada em `docs/legal/auditoria-monitor-energia-2026-10-21.md` | Regras validadas registadas; só depois, especificação da Fase 2 |
| C2 | Páginas de problemas de Água e Gás (ECO-23) | Revisão do conteúdo | Recomendação: criar só com texto revisto, seguindo as regras de `problemas.test.mjs` |

### D. Comercial

| # | Lacuna (ECO) | Critério de conclusão |
| --- | --- | --- |
| D1 | Nenhum parceiro activo (ECO-17, 18) | Pequeno piloto com 1–3 parceiros com contrato-tipo assinado, código emitido, primeira conta atribuída e área do parceiro concedida — reutilizando o programa existente |
| D2 | Rede especializada inexistente (ECO-19) | Âmbito, preço, entidade pagadora, partilha autorizada e acordo definidos com pelo menos um advogado ou especialista, e procura observada em casos reais, **antes** de qualquer desenvolvimento |

## Regras para a verificação por Claude

Ler AGENTS.md e instruções do projecto. Auditar primeiro, sem implementar funcionalidades, enviar comunicações, processar pagamentos ou modificar dados de clientes. Utilizar produção em modo de leitura e testes sem efeitos externos. Não expor segredos nem dados pessoais no relatório.

Verificar regras jurídicas em fontes oficiais actualizadas quando necessário. Sempre que for identificada alteração legal, regulamentar, jurisprudencial ou de orientação relevante, verificar também as páginas públicas de problemas relacionadas, indicando URL, conteúdo afectado e correcção proposta. Não alterar conteúdo jurídico automaticamente sem a revisão aplicável.

Usar português europeu clássico, com ortografia anterior ao Acordo Ortográfico de 1990. Preservar identificadores técnicos existentes.

Entregar uma matriz com provas, uma lista explícita das hipóteses anteriores desmentidas e um roadmap apenas das lacunas confirmadas. Distinguir commit, push, merge e deployment; não afirmar publicação em produção sem evidência.
