# Deploy com o build feito no Mac (preparado a 22/10/2026 — **ainda não activo**)

Hoje o deploy é feito pela Clever: cada merge no `main` → GitHub → Clever compila numa instância de build **M** → arranca no **XS**. Este documento descreve a alternativa preparada: compilar neste Mac e a Clever só arrancar a aplicação, sem instância de build (só o XS).

**Porquê:** o `next build` precisa de ~1,1 GB só para compilar (medição de 22/10/2026). Não cabe no XS e falha no S; o M tem custo por cada deploy. A aplicação a correr usa ~250–310 MB, por isso o XS chega.

## Como funciona

`npm run deploy` (script `scripts/deploy/deploy-producao.mjs`):

1. Confirma no GitHub que o CI (`unitarios` e `contrato`) passou no commit a publicar — o build já não verifica tipos.
2. Tira uma cópia limpa do `origin/main` (nunca envia alterações locais por guardar).
3. Lê as variáveis da Clever e usa no build **só as que não são segredos** (interruptores, `NEXT_PUBLIC_*`, IDs de preços). Os segredos (`*_KEY`, `*_SECRET`, `*_CHAVE`…) ficam só na Clever e são lidos em runtime. Não há ficheiro local para manter: uma variável mudada na Clever entra no build seguinte.
4. `npm ci` + `next build --webpack` (~30 s).
5. Recusa continuar se o valor de algum segredo aparecer nos ficheiros compilados.
6. Envia um commit só com o resultado para o branch **`producao`** do GitHub (substituído a cada deploy; o `main` não é tocado). A Clever faz o deploy desse branch.

Opções: `--ensaio` (faz tudo menos o envio), `--commit <sha>` (publicar outro commit, ex.: voltar atrás), `--sem-ci` (só em emergência).

Requisitos no Mac: `git`, `node`, `gh` (sessão iniciada) e `clever` (sessão iniciada).

## Mudança (uma vez, quando Thiago decidir)

Por esta ordem:

1. `npm run deploy -- --ensaio` — confirmar que termina com "Ensaio concluído".
2. `npm run deploy` — cria o branch `producao` no GitHub. **Ainda não muda nada em produção** (a Clever continua a seguir o `main`).
3. Na Clever (consola → aplicação → Information, ou pelos comandos):
   - branch de deploy: `main` → `producao`;
   - `clever env rm CC_PRE_BUILD_HOOK -a dolado-plataform` (sem compilação na Clever);
   - `clever scale --build-flavor disabled -a dolado-plataform` (sem instância de build dedicada).
4. `clever restart -a dolado-plataform` e acompanhar com `clever activity -a dolado-plataform`; confirmar `https://dolado.pt` e `https://portal.dolado.pt/login`.

A partir daí: **um merge no `main` já não publica nada**. Publicar = `npm run deploy` no Mac.

## Voltar ao modelo actual

1. Na Clever, branch de deploy de volta a `main`.
2. `clever env set CC_PRE_BUILD_HOOK "npm ci && rm -rf .next/cache/webpack && timeout 600 npm run build" -a dolado-plataform`
3. `clever scale --build-flavor M -a dolado-plataform`
4. `clever restart -a dolado-plataform`

Sem o Mac disponível (avaria, viagem), este é também o plano B: leva um minuto.

## Cuidados

- O branch `producao` contém o código compilado. Com o repositório público, fica visível como o resto do código; nunca contém segredos (passo 5).
- A protecção do `main` (CI obrigatório) continua a ser a garantia dos tipos. Se o repositório passar a privado no plano gratuito do GitHub, essa protecção deixa de existir — o script continua a exigir o CI verde no commit publicado.
- Verificado a 22/10/2026 só em ensaio (`--ensaio`): build, filtro de segredos e preparação do commit. O deploy real na Clever a partir do branch `producao` ainda não foi testado.
