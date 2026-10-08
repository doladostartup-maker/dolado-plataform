# Decisões jurídicas e registo de tratamento — 8 de outubro de 2026

Estado: decisões aprovadas pela advogada, conforme confirmação do responsável do projeto. Este registo acompanha as versões legais 2026-10-08 e as alterações de aplicação/migration associadas. A Edge Function e as migrations foram publicadas/aplicadas em produção a 08/10/2026; o deploy do código (que põe em vigor a Política e os Termos 2026-10-08) continua por executar (ver secção 6).

## 1. Decisões fechadas

### Dados de saúde e outras categorias especiais

- O serviço não solicita dados de saúde como regra. Se surgirem incidentalmente num documento, devem ser minimizados, ocultados ou removidos, salvo necessidade estrita e documentada.
- O tratamento exige cumulativamente um fundamento do artigo 6.º e uma condição autónoma do artigo 9.º do RGPD. Para uma funcionalidade pedida: artigo 6.º, n.º 1, alínea b), com consentimento explícito, específico e revogável do artigo 9.º, n.º 2, alínea a). Para declarar, exercer ou defender um direito: artigo 6.º, n.º 1, alínea f), com o artigo 9.º, n.º 2, alínea f), limitado ao necessário para esse direito.
- O upload de um documento não constitui consentimento explícito. O acesso fica restrito às pessoas que tratam o caso. Não se inicia tratamento sistemático desta categoria antes da avaliação de risco e da decisão documentada de AIPD.
- Dados de terceiros são tratados apenas quando necessários ao caso, com instrução para ocultar os dados irrelevantes. Não são reutilizados para outros fins.

### Comunicações comerciais

- A autorização tem de ser facultativa, separada da compra/abertura do caso, não pré-selecionada e demonstrável por texto, data e titular. A retirada produz efeito imediato nos envios.
- A retirada não apaga automaticamente a prova mínima da autorização/retirada. Conserva-se o registo restrito por 5 anos desde a retirada ou a última comunicação comercial, consoante a data mais recente, para demonstrar cumprimento e responder a reclamações; depois elimina-se, salvo processo pendente. Não se conserva o perfil de marketing para outro fim. O prazo foi fixado à luz da prescrição de cinco anos do procedimento contraordenacional quando a coima máxima aplicável atinge €49 879,79; a Lei n.º 41/2004 prevê coima máxima de €2 500 000 para pessoas coletivas.
- A DoLado não envia comunicações comerciais em nome dos parceiros nem lhes fornece a lista de clientes indicados.

### Avulso e subscrição

- Não há conversão automática. É necessária uma nova escolha e confirmação expressa da subscrição.
- Um Avulso pago, elegível e ainda não usado cobre uma mensalidade; a diferença é reembolsada uma vez para o método de pagamento original, depois de a subscrição estar confirmada. O caso Avulso deixa de estar disponível. A partir do segundo mês aplica-se o preço mensal normal.
- Avulso já utilizado não é convertível. A regra comercial não limita o direito de livre resolução ou outros direitos imperativos.

### Seguro profissional e âmbito do serviço

- A Lei n.º 10/2024 regula a consulta jurídica como atividade reservada e prevê seguro de responsabilidade civil profissional para o advogado/consultor jurídico que preste esses serviços nos termos do artigo 7.º, n.º 6. A aplicação à operação da DoLado depende do conteúdo efetivo do serviço e de quem o presta; uma cláusula de exclusão nos Termos não altera, por si só, a qualificação legal.
- Decisão operacional: manter a descrição do serviço como apoio factual/administrativo ao consumidor, não oferecer consulta jurídica individualizada nem representação; obter confirmação da advogada sobre a qualificação da redação e revisão dos casos e contratar seguro antes de alargar a atividade caso esta se enquadre no regime. Coberturas a solicitar: responsabilidade por erro/omissão profissional, custos de defesa, atos de colaboradores/subcontratados, reclamações relativas a documentos e aconselhamento, continuidade/retroatividade e território Portugal/UE.
- A recomendação é contratar seguro adequado mesmo que a obrigação não se aplique à estrutura atual, atendendo ao risco de redação e acompanhamento individualizados.

## 2. Proposta consolidada de tratamento e ROPA

| Atividade | Titulares/dados | Finalidade e base | Destinatários | Conservação/controlo |
|---|---|---|---|---|
| Conta, pedido e caso | Cliente; contacto, descrição, documentos, comunicações, autorizações e histórico | Art. 6.º, n.º 1, al. b), para serviço pedido; al. c) para deveres legais; al. f) para segurança/prova/defesa de direitos | Supabase, Clever Cloud, Brevo, Resend; empresa reclamada, Livro de Reclamações e entidade pública apenas após autorização/necessidade | Registos do caso enquanto a conta existir; reavaliar anexos no encerramento e eliminar os que deixem de ser necessários; prova mínima pelo prazo de defesa aplicável |
| Dossiê PDF e versões | Titular e terceiros mencionados; informação factual, documentos e comunicações do caso | Art. 6.º, n.º 1, al. b); prova/defesa quando aplicável, al. f) | Supabase Storage UE | Até 6 meses após o último encerramento (caso ainda encerrado); eliminação diária por Edge Function, mantendo só registos/provas cuja conservação seja necessária. Não abrange `casos.dossie_url` nem anexos |
| Monitor de Proteção | Titular e outros nomes/NIF que surjam em faturas; documentos, dados extraídos, condições, alertas e correções | Art. 6.º, n.º 1, al. b); segurança/prova e recuperação temporária, al. f) | Supabase, Clever Cloud, Anthropic API | Documento rejeitado: imediato; documento/serviço acompanhado: conforme estado de acompanhamento; dados desativados após fim da Proteção: 6 meses, depois eliminação automatizada |
| Leitura IA no Monitor | Conteúdo do documento escolhido pelo utilizador, incluindo dados incidentalmente presentes | Mesma finalidade do Monitor; minimização reforçada; categorias especiais sujeitas também ao art. 9.º | Anthropic API como subcontratante; URL assinada por 5 minutos, sem Files API/persistência própria | Anthropic: até 30 dias na configuração atual; conta sem zero data retention. Excluir informação especial/terceiros desnecessária antes do envio |
| Rascunho/análise IA de reclamação | Descrição, setor, empresa, tipo de problema e comunicação necessária, sem identificadores diretos nem anexos | Art. 6.º, n.º 1, al. b); para dados especiais, apenas com condição art. 9 aplicável | Anthropic API | Registos mínimos do modelo/uso sem conteúdo; entradas/saídas da API sujeitas à retenção publicada pelo prestador |
| Marketing | Cliente que deu consentimento; endereço e prova do opt-in/retirada | Art. 6.º, n.º 1, al. a), para envio; al. f), para prova e defesa de direitos; Lei n.º 41/2004 quando aplicável a comunicações eletrónicas | Brevo | Até retirada; depois prova mínima por 5 anos desde retirada ou última comunicação, consoante a data mais recente; eliminação posterior, salvo processo pendente |
| Cookies de origem `dolado_origem` e `dolado_estatisticas` | Visitante; identificador de campanha em `?ref=`, primeira visita (só para validar a atribuição) e marca técnica da escolha de estatística (dada/recusada) | Consentimento prévio de estatística para acesso/armazenamento no equipamento; Lei n.º 41/2004 e art. 6.º, n.º 1, al. a), RGPD | Não há envio à Stripe, Google ou parceiros. Registo interno em `utilizadores.acquisition_source` | Ambos até 30 dias; apagar cookies e campo da conta ao retirar consentimento; eliminar também com a conta |
| Medição | Visitante; eventos e dados técnicos (incluindo conversão, se permitido) | Consentimento prévio separado no Cookiebot | Google Analytics/Ads, GTM | Apenas depois do consentimento da categoria; configurações de conservação devem corresponder aos prazos exibidos pelo Cookiebot |
| Pagamento/subscrição | Cliente; plano, montante, fatura, reembolso e identificadores Stripe | Art. 6.º, n.º 1, al. b) e c); Stripe atua nas qualidades descritas na Política | Stripe; dados de pagamento não recebidos pela DoLado | Prazo contabilístico/fiscal aplicável a cada documento; sem copiar `acquisition_source` para metadata |

## 3. AIPD — triagem documentada

**Decisão preliminar para o piloto atual:** não foi identificada uma operação planeada de tratamento em larga escala de dados de saúde. A leitura de faturas/contratos envolve avaliação automatizada de dados financeiros e de utilização de serviços, monitorização do serviço escolhido e apoio por IA; por isso, é necessário conservar esta triagem e reavaliá-la antes de qualquer tratamento sistemático de dados do artigo 9.º, expansão de volume, perfilagem ou decisão com efeito relevante.

**Medidas obrigatórias antes de ampliar o uso:** (1) mapear escala e categorias reais; (2) avaliar necessidade/proporcionalidade e alternativas sem IA; (3) testar a filtragem de dados especiais/terceiros; (4) restringir acessos e conservar logs; (5) confirmar subcontratação, localização e retenção da Anthropic; (6) decidir formalmente se os critérios do artigo 35.º RGPD e orientações da CNPD exigem AIPD completa. Repetir a triagem quando produto, volume ou fornecedores mudarem.

**Resultado atual:** AIPD completa não iniciada; a triagem não autoriza recolha intencional nem uso sistemático de dados de saúde. A decisão deve ser revista pela responsável pelo tratamento e confirmada pela advogada antes de alargar o piloto.

## 4. Alterações aplicadas ao produto e documentos (no repositório; por publicar)

- **Política de Privacidade 2026-10-08** (`src/app/(legal)/privacidade/_versoes/v2026-10-08.tsx`): bases dos arts. 6.º/9.º e dados de saúde incidentais (upload ≠ consentimento explícito; acessos restritos; triagem AIPD), dados de terceiros, mensagens recebidas, dossiês PDF com prazo próprio, prazos separados entre caso e Monitor, cópia da fatura do caso só por escolha do titular, Claude API (URL assinada de 5 minutos, sem Files API, retenção do fornecedor até 30 dias, sem retenção zero), origem `?ref=` e cookies `dolado_origem`/`dolado_estatisticas` com consentimento prévio, origem só na conta (nunca na Stripe nem em parceiros), faturas/pagamentos, parceiros sem acesso a dados dos clientes indicados, prova de consentimento comercial por 5 anos (prazo interno para defesa de direitos, não prazo legal expresso).
- **Termos 2026-10-08** (`src/app/(legal)/termos/_versoes/v2026-10-08.tsx`): secção 2 (a revisão humana não substitui aconselhamento jurídico independente); secção 10 (adesão Avulso → subscrição expressa e não automática, elegibilidade, reembolso uma só vez, perda do caso Avulso convertido, direitos imperativos preservados). Preços e lógica comercial inalterados.
- **`?ref=` e cookies** (`src/lib/origemAquisicao.ts`, `MedicaoComConsentimento`, `origemAquisicaoServidor.ts`, middleware, `/api/privacidade/origem-aquisicao`, migration `20261008110000_origem_aquisicao_retirada.sql`):
  - os cookies só são criados no browser depois de o Cookiebot responder com consentimento de estatística (`dolado_estatisticas=1` + `dolado_origem`, 30 dias, `Domain=.dolado.pt`); sem resposta no banner (ou sem Cookiebot, ex.: `portal.dolado.pt` não autorizado) nada é criado;
  - recusa/retirada: `dolado_estatisticas=0`, `dolado_origem` apagado (também pelo middleware, incluindo cookies antigos httpOnly) e a origem da conta apagada por `origem_aquisicao_retirar()` — de imediato se houver sessão no domínio (rota POST, só aceita pedidos do próprio site), ou na próxima interação autenticada (registo, callback, código, início de sessão, Checkout) através da marca `0`;
  - a origem nunca passa de um valor para outro (trigger, para todos); só pode passar a null pela função de retirada; uma conta já existente não volta a ser atribuída por um `?ref=` posterior;
  - `acquisition_source` deixou de ir para a metadata da Stripe e deixou de ser lida dela (`/criar-conta`).
- **Dossiês PDF** (`casos_dossies`): rotina diária (Edge Function `limpar-dossies-expirados` + migration `20261008130000_retencao_dossies_pdf.sql`, 03:15 UTC) apaga todas as versões 6 meses depois do **último** encerramento, se o caso continuar num estado final (um caso reaberto mantém-nas). Objeto do Storage pelo caminho exato primeiro, registo depois; repetível depois de falhas parciais; lotes de 100; protegida por `CRON_SECRET`. **Não** apaga `casos.dossie_url`, anexos originais nem o registo factual do caso.
- **Procedimento no encerramento do caso** (manual, Thiago): rever os anexos originais, eliminar os que já não sejam necessários e registar a justificação para os que permaneçam por necessidade probatória. A rotina diária não trata estes anexos nem os links antigos em `casos.dossie_url`.
- **RAL** (`ENTIDADES_RAL` em `src/lib/legal.ts`): confrontada a 08/10/2026 com a lista da DGC (10 centros de competência genérica + 2 "Centros de Arbitragem para Conflitos Específicos": CIMPAS e Provedor da APAVT). No portal e no PDF, "Centros a consultar" só lista os gerais; as entidades setoriais têm secção própria; a lista é apresentada como informativa, sem indicar a entidade competente.
- **Base de regras** (migration `20261008120000_revisao_regras_juridicas_aprovada.sql`; textos confrontados com o Diário da República e o RRC consolidado da ERSE): nova `COMPRA_INDISPONIBILIDADE_DISTANCIA_19` (DL 24/2014, art. 19.º, incluindo n.os 4 e 5); `COMPRA_ENTREGA_PRAZO_11`/`_REEMBOLSO_11` distinguem o art. 11.º do DL 84/2021; nova `GAS_CORTE_AGENDAMENTO_79_7` e `GAS_CORTE_PREAVISO_79` revista (n.º 7: cinco dias úteis no gás, distinto do pré-aviso e do n.º 11); `CCG_BOAFE_CONSUMIDOR` sem nulidade automática, regra geral (sem setor, categoria "Contrato") e com os arts. 20.º a 22.º do DL 446/85 aplicáveis a consumidores. As seis ficam ativas com `revista_em = 2026-10-08`, `revista_por = 'advogada'`; a migration falha se uma regra que altera não existir.

## 5. Riscos e dependências externas remanescentes

- A advogada deve confirmar se a operação real da DoLado pode ser qualificada como consulta jurídica individualizada e, consequentemente, qual o seguro obrigatório ou recomendável. A Lei n.º 10/2024 é posterior à antiga Lei n.º 49/2004.
- `portal.dolado.pt` não é autorizado no Cookiebot (plano gratuito = 1 domínio; decisão de Thiago, 08/10/2026). O código falha fechado nesse domínio: não cria cookies nem carrega medição. A atribuição funciona porque os cookies são criados no banner de `dolado.pt` com `Domain=.dolado.pt`; as ligações `?ref=` dos parceiros têm de apontar para `dolado.pt`. A retirada faz-se no banner de `dolado.pt` e é aplicada à conta na interação autenticada seguinte.
- O Cookiebot tem de classificar `dolado_estatisticas` como necessário (regista a escolha, incluindo a recusa) e `dolado_origem` como estatística. Se o Cookiebot apagar a marca `0` numa recusa, a origem da conta só é apagada pela rota de retirada (com sessão no domínio) e não na interação seguinte.
- A atribuição continua desligada por omissão (`ORIGEM_AQUISICAO_ATIVO`); a flag é lida no servidor e passada ao componente de medição — as páginas estáticas só a refletem depois de um novo build/deploy.
- A remoção de `acquisition_source` da Stripe aplica-se a novas sessões. Metadata já gravada em sessões/subscrições existentes requer limpeza administrativa separada na Stripe; não foi alterada remotamente.
- Atribuições legadas de contas em que não ocorra nova retirada não são alteradas remotamente nesta tarefa. Uma limpeza em lote, se decidida, deve usar `select public.origem_aquisicao_retirar(id) from public.utilizadores where acquisition_source is not null;` (o trigger recusa um `update` direto).
- Retenção da Anthropic: a Política diz "até 30 dias"; confirmar a retenção publicada em vigor antes de cada revisão da Política.
- Não foram consultadas contas de produção nem enviados dados a terceiros durante esta tarefa.

## 6. Tarefas manuais (Thiago), por ordem

1. ✅ (08/10/2026, exceto `portal.dolado.pt`, que não é autorizado — plano gratuito) **Cookiebot Manager** (domain group `dafec895-…`): declarar `dolado_estatisticas` (Necessário; regista a escolha sobre estatística; 30 dias; `.dolado.pt`) e `dolado_origem` (Estatística; origem `?ref=`; 30 dias; `.dolado.pt`); confirmar em `dolado.pt` e em `portal.dolado.pt` que o banner aparece, que nada de estatística corre antes do consentimento e que, ao retirar, `dolado_origem` desaparece e `dolado_estatisticas` passa a `0`.
2. **Supabase → Edge Functions → Secrets**: confirmar que `CRON_SECRET` é igual ao segredo do Vault `alertas_fidelizacao_cron_secret` (é o que `verificar-monitor-datas` já usa).
3. ✅ (08/10/2026) **Publicar a Edge Function**: `supabase functions deploy limpar-dossies-expirados` (com `verify_jwt = false`, de `supabase/config.toml`).
4. ✅ (08/10/2026; a primeira tentativa da `20261008120000` foi revertida pela verificação final — três regras já tinham revisão de 08/10 dada no backoffice — e a migration foi corrigida para limpar a revisão anterior antes de gravar a nova) **Migrations**: `supabase db push --linked --dry-run`; confirmar que lista, por esta ordem, `20261008110000_origem_aquisicao_retirada`, `20261008120000_revisao_regras_juridicas_aprovada` e `20261008130000_retencao_dossies_pdf` (e `20261008090000`/`20261008100000`, se ainda não aplicadas); depois `supabase db push --linked`. Antes do deploy do código.
5. **Deploy da aplicação** (merge → Clever Cloud). Só então a Política e os Termos 2026-10-08 passam a estar em vigor no site.
6. **Supabase → Integrations → Cron**: no dia seguinte, verificar a execução de `limpar-dossies-expirados-diario` (resposta 200; 500 = falhas a tratar, ver os registos da Edge Function).
7. **Stripe**: rever a metadata `acquisition_source` em sessões/subscrições antigas e removê-la, se a revisão confirmar que pode ser apagada.
8. **Dados históricos**: decidir com a advogada se as `acquisition_source` antigas se apagam em lote (comando no ponto 5 acima).
9. **Seguro e âmbito**: confirmar com a advogada a qualificação à luz da Lei n.º 10/2024 e, se aplicável, contratar seguro de responsabilidade civil profissional (erro/omissão, custos de defesa, colaboradores/subcontratados, atos passados/continuidade, Portugal/UE).
10. **Encerramento dos casos**: adotar o procedimento escrito de revisão dos anexos (secção 4).
11. ✅ (08/10/2026; efetivo nas páginas estáticas a partir do build seguinte) **Ligar a atribuição** (`ORIGEM_AQUISICAO_ATIVO=1` no Clever Cloud + novo deploy) só depois dos pontos 1, 4 e 5.

## Fontes primárias

- RGPD, artigos 6.º, 9.º, 22.º, 30.º e 35.º: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Lei n.º 41/2004, artigo 5.º: https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2004-58213879
- Lei n.º 41/2004, artigos 13.º-A e 14.º: https://diariodarepublica.pt/dr/detalhe/lei/41-2004-480710
- Regime Geral das Contraordenações, artigo 27.º: https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1982-34484875
- Lei n.º 10/2024: https://diariodarepublica.pt/dr/detalhe/lei/10-2024-837135330
- DL n.º 24/2014, artigo 19.º: https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-73222992
- DL n.º 84/2021, artigo 11.º: https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2021-172938301
- RRC aprovado pelo Regulamento n.º 827/2023: https://diariodarepublica.pt/dr/detalhe/regulamento/827-2023-216305857
- Lista RAL da DGC: https://www.consumidor.gov.pt/ral-mapa-e-lista-de-entidades
- Regime jurídico das cláusulas contratuais gerais (DL n.º 446/85): https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1985-34436475
