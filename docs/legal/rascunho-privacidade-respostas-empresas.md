# Política de Privacidade — acompanhamento depois do envio (rascunho para validação)

**Estado: aprovado e publicado como Política `2026-10-06`** (texto aprovado por Thiago a 06/10/2026; DPA do
Resend obtido a 06/10/2026 — região e mecanismo de transferência na matriz de subcontratantes). Este documento
descreve o que muda no tratamento com o acompanhamento depois do envio (06/10/2026) e propõe o texto das
secções a alterar, para uma nova versão (`_versoes/vAAAA-MM-DD.tsx`, sem editar a publicada).

## Porquê

Até aqui, o trabalho registado na plataforma terminava no envio da reclamação. Passa a haver:

1. **Receção das respostas das empresas** num endereço técnico por caso
   (`caso-<código>-<token>@respostas.dolado.pt`), através do **Resend** (fornecedor novo, só para a receção:
   o Resend recebe a mensagem, avisa a DoLado e a DoLado obtém o conteúdo e os anexos pela API). Os envios
   de e-mail continuam todos na Brevo. (Decisão de 06/10/2026: a receção pela Brevo exigia um plano pago.) Também o **registo manual** de respostas recebidas por carta, telefone,
   Livro de Reclamações ou outro endereço.
2. **Conservação dessas comunicações e dos anexos** no caso (Supabase, UE), como prova: texto, HTML original,
   remetente, destinatários, data, alguns cabeçalhos técnicos e anexos de tipos permitidos.
3. **Análise preliminar da resposta pela Claude API (Anthropic)** — interna, sempre revista por uma pessoa;
   nunca decide, nunca é mostrada ao cliente. Desligada por omissão (`ANALISE_RESPOSTA_IA_ATIVO`).
4. **Pedidos de informação ao cliente** e envio de ficheiros pelo cliente no portal; confirmação, pelo
   cliente, de que o problema ficou resolvido.

## O que muda no tratamento

| Ponto | Hoje (Política 2026-10-05) | Com o acompanhamento |
|---|---|---|
| Dados do caso (secção 2) | Descrição, documentos, texto preparado, autorização, texto enviado, comprovativo, histórico | Também: **comunicações recebidas da empresa** (ou de terceiros) relacionadas com a reclamação — conteúdo, anexos, remetente, data — e a **análise e decisões** da DoLado; informação e ficheiros enviados pelo cliente a pedido da DoLado; confirmação da resolução |
| Dados de terceiros (secção 2) | — | As respostas trazem **dados de trabalhadores da empresa visada** (nome, e-mail profissional, assinatura). Tratados só como parte da prova do caso; nunca usados para outra finalidade |
| Finalidade (secção 3) | "… e acompanhar o caso" | Explicitar: receber e analisar as respostas da empresa, informar o cliente do estado, pedir-lhe informação, preparar novas comunicações (sempre com autorização) e registar o desfecho |
| Fundamento (secção 3) | Execução do contrato (art. 6.º, n.º 1, al. b) | Sem alteração para o cliente. Para os dados dos trabalhadores da empresa: **interesse legítimo** (art. 6.º, n.º 1, al. f) — tratar e provar a reclamação. A validar pela advogada |
| IA (secção 4) | Monitor (extração) e proposta do texto | **Terceiro uso:** análise preliminar da resposta recebida. Enviados: problema descrito pelo cliente, última comunicação enviada, até 3 comunicações anteriores (resumidas), a resposta recebida (texto), o domínio do remetente e o tipo dos anexos. Antes do envio retiram-se e-mails, telefones, números longos, IBAN, códigos postais e o nome do cliente (melhor esforço). Nunca: nome/e-mail/telefone da conta, endereço técnico, cabeçalhos, ficheiros anexos. Revisão humana sempre; sem decisões automatizadas (art. 22.º) |
| Subcontratantes (secção 5) | Brevo: envio de e-mails; Anthropic: Monitor e proposta do texto | **Novo: Resend** — receção dos e-mails dirigidos aos endereços dos casos e disponibilização à DoLado (conteúdo, anexos, cabeçalhos). Empresa com sede nos EUA: **a validar** região do processamento, prazo de conservação das mensagens do lado do Resend, DPA e mecanismo de transferência (SCCs / Data Privacy Framework). **Anthropic:** também a análise preliminar das respostas. Brevo sem alteração |
| Conservação (secção 6) | Casos: durante o acompanhamento e enquanto a conta existir; depois, prova até à prescrição | Sem prazo novo: comunicações recebidas, anexos, análises e decisões **seguem o caso**. Proposta: acrescentar "comunicações trocadas com a empresa e respetivos anexos" à linha "Casos". Registo técnico do webhook (sem conteúdo nem endereços): 90 dias. E-mails sem caso (quarentena: destinatário, remetente, assunto, data, motivo — sem corpo nem anexos): 90 dias |
| Direitos (secção 7) | — | Sem alteração |

## Proposta de texto (para a advogada)

**Secção 2 — Dados do caso** (acrescentar): "as comunicações recebidas da empresa visada ou de outras entidades
sobre a reclamação — por e-mail, através de um endereço próprio do caso, ou registadas pela DoLado quando chegam
por outro meio —, incluindo os anexos, o remetente e a data; a análise dessas comunicações e as decisões da
DoLado sobre o passo seguinte; a informação e os ficheiros que o Utilizador envia a pedido da DoLado; e a
confirmação do Utilizador sobre a resolução do problema."

**Secção 2 — Dados de terceiros** (acrescentar): "As comunicações da empresa visada podem conter dados de
pessoas que trabalham para essa empresa (por exemplo, nome e contacto profissional). A DoLado conserva-os
apenas como parte do registo da reclamação."

**Secção 4 — IA** (acrescentar terceiro ponto): "no acompanhamento da reclamação, para preparar uma análise
preliminar interna das respostas recebidas da empresa — o que foi respondido, o que ficou por responder e o
passo seguinte possível —, sempre revista por uma pessoa da equipa DoLado, que decide o que fazer. Esta análise
não é mostrada ao Utilizador nem enviada à empresa." e, na minimização: "Para essa análise, o prestador recebe
o problema descrito pelo Utilizador, a última comunicação enviada pela DoLado e a resposta recebida, sem o nome,
o e-mail nem o telefone do Utilizador, nem os ficheiros anexos."

**Secção 5 — Resend** (acrescentar): "Resend (receção dos e-mails enviados para os endereços próprios de cada
caso, que disponibiliza à DoLado, na qualidade de subcontratante). O Resend é uma empresa com sede nos Estados
Unidos; [região e mecanismo de transferência a indicar depois de confirmados no DPA]".

## Antes de ligar

- Validar o texto acima com a advogada e publicar a nova versão (subir `PRIVACIDADE_VERSAO`).
- Atualizar `docs/legal/matriz-subcontratantes.md` (Resend — linha nova, marcada "a validar"; Anthropic).
- **Assinar o DPA com o Resend** e confirmar: região de processamento/armazenamento das mensagens recebidas,
  prazo de conservação do lado do Resend (e se é possível apagar), subcontratantes ulteriores e mecanismo de
  transferência para os EUA.
- Só depois: configurar o MX de `respostas.dolado.pt` / o webhook do Resend e `ANALISE_RESPOSTA_IA_ATIVO=1`.

Termos e Condições: **sem alteração necessária** — a secção do serviço já diz que a DoLado "acompanha o caso",
"pode pedir esclarecimentos ou documentos adicionais", "acompanha o prazo de resposta e informa o Utilizador",
e que qualquer texto alterado "tem de ser novamente autorizado antes do envio".
