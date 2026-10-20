# Rascunho — Política de Privacidade: guia gratuito e autorização comercial sem conta

**Estado:** rascunho para validação pela advogada. **Bloqueia a entrada em produção** da página `/guia-facturas` (`GUIA_FACTURAS_ATIVO=1`).
**Funcionalidade:** e-book gratuito «Está a pagar mais do que devia?» (página `/guia-facturas`, 22/10/2026). Migration `20261022090000_guia_facturas.sql`.

## 1. O que é tratado

| Finalidade | Dados | Fundamento proposto | Conservação |
|---|---|---|---|
| Disponibilizar o guia pedido e enviar a ligação por e-mail (uma vez em cada 24 horas, no máximo) | E-mail; idioma da página; data do primeiro e do último pedido; número de pedidos | Execução de diligências a pedido do titular (art. 6.º, n.º 1, al. b), RGPD) — **a validar**; alternativa: interesse legítimo | 12 meses depois do último pedido (apagado automaticamente) |
| Medir a origem dos pedidos (campanhas) | Origem classificada (Instagram, Facebook, anúncios Meta, directo, outro) e parâmetros UTM do primeiro pedido, ligados ao e-mail | Interesse legítimo em medir a eficácia das campanhas — **a validar** | O mesmo registo (12 meses) |
| Enviar dicas, novidades e comunicações comerciais da DoLado | E-mail; texto exacto e versão da autorização; data e hora; idioma; data da retirada | Consentimento (art. 6.º, n.º 1, al. a), RGPD; Lei n.º 41/2004, art. 13.º-A) | Enquanto a autorização estiver activa; depois da retirada, a prova é conservada 3 anos (**prazo a validar**) |

- Nenhuma conta é criada. Os pedidos e as autorizações não ficam ligados a contas da plataforma.
- Subcontratantes: Supabase (base de dados, UE), Clever Cloud (alojamento, UE) e Brevo (envio do e-mail, UE) — os que já constam da matriz. Não há fornecedores novos.
- Medição no browser (Google Analytics e Pixel da Meta): só com consentimento no Cookiebot, como no resto do site, e **sem o e-mail** nos eventos (`guia_view`, `guia_pedido`, `guia_download`, `guia_clique_protecao`; `Lead` e `GuiaDownload` no Pixel, só com consentimento de marketing). Já está coberto pela Política `2026-10-19`; confirmar que os novos eventos não exigem alterações.

## 2. Texto proposto para a Política de Privacidade (nova versão)

> **Guia gratuito.** Quando pede um guia gratuito no nosso site, tratamos o seu endereço de e-mail para lho disponibilizar e para lhe enviar a ligação por e-mail. Registamos também a data do pedido, o idioma e a origem da visita (por exemplo, uma publicação no Instagram ou um anúncio), para sabermos que canais funcionam. Não criamos nenhuma conta. Apagamos estes dados 12 meses depois do seu último pedido.
>
> **Comunicações comerciais.** Só lhe enviamos dicas, novidades e outras comunicações da DoLado se tiver dado autorização, marcando a caixa opcional. Essa autorização não é necessária para receber o guia. Guardamos o texto que aceitou, a versão, a data e a hora, como prova. Pode retirá-la a qualquer momento pela ligação incluída em cada comunicação ou escrevendo para privacidade@dolado.pt.

Secções a actualizar: finalidades e fundamentos, categorias de dados, conservação, direitos (retirada do consentimento).

## 3. Pontos para a advogada

- [ ] **Fundamento do envio do guia:** diligências a pedido do titular ou interesse legítimo?
- [ ] **E-mail transaccional com a ligação:** o texto não promove serviços (a promoção da Protecção só aparece na página, depois do download). Confirmar que este e-mail não é comunicação comercial.
- [ ] **Dupla confirmação antes do primeiro envio comercial:** a autorização é dada sem conta e sem confirmar o endereço, por isso alguém pode marcar a caixa com o e-mail de outra pessoa. Proposta: antes do primeiro envio comercial, um e-mail de confirmação («Confirme que quer receber…»), registado em `confirmado_em`. Só envia quem confirmou. Ainda por construir.
- [ ] **Deixar de receber:** cada comunicação comercial tem de incluir uma ligação para o fazer. Ainda por construir; não há envios comerciais.
- [ ] **Prazos:** 12 meses para os pedidos e 3 anos para a prova de autorizações retiradas.
- [ ] **Página em inglês:** o texto da autorização é gravado em português (versão vinculativa), com tradução informativa ao lado, como nos outros consentimentos.

## 4. Exercício de direitos (procedimento interno até haver automatização)

- **Acesso, rectificação ou apagamento:** procurar o e-mail em `guias_pedidos` e `consentimentos_comunicacoes_sem_conta` (só o admin lê) e responder pelo privacidade@dolado.pt. Apagar um pedido: `delete from public.guias_pedidos where email = '<e-mail>'`. Pode apagar-se também uma autorização retirada, se não for necessário conservar a prova.
- **Retirada da autorização:** `update public.consentimentos_comunicacoes_sem_conta set retirado_em = now(), retirado_motivo = 'pedido por e-mail' where email = '<e-mail>' and retirado_em is null`. O texto, a versão e a data da prova não podem ser alterados (trigger).
