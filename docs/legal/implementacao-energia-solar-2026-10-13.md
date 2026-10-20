# Energia Solar / Autoconsumo — implementação (13/10/2026)

Segue a auditoria `docs/legal/auditoria-regras-energia-solar-2026-10-13.md`. As 17 regras novas entraram inativas e foram **ativadas a 13/10/2026**, depois da revisão de Thiago (`20261013110000_ativar_regras_energia_solar.sql`, aplicada em produção; `revista_por = 'Thiago Pereira'`). Os pontos da secção 5 continuam por confirmar com a advogada.

## 1. O que muda

| Peça | Onde |
|---|---|
| Três tipos de problema em Energia: "Painéis solares: instalação, avaria ou garantia", "…: contrato, cancelamento ou promessa comercial", "…: registo, ligação ou autoconsumo" | `src/lib/pedidoCaso.ts` (`PROBLEMAS_AUTOCONSUMO`, `ehCasoAutoconsumo`), rótulos pt/en |
| Três perguntas no formulário, só nesses tipos (todas com "Não sei"): forma de contratação, financiamento, os painéis são seus (compra vs. CAER) | `FormularioCaso.tsx`; gravadas em `pedidos_caso.detalhes_caso` → `casos.detalhes_caso` (jsonb, valores fechados, validado na BD) |
| Correção das respostas pelo admin | Backoffice, "Dados do caso" (só casos solares) |
| Perfil de seleção próprio (prioridades 1–5, limite 18 depois da ordenação) | `src/lib/rascunhoIA/perfilAutoconsumo.ts`, chamado por `selecionarRegras` |
| Contexto da IA: as três respostas em texto simples ("não indicado pelo cliente" quando não sabe) | `src/lib/rascunhoIA/contexto.ts` (`contexto_v3`) |
| 17 regras novas (inativas) | `supabase/migrations/20261013100000_energia_solar_autoconsumo.sql` |

Sem campo `subsector`: o tipo de problema já é o subtipo. Schema: só a coluna `detalhes_caso` (nullable) em duas tabelas e a função `converter_pedido_em_caso()` atualizada.

## 2. Seleção para casos solares

- **Entram:** regras gerais; regras de Compras & Reembolsos (DL 84/2021 e DL 24/2014 — sem lhes mudar o setor); de Energia, só as das categorias Autoconsumo e CAER.
- **Saem sempre:** regras de fornecimento de energia (cortes, cauções, tarifa social, leituras, faturação, mudança de comercializador, RQS…) e as da Lei 23/96 (a venda e instalação de painéis não é serviço público essencial). `ENE_SERVICOS_ADICIONAIS_17` fica de fora até decisão da advogada (auditoria, H.6(d)).
- **Condicionais (pelas respostas):**
  - DL 24/2014: no estabelecimento → só `COMPRA_LOJA_SEM_LR_2`; à distância → sem o art. 9.º; em casa/noutro local → sem os arts. 5.º, 6.º e 19.º; "não sei" → todas, para a pessoa confirmar.
  - Crédito coligado: só com "financiamento apresentado ou contratado juntamente com a compra". Empréstimo contratado separadamente ou "não sei" → fora.
  - CAER: só com "uma empresa instala e explora os painéis no meu telhado ou terreno".
- **Prioridade** por tipo de problema (1 = diretamente ligada ao problema; 2 = conformidade, instalação, entrega, garantia, reparação, resolução; 3 = UPAC; 4 = práticas comerciais, cláusulas, financiamento, danos, fabricante; 5 = reclamação/RAL e restantes). Empates: regras de um setor antes das gerais, depois categoria, depois código.
- **Fora dos casos solares nada muda:** teste de não regressão compara, para todos os outros setores/tipos, a seleção nova com a antiga, com as 157 regras de produção. As categorias Autoconsumo, CAER e Crédito coligado nunca chegam pelo critério geral.

Simulação com as regras de produção + as 17 novas ativadas (cenários A–G da auditoria): todos cobertos, sem nenhuma regra `ENE_`/`SPE_` (`src/lib/rascunhoIA/autoconsumo.test.mjs`).

## 3. Regras novas (ativas desde 13/10/2026)

| Código | Setor / categoria | Base |
|---|---|---|
| GAR_EMPREITADA_3 | geral / Conformidade | DL 84/2021, art. 3.º, n.º 1, als. a) e b) |
| GAR_ENTREGA_INSTALACAO_11 | geral / Entrega | DL 84/2021, art. 11.º, n.º 2 |
| GAR_RECUSA_PAGAMENTO_15_7 | geral / Conformidade | DL 84/2021, art. 15.º, n.os 7 e 8 |
| GAR_COMERCIAL_43 | geral / Garantia | DL 84/2021, art. 2.º, al. k), e art. 43.º |
| GAR_PRODUTOR_DIRETO_40 | geral / Garantia | DL 84/2021, art. 2.º, al. p), e art. 40.º |
| CONS_REPARACAO_DANOS_12 | geral / Danos | Lei 24/96, art. 12.º |
| CRED_COLIGADO_18 | geral / Crédito coligado | DL 133/2009, art. 4.º, n.º 1, al. o), e art. 18.º |
| DIST_FORA_ESTAB_FORMA_9 | geral / Contrato | DL 24/2014, art. 9.º |
| DIST_ACESSORIOS_16 | geral / Livre resolução | DL 24/2014, art. 3.º, al. g), e art. 16.º |
| UPAC_CONTROLO_PREVIO_11_81 | Energia / Autoconsumo | DL 15/2022 (red. DL 130/2026), arts. 11.º e 81.º |
| UPAC_CERTIFICADO_EXPLORACAO_81A | Energia / Autoconsumo | DL 15/2022, art. 81.º-A |
| UPAC_INSTALADOR_84 | Energia / Autoconsumo | DL 15/2022 (red. DL 130/2026), art. 84.º |
| UPAC_EQUIPAMENTOS_CERTIFICADOS_96 | Energia / Autoconsumo | DL 15/2022, art. 96.º e art. 88.º, n.º 2, al. h) |
| UPAC_DEVERES_AUTOCONSUMIDOR_88 | Energia / Autoconsumo | DL 15/2022 (red. DL 130/2026), art. 88.º |
| CAER_AMBITO_FORMA_2_4 | Energia / CAER | Lei 29/2026, arts. 2.º e 4.º |
| CAER_INFORMACAO_5_6 | Energia / CAER | Lei 29/2026, arts. 5.º e 6.º |
| CAER_EMPRESA_DGEG_3 | Energia / CAER | Lei 29/2026, art. 3.º |

Datas: regras com redação do DL 130/2026 → `em_vigor_desde = 2026-08-28`, com a nota de que só se aplicam a procedimentos de controlo prévio iniciados a partir dessa data. CAER → `2026-07-01`. As regras da UPAC indicam no **diploma** "na redação do Decreto-Lei n.º 130/2026", porque o validador da IA só aceita diplomas que constem do diploma/artigo das regras enviadas.

**Reutilizadas sem alteração** (já existiam e passam a chegar aos casos solares pelo perfil): `COMPRA_INSTALACAO_INCORRETA_9`, `COMPRA_CONFORMIDADE_5_7`, `COMPRA_DIREITOS_CONFORMIDADE_15`, `COMPRA_REJEICAO_30D_16`, `COMPRA_REPARACAO_REGRAS_18`, `COMPRA_RESOLUCAO_REEMBOLSO_20`, `COMPRA_ENTREGA_PRAZO_11`, `COMPRA_ENTREGA_REEMBOLSO_11`, `COMPRA_LR_*`, `COMPRA_LOJA_SEM_LR_2`, `GAR_*`, `DIST_*`, `PCD_*`, `CCG_*`, `CONS_*`, `PAY_*`.

## 4. Verificação legal (13/10/2026)

Fontes: versões consolidadas da PGDL (DL 84/2021 — sem alterações; DL 24/2014 — 7.ª versão, Lei 10/2023; DL 133/2009 — 7.ª versão, DL 103/2025; DL 15/2022 — 11.ª versão, DL 130/2026; Lei 24/96, art. 12.º), texto da Lei 29/2026 no DR (n.º 119, 1.ª série, 23/06/2026) e página da DGEG sobre o DL 130/2026.

- **Prazo de livre resolução (pedido de correção "em casa = 30 dias").** O art. 10.º, n.º 1, do DL 24/2014 em vigor diz: 14 dias, ou **30 dias nos contratos celebrados fora do estabelecimento a que se referem as subalíneas ii) e v) da alínea i) do artigo 3.º** — ii) "celebrados no domicílio do consumidor"; v) "durante uma deslocação organizada pelo fornecedor". Os 30 dias no domicílio são, portanto, a lei em vigor (não exigem visita não solicitada). As regras existentes estão corretas e **não foram alteradas**: `DIST_LIVRE_RESOLUCAO` ("em regra, 14 dias… determinados contratos fora do estabelecimento previstos na lei, 30 dias") e `COMPRA_LR_BENS_INICIO_10` (14 dias; 30 dias no domicílio ou em deslocação organizada). Nenhuma regra diz que todo o contrato fora do estabelecimento tem 30 dias (local de trabalho, contacto na rua, local indicado pelo fornecedor → 14 dias). Teste: `autoconsumo.test.mjs`.
- **DL 130/2026:** em vigor a 28/08/2026 (DGEG). Aplica-se aos procedimentos de controlo prévio iniciados depois dessa data (nota jurídica Pérez-Llorca; **[a confirmar no DR]** o artigo exato da norma transitória). Limiar de isenção: 800 W sem injeção (art. 11.º, n.º 5); antes era diferente — **[a confirmar]** 700 W.
- **Lei 29/2026:** entra em vigor no 1.º dia do mês seguinte à publicação (art. 12.º) → 01/07/2026; aplica-se aos procedimentos pendentes na DGEG (art. 11.º). A portaria com o modelo-tipo de CAER (art. 4.º, n.º 5, prazo de 6 meses) ainda não foi verificada.
- **Não criado, por dúvida:** regra do art. 14.º do DL 15/2022 (licença de autoconsumo em 90 dias com deferimento tácito, da Lei 29/2026) — a nota jurídica indica que o DL 130/2026 voltou a mudar esse artigo. Confirmar antes de criar.
- **DL 133/2009:** a Diretiva (UE) 2023/2225 (crédito aos consumidores) é aplicável a partir de 20/11/2026; a condição da regra manda confirmar o regime aplicável à data do contrato de crédito.

## 5. Antes de ativar (Thiago + advogada)

**Validado (20/10/2026):** Thiago confirmou que os cinco pontos desta secção estão validados. Nada muda nas regras, na selecção nem nos textos legais; `ENE_SERVICOS_ADICIONAIS_17` fica como está.

1. ~~Rever e ativar as 17 regras~~ — ativadas por Thiago a 13/10/2026. A advogada deve ainda rever o texto, as condições e as datas; alterar o conteúdo de uma regra retira a revisão e desativa-a até nova data de revisão.
2. Confirmar a qualificação "fornecimento e instalação" como empreitada de consumo com o DL 84/2021 aplicável (auditoria, H.6(a)).
3. Confirmar a norma transitória do DL 130/2026 e o limiar anterior.
4. Decidir sobre `ENE_SERVICOS_ADICIONAIS_17` (venda de UPAC pelo comercializador).
5. Termos (secção 2) e Política de Privacidade: os casos de painéis solares e as três respostas novas (enviadas à Claude API, sem dados pessoais) cabem nas finalidades já descritas? Se não, nova versão.

## 6. Deploy

1. `supabase db push --linked --dry-run`, depois `supabase db push --linked` (antes do merge que faz o deploy — o código novo lê `casos.detalhes_caso`).
2. Merge → deploy na Clever Cloud.
3. Ativação: `20261013110000_ativar_regras_energia_solar.sql` (13/10/2026).

Testes: `src/lib/rascunhoIA/autoconsumo.test.mjs`, `src/lib/pedidoCaso.test.mjs`, `supabase/tests/database/energia_solar_autoconsumo.test.sql`.
