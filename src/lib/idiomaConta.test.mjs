// Idioma preferido da conta (user_metadata.idioma) — `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  JANELA_CONTA_NOVA_MS,
  deveGravarIdiomaNoCallback,
  idiomaDoEmailPagamento,
  idiomaDosMetadados,
  preferenciaDosMetadados,
} from "./idiomaConta.ts";
import { enviarLembretesCompraSemConta } from "./compra/lembretes.ts";

const ler = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("preferência guardada na conta", () => {
  test("conta criada em /en → en-GB; em / → pt-PT; conta antiga (sem valor) → pt-PT", () => {
    assert.equal(idiomaDosMetadados({ idioma: "en-GB" }), "en-GB");
    assert.equal(idiomaDosMetadados({ idioma: "pt-PT" }), "pt-PT");
    assert.equal(idiomaDosMetadados({ nome: "Ana" }), "pt-PT");
    assert.equal(idiomaDosMetadados(null), "pt-PT");
    assert.equal(idiomaDosMetadados({ idioma: "en-US" }), "pt-PT");
    assert.equal(preferenciaDosMetadados({}), null);
    assert.equal(preferenciaDosMetadados({ idioma: "en-GB" }), "en-GB");
  });

  test("todos os signUp guardam o idioma da página (dadosContaNova exige idioma)", () => {
    const auth = ler("./authServidor.ts");
    assert.match(auth, /idioma: Idioma \}/);
    assert.match(auth, /\[CHAVE_IDIOMA_CONTA\]: dados\.idioma/);
    for (const f of ["../app/[idioma]/registo/actions.ts", "../app/[idioma]/criar-conta/actions.ts", "../app/[idioma]/tratar-caso/actions.ts"]) {
      assert.match(ler(f), /dadosContaNova\(\{[^}]*idioma: await obterIdioma\(\)/, f);
    }
  });

  test("Google: só grava numa conta acabada de criar e sem idioma (contas antigas não mudam)", () => {
    const agora = new Date("2026-10-09T10:00:00Z");
    const recente = new Date(agora.getTime() - 60_000).toISOString();
    const antiga = new Date(agora.getTime() - JANELA_CONTA_NOVA_MS - 1).toISOString();
    assert.equal(deveGravarIdiomaNoCallback({}, recente, agora), true);
    assert.equal(deveGravarIdiomaNoCallback({}, antiga, agora), false);
    assert.equal(deveGravarIdiomaNoCallback({ idioma: "pt-PT" }, recente, agora), false);
    assert.equal(deveGravarIdiomaNoCallback({}, null, agora), false);
    assert.match(ler("../app/auth/callback/route.ts"), /gravarIdiomaDeContaNova\(data\.user, idioma\)/);
  });

  test("pagamento: idioma da conta; sem conta/sem idioma, o do Checkout (en-GB em /en)", () => {
    assert.equal(idiomaDoEmailPagamento("pt-PT", "en-GB"), "pt-PT");
    assert.equal(idiomaDoEmailPagamento("en-GB", null), "en-GB");
    assert.equal(idiomaDoEmailPagamento(null, "en-GB"), "en-GB");
    assert.equal(idiomaDoEmailPagamento(null, null), "pt-PT");
    assert.equal(idiomaDoEmailPagamento(null, "auto"), "pt-PT");
  });

  test("o idioma nunca decide acesso: não aparece nas regras de acesso, planos nem webhook (só no e-mail)", () => {
    for (const f of ["./acesso.ts", "./auth.ts", "./planos.ts"]) assert.doesNotMatch(ler(f), /idiomaConta|user_metadata\??\.idioma/, f);
    const webhook = ler("./stripe/webhook.ts");
    // Só os dois campos de apresentação passados ao e-mail de pagamento.
    assert.equal((webhook.match(/localeCheckout/g) ?? []).length, 2);
  });
});

describe("lembretes de compra sem conta", () => {
  function deps(idioma) {
    const enviados = [];
    return {
      enviados,
      pendentes: async () => [{ stripe_session_id: "cs_1", email: "a@b.pt", plano: "avulso", confirmado_em: "x", marco: "1d" }],
      reservar: async () => true,
      contaExisteComEmail: async () => false,
      enviarEmail: async (d, assunto, html) => enviados.push({ assunto, html }),
      notificarAdmin: async () => {},
      ...(idioma ? { idiomaDaCompra: async () => idioma } : {}),
    };
  }

  test("compra feita em /en → lembrete em inglês; sem informação → português", async () => {
    const en = deps("en-GB");
    await enviarLembretesCompraSemConta(en, "https://portal.dolado.pt");
    assert.equal(en.enviados[0].assunto, "Finish setting up access to your DoLado purchase");
    assert.match(en.enviados[0].html, /\/en\/criar-conta\?session_id=cs_1/);
    const pt = deps(null);
    await enviarLembretesCompraSemConta(pt, "https://portal.dolado.pt");
    assert.equal(pt.enviados[0].assunto, "Falta concluir o acesso à sua compra na DoLado");
  });

  test("falha a ler o idioma → português, o lembrete sai na mesma", async () => {
    const d = { ...deps(null), idiomaDaCompra: async () => { throw new Error("stripe"); } };
    await enviarLembretesCompraSemConta(d, "https://portal.dolado.pt");
    assert.equal(d.enviados.length, 1);
    assert.match(d.enviados[0].html, /lang="pt-PT"/);
  });
});
