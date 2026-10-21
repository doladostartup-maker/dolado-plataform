# Pendências jurídicas

Lista única do que ficou em aberto nas auditorias e cargas jurídicas: pontos para a advogada, cargas por fazer e revisões periódicas. Cada linha indica a origem (documento com o detalhe). Quando um ponto ficar resolvido, marcá-lo com a data e a decisão (não apagar).

## Electricidade: interrupções e compensações (20 de Outubro de 2026)

Origem: [auditoria-interrupcoes-electricidade-2026-10-20.md](auditoria-interrupcoes-electricidade-2026-10-20.md), secção C. As regras já estão **activas** em produção (revistas por Thiago a 20/10/2026); estes pontos são confirmações, não bloqueiam o uso.

### Para a advogada — regras do RQS (`ENE_CONTINUIDADE_PADROES_24`, `ENE_CONTINUIDADE_PAGAMENTO_106`, `ENE_CONTINUIDADE_RESP_CIVIL_10`, `ENE_ASSISTENCIA_AVARIA_83`)

- [ ] **Remissão do art. 13.º, n.º 3, als. e) e f), do RQS:** remete para o "artigo 8.º" nos casos fortuitos e de força maior, que estão definidos no art. 7.º (provável remissão desactualizada no consolidado). A regra não depende disto, porque na electricidade só o evento excepcional afasta a compensação (arts. 24.º, n.º 2, e 110.º, n.º 1, al. a)).
- [ ] **Art. 45.º do RQS:** confirmar se o operador de rede tem de comunicar ao cliente os **valores** dos indicadores individuais da sua instalação. A regra só manda pedir esclarecimento; não afirma esse direito.
- [ ] **Apagão de 28/04/2025:** a `ENE_CONTINUIDADE_PADROES_24` diz nas condições que a ERSE o classificou como evento excepcional (destaque da ERSE de 14/10/2026). Decidir se a menção fica ou sai.
- [ ] **Pedidos de evento excepcional ainda por decidir:** o crédito ao comercializador passa a ser até 70 dias depois da última decisão da ERSE sobre esse ano. Confirmar se a redacção da `ENE_CONTINUIDADE_PAGAMENTO_106` chega.

### Para a advogada — danos do Código Civil (`ENE_DANOS_INSTALACAO_CC_509`, `ENE_DANOS_CULPA_CC_798`)

- [ ] **Art. 509.º, n.º 3:** exclui os danos *causados por* utensílios de uso de energia. Confirmar que não abrange os danos *sofridos* pelos aparelhos por causa da electricidade entregue (por exemplo, sobretensão).
- [ ] **A quem dirigir o pedido:** ao operador de rede (art. 509.º, quem tem a direcção efectiva da instalação) e/ou ao comercializador (responsabilidade contratual, arts. 798.º e 799.º). Ver também os actos de auxiliares do art. 800.º.
- [ ] **Limites do art. 510.º:** remetem para o art. 508.º, n.º 1. Confirmar se a regra deve indicar os montantes.
- [ ] **Responsabilidade do produtor (DL n.º 383/89):** ficou de fora. Confirmar se a electricidade é "produto" no direito português e se vale a pena uma regra.

### Cargas por fazer

- [ ] **Qualidade da tensão — art. 66.º do RQS:** reclamações sobre a qualidade da energia eléctrica (oscilações, sobretensões), com compensação pelo art. 61.º, n.º 1, al. d). Equivalente eléctrico da `GAS_RECLAM_CARACTERISTICAS_RQS_67`. Criar inactiva e rever.

### Revisões periódicas

- [ ] **Nova consolidação do RQS pela ERSE:** rever as 4 regras (sobretudo os padrões do Anexo I e os valores unitários) e a página `/problemas/energia/falta-de-luz` sempre que a ERSE publicar uma versão nova.
- [ ] **Coerência da página `/problemas/energia/falta-de-luz` com as regras:** se uma regra de continuidade ou de danos mudar, rever o texto da página em pt e en (regra obrigatória das auditorias, no CLAUDE.md).

## Programa de Parceiros — Fase 1 (20 de Outubro de 2026)

Origem: [../especificacoes/PROGRAMA_PARCEIROS_FASE1.md](../especificacoes/PROGRAMA_PARCEIROS_FASE1.md), secção 4. **Bloqueia a ligação em produção** (interruptor desligado até lá); a base de dados pode ser aplicada antes, porque nada é exposto ao público.

### Para a advogada

Regras do programa e textos dos Termos e da Política `2026-10-20` validados pela advogada (confirmado por Thiago, 20/10/2026). Migration aplicada em produção a 20/10/2026.

- [x] **Política de Privacidade `2026-10-20`** (`src/app/[idioma]/(legal)/privacidade/_versoes/v2026-10-20.tsx`, secções 2, 3, 5, 6 e 8): candidaturas, dados dos parceiros, atribuição (ligação com consentimento ou código), mensalidades usadas para a comissão, oportunidades B2B, Protecção oferecida, tentativas (2 dias). Pontos a confirmar: (a) bases jurídicas — candidatura em nome próprio (art. 6.º/1/b) vs. em nome de empresa (f); atribuição e registo das mensalidades por interesse legítimo (f); (b) prazos sem limpeza automática — dados dos parceiros e comissões (prescrição / prazo contabilístico até 10 anos), oportunidades B2B ("enquanto necessário"), candidaturas pendentes; se preferir prazos fixos, acrescentá-los à manutenção; (c) contactos B2B — o texto promete informar a pessoa no primeiro contacto (art. 14.º): procedimento manual de Thiago.
- [x] **Termos `2026-10-20`** (`src/app/[idioma]/(legal)/termos/_versoes/v2026-10-20.tsx`, secções 5, 7, 14.2, 22, 23 e 24): Protecção oferecida (activação com e-mail confirmado, uma vez, prazo de activação, meses de calendário, sem cobrança, fim automático, adesão expressa com cobrança no fim, recusa com subscrição activa ou outra oferta em curso, termina a Protecção gratuita em curso e impede-a depois, anulação de códigos por activar); Parceiros de Indicação (comissão paga pela DoLado, sem desconto nem efeito no preço, primeira atribuição, contas que ainda não são clientes). Ponto a confirmar: a duração do período só é mostrada **depois** da activação (área de cliente e e-mail) — se tiver de aparecer antes, mostrar o número de meses na página `/ativar-codigo` depois de validar o código.
- [ ] **Condições do Programa de Parceiros:** a candidatura em `/parceiros` só aceita o tratamento dos dados ("As condições comerciais constam do acordo de parceria"), por isso as condições (comissões sem IVA, 3 mensalidades, reversões, pagamento manual, mínimo de 25 €, sem rendimentos garantidos) ficam no contrato-tipo, fora do código.
- [ ] **Contratos-tipo:** Parceiro de Indicação (incluindo o registo de oportunidades B2B e a legitimidade para comunicar contactos de terceiros) e Parceiro de Distribuição (pacotes pré-pagos, sem acesso a dados dos beneficiários).
- [ ] **Fiscalidade dos pagamentos a parceiros pessoa singular** (recibo, retenção na fonte) — com o contabilista. IVA: decidido (comissões sem IVA; a DoLado está no regime normal e deduz o IVA dos parceiros — Thiago, 20/10/2026). Falta a retenção na fonte: se for preciso, acrescentar o campo ao registo do pagamento.

- [x] **Área do parceiro (21/10/2026)** — validada pela advogada e publicada como Política `2026-10-22b` (totais exactos; Termos sem alteração; confirmado por Thiago a 21/10/2026): nova versão da Política (secções 2, 5 e 6) e, se necessário, dos Termos (secção 24) — a Política `2026-10-22` diz que os parceiros não têm acesso à plataforma. Decidir a inferência com números pequenos (totais exactos, "menos de 5" ou sem conversões por produto). Rascunho: `docs/legal/rascunho-privacidade-area-parceiro.md`. Bloqueia `AREA_PARCEIRO_ATIVA=1`.
- [x] **Contrato-tipo do Parceiro de Indicação** (aprovado, confirmado por Thiago a 21/10/2026): acrescentar a área de parceiro (conta pessoal), a obrigação de dizer ao consumidor que recebe comissão e a proibição de envio em massa / listas sem base legal.

### Fora do código (Thiago)

- [x] **Cookiebot:** a finalidade do cookie `dolado_indicacao` passa a incluir as indicações de parceiros comerciais (feito, confirmado por Thiago a 21/10/2026).
- [x] **Alinhar `/empresas` com `/parceiros`** (não duplicar conteúdo nem prometer condições) — feito a 20/10/2026: `/empresas` = benefício ("Pedir proposta"), `/parceiros` = indicação e distribuição ("Propor parceria"), ligações cruzadas, comissões só "nos termos do acordo".
- [x] **Informar os contactos B2B no primeiro contacto** (Política, secções 3 e 8): botão "Avisar primeiro contacto" no backoffice (20/10/2026), com prova em `parceiros_oportunidades_avisos`. Falta a advogada validar o texto do aviso (`textoAvisoPrimeiroContacto` em `src/lib/legal.ts`).
- [x] **Ligar em produção:** `PARCEIROS_ATIVO=1`, `ACESSOS_PATROCINADOS_ATIVO=1` e `PARCEIROS_CHAVE` na Clever Cloud, com novo build (20/10/2026, confirmado por Thiago).
- [x] **`/parceiros` indexável** (decisão de Thiago, 20/10/2026): no sitemap e no rodapé, sem `noindex`.

## Energia e Gás: facturação, cobrança e contratação (20 de Outubro de 2026)

Origem: [auditoria-energia-facturacao-contratacao-2026-10-20.md](auditoria-energia-facturacao-contratacao-2026-10-20.md), secções C, D, E e G.

- [ ] **Regras ENE e o Regulamento n.º 8/2026:** confrontar os artigos das regras `ENE_*` com o RRC/RQS consolidados depois do Reg. 8/2026, incluindo os arts. 19.º e 81.º de `ENE_FIDELIZACAO_INDEMNIZACAO_19` e `ENE_DENUNCIA_SEM_ENCARGOS_81`. Trocar `fonte_url` pelo consolidado da ERSE com nova data de revisão (mudar o conteúdo sem nova data retira a revisão).
- [ ] **Potência contratada:** identificar a norma no RRC e redigir a regra, inactiva, para revisão. Não indicar artigo sem leitura.
- [x] **`ENE_GAS_TARIFA_SOCIAL_AUTO_6`** desactivada (20/10/2026, decisão de Thiago; `20261020150000_desativar_ene_gas_tarifa_social.sql`).
- [x] **Ajuda de documentos por tipo de problema** no passo 4 de `/tratar-caso` (20/10/2026).
- [x] **Limites temporais dos acertos** em `/problemas/energia/consumos-estimados` (20/10/2026, texto da secção E).
- [x] **Página `/problemas/energia/mudanca-de-comercializador-nao-autorizada`** criada (20/10/2026, aprovada por Thiago).

## Guia gratuito «Está a pagar mais do que devia?» (22 de Outubro de 2026)

Origem: [revisao-juridica.md](../../conteudos/guia-facturas/revisao-juridica.md) (conteúdo do e-book) e [rascunho-privacidade-guia-facturas.md](rascunho-privacidade-guia-facturas.md) (captação de e-mail). A Política `2026-10-22` cobre a página; os pontos abertos não bloqueiam a produção.

- [x] **Política de Privacidade:** versão `2026-10-22` com o guia gratuito e a autorização comercial sem conta (validada pela advogada, confirmado por Thiago a 22/10/2026).
- [ ] **Conteúdo do e-book:** pontos A1–A5 da revisão jurídica (LCE art. 129.º, prazo do Livro de Reclamações, actualizações de preço previstas no contrato, água sem fidelização, modelo de pedido de esclarecimento).
- [x] **Antes do primeiro envio comercial:** dupla confirmação do endereço (`confirmado_em`) e ligação para deixar de receber em cada e-mail — construídas a 21/10/2026 (migration `20261024090000`). Ainda não há envios.
- [ ] **Política de Privacidade:** confirmar com a advogada se a próxima versão deve mencionar o e-mail de confirmação do endereço e o registo da data da confirmação (prova do consentimento). Não bloqueia: a confirmação reforça a autorização já descrita.
- [ ] **Autorizações sem conta nunca confirmadas:** hoje ficam guardadas (nunca dão envios). Decidir um prazo de conservação e acrescentá-lo à limpeza.
- [x] **Prazos de conservação:** 12 meses para os pedidos; 3 anos para a prova das autorizações retiradas (validados com a Política `2026-10-22`).
- [ ] **Revisão periódica do e-book:** sempre que mudarem a LCE, o RRC/RQS da ERSE, o RRCAR ou a Lei n.º 23/96.

## Monitor de Protecção: electricidade e gás (21 de Outubro de 2026)

Origem: [auditoria-monitor-energia-2026-10-21.md](auditoria-monitor-energia-2026-10-21.md), secção 3. A Fase 1 é só factual (sem regras jurídicas); estes pontos bloqueiam apenas a **Fase 2**.

### Para a advogada

- [ ] Subida do preço durante a fidelização (RRC, art. 19.º, n.º 5): sinal ao revisor e texto ao cliente.
- [ ] Fidelização + tarifário indexado/dinâmico (art. 19.º, n.º 7): confirmar a proibição e o texto do aviso.
- [ ] Aviso prévio de 30 dias (art. 68.º): validar "Confirme se recebeu uma comunicação do comercializador sobre esta alteração".
- [ ] Repercussão das tarifas de acesso às redes num contrato de preço fixo: quando conta como alteração das condições.
- [ ] Acertos com consumos de mais de 6 meses (Lei n.º 23/96, art. 10.º): sinal ao revisor e texto.
- [ ] Serviços adicionais: validar "Se não pediu este serviço, vale a pena confirmar com o comercializador".
- [ ] Custo de saída em energia (art. 19.º, n.os 9 a 11): só o valor indicado pelo comercializador, com que ressalvas.
- [ ] Comparação de ofertas com o simulador da ERSE: condições de utilização e linguagem.
- [ ] Política de Privacidade/DPIA: consumo por período horário, potência e preços estruturados a partir das facturas.

### Revisões

- [ ] Confirmar os arts. 17.º, 19.º, 41.º, 42.º, 44.º, 68.º e 81.º do RRC no texto consolidado posterior ao Regulamento n.º 8/2026 e a qualquer outro acto de 2026.
- [ ] Depois de ligar `MONITOR_ENERGIA_ATIVO`: decidir a frase sobre electricidade e gás em `/protecao` (pt e en).

## Validações confirmadas (20 de Outubro de 2026)

Confirmadas por Thiago a 20/10/2026:

- [x] Protecção gratuita, primeira cobrança perto do fim do período: valem as **48 horas** dos Termos («menos de 2 dias»), sem nova versão dos Termos (advogada, confirmado por Thiago a 21/10/2026). O código passou de 49 h para 48 h (`MARGEM_MINIMA_INICIO_COBRANCA_MS`; o `trial_end` do Stripe fica no máximo 5 minutos depois do fim) e o preçário e as perguntas frequentes passaram a indicar a excepção.
- [x] Termos `2026-10-07` (programa de indicação).
- [x] Traduções inglesas dos textos legais e de consentimento.
- [x] Textos da Calculadora de Cancelamento e resumo da regra.
- [x] Energia Solar: os cinco pontos da secção 5 de [implementacao-energia-solar-2026-10-13.md](implementacao-energia-solar-2026-10-13.md).
- [x] Sede: mantém-se a morada actual (`MORADA_SEDE`); a mudança prevista deixou de estar pendente.
