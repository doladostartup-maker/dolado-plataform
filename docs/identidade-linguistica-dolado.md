# Identidade linguística da DoLado

Norma oficial, permanente e obrigatória desde 19/10/2026 (decisão de Thiago). Aplica-se a todo o texto em português que a DoLado produz: site, portal, backoffice, e-mails, documentos gerados, prompts de IA, materiais comerciais e de marketing. Referência obrigatória sempre que se cria ou altera um texto.

## 1. A norma

**Português europeu clássico, na ortografia tradicional anterior ao Acordo Ortográfico de 1990.**

Não basta evitar o português do Brasil: a DoLado usa deliberadamente a grafia tradicional portuguesa. É uma escolha de identidade — uma empresa portuguesa, que presta serviços a consumidores em Portugal, a escrever como se escreve em Portugal.

A ortografia tradicional não significa vocabulário arcaico nem linguagem rebuscada: o tom continua claro, próximo e profissional.

O inglês britânico (`/en/…`) não muda.

## 2. Regras ortográficas

### Consoantes que o Acordo retirou

Mantêm-se o **c** e o **p** das famílias latinas (*-ct-*, *-cç-*, *-pt-*, *-pç-*):

| Não usar (Acordo de 1990) | Usar (ortografia tradicional) |
|---|---|
| proteção, Caso + Proteção | protecção, Caso + Protecção |
| fatura, faturação | factura, facturação |
| atual, atualmente, atualização, atualizar | actual, actualmente, actualização, actualizar |
| ação, ações, reação, transação, redação | acção, acções, reacção, transacção, redacção |
| correção, correto, incorreto | correcção, correcto, incorrecto |
| direção, direto, diretamente, diretiva | direcção, directo, directamente, directiva |
| eletricidade, elétrico, eletrónico | electricidade, eléctrico, electrónico |
| setor, setores, setorial | sector, sectores, sectorial |
| objetivo, objeto, projeto | objectivo, objecto, projecto |
| ativo, ativar, ativação, atividade, desativar, inativo | activo, activar, activação, actividade, desactivar, inactivo |
| selecionar, seleção, seletor | seleccionar, selecção, selector |
| detetar, deteção, detetámos | detectar, detecção, detectámos |
| respetivo, afetar, afetado | respectivo, afectar, afectado |
| exceção, exceto, excecional | excepção, excepto, excepcional |
| exato, exatamente, exatidão | exacto, exactamente, exactidão |
| ótimo, otimizar | óptimo, optimizar |
| perspetiva, receção, adotar, efetuar, efetivo | perspectiva, recepção, adoptar, efectuar, efectivo |
| aspeto, fator, teto, ato, ator, arquitetura | aspecto, factor, tecto, acto, actor, arquitectura |
| retificar, retroativo, coletivo, injeção | rectificar, retroactivo, colectivo, injecção |

A tabela é exemplificativa. **Não fazer substituições globais às cegas**: muitas palavras têm a mesma grafia antes e depois do Acordo (*relativo*, *alternativa*, *iniciativa*, *direito*, *informação*, *contacto*, *facto*, *aceitar*, *secção*) e algumas mudam de sentido (*corretor* de seguros ≠ *corrector* de textos). Em caso de dúvida, consultar um dicionário português que distinga a grafia anterior e posterior ao Acordo (ex.: Priberam, opção "grafia anterior").

### Outras regras

- **Meses com maiúscula:** "19 de Outubro de 2026", "Janeiro", abreviaturas "Out.". Os dias da semana continuam com minúscula ("segunda-feira").
- **Hífen nos prefixos antes de vogal diferente, *h*, *r* ou *s*:** "auto-indicação", "pré-aviso", "anti-social", "contra-ordenação", "infra-estrutura".
- **Acentos que o Acordo retirou:** "lêem", "vêem", "dêem", "crêem"; "pára" (verbo).

## 3. Tom de voz

- Claro, profissional, acessível e próximo. Frases curtas. Sem jargão jurídico desnecessário.
- Prudente: nunca prometer resultados nem concluir que uma empresa violou a lei.
- Explicar porquê: quando se fala de contratos, facturas, datas, preços ou condições, dizer como essa informação ajuda a prevenir ou a resolver um problema do consumidor (ver "Posicionamento do produto" no `CLAUDE.md`).

## 4. Tratamento dos consumidores

Terceira pessoa, sempre: "por si", "consigo", "a sua", "Preencha", "Conte-nos". Nunca "tu" ("preenche", "o teu") nem "você".

## 5. Vocabulário preferencial

| Usar | Evitar |
|---|---|
| ecrã | tela |
| telemóvel | celular |
| ficheiro | arquivo |
| registo | cadastro |
| e-mail, e-mails (com hífen) | email |
| palavra-passe | senha |
| no prazo máximo de 2 dias úteis | em até, 24 horas, 48 horas |
| área de cliente | painel do usuário |
| carregar (um documento) | fazer upload |

## 6. Expressões a evitar

Construções do português do Brasil ("a gente", "em até", "estar fazendo"), traduções literais do inglês ("fazer sentido" em excesso, "endereçar um problema", "aplicar para"), estrangeirismos desnecessários ("feedback", "update", "check") e frases comerciais artificiais ("solução 360º", "experiência premium").

## 7. Terminologia comercial oficial

- A marca é **a DoLado** — feminino, com L maiúsculo ("da DoLado", "com a DoLado"). Nunca "o DoLado" nem "Dolado".
- Planos: **Protecção**, **Caso + Protecção**, **Avulso**, **Caso Extra**. Nunca "Assinatura", "créditos", "saldo" nem "mês grátis".
- "subscrição", "casos disponíveis", "Protecção gratuita durante 30 dias".
- Funcionalidades: "Os meus serviços", "Monitor de Protecção", "Comparação de facturas", "Aviso sectorial".
- Os identificadores técnicos continuam como estão (`protecao`, `caso_protecao`, `/protecao`, `faturas_monitor`, `setor`): só o texto mostrado segue a norma.

## 8. Documentos gerados

Reclamações, novas comunicações, dossiês PDF, resumos mensais, e-mails e qualquer documento descarregável seguem a norma. A regra vive nos **modelos e mecanismos** que geram os documentos (ex.: `src/lib/dossie/modelo.ts`, `src/lib/resumoMensal/resumo.ts`, `src/lib/email/`), não só nos exemplos. Ao mudar o texto de um modelo, subir a versão do modelo (`DOSSIE_MODELO_VERSAO`, `RESUMO_MODELO_VERSAO`…).

**Nunca alterar:** documentos já gerados e finalizados, comprovativos, textos já enviados, declarações e descrições escritas pelos clientes, respostas das empresas, documentos recebidos e registos de prova (consentimentos, autorizações).

## 9. Inteligência artificial

Todos os prompts que geram texto em português incluem a instrução obrigatória, centralizada em **`src/lib/ia/normaLinguistica.ts`** (`INSTRUCAO_NORMA_LINGUISTICA`, `BLOCO_NORMA_LINGUISTICA`). Hoje: sugestão do texto da reclamação e nova comunicação (`src/lib/rascunhoIA/prompt.ts`) e análise das respostas das empresas (`src/lib/analiseResposta/prompt.ts`). Funcionalidade nova com IA que escreva português = incluir o bloco e subir a versão do prompt.

A IA nunca reescreve a descrição do consumidor, citações, referências jurídicas nem elementos documentais. Os prompts de extracção factual do Monitor (`src/lib/monitor/extracao*.ts`) não produzem texto para o cliente e ficaram como estavam; passam à norma na próxima versão do prompt.

O texto que chega à IA pode vir em qualquer grafia (dos clientes, das empresas): as verificações e as máscaras de dados pessoais aceitam as duas (ex.: "Diretiva"/"Directiva" em `src/lib/rascunhoIA/validacao.ts`).

## 10. Excepções

- **Versões legais já publicadas** (Termos, Política de Privacidade, textos de consentimento): imutáveis, na grafia em que foram aceites. A ortografia tradicional entra por versões novas: Termos `2026-10-19`, Política `2026-10-19b`, consentimento de comunicações `2026-10-19`, formulário de livre resolução `2026-10-19`. Mudança só ortográfica: nunca alterar direitos, obrigações, prazos ou condições.
- **Citações normativas e transcrições** (texto de leis, regras jurídicas em `regras_juridicas`, documentos recebidos): mantêm a redacção oficial, mesmo que seja a do Acordo.
- **Valores gravados na base de dados** (ex.: a categoria "Faturação" das regras jurídicas, estados, tipos): não mudam; se aparecem ao cliente, mostram-se através de um rótulo.
- **Inglês** (`en-GB`): inalterado.
- **Identificadores técnicos**: tabelas, colunas, variáveis, funções, chaves de tradução, eventos, rotas, slugs, IDs da Stripe.

As excepções do código estão em `src/lib/normaLinguistica/excecoes.ts`, cada uma com o motivo.

## Verificação automática

- `src/lib/normaLinguistica/verificacao.test.mjs` corre no `npm test` (e no CI) e falha se um texto visível usar a grafia do Acordo. Olha só para texto (strings, JSX, templates, e-mails HTML); ignora identificadores, valores técnicos, comparações, consultas, valores da base de dados, testes, inglês e versões legais publicadas.
- Regras palavra a palavra: `src/lib/normaLinguistica/ortografia.ts` (testes em `ortografia.test.mjs`). Palavra nova = regra nova + teste.
- Corrigir de uma vez: `node scripts/dev/ortografia-tradicional.mjs --corrigir`, rever o diff, `npx tsc --noEmit` (as traduções inglesas têm chaves em português que têm de acompanhar) e `npm test`.

## Fora do repositório (manual)

Textos que vivem noutras plataformas e têm de ser revistos à mão: nomes dos produtos na Stripe (recibos, Checkout, facturas da Stripe), templates da Supabase Auth colados no Dashboard (têm de acompanhar `supabase/templates/*.html`), remetente e rodapé na Brevo, anúncios Google/Meta, perfil e mensagens de WhatsApp, Crisp, materiais comerciais e imagens com texto.
